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
                    wochentage: list[int] | None = None) -> list[Eintrag]:
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
        # Filter entries whose category's primary room type matches
        eintraege = [
            e for e in eintraege
            if _primary_raumtyp_id(e.kategorie) == raumtyp_id
        ]

    return eintraege


# ---------------------------------------------------------------------------
# Lastprofil (load profile / heatmap)
# ---------------------------------------------------------------------------

def berechne_lastprofil(gruppe_ids: list[int], datum_von: date, datum_bis: date,
                         raumtyp_id: int | None = None,
                         wochentage: list[int] | None = None) -> dict:
    """Calculate per-slot (weekday × 15-min) mean/min/max occupancy.

    Returns data suitable for the heatmap visualisation.
    """
    eintraege = _load_eintraege(gruppe_ids, datum_von, datum_bis, raumtyp_id, wochentage)

    # Map: (wochentag, slot_minuten, kw) → count of persons
    KW_TAG_SLOT: dict[tuple, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    raumtyp_ids_set: set[int | None] = set()

    for e in eintraege:
        wt = e.datum.weekday()
        kw = _iso_kw(e.datum)
        von_min = time_to_minutes(e.zeit_von)
        bis_min = time_to_minutes(e.zeit_bis)
        rt_id = _primary_raumtyp_id(e.kategorie)
        raumtyp_ids_set.add(rt_id)

        # Mark every 15-min slot that this entry covers.
        slot = von_min
        while slot < bis_min:
            if TAG_START_MINUTEN <= slot < TAG_END_MINUTEN:
                KW_TAG_SLOT[(wt, slot - TAG_START_MINUTEN, rt_id)][kw] += 1
            slot += SLOT_MINUTES

    # Aggregate per (wochentag, slot_offset, raumtyp_id)
    aggregiert = []
    for (wt, slot_offset, rt_id), kw_counts in KW_TAG_SLOT.items():
        werte = list(kw_counts.values())
        aggregiert.append({
            "wochentag": wt,
            "slot_start_minuten": slot_offset,
            "raumtyp_id": rt_id,
            "mittelwert": round(sum(werte) / len(werte), 2),
            "maximum": max(werte),
            "minimum": min(werte),
            "anzahl_wochen": len(werte),
        })

    raumtypen = []
    for rt_id in raumtyp_ids_set:
        if rt_id is None:
            continue
        rt = db.session.get(Raumtyp, rt_id)
        if rt:
            first_farbe = next(
                (k.farbe for k in rt.kategorien if k.farbe), "#3B82F6"
            )
            raumtypen.append({
                "id": rt.id,
                "name": rt.name,
                "farbe": first_farbe,
            })

    return {"slots": aggregiert, "raumtypen": raumtypen}


# ---------------------------------------------------------------------------
# Raumbedarf (room demand)
# ---------------------------------------------------------------------------

def berechne_raumbedarf(gruppe_ids: list[int], datum_von: date, datum_bis: date) -> dict:
    """Calculate recommended number of spaces per room type."""
    gruppen = _get_gruppen(gruppe_ids)
    sharing_ratio = _gewichtete_sharing_ratio(gruppen)
    eintraege = _load_eintraege(gruppe_ids, datum_von, datum_bis)

    # Build mapping raumtyp_id → list of per-(kw, wt, slot) counts.
    kein_raum_namen = {
        rt.id for rt in Raumtyp.query.all() if rt.name == "Kein Raum nötig"
    }

    # Per raumtyp: map (kw, wt, slot) → count
    rt_kw_slot: dict[int | None, dict[tuple, int]] = defaultdict(lambda: defaultdict(int))

    for e in eintraege:
        rt_id = _primary_raumtyp_id(e.kategorie)
        kw = _iso_kw(e.datum)
        wt = e.datum.weekday()
        von_min = time_to_minutes(e.zeit_von)
        bis_min = time_to_minutes(e.zeit_bis)
        slot = von_min
        while slot < bis_min:
            if TAG_START_MINUTEN <= slot < TAG_END_MINUTEN:
                rt_kw_slot[rt_id][(kw, wt, slot - TAG_START_MINUTEN)] += 1
            slot += SLOT_MINUTES

    raumtypen_result = []
    all_raumtypen = Raumtyp.query.filter_by(aktiv=True).order_by(Raumtyp.sort_order).all()

    for rt in all_raumtypen:
        slot_counts = rt_kw_slot.get(rt.id, {})
        werte = list(slot_counts.values())
        avg_nutzung = round(sum(werte) / len(werte), 2) if werte else 0.0
        peak_nutzung = max(werte) if werte else 0
        einheiten_avg = math.ceil(avg_nutzung / sharing_ratio) if avg_nutzung > 0 else 0
        einheiten_peak = math.ceil(peak_nutzung / sharing_ratio) if peak_nutzung > 0 else 0

        raumtypen_result.append({
            "id": rt.id,
            "name": rt.name,
            "avg_nutzung": avg_nutzung,
            "peak_nutzung": peak_nutzung,
            "einheiten_avg": einheiten_avg,
            "einheiten_peak": einheiten_peak,
            "kein_raum": rt.id in kein_raum_namen,
        })

    # Additional row: total presence (all room types except "Kein Raum nötig").
    anwesend_slots = defaultdict(int)
    for rt_id, slots in rt_kw_slot.items():
        if rt_id not in kein_raum_namen and rt_id is not None:
            for key, cnt in slots.items():
                anwesend_slots[key] += cnt
    anw_werte = list(anwesend_slots.values())

    return {
        "sharing_ratio": sharing_ratio,
        "raumtypen": raumtypen_result,
        "anwesend_total": {
            "avg_nutzung": round(sum(anw_werte) / len(anw_werte), 2) if anw_werte else 0.0,
            "peak_nutzung": max(anw_werte) if anw_werte else 0,
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

    gesamt_minuten = 0.0
    for e in eintraege:
        dauer = time_to_minutes(e.zeit_bis) - time_to_minutes(e.zeit_von)
        rt_id = _primary_raumtyp_id(e.kategorie)
        rt_minuten[rt_id] += dauer
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

    # Weekday bar chart.
    wochentag_daten = []
    for wt in range(5):
        row: dict[str, Any] = {"wochentag": wt}
        for hg_name, wt_map in hauptgruppe_wt.items():
            row[hg_name] = round(wt_map.get(wt, 0.0) / 60, 1)
        wochentag_daten.append(row)

    return {
        "raumtyp_anteile": raumtyp_anteile,
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
