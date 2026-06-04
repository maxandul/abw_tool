"""Analysis service: load profiles, room demand, shares, key metrics.

All computation is in the service layer; the routes only pass filter
parameters and forward results.  Calculations intentionally use naive local
datetimes throughout (Europe/Zurich) – see Dok. 1 §13.
"""

import math
from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from app.utils import ValidationError, time_to_minutes
from constants import (
    ARBEITSTAGE,
    ANZAHL_SLOTS,
    SLOT_MINUTES,
    TAG_START_MINUTEN,
    TAG_END_MINUTEN,
)
from extensions import db
from models import Eintrag, Gruppe, GruppenMitglied, Kategorie, Raumtyp


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_gruppen(gruppe_ids: list[int]) -> list[Gruppe]:
    """Fetch groups or raise ValidationError when any id is missing."""
    gruppen = []
    for gid in gruppe_ids:
        g = db.session.get(Gruppe, gid)
        if g is None:
            raise ValidationError(f"Gruppe {gid} nicht gefunden.")
        gruppen.append(g)
    return gruppen


def _default_zeitraum(gruppen: list[Gruppe]) -> tuple[date, date]:
    """Return the earliest start and latest end date across all groups."""
    von = min(g.zeitraum_von for g in gruppen)
    bis = max(g.zeitraum_bis for g in gruppen)
    return von, bis


def _arbeitstage(datum_von: date, datum_bis: date) -> list[date]:
    """Return all working days (Mo–Fr) within a date range."""
    tage = []
    d = datum_von
    while d <= datum_bis:
        if d.weekday() in ARBEITSTAGE:
            tage.append(d)
        d += timedelta(days=1)
    return tage


def _iso_kw(d: date) -> str:
    """Return ISO calendar-week key, e.g. '2026-W22-1'."""
    iso = d.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def _gewichtete_sharing_ratio(gruppen: list[Gruppe]) -> float:
    """Weighted mean sharing ratio (weighted by number of participants per group)."""
    gesamt_teilnehmer = 0
    gewichtet_summe = 0.0
    for g in gruppen:
        n = GruppenMitglied.query.filter_by(gruppe_id=g.id).count()
        gesamt_teilnehmer += n
        gewichtet_summe += g.sharing_ratio * n
    if gesamt_teilnehmer == 0:
        return gruppen[0].sharing_ratio if gruppen else 1.2
    return gewichtet_summe / gesamt_teilnehmer


# ---------------------------------------------------------------------------
# Load entries
# ---------------------------------------------------------------------------

def _primary_raumtyp_id(kategorie) -> int | None:
    """Return the first raumtyp id for a category (M2M), or None."""
    if not kategorie:
        return None
    rts = kategorie.raumtypen
    return rts[0].id if rts else None


def _load_eintraege(gruppe_ids: list[int], datum_von: date, datum_bis: date,
                    raumtyp_id: int | None = None,
                    wochentage: list[int] | None = None,
                    kategorie_ids: list[int] | None = None) -> list[Eintrag]:
    """Load all entries matching the given filters."""
    query = (
        db.session.query(Eintrag)
        .filter(Eintrag.gruppe_id.in_(gruppe_ids))
        .filter(Eintrag.datum >= datum_von)
        .filter(Eintrag.datum <= datum_bis)
    )

    eintraege = query.all()

    if wochentage is not None:
        eintraege = [e for e in eintraege if e.datum.weekday() in wochentage]

    if raumtyp_id is not None:
        eintraege = [
            e for e in eintraege
            if _primary_raumtyp_id(e.kategorie) == raumtyp_id
        ]

    if kategorie_ids is not None:
        k_set = set(kategorie_ids)
        eintraege = [e for e in eintraege if e.kategorie_id in k_set]

    return eintraege


# ---------------------------------------------------------------------------
# Lastprofil (load profile / heatmap)
# ---------------------------------------------------------------------------

