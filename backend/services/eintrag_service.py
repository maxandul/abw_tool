"""Business logic for time-block entries and submission state management."""

import math
from datetime import date, datetime, time, timedelta
from typing import Any

from app.utils import ValidationError, parse_date, parse_time, time_to_minutes
from constants import (
    ARBEITSTAGE,
    MIN_HALBTAG_STUNDEN,
    MITTAG,
    MITTAG_MINUTEN,
    SLOT_MINUTES,
    SOLL_STUNDEN_PRO_TAG,
    TAG_END,
    TAG_START,
    WOCHENTAG_NAMEN,
)
from extensions import db
from models import (
    Arbeitsform,
    Arbeitsort,
    Einreichung,
    EinreichungStatus,
    Eintrag,
    Gruppe,
    Gruppengroesse,
    Kategorie,
    GruppenMitglied,
    Rueckzugsbedarf,
    Teilnehmerkreis,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_gruppe(gruppe_id: int, erlaube_inaktiv: bool = False) -> Gruppe:
    gruppe = db.session.get(Gruppe, gruppe_id)
    if gruppe is None:
        raise ValidationError("Gruppe nicht gefunden oder nicht aktiv.")
    if not gruppe.aktiv and not erlaube_inaktiv:
        raise ValidationError("Gruppe nicht gefunden oder nicht aktiv.")
    return gruppe


def _assert_editierbar(user_id: int, gruppe_id: int) -> Einreichung | None:
    """Raise if entries can no longer be modified."""
    einreichung = Einreichung.query.filter_by(
        user_id=user_id, gruppe_id=gruppe_id
    ).first()
    if einreichung and einreichung.status in (
        EinreichungStatus.EINGEREICHT,
        EinreichungStatus.ABGESCHLOSSEN,
    ):
        raise ValidationError("Einträge können nicht bearbeitet werden – Status ist gesperrt.")
    return einreichung


def _check_overlap(user_id: int, gruppe_id: int, datum: date,
                   zeit_von: time, zeit_bis: time, exclude_id: int | None = None) -> None:
    """Ensure no existing entry overlaps the given time range."""
    query = Eintrag.query.filter_by(user_id=user_id, gruppe_id=gruppe_id, datum=datum)
    if exclude_id is not None:
        query = query.filter(Eintrag.id != exclude_id)
    for e in query.all():
        if e.zeit_von < zeit_bis and e.zeit_bis > zeit_von:
            raise ValidationError(
                f"Überschneidung mit Eintrag {e.kategorie.name} "
                f"({e.zeit_von.strftime('%H:%M')}–{e.zeit_bis.strftime('%H:%M')})."
            )


def _get_or_create_einreichung(user_id: int, gruppe_id: int) -> Einreichung:
    """Return the submission record, creating it (OFFEN) if it doesn't exist."""
    einreichung = Einreichung.query.filter_by(
        user_id=user_id, gruppe_id=gruppe_id
    ).first()
    if einreichung is None:
        einreichung = Einreichung(
            user_id=user_id, gruppe_id=gruppe_id, status=EinreichungStatus.OFFEN
        )
        db.session.add(einreichung)
        db.session.flush()
    return einreichung


def _snap(t: time) -> time:
    """Snap a time to the nearest 15-minute boundary (floor)."""
    total = time_to_minutes(t)
    snapped = (total // SLOT_MINUTES) * SLOT_MINUTES
    return time(snapped // 60, snapped % 60)


# ---------------------------------------------------------------------------
# Entries
# ---------------------------------------------------------------------------

def list_eintraege(user_id: int, gruppe_id: int,
                   datum_von: date, datum_bis: date) -> list[dict]:
    """Return all entries for a user/group within a date range."""
    eintraege = (
        Eintrag.query
        .filter_by(user_id=user_id, gruppe_id=gruppe_id)
        .filter(Eintrag.datum >= datum_von, Eintrag.datum <= datum_bis)
        .order_by(Eintrag.datum, Eintrag.zeit_von)
        .all()
    )
    result = []
    for e in eintraege:
        d = e.to_dict()
        d["kategorie"] = e.kategorie.to_dict() if e.kategorie else None
        result.append(d)
    return result


def _resolve_enum_feld(data: dict, feld: str, enum_cls, label: str):
    raw = data.get(feld)
    if not raw:
        raise ValidationError(f"{label} ist für diese Tätigkeit anzugeben.")
    try:
        return enum_cls(raw)
    except ValueError as exc:
        raise ValidationError(f"Ungültiger Wert für {label}: {raw}") from exc


def _resolve_offene_merkmale(kategorie: Kategorie, data: dict) -> dict:
    """Resolve the participant-supplied attribute values for a Kategorie.

    Fields the Kategorie already defines are authoritative and always come
    back ``None`` here (any value submitted for them is ignored, not just
    trusted from the client). Fields the Kategorie left open are required
    and validated against the corresponding enum.

    Rückzugsbedarf is only ever relevant when the (effective) Arbeitsort is
    "Üblicher Arbeitsplatz/Standort" – if the Kategorie leaves Arbeitsort open
    too, this is only known once the participant's own choice is resolved.
    """
    werte = {"arbeitsort": None, "rueckzugsbedarf": None, "gruppengroesse": None, "teilnehmerkreis": None}

    if kategorie.arbeitsform == Arbeitsform.EINZELARBEIT:
        if kategorie.arbeitsort is not None:
            arbeitsort = kategorie.arbeitsort
        else:
            arbeitsort = _resolve_enum_feld(data, "arbeitsort", Arbeitsort, "Arbeitsort")
            werte["arbeitsort"] = arbeitsort

        if kategorie.rueckzugsbedarf is not None:
            pass  # bereits fest vorgegeben, bleibt None (effective_* greift auf Kategorie zurück)
        elif arbeitsort == Arbeitsort.UEBLICHER_ARBEITSPLATZ:
            werte["rueckzugsbedarf"] = _resolve_enum_feld(
                data, "rueckzugsbedarf", Rueckzugsbedarf, "Rückzugsbedarf"
            )
        # Bei anderem Arbeitsort entfällt Rückzugsbedarf – nicht anfordern.

    elif kategorie.arbeitsform == Arbeitsform.MEETING:
        for feld, enum_cls, label in (
            ("gruppengroesse", Gruppengroesse, "Gruppengrösse"),
            ("teilnehmerkreis", Teilnehmerkreis, "Teilnehmendenkreis"),
            ("rueckzugsbedarf", Rueckzugsbedarf, "Rückzugsbedarf"),
        ):
            if getattr(kategorie, feld) is None:
                werte[feld] = _resolve_enum_feld(data, feld, enum_cls, label)

    return werte


def create_eintrag(user_id: int, gruppe_id: int, data: dict, als_admin: bool = False) -> Eintrag:
    """Create a new time-block entry after validation.

    With ``als_admin`` the submission lock and group-active check are bypassed,
    allowing an admin to correct entries regardless of status.
    """
    gruppe = _get_gruppe(gruppe_id, erlaube_inaktiv=als_admin)
    if not als_admin:
        _assert_editierbar(user_id, gruppe_id)

    datum = parse_date(data.get("datum"), "Datum")
    zeit_von = _snap(parse_time(data.get("zeit_von"), "Zeit von"))
    zeit_bis = _snap(parse_time(data.get("zeit_bis"), "Zeit bis"))
    kategorie_id = data.get("kategorie_id")

    if datum.weekday() not in ARBEITSTAGE:
        raise ValidationError("Einträge sind nur für Mo–Fr erlaubt.")
    if not (gruppe.zeitraum_von <= datum <= gruppe.zeitraum_bis):
        raise ValidationError("Datum liegt ausserhalb des Erhebungszeitraums.")
    if zeit_von >= zeit_bis:
        raise ValidationError("'Zeit von' muss vor 'Zeit bis' liegen.")
    if zeit_von < TAG_START or zeit_bis > TAG_END:
        raise ValidationError(
            f"Einträge sind nur zwischen {TAG_START.strftime('%H:%M')} und "
            f"{TAG_END.strftime('%H:%M')} erlaubt."
        )
    if not kategorie_id:
        raise ValidationError("Kategorie fehlt.")
    kategorie = db.session.get(Kategorie, int(kategorie_id))
    if kategorie is None or not kategorie.aktiv:
        raise ValidationError("Kategorie nicht gefunden oder nicht aktiv.")

    merkmale = _resolve_offene_merkmale(kategorie, data)

    _check_overlap(user_id, gruppe_id, datum, zeit_von, zeit_bis)

    eintrag = Eintrag(
        user_id=user_id,
        gruppe_id=gruppe_id,
        kategorie_id=int(kategorie_id),
        datum=datum,
        zeit_von=zeit_von,
        zeit_bis=zeit_bis,
        **merkmale,
    )
    db.session.add(eintrag)
    _get_or_create_einreichung(user_id, gruppe_id)
    db.session.commit()
    eintrag.kategorie  # eager-load for to_dict
    return eintrag


def update_eintrag(user_id: int, eintrag_id: int, data: dict, als_admin: bool = False) -> Eintrag:
    """Update an existing entry."""
    eintrag = db.session.get(Eintrag, eintrag_id)
    if eintrag is None or eintrag.user_id != user_id:
        raise ValidationError("Eintrag nicht gefunden.")
    gruppe = _get_gruppe(eintrag.gruppe_id, erlaube_inaktiv=als_admin)
    if not als_admin:
        _assert_editierbar(user_id, eintrag.gruppe_id)

    datum = parse_date(data.get("datum") or eintrag.datum.isoformat(), "Datum")
    zeit_von = _snap(parse_time(data.get("zeit_von") or eintrag.zeit_von.strftime("%H:%M"), "Zeit von"))
    zeit_bis = _snap(parse_time(data.get("zeit_bis") or eintrag.zeit_bis.strftime("%H:%M"), "Zeit bis"))

    if datum.weekday() not in ARBEITSTAGE:
        raise ValidationError("Einträge sind nur für Mo–Fr erlaubt.")
    if not (gruppe.zeitraum_von <= datum <= gruppe.zeitraum_bis):
        raise ValidationError("Datum liegt ausserhalb des Erhebungszeitraums.")
    if zeit_von >= zeit_bis:
        raise ValidationError("'Zeit von' muss vor 'Zeit bis' liegen.")

    if "kategorie_id" in data:
        kategorie = db.session.get(Kategorie, int(data["kategorie_id"]))
        if kategorie is None or not kategorie.aktiv:
            raise ValidationError("Kategorie nicht gefunden oder nicht aktiv.")
        eintrag.kategorie_id = int(data["kategorie_id"])
    else:
        kategorie = eintrag.kategorie

    merkmale = _resolve_offene_merkmale(kategorie, data)
    eintrag.arbeitsort = merkmale["arbeitsort"]
    eintrag.rueckzugsbedarf = merkmale["rueckzugsbedarf"]
    eintrag.gruppengroesse = merkmale["gruppengroesse"]
    eintrag.teilnehmerkreis = merkmale["teilnehmerkreis"]

    _check_overlap(user_id, eintrag.gruppe_id, datum, zeit_von, zeit_bis, exclude_id=eintrag_id)

    eintrag.datum = datum
    eintrag.zeit_von = zeit_von
    eintrag.zeit_bis = zeit_bis
    db.session.commit()
    return eintrag


def delete_eintrag(user_id: int, eintrag_id: int, als_admin: bool = False) -> None:
    """Delete an entry."""
    eintrag = db.session.get(Eintrag, eintrag_id)
    if eintrag is None or eintrag.user_id != user_id:
        raise ValidationError("Eintrag nicht gefunden.")
    if not als_admin:
        _assert_editierbar(user_id, eintrag.gruppe_id)
    db.session.delete(eintrag)
    db.session.commit()


# ---------------------------------------------------------------------------
# Gap check
# ---------------------------------------------------------------------------

def _erfasste_minuten_halbtag(eintraege: list[Eintrag], tag: date, bis_mittag: bool) -> float:
    """Count recorded minutes in the morning or afternoon of a given day."""
    total = 0
    grenze_von = time_to_minutes(TAG_START if bis_mittag else MITTAG)
    grenze_bis = time_to_minutes(MITTAG if bis_mittag else TAG_END)
    for e in eintraege:
        if e.datum != tag:
            continue
        von = max(time_to_minutes(e.zeit_von), grenze_von)
        bis = min(time_to_minutes(e.zeit_bis), grenze_bis)
        if bis > von:
            total += bis - von
    return total / 60.0


def pruefe_luecken(user_id: int, gruppe_id: int) -> list[dict]:
    """Check all working days in the survey period for gaps.

    A gap is: a whole day with no entry, or a half-day (AM/PM) with < 2 hours.
    Returns a list of {tag, datum, luecke} dicts.
    """
    gruppe = db.session.get(Gruppe, gruppe_id)
    if gruppe is None:
        return []

    eintraege = Eintrag.query.filter_by(user_id=user_id, gruppe_id=gruppe_id).all()

    luecken = []
    aktuell = gruppe.zeitraum_von
    while aktuell <= gruppe.zeitraum_bis:
        if aktuell.weekday() in ARBEITSTAGE:
            tages_eintraege = [e for e in eintraege if e.datum == aktuell]
            if not tages_eintraege:
                luecken.append({
                    "tag": WOCHENTAG_NAMEN.get(aktuell.weekday(), ""),
                    "datum": aktuell.isoformat(),
                    "luecke": "Ganztag nicht erfasst",
                })
            else:
                vm = _erfasste_minuten_halbtag(tages_eintraege, aktuell, True)
                nm = _erfasste_minuten_halbtag(tages_eintraege, aktuell, False)
                if vm < MIN_HALBTAG_STUNDEN:
                    luecken.append({
                        "tag": WOCHENTAG_NAMEN.get(aktuell.weekday(), ""),
                        "datum": aktuell.isoformat(),
                        "luecke": "Vormittag < 2h",
                    })
                if nm < MIN_HALBTAG_STUNDEN:
                    luecken.append({
                        "tag": WOCHENTAG_NAMEN.get(aktuell.weekday(), ""),
                        "datum": aktuell.isoformat(),
                        "luecke": "Nachmittag < 2h",
                    })
        aktuell += timedelta(days=1)
    return luecken


# ---------------------------------------------------------------------------
# Submission
# ---------------------------------------------------------------------------

_TN_STATUS_UEBERGAENGE: dict[EinreichungStatus, EinreichungStatus] = {
    EinreichungStatus.OFFEN: EinreichungStatus.EINGEREICHT,
    EinreichungStatus.IN_BEARBEITUNG: EinreichungStatus.EINGEREICHT,
    EinreichungStatus.EINGEREICHT: EinreichungStatus.IN_BEARBEITUNG,
}


def einreichen(user_id: int, gruppe_id: int) -> Einreichung:
    """Submit entries (OFFEN/IN_BEARBEITUNG → EINGEREICHT).

    Participants always land in EINGEREICHT and can self-unlock again as long
    as the Erhebung is open. ABGESCHLOSSEN is only ever set by an admin, so a
    participant can never lock themselves out.
    """
    einreichung = _get_or_create_einreichung(user_id, gruppe_id)

    ziel = _TN_STATUS_UEBERGAENGE.get(einreichung.status)
    if ziel != EinreichungStatus.EINGEREICHT:
        raise ValidationError(
            f"Einreichen ist im Status {einreichung.status.value} nicht möglich."
        )

    einreichung.status = ziel
    einreichung.eingereicht_am = datetime.now()
    db.session.commit()
    return einreichung


def entsperren(user_id: int, gruppe_id: int) -> Einreichung:
    """Unlock entries for editing (EINGEREICHT → IN_BEARBEITUNG).

    ABGESCHLOSSEN can only be unlocked by an admin.
    """
    einreichung = Einreichung.query.filter_by(
        user_id=user_id, gruppe_id=gruppe_id
    ).first()
    if einreichung is None:
        raise ValidationError("Keine Einreichung vorhanden.")
    if einreichung.status != EinreichungStatus.EINGEREICHT:
        raise ValidationError(
            "Selbst entsperren ist nur im Status EINGEREICHT möglich."
        )
    einreichung.status = EinreichungStatus.IN_BEARBEITUNG
    db.session.commit()
    return einreichung


def get_einreichung(user_id: int, gruppe_id: int) -> dict:
    """Return current submission state (creates OFFEN record if absent)."""
    einreichung = _get_or_create_einreichung(user_id, gruppe_id)
    db.session.commit()
    return einreichung.to_dict()


# ---------------------------------------------------------------------------
# Teilnehmer Dashboard
# ---------------------------------------------------------------------------

def get_dashboard(user_id: int, gruppe_id: int) -> dict:
    """Return dashboard data for the logged-in participant."""
    gruppe = db.session.get(Gruppe, gruppe_id)
    if gruppe is None:
        raise ValidationError("Gruppe nicht gefunden.")

    einreichung = Einreichung.query.filter_by(
        user_id=user_id, gruppe_id=gruppe_id
    ).first()
    status = einreichung.status.value if einreichung else EinreichungStatus.OFFEN.value

    eintraege = Eintrag.query.filter_by(user_id=user_id, gruppe_id=gruppe_id).all()

    total_minuten = sum(
        time_to_minutes(e.zeit_bis) - time_to_minutes(e.zeit_von)
        for e in eintraege
    )

    # Category time shares.
    kategorie_minuten: dict[int, dict] = {}
    for e in eintraege:
        if e.kategorie_id not in kategorie_minuten:
            kategorie_minuten[e.kategorie_id] = {
                "kategorie": e.kategorie.to_dict() if e.kategorie else {},
                "minuten": 0,
            }
        kategorie_minuten[e.kategorie_id]["minuten"] += (
            time_to_minutes(e.zeit_bis) - time_to_minutes(e.zeit_von)
        )

    # Count work days in the survey period.
    arbeitstage = 0
    tage_mit_eintraegen = len({e.datum for e in eintraege})
    aktuell = gruppe.zeitraum_von
    while aktuell <= gruppe.zeitraum_bis:
        if aktuell.weekday() in ARBEITSTAGE:
            arbeitstage += 1
        aktuell += timedelta(days=1)

    # Expected hours are the same for everyone (working days × 8.4h); part-time
    # staff record their non-working time as "Teilzeit". Completeness caps the
    # recorded time at the expected value.
    erwartete_minuten = arbeitstage * SOLL_STUNDEN_PRO_TAG * 60
    vollstaendigkeit = (
        round(min(total_minuten, erwartete_minuten) / erwartete_minuten * 100, 1)
        if erwartete_minuten
        else 0.0
    )

    return {
        "gruppe": gruppe.to_dict(),
        "status": status,
        "gesamt_stunden": round(total_minuten / 60, 1),
        "kategorien": list(kategorie_minuten.values()),
        "tage_mit_eintraegen": tage_mit_eintraegen,
        "arbeitstage_gesamt": arbeitstage,
        "erwartete_stunden": round(erwartete_minuten / 60, 1),
        "vollstaendigkeit_prozent": vollstaendigkeit,
    }
