"""Analysis service: load profiles, demand by activity group, shares, key metrics."""

import math
from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from app.utils import ValidationError, time_to_minutes
from constants import (
    ARBEITSTAGE,
    SLOT_MINUTES,
    SOLL_STUNDEN_PRO_TAG,
    TAG_START_MINUTEN,
    TAG_END_MINUTEN,
    VOLLSTAENDIGKEIT_SCHWELLE,
)
from extensions import db
from models import Arbeitsform, Eintrag, Gruppe, GruppenMitglied, Kategorie, Taetigkeitsgruppe
from models.einreichung import Einreichung, EinreichungStatus
from models.kategorie import ARBEITSFORM_LABELS, TAETIGKEITSGRUPPE_LABELS

TeilnehmerFilter = dict[str, list]

# A participant counts as "eingereicht" (included in analysis) when their
# submission is in one of these states. IN_BEARBEITUNG/OFFEN are excluded:
# their data is incomplete or being edited and would distort the analysis.
EINGEREICHT_STATUS = (
    EinreichungStatus.EINGEREICHT,
    EinreichungStatus.ABGESCHLOSSEN,
)


def _eingereichte_paare(gruppe_ids: list[int]) -> set[tuple[int, int]]:
    """Return the set of (gruppe_id, user_id) pairs that have submitted."""
    rows = Einreichung.query.filter(
        Einreichung.gruppe_id.in_(gruppe_ids),
        Einreichung.status.in_(EINGEREICHT_STATUS),
    ).all()
    return {(r.gruppe_id, r.user_id) for r in rows}


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


def _mitglied_matches_teilnehmer_filter(
    mitglied: GruppenMitglied, flt: TeilnehmerFilter | None
) -> bool:
    if not _teilnehmer_filter_active(flt):
        return True
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


def _mitglied_name(mitglied: GruppenMitglied) -> str:
    name = " ".join(p for p in (mitglied.vorname, mitglied.nachname) if p).strip()
    if name:
        return name
    if mitglied.user and mitglied.user.email:
        return mitglied.user.email
    return f"Teilnehmer {mitglied.user_id}"


def _zaehle_arbeitstage(
    datum_von: date, datum_bis: date, wochentage: list[int] | None
) -> int:
    tage = set(wochentage) if wochentage else set(ARBEITSTAGE)
    anzahl = 0
    d = datum_von
    while d <= datum_bis:
        if d.weekday() in tage:
            anzahl += 1
        d += timedelta(days=1)
    return anzahl


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

ANWESEND_ARBEITSFORMEN = (Arbeitsform.EINZELARBEIT, Arbeitsform.MEETING)


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
    """Whether a Kategorie counts as "arbeitet" (present/working).

    Kategorien from the current (Arbeitsform-based) structure and Kategorien
    from the superseded pre-restructure system are each judged by their own
    classification – the two are never cross-mapped.
    """
    if kategorie is None:
        return False
    if kategorie.arbeitsform is not None:
        return kategorie.arbeitsform in ANWESEND_ARBEITSFORMEN
    return kategorie.taetigkeitsgruppe in ANWESEND_GRUPPEN


def _hauptgruppe(kategorie: Kategorie) -> str:
    """Coarse 3-bucket grouping ("Stille"/"Kommunikative"/"Abwesenheit &
    Sonstiges"), shared across both structures for the weekday breakdown."""
    if kategorie.arbeitsform is not None:
        if kategorie.arbeitsform == Arbeitsform.EINZELARBEIT:
            return "Stille Tätigkeiten"
        if kategorie.arbeitsform == Arbeitsform.MEETING:
            return "Kommunikative Tätigkeiten"
        return "Abwesenheit & Sonstiges"
    if kategorie.taetigkeitsgruppe == Taetigkeitsgruppe.EINZELARBEIT:
        return "Stille Tätigkeiten"
    if kategorie.taetigkeitsgruppe in (Taetigkeitsgruppe.ZU_ZWEIT_DREIT, Taetigkeitsgruppe.GRUPPE_4PLUS):
        return "Kommunikative Tätigkeiten"
    return "Abwesenheit & Sonstiges"