def berechne_lastprofil(gruppe_ids: list[int], datum_von: date, datum_bis: date,
                         wochentage: list[int] | None = None,
                         kategorie_ids: list[int] | None = None) -> dict:
    """Two-mode heatmap calculation.

    Requires non-empty kategorie_ids; returns empty when omitted.

    Mittelwert: per (weekday, slot) and per participant, compute the fraction
    of their active weeks where they had a booking in the selected categories.
    Average this fraction across all participants with any entries.
    Scale: 0.0 – 1.0.

    Maximum: per (weekday, slot), count distinct participants who had at least
    one matching booking across all their weeks.  A participant counts ≤ 1 even
    if they booked the slot in multiple weeks or with different categories.
    Scale: 0 – n_participants.
    """
    if not kategorie_ids:
        return {"slots": []}

    # Entries matching selected categories
    kat_eintraege = _load_eintraege(
        gruppe_ids, datum_von, datum_bis,
        wochentage=wochentage, kategorie_ids=kategorie_ids,
    )
    # All entries – used to determine active weeks per participant
    alle_eintraege = _load_eintraege(gruppe_ids, datum_von, datum_bis, wochentage=wochentage)

    alle_user_ids: set[int] = {e.user_id for e in alle_eintraege}

    # Per participant: ISO weeks in which they recorded anything
    tn_wochen: dict[int, set[str]] = defaultdict(set)
    for e in alle_eintraege:
        tn_wochen[e.user_id].add(_iso_kw(e.datum))

    # Per participant per (wt, slot_offset) per kategorie_id: weeks with a booking
    # tn_slot_kat_match[uid][(wt, off)][kat_id] = set of kw
    tn_slot_kat_match: dict = defaultdict(lambda: defaultdict(lambda: defaultdict(set)))
    # Per (wt, slot_offset): participants who ever matched (for maximum)
    slot_tn: dict[tuple, set] = defaultdict(set)

    for e in kat_eintraege:
        wt = e.datum.weekday()
        kw = _iso_kw(e.datum)
        von_min = time_to_minutes(e.zeit_von)
        bis_min = time_to_minutes(e.zeit_bis)
        slot = von_min
        while slot < bis_min:
            if TAG_START_MINUTEN <= slot < TAG_END_MINUTEN:
                off = slot - TAG_START_MINUTEN
                tn_slot_kat_match[e.user_id][(wt, off)][e.kategorie_id].add(kw)
                slot_tn[(wt, off)].add(e.user_id)
            slot += SLOT_MINUTES

    aggregiert = []
    for (wt, off), uid_set in slot_tn.items():
        maximum = len(uid_set)

        # Mittelwert: sum of (category_matching_weeks / total_weeks) per participant
        # across all selected categories → Ø persons at this slot per week.
        total = 0.0
        for uid in alle_user_ids:
            wochen = tn_wochen.get(uid)
            if not wochen:
                continue
            n = len(wochen)
            kat_map = tn_slot_kat_match[uid].get((wt, off), {})
            for kat_id in kategorie_ids:
                total += len(kat_map.get(kat_id, set())) / n

        aggregiert.append({
            "wochentag": wt,
            "slot_start_minuten": off,
            "mittelwert": round(total, 3),
            "maximum": maximum,
        })

    return {"slots": aggregiert}


# ---------------------------------------------------------------------------
# Raumbedarf (room demand)
# ---------------------------------------------------------------------------

