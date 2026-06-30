"""Analysis service: load profiles, demand by activity group, shares, key metrics."""

import math
from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from app.utils import ValidationError, time_to_minutes
from constants import (
    ARBEITSTAGE,
    SLOT_MINUTES,
    TAG_START_MINUTEN,
    TAG_END_MINUTEN,
)
from extensions import db
from models import Eintrag, Gruppe, GruppenMitglied, Kategorie, Taetigkeitsgruppe
from models.kategorie import TAETIGKEITSGRUPPE_LABELS

TeilnehmerFilter = dict[str, list]


def _teilnehmer_filter_active(flt: TeilnehmerFilter | None) -> bool:
    if not flt:
        return False
    return bool(
        flt.get("funktionen")
        or flt.get("organisationseinheiten")
        or flt.get("beschaeftigungsgrade")
    )


def _membership_lookup(gruppe_ids: list[int]) -> dict[tuple[int, int], GruppenMitglied]:
    rows = GruppenMitglied.query.filter(
        GruppenMitglied.gruppe_id.in_(gruppe_ids)
    ).all()
    return {(m.gruppe_id, m.user_id): m for m in rows}


def _eintrag_matches_teilnehmer_filter(
    eintrag: Eintrag,
    lookup: dict[tuple[int, int], GruppenMitglied],
    flt: TeilnehmerFilter | None,
) -> bool:
    if not _teilnehmer_filter_active(flt):
        return True
    mitglied = lookup.get((eintrag.gruppe_id, eintrag.user_id))
    if mitglied is None:
        return False
    if flt.get("funktionen") and (mitglied.funktion or "") not in flt["funktionen"]:
        return False
    if flt.get("organisationseinheiten") and (
        mitglied.organisationseinheit or ""
    ) not in flt["organisationseinheiten"]:
        return False
    if flt.get("beschaeftigungsgrade") and (
        mitglied.beschaeftigungsgrad not in flt["beschaeftigungsgrade"]
    ):
        return False
    return True


def get_teilnehmer_filter_optionen(gruppe_ids: list[int]) -> dict:
    """Distinct participant attribute values for filter UI."""
    _get_gruppen(gruppe_ids)
    rows = GruppenMitglied.query.filter(
        GruppenMitglied.gruppe_id.in_(gruppe_ids)
    ).all()
    return {
        "funktionen": sorted(
            {m.funktion for m in rows if m.funktion}, key=lambda s: s.lower()
        ),
        "organisationseinheiten": sorted(
            {m.organisationseinheit for m in rows if m.organisationseinheit},
            key=lambda s: s.lower(),
        ),
        "beschaeftigungsgrade": sorted({m.beschaeftigungsgrad for m in rows}),
        "anzahl_teilnehmer": len(rows),
    }

ANWESEND_GRUPPEN = (
    Taetigkeitsgruppe.EINZELARBEIT,
    Taetigkeitsgruppe.ZU_ZWEIT_DREIT,
    Taetigkeitsgruppe.GRUPPE_4PLUS,
)


def _get_gruppen(gruppe_ids: list[int]) -> list[Gruppe]:
    gruppen = []
    for gid in gruppe_ids:
        g = db.session.get(Gruppe, gid)
        if g is None:
            raise ValidationError(f"Gruppe {gid} nicht gefunden.")
        gruppen.append(g)
    return gruppen


def _default_zeitraum(gruppen: list[Gruppe]) -> tuple[date, date]:
    von = min(g.zeitraum_von for g in gruppen)
    bis = max(g.zeitraum_bis for g in gruppen)
    return von, bis


def _iso_kw(d: date) -> str:
    iso = d.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def _is_anwesend(kategorie: Kategorie | None) -> bool:
    if kategorie is None:
        return False
    return kategorie.taetigkeitsgruppe in ANWESEND_GRUPPEN


def _hauptgruppe(gruppe: Taetigkeitsgruppe) -> str:
    if gruppe == Taetigkeitsgruppe.EINZELARBEIT:
        return "Stille Tätigkeiten"
    if gruppe in (Taetigkeitsgruppe.ZU_ZWEIT_DREIT, Taetigkeitsgruppe.GRUPPE_4PLUS):
        return "Kommunikative Tätigkeiten"
    return "Abwesenheit & Sonstiges"