def _gruppen_label(kategorie: Kategorie) -> str:
    """Top-level grouping label for the "Anteile" bar chart: the 3 current
    Arbeitsform labels, or (for legacy Kategorien) the 4 old
    Tätigkeitsgruppe labels – never merged between the two structures."""
    if kategorie.arbeitsform is not None:
        return ARBEITSFORM_LABELS[kategorie.arbeitsform]
    return TAETIGKEITSGRUPPE_LABELS[kategorie.taetigkeitsgruppe]


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

    # Only entries from participants who have submitted are part of the analysis.
    eingereicht = _eingereichte_paare(gruppe_ids)
    eintraege = [e for e in eintraege if (e.gruppe_id, e.user_id) in eingereicht]

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
        if _is_anwesend(k)
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

    # Keyed by the human label (current Arbeitsform or legacy
    # Tätigkeitsgruppe label) rather than the enum, since a report can only
    # ever contain entries from one of the two structures in practice but
    # both need a bucket to land in.
    tg_minuten: dict[str, float] = defaultdict(float)
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
        tg_minuten[_gruppen_label(e.kategorie)] += dauer
        kat_minuten[e.kategorie_id] += dauer
        gesamt_minuten += dauer
        hg = _hauptgruppe(e.kategorie)
        hauptgruppe_wt[hg][e.datum.weekday()] += dauer

    _label_order = list(dict.fromkeys(
        [ARBEITSFORM_LABELS[a] for a in Arbeitsform]
        + [TAETIGKEITSGRUPPE_LABELS[t] for t in Taetigkeitsgruppe]
    ))
    _ordered_labels = [l for l in _label_order if l in tg_minuten] + [
        l for l in tg_minuten if l not in _label_order
    ]

    tg_anteile = []
    for label in _ordered_labels:
        minuten = tg_minuten[label]
        if minuten == 0:
            continue
        stunden = round(minuten / 60, 1)
        anteil = round(minuten / gesamt_minuten * 100, 1) if gesamt_minuten else 0.0
        tg_anteile.append({
            "gruppe": label,
            "name": label,
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
        if _is_anwesend(e.kategorie):
            anwesend_min += dauer
        hg = _hauptgruppe(e.kategorie)
        if hg == "Stille Tätigkeiten":
            stille_min += dauer
        elif hg == "Kommunikative Tätigkeiten":
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


def berechne_sample(
    gruppe_ids: list[int],
    datum_von: date,
    datum_bis: date,
    wochentage: list[int] | None = None,
    teilnehmer_filter: TeilnehmerFilter | None = None,
) -> dict:
    """Describe the (optionally filtered) data sample behind the analysis.

    Only participants who have submitted ("eingereicht") are part of the
    analysis. Returns how many of the eligible participants submitted, the FTE
    sum and completeness of the submitted ones, plus those below the threshold.
    """
    gruppen = _get_gruppen(gruppe_ids)
    flt = teilnehmer_filter or None

    alle_mitglieder = GruppenMitglied.query.filter(
        GruppenMitglied.gruppe_id.in_(gruppe_ids)
    ).all()
    sample_mitglieder = [
        m for m in alle_mitglieder if _mitglied_matches_teilnehmer_filter(m, flt)
    ]

    eingereicht_paare = _eingereichte_paare(gruppe_ids)
    eingereicht_mitglieder = [
        m for m in sample_mitglieder
        if (m.gruppe_id, m.user_id) in eingereicht_paare
    ]

    eintraege = _load_eintraege(
        gruppe_ids, datum_von, datum_bis,
        wochentage=wochentage, teilnehmer_filter=flt,
    )
    erfasst_pro_mitglied: dict[tuple[int, int], float] = defaultdict(float)
    for e in eintraege:
        erfasst_pro_mitglied[(e.gruppe_id, e.user_id)] += (
            time_to_minutes(e.zeit_bis) - time_to_minutes(e.zeit_von)
        )

    arbeitstage = _zaehle_arbeitstage(datum_von, datum_bis, wochentage)
    tagessoll_min = SOLL_STUNDEN_PRO_TAG * 60

    fte_summe = 0.0
    erfasste_minuten = 0.0
    erfasste_minuten_gedeckelt = 0.0
    erwartete_minuten = 0.0
    unter_schwelle = []

    # Expected hours are the same for everyone (working days × 8.4h): part-time
    # staff record their non-working time as the "Teilzeit" activity, so they
    # also fill the whole week. FTE sum is kept purely as descriptive info.
    soll = arbeitstage * tagessoll_min
    for m in eingereicht_mitglieder:
        grad = (m.beschaeftigungsgrad or 100.0) / 100.0
        fte_summe += grad
        ist = erfasst_pro_mitglied.get((m.gruppe_id, m.user_id), 0.0)
        erwartete_minuten += soll
        erfasste_minuten += ist
        # Cap each participant at their own expected hours so over-recording by
        # some cannot mask gaps of others in the aggregate completeness.
        erfasste_minuten_gedeckelt += min(ist, soll)
        if soll > 0:
            quote = ist / soll
            if quote < VOLLSTAENDIGKEIT_SCHWELLE:
                unter_schwelle.append({
                    "user_id": m.user_id,
                    "gruppe_id": m.gruppe_id,
                    "name": _mitglied_name(m),
                    "beschaeftigungsgrad": m.beschaeftigungsgrad,
                    "vollstaendigkeit_prozent": round(quote * 100, 1),
                })

    unter_schwelle.sort(key=lambda r: r["vollstaendigkeit_prozent"])

    vollstaendigkeit = (
        round(erfasste_minuten_gedeckelt / erwartete_minuten * 100, 1)
        if erwartete_minuten
        else 0.0
    )

    return {
        "teilnehmer_im_sample": len(sample_mitglieder),
        "eingereicht": len(eingereicht_mitglieder),
        "nicht_eingereicht": len(sample_mitglieder) - len(eingereicht_mitglieder),
        "fte_summe": round(fte_summe, 2),
        "arbeitstage": arbeitstage,
        "anzahl_gruppen": len(gruppen),
        "zeitraum_von": datum_von.isoformat(),
        "zeitraum_bis": datum_bis.isoformat(),
        "erfasste_stunden": round(erfasste_minuten / 60, 1),
        "erwartete_stunden": round(erwartete_minuten / 60, 1),
        "vollstaendigkeit_prozent": vollstaendigkeit,
        "schwelle_prozent": round(VOLLSTAENDIGKEIT_SCHWELLE * 100),
        "teilnehmer_unter_schwelle": unter_schwelle,
        "filter_aktiv": _teilnehmer_filter_active(flt),
    }


def export_rohdaten(
    gruppe_ids: list[int],
    datum_von: date,
    datum_bis: date,
) -> dict:
    """Anonymous raw dataset for the self-contained interactive HTML export.

    Contains everything needed to recompute Lastprofil, Bedarf, Anteile and
    Stichprobe client-side, for the selected groups only. No names or e-mails
    are included; participants are referenced by an opaque index. Only entries
    of submitted ("eingereicht") participants are included.
    """
    gruppen = _get_gruppen(gruppe_ids)

    mitglieder = GruppenMitglied.query.filter(
        GruppenMitglied.gruppe_id.in_(gruppe_ids)
    ).all()
    eingereicht_paare = _eingereichte_paare(gruppe_ids)

    # Stable anonymous index per membership (gruppe_id, user_id).
    index_map: dict[tuple[int, int], int] = {}
    teilnehmer = []
    for m in mitglieder:
        key = (m.gruppe_id, m.user_id)
        idx = len(teilnehmer)
        index_map[key] = idx
        teilnehmer.append({
            "i": idx,
            "funktion": m.funktion or "",
            "oe": m.organisationseinheit or "",
            "grad": m.beschaeftigungsgrad if m.beschaeftigungsgrad is not None else 100.0,
            "eingereicht": key in eingereicht_paare,
        })

    eintraege_raw = (
        db.session.query(Eintrag)
        .filter(Eintrag.gruppe_id.in_(gruppe_ids))
        .filter(Eintrag.datum >= datum_von)
        .filter(Eintrag.datum <= datum_bis)
        .all()
    )
    eintraege = []
    for e in eintraege_raw:
        key = (e.gruppe_id, e.user_id)
        if key not in eingereicht_paare:
            continue
        idx = index_map.get(key)
        if idx is None:
            continue
        eintraege.append({
            "t": idx,
            "k": e.kategorie_id,
            "wd": e.datum.weekday(),
            "kw": _iso_kw(e.datum),
            "von": time_to_minutes(e.zeit_von),
            "bis": time_to_minutes(e.zeit_bis),
        })

    kategorien = [
        {
            "id": k.id,
            "name": k.name,
            "farbe": k.farbe,
            # "Top group" key/label for the export's own grouping – the
            # Arbeitsform for current Kategorien, or the legacy
            # Tätigkeitsgruppe for Kategorien from the superseded system.
            "taetigkeitsgruppe": k.arbeitsform.value if k.arbeitsform else k.taetigkeitsgruppe.value,
            "taetigkeitsgruppe_label": _gruppen_label(k),
            "sort_order": k.sort_order,
            "anwesend": _is_anwesend(k),
        }
        for k in Kategorie.query.filter_by(aktiv=True)
        .order_by(Kategorie.sort_order)
        .all()
    ]

    return {
        "gruppen_namen": [g.name for g in gruppen],
        "anzahl_gruppen": len(gruppen),
        "zeitraum_von": datum_von.isoformat(),
        "zeitraum_bis": datum_bis.isoformat(),
        "arbeitstage": _zaehle_arbeitstage(datum_von, datum_bis, None),
        "soll_stunden_pro_tag": SOLL_STUNDEN_PRO_TAG,
        "schwelle_prozent": round(VOLLSTAENDIGKEIT_SCHWELLE * 100),
        "tag_start_minuten": TAG_START_MINUTEN,
        "tag_end_minuten": TAG_END_MINUTEN,
        "slot_minuten": SLOT_MINUTES,
        "teilnehmer": teilnehmer,
        "eintraege": eintraege,
        "kategorien": kategorien,
    }