def berechne_raumbedarf(gruppe_ids: list[int], datum_von: date, datum_bis: date) -> dict:
    """Recommend number of spaces per room type.

    Uses the same distinct-participant approach as the new Lastprofil maximum:
    per (weekday, slot_offset) count the distinct participants who ever had a
    booking in the given room type at that slot across the whole survey period.
    avg_nutzung = mean of these per-slot counts.
    peak_nutzung = maximum per-slot count.
    """
    gruppen = _get_gruppen(gruppe_ids)
    sharing_ratio = _gewichtete_sharing_ratio(gruppen)
    eintraege = _load_eintraege(gruppe_ids, datum_von, datum_bis)

    kein_raum_ids = {
        rt.id for rt in Raumtyp.query.all() if rt.name == "Kein Raum nötig"
    }

    # Per room type, per (wt, slot_offset): set of distinct participants
    rt_slot_tn: dict[int, dict[tuple, set]] = defaultdict(lambda: defaultdict(set))

    for e in eintraege:
        rt_id = _primary_raumtyp_id(e.kategorie)
        if rt_id is None:
            continue
        wt = e.datum.weekday()
        von_min = time_to_minutes(e.zeit_von)
        bis_min = time_to_minutes(e.zeit_bis)
        slot = von_min
        while slot < bis_min:
            if TAG_START_MINUTEN <= slot < TAG_END_MINUTEN:
                rt_slot_tn[rt_id][(wt, slot - TAG_START_MINUTEN)].add(e.user_id)
            slot += SLOT_MINUTES

    # Anwesend = all room types except "Kein Raum nötig"
    anwesend_slot_tn: dict[tuple, set] = defaultdict(set)
    for rt_id, slot_map in rt_slot_tn.items():
        if rt_id not in kein_raum_ids:
            for sk, uid_set in slot_map.items():
                anwesend_slot_tn[sk].update(uid_set)

    all_raumtypen = Raumtyp.query.filter_by(aktiv=True).order_by(Raumtyp.sort_order).all()
    raumtypen_result = []

    for rt in all_raumtypen:
        slot_map = rt_slot_tn.get(rt.id, {})
        counts = [len(uid_set) for uid_set in slot_map.values()]
        avg_nutzung = round(sum(counts) / len(counts), 2) if counts else 0.0
        peak_nutzung = max(counts) if counts else 0
        einheiten_avg = math.ceil(avg_nutzung / sharing_ratio) if avg_nutzung > 0 else 0
        einheiten_peak = math.ceil(peak_nutzung / sharing_ratio) if peak_nutzung > 0 else 0

        raumtypen_result.append({
            "id": rt.id,
            "name": rt.name,
            "avg_nutzung": avg_nutzung,
            "peak_nutzung": peak_nutzung,
            "einheiten_avg": einheiten_avg,
            "einheiten_peak": einheiten_peak,
            "kein_raum": rt.id in kein_raum_ids,
        })

    anw_counts = [len(uid_set) for uid_set in anwesend_slot_tn.values()]

    return {
        "sharing_ratio": sharing_ratio,
        "raumtypen": raumtypen_result,
        "anwesend_total": {
            "avg_nutzung": round(sum(anw_counts) / len(anw_counts), 2) if anw_counts else 0.0,
            "peak_nutzung": max(anw_counts) if anw_counts else 0,
        },
    }


# ---------------------------------------------------------------------------
# Anteile (shares / proportions)
# ---------------------------------------------------------------------------