def _load_eintraege(
    gruppe_ids: list[int],
    datum_von: date,
    datum_bis: date,
    wochentage: list[int] | None = None,
    kategorie_ids: list[int] | None = None,
    teilnehmer_filter: TeilnehmerFilter | None = None,
) -> list[Eintrag]:
    query = (
        db.session.query(Eintrag)
        .filter(Eintrag.gruppe_id.in_(gruppe_ids))
        .filter(Eintrag.datum >= datum_von)
        .filter(Eintrag.datum <= datum_bis)
    )
    eintraege = query.all()

    lookup = (
        _membership_lookup(gruppe_ids)
        if _teilnehmer_filter_active(teilnehmer_filter)
        else None
    )

    if wochentage is not None:
        eintraege = [e for e in eintraege if e.datum.weekday() in wochentage]

    if kategorie_ids is not None:
        k_set = set(kategorie_ids)
        eintraege = [e for e in eintraege if e.kategorie_id in k_set]

    if lookup is not None:
        eintraege = [
            e
            for e in eintraege
            if _eintrag_matches_teilnehmer_filter(e, lookup, teilnehmer_filter)
        ]

    return eintraege


def berechne_lastprofil(
    gruppe_ids: list[int],
    datum_von: date,
    datum_bis: date,
    wochentage: list[int] | None = None,
    kategorie_ids: list[int] | None = None,
    teilnehmer_filter: TeilnehmerFilter | None = None,
) -> dict:
    if not kategorie_ids:
        return {"slots": []}

    kat_eintraege = _load_eintraege(
        gruppe_ids, datum_von, datum_bis,
        wochentage=wochentage, kategorie_ids=kategorie_ids,
        teilnehmer_filter=teilnehmer_filter,
    )
    alle_eintraege = _load_eintraege(
        gruppe_ids, datum_von, datum_bis,
        wochentage=wochentage, teilnehmer_filter=teilnehmer_filter,
    )

    alle_user_ids: set[int] = {e.user_id for e in alle_eintraege}

    tn_wochen: dict[int, set[str]] = defaultdict(set)
    for e in alle_eintraege:
        tn_wochen[e.user_id].add(_iso_kw(e.datum))

    tn_slot_kat_match: dict = defaultdict(lambda: defaultdict(lambda: defaultdict(set)))
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


def berechne_raumbedarf(
    gruppe_ids: list[int],
    datum_von: date,
    datum_bis: date,
    teilnehmer_filter: TeilnehmerFilter | None = None,
) -> dict:
    """Recommended capacity units per Tätigkeit (excluding Extern)."""
    _get_gruppen(gruppe_ids)
    eintraege = _load_eintraege(
        gruppe_ids, datum_von, datum_bis, teilnehmer_filter=teilnehmer_filter
    )

    kat_slot_tn: dict[int, dict[tuple, set]] = defaultdict(
        lambda: defaultdict(set)
    )

    for e in eintraege:
        if not e.kategorie or not _is_anwesend(e.kategorie):
            continue
        kat_id = e.kategorie_id
        wt = e.datum.weekday()
        von_min = time_to_minutes(e.zeit_von)
        bis_min = time_to_minutes(e.zeit_bis)
        slot = von_min
        while slot < bis_min:
            if TAG_START_MINUTEN <= slot < TAG_END_MINUTEN:
                kat_slot_tn[kat_id][(wt, slot - TAG_START_MINUTEN)].add(e.user_id)
            slot += SLOT_MINUTES

    anwesend_slot_tn: dict[tuple, set] = defaultdict(set)
    for slot_map in kat_slot_tn.values():
        for sk, uid_set in slot_map.items():
            anwesend_slot_tn[sk].update(uid_set)

    kategorien = {
        k.id: k
        for k in Kategorie.query.filter_by(aktiv=True).order_by(Kategorie.sort_order).all()
        if k.taetigkeitsgruppe in ANWESEND_GRUPPEN
    }

    taetigkeiten_result = []
    for kat_id in sorted(kategorien, key=lambda kid: kategorien[kid].sort_order):
        slot_map = kat_slot_tn.get(kat_id, {})
        counts = [len(uid_set) for uid_set in slot_map.values()]
        if not counts:
            continue
        kat = kategorien[kat_id]
        avg_nutzung = round(sum(counts) / len(counts), 2)
        peak_nutzung = max(counts)
        taetigkeiten_result.append({
            "id": kat_id,
            "name": kat.name,
            "farbe": kat.farbe,
            "avg_nutzung": avg_nutzung,
            "peak_nutzung": peak_nutzung,
            "einheiten_avg": math.ceil(avg_nutzung) if avg_nutzung > 0 else 0,
            "einheiten_peak": peak_nutzung,
        })

    anw_counts = [len(uid_set) for uid_set in anwesend_slot_tn.values()]

    return {
        "taetigkeiten": taetigkeiten_result,
        "anwesend_total": {
            "avg_nutzung": round(sum(anw_counts) / len(anw_counts), 2) if anw_counts else 0.0,
            "peak_nutzung": max(anw_counts) if anw_counts else 0,
        },
    }


def berechne_anteile(
    gruppe_ids: list[int],
    datum_von: date,
    datum_bis: date,
    teilnehmer_filter: TeilnehmerFilter | None = None,
) -> dict:
    """Compute time shares per Tätigkeitsgruppe and per Tätigkeit, by weekday."""
    eintraege = _load_eintraege(
        gruppe_ids, datum_von, datum_bis, teilnehmer_filter=teilnehmer_filter
    )

    tg_minuten: dict[Taetigkeitsgruppe, float] = defaultdict(float)
    hauptgruppe_wt: dict[str, dict[int, float]] = {
        "Stille Tätigkeiten": defaultdict(float),
        "Kommunikative Tätigkeiten": defaultdict(float),
        "Abwesenheit & Sonstiges": defaultdict(float),
    }

    kat_minuten: dict[int, float] = defaultdict(float)
    gesamt_minuten = 0.0
    for e in eintraege:
        if not e.kategorie:
            continue
        dauer = time_to_minutes(e.zeit_bis) - time_to_minutes(e.zeit_von)
        tg = e.kategorie.taetigkeitsgruppe
        tg_minuten[tg] += dauer
        kat_minuten[e.kategorie_id] += dauer
        gesamt_minuten += dauer
        hg = _hauptgruppe(tg)
        hauptgruppe_wt[hg][e.datum.weekday()] += dauer

    tg_anteile = []
    for tg in list(Taetigkeitsgruppe):
        minuten = tg_minuten.get(tg, 0.0)
        if minuten == 0:
            continue
        stunden = round(minuten / 60, 1)
        anteil = round(minuten / gesamt_minuten * 100, 1) if gesamt_minuten else 0.0
        tg_anteile.append({
            "gruppe": tg.value,
            "name": TAETIGKEITSGRUPPE_LABELS[tg],
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
            "farbe": kat.farbe,
            "stunden": stunden,
            "anteil_prozent": anteil,
        })

    wochentag_daten = []
    for wt in range(5):
        row: dict[str, Any] = {"wochentag": wt}
        for hg_name, wt_map in hauptgruppe_wt.items():
            row[hg_name] = round(wt_map.get(wt, 0.0) / 60, 1)
        wochentag_daten.append(row)

    return {
        "taetigkeitsgruppe_anteile": tg_anteile,
        "kategorie_anteile": kategorie_anteile,
        "hauptgruppen_wochentag": wochentag_daten,
        "gesamt_stunden": round(gesamt_minuten / 60, 1),
    }


def berechne_kennzahlen(
    gruppe_ids: list[int],
    datum_von: date,
    datum_bis: date,
    teilnehmer_filter: TeilnehmerFilter | None = None,
) -> dict:
    eintraege = _load_eintraege(
        gruppe_ids, datum_von, datum_bis, teilnehmer_filter=teilnehmer_filter
    )

    total_min = 0.0
    anwesend_min = 0.0
    stille_min = 0.0
    kommunikativ_min = 0.0

    for e in eintraege:
        if not e.kategorie:
            continue
        dauer = time_to_minutes(e.zeit_bis) - time_to_minutes(e.zeit_von)
        total_min += dauer
        tg = e.kategorie.taetigkeitsgruppe
        if _is_anwesend(e.kategorie):
            anwesend_min += dauer
        if tg == Taetigkeitsgruppe.EINZELARBEIT:
            stille_min += dauer
        elif tg in (Taetigkeitsgruppe.ZU_ZWEIT_DREIT, Taetigkeitsgruppe.GRUPPE_4PLUS):
            kommunikativ_min += dauer

    slot_counts: dict[tuple, int] = defaultdict(int)
    for e in eintraege:
        if not _is_anwesend(e.kategorie):
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