def berechne_anteile(gruppe_ids: list[int], datum_von: date, datum_bis: date,
                      raumtyp_id: int | None = None) -> dict:
    """Compute time shares per room type and per main group, by weekday."""
    eintraege = _load_eintraege(gruppe_ids, datum_von, datum_bis, raumtyp_id)

    # Minutes per raumtyp_id.
    rt_minuten: dict[int | None, float] = defaultdict(float)
    # Minutes per (raumtyp_category: stille/kommunikativ/abwesend) × weekday.
    hauptgruppe_wt: dict[str, dict[int, float]] = {
        "Stille Tätigkeiten": defaultdict(float),
        "Kommunikative Tätigkeiten": defaultdict(float),
        "Abwesenheit & Sonstiges": defaultdict(float),
    }

    kein_raum_ids = {
        rt.id for rt in Raumtyp.query.all() if rt.name == "Kein Raum nötig"
    }

    # Category sort_order 1–2 → still, 3–12 → kommunikativ, 13–17 → abwesend.
    def hauptgruppe(sort_order: int) -> str:
        if sort_order <= 2:
            return "Stille Tätigkeiten"
        if sort_order <= 12:
            return "Kommunikative Tätigkeiten"
        return "Abwesenheit & Sonstiges"

    kat_minuten: dict[int | None, float] = defaultdict(float)
    gesamt_minuten = 0.0
    for e in eintraege:
        dauer = time_to_minutes(e.zeit_bis) - time_to_minutes(e.zeit_von)
        rt_id = _primary_raumtyp_id(e.kategorie)
        rt_minuten[rt_id] += dauer
        kat_minuten[e.kategorie_id] += dauer
        gesamt_minuten += dauer

        so = e.kategorie.sort_order if e.kategorie else 17
        hg = hauptgruppe(so)
        hauptgruppe_wt[hg][e.datum.weekday()] += dauer

    all_raumtypen = Raumtyp.query.filter_by(aktiv=True).order_by(Raumtyp.sort_order).all()
    raumtyp_anteile = []
    for rt in all_raumtypen:
        minuten = rt_minuten.get(rt.id, 0.0)
        stunden = round(minuten / 60, 1)
        anteil = round(minuten / gesamt_minuten * 100, 1) if gesamt_minuten else 0.0
        raumtyp_anteile.append({
            "id": rt.id,
            "name": rt.name,
            "stunden": stunden,
            "anteil_prozent": anteil,
        })

    all_kategorien = Kategorie.query.filter_by(aktiv=True).order_by(Kategorie.sort_order).all()
    kategorie_anteile = []
    for kat in all_kategorien:
        minuten = kat_minuten.get(kat.id, 0.0)
        if minuten == 0:
            continue
        stunden = round(minuten / 60, 1)
        anteil = round(minuten / gesamt_minuten * 100, 1) if gesamt_minuten else 0.0
        kategorie_anteile.append({
            "id": kat.id,
            "name": kat.name,
            "stunden": stunden,
            "anteil_prozent": anteil,
        })

    # Weekday bar chart.
    wochentag_daten = []
    for wt in range(5):
        row: dict[str, Any] = {"wochentag": wt}
        for hg_name, wt_map in hauptgruppe_wt.items():
            row[hg_name] = round(wt_map.get(wt, 0.0) / 60, 1)
        wochentag_daten.append(row)

    return {
        "raumtyp_anteile": raumtyp_anteile,
        "kategorie_anteile": kategorie_anteile,
        "hauptgruppen_wochentag": wochentag_daten,
        "gesamt_stunden": round(gesamt_minuten / 60, 1),
    }


# ---------------------------------------------------------------------------
# Key metrics (Kennzahlen-Kacheln)
# ---------------------------------------------------------------------------

def berechne_kennzahlen(gruppe_ids: list[int], datum_von: date, datum_bis: date) -> dict:
    """Compute four headline KPI tiles for the analysis page."""
    eintraege = _load_eintraege(gruppe_ids, datum_von, datum_bis)

    kein_raum_ids = {
        rt.id for rt in Raumtyp.query.all() if rt.name == "Kein Raum nötig"
    }

    total_min = 0.0
    anwesend_min = 0.0
    stille_min = 0.0
    kommunikativ_min = 0.0

    for e in eintraege:
        dauer = time_to_minutes(e.zeit_bis) - time_to_minutes(e.zeit_von)
        total_min += dauer
        rt_id = _primary_raumtyp_id(e.kategorie)
        so = e.kategorie.sort_order if e.kategorie else 17
        if rt_id not in kein_raum_ids:
            anwesend_min += dauer
        if so <= 2:
            stille_min += dauer
        elif so <= 12:
            kommunikativ_min += dauer

    # Average simultaneous occupancy (anwesend).
    slot_counts: dict[tuple, int] = defaultdict(int)
    for e in eintraege:
        rt_id = _primary_raumtyp_id(e.kategorie)
        if rt_id in kein_raum_ids:
            continue
        kw = _iso_kw(e.datum)
        wt = e.datum.weekday()
        von_min = time_to_minutes(e.zeit_von)
        bis_min = time_to_minutes(e.zeit_bis)
        slot = von_min
        while slot < bis_min:
            if TAG_START_MINUTEN <= slot < TAG_END_MINUTEN:
                slot_counts[(kw, wt, slot - TAG_START_MINUTEN)] += 1
            slot += SLOT_MINUTES

    slot_werte = list(slot_counts.values())
    avg_anwesende = round(sum(slot_werte) / len(slot_werte), 1) if slot_werte else 0.0

    return {
        "anwesenheitsquote": round(anwesend_min / total_min * 100, 1) if total_min else 0.0,
        "stille_arbeit": round(stille_min / total_min * 100, 1) if total_min else 0.0,
        "kommunikative_arbeit": round(kommunikativ_min / total_min * 100, 1) if total_min else 0.0,
        "avg_anwesende": avg_anwesende,
    }
