"""Business logic for groups, group participants and the admin dashboard."""

from app.utils import ValidationError, parse_date
from extensions import db
from models import (
    Einreichung,
    EinreichungStatus,
    Eintrag,
    Gruppe,
    GruppenMitglied,
    Rolle,
    User,
)
from models.gruppe import generate_token  # noqa: F401 – kept for DB default on Gruppe
from services import auth_service


def _parse_beschaeftigungsgrad(value) -> float:
    """Normalise employment percentage (0–100). Empty values default to 100."""
    if value is None or value == "":
        return 100.0
    raw = str(value).strip().replace("%", "").replace(",", ".")
    try:
        grad = float(raw)
    except ValueError as exc:
        raise ValidationError(
            f"Beschäftigungsgrad «{value}» ist keine gültige Zahl."
        ) from exc
    if grad <= 0 or grad > 100:
        raise ValidationError("Beschäftigungsgrad muss zwischen 0 und 100 liegen.")
    return grad


def _parse_teilnehmer_attrs(data: dict) -> dict:
    """Validate and normalise erhebungs-specific participant attributes."""
    return {
        "vorname": (data.get("vorname") or "").strip() or None,
        "nachname": (data.get("nachname") or "").strip() or None,
        "funktion": (data.get("funktion") or "").strip() or None,
        "organisationseinheit": (
            (data.get("organisationseinheit") or "").strip() or None
        ),
        "beschaeftigungsgrad": _parse_beschaeftigungsgrad(
            data.get("beschaeftigungsgrad")
        ),
    }


def _apply_profil(mitglied: GruppenMitglied, attrs: dict) -> None:
    """Write parsed profile attributes onto a membership row."""
    for key, value in attrs.items():
        setattr(mitglied, key, value)


def _teilnehmer_entry(
    mitglied: GruppenMitglied, user: User, gruppe: Gruppe
) -> dict:
    """Build the API dict for one participant in a group."""
    einreichung = Einreichung.query.filter_by(
        user_id=user.id, gruppe_id=gruppe.id
    ).first()
    eintraege = Eintrag.query.filter_by(user_id=user.id, gruppe_id=gruppe.id).all()
    letzter = max((e.datum for e in eintraege), default=None)
    gruppen_namen = [gm.gruppe.name for gm in user.mitgliedschaften]
    return {
        "user_id": user.id,
        "email": user.email,
        "aktiv": user.aktiv,
        "pin_temporaer": user.pin_temporaer,
        "gruppen": gruppen_namen,
        "status": (
            einreichung.status.value
            if einreichung
            else EinreichungStatus.OFFEN.value
        ),
        "anzahl_eintraege": len(eintraege),
        "letzter_eintrag": letzter.isoformat() if letzter else None,
        **mitglied.profil_dict(),
    }


def _validate_gruppe_input(data: dict, partial: bool = False) -> dict:
    """Validate and normalise group input. Returns cleaned values."""
    cleaned = {}

    name = (data.get("name") or "").strip()
    if not partial or "name" in data:
        if not name:
            raise ValidationError("Der Gruppenname ist erforderlich.")
        cleaned["name"] = name

    if not partial or "zeitraum_von" in data or "zeitraum_bis" in data:
        von = parse_date(data.get("zeitraum_von"), "Zeitraum von")
        bis = parse_date(data.get("zeitraum_bis"), "Zeitraum bis")
        if bis < von:
            raise ValidationError("'Zeitraum bis' muss nach 'Zeitraum von' liegen.")
        cleaned["zeitraum_von"] = von
        cleaned["zeitraum_bis"] = bis

    return cleaned


def _minuten_erfasst(gruppe_id: int) -> int:
    """Sum all recorded minutes (zeit_bis - zeit_von) for a group."""
    from datetime import datetime, date as date_type
    eintraege = Eintrag.query.filter_by(gruppe_id=gruppe_id).all()
    total = 0
    for e in eintraege:
        if e.zeit_von and e.zeit_bis:
            delta = (
                datetime.combine(date_type.min, e.zeit_bis)
                - datetime.combine(date_type.min, e.zeit_von)
            )
            total += max(0, int(delta.total_seconds() // 60))
    return total


def gruppe_stats(gruppe: Gruppe) -> dict:
    """Compute participant and submission statistics for a group."""
    member_user_ids = [m.user_id for m in gruppe.mitglieder]
    anzahl_teilnehmer = len(member_user_ids)

    # Sum of employment levels expressed in full-time equivalents (e.g. 80% = 0.8).
    # Used for expected-hours/completeness metrics so part-time staff are not
    # counted as full-time. Defaults to 100% when unset.
    fte_summe = sum((m.beschaeftigungsgrad or 100.0) for m in gruppe.mitglieder) / 100.0

    status_counts = {s.value: 0 for s in EinreichungStatus}
    einreichungen = {
        e.user_id: e.status
        for e in Einreichung.query.filter_by(gruppe_id=gruppe.id).all()
    }
    for uid in member_user_ids:
        status = einreichungen.get(uid, EinreichungStatus.OFFEN)
        status_counts[status.value] += 1

    if member_user_ids:
        user_ids_mit_eintraegen = {
            row[0]
            for row in db.session.query(Eintrag.user_id)
            .filter(Eintrag.gruppe_id == gruppe.id)
            .distinct()
            .all()
        }
        ohne_eintraege = sum(
            1 for uid in member_user_ids if uid not in user_ids_mit_eintraegen
        )
    else:
        ohne_eintraege = 0

    return {
        "anzahl_teilnehmer": anzahl_teilnehmer,
        "fte_summe": round(fte_summe, 2),
        "status_counts": status_counts,
        "teilnehmer_ohne_eintraege": ohne_eintraege,
        "total_minuten_erfasst": _minuten_erfasst(gruppe.id),
    }


def list_gruppen(include_inaktiv: bool = False) -> list[dict]:
    """Return all groups with statistics."""
    query = Gruppe.query
    if not include_inaktiv:
        query = query.filter_by(aktiv=True)
    gruppen = query.order_by(Gruppe.created_at.desc()).all()
    return [{**g.to_dict(), "stats": gruppe_stats(g)} for g in gruppen]


def get_gruppe(gruppe_id: int) -> Gruppe:
    """Fetch a group or raise ValidationError if not found."""
    gruppe = db.session.get(Gruppe, gruppe_id)
    if gruppe is None:
        raise ValidationError("Gruppe nicht gefunden.")
    return gruppe


def create_gruppe(data: dict) -> Gruppe:
    """Create a new group with a generated registration token."""
    cleaned = _validate_gruppe_input(data)
    gruppe = Gruppe(**cleaned)
    db.session.add(gruppe)
    db.session.commit()
    return gruppe


def update_gruppe(gruppe_id: int, data: dict) -> Gruppe:
    """Update an existing group."""
    gruppe = get_gruppe(gruppe_id)
    cleaned = _validate_gruppe_input(data, partial=True)
    for key, value in cleaned.items():
        setattr(gruppe, key, value)
    db.session.commit()
    return gruppe


def regenerate_token(gruppe_id: int) -> Gruppe:
    """Deprecated: registration links are no longer used."""
    raise ValidationError("Registrierungslinks werden nicht mehr unterstützt.")


def abschliessen_gruppe(gruppe_id: int) -> Gruppe:
    """Mark a group as closed: participants can no longer enter data."""
    gruppe = get_gruppe(gruppe_id)
    if not gruppe.aktiv:
        raise ValidationError("Archivierte Erhebungen können nicht abgeschlossen werden.")
    gruppe.abgeschlossen = True
    db.session.commit()
    return gruppe


def wiederoeffnen_gruppe(gruppe_id: int) -> Gruppe:
    """Re-open a closed group so participants can enter data again."""
    gruppe = get_gruppe(gruppe_id)
    if not gruppe.aktiv:
        raise ValidationError("Archivierte Erhebungen können nicht wieder geöffnet werden.")
    gruppe.abgeschlossen = False
    db.session.commit()
    return gruppe


def deactivate_gruppe(gruppe_id: int) -> Gruppe:
    """Archive a group (only allowed when abgeschlossen=True). Data is retained."""
    gruppe = get_gruppe(gruppe_id)
    if not gruppe.abgeschlossen:
        raise ValidationError(
            "Eine Erhebung kann nur archiviert werden, wenn sie zuerst abgeschlossen wurde."
        )
    gruppe.aktiv = False
    db.session.commit()
    return gruppe


def dashboard() -> dict:
    """Aggregate dashboard data across all non-archived groups (offen + abgeschlossen)."""
    gruppen = Gruppe.query.filter_by(aktiv=True).order_by(Gruppe.name).all()
    gruppen_data = [{**g.to_dict(), "stats": gruppe_stats(g)} for g in gruppen]

    teilnehmer_ids = {
        m.user_id
        for g in gruppen
        for m in g.mitglieder
    }
    user_ids_mit_eintraegen = {
        row[0] for row in db.session.query(Eintrag.user_id).distinct().all()
    }
    ohne_eintraege = sum(
        1 for uid in teilnehmer_ids if uid not in user_ids_mit_eintraegen
    )

    return {
        "gruppen": gruppen_data,
        "anzahl_aktive_gruppen": len(gruppen),
        "anzahl_teilnehmer_total": len(teilnehmer_ids),
        "teilnehmer_ohne_eintraege": ohne_eintraege,
    }


# --- Participant management -------------------------------------------------

def list_teilnehmer(gruppe_id: int) -> list[dict]:
    """List all participants of a group with status and entry statistics."""
    gruppe = get_gruppe(gruppe_id)
    return [
        _teilnehmer_entry(m, m.user, gruppe)
        for m in sorted(
            gruppe.mitglieder,
            key=lambda m: (
                (m.nachname or "").lower(),
                (m.vorname or "").lower(),
                m.user.email,
            ),
        )
    ]


def upsert_teilnehmer(gruppe_id: int, data: dict) -> dict:
    """Create or update a participant in a group (profile per Erhebung).

    Returns user info, optional temporary PIN (new accounts only), and flags
    indicating whether the row was created or updated.
    """
    gruppe = get_gruppe(gruppe_id)
    email = (data.get("email") or "").strip().lower()
    if not email or "@" not in email:
        raise ValidationError("Bitte eine gültige E-Mail-Adresse angeben.")

    attrs = _parse_teilnehmer_attrs(data)
    user = User.query.filter_by(email=email).first()
    temp_pin = None

    if user is None:
        temp_pin = auth_service.teilnehmer_temp_pin()
        user = User(
            email=email,
            pin_hash=auth_service.hash_pin(temp_pin),
            rolle=Rolle.TEILNEHMER,
            aktiv=True,
            pin_temporaer=True,
        )
        db.session.add(user)
        db.session.flush()

    mitglied = GruppenMitglied.query.filter_by(
        user_id=user.id, gruppe_id=gruppe.id
    ).first()
    is_new = mitglied is None

    if mitglied is None:
        mitglied = GruppenMitglied(user_id=user.id, gruppe_id=gruppe.id)
        db.session.add(mitglied)

    _apply_profil(mitglied, attrs)
    db.session.commit()

    return {
        "user": user.to_dict(),
        "temporaerer_pin": temp_pin,
        "created": is_new,
        "updated": not is_new,
        "profil": mitglied.profil_dict(),
    }


def add_teilnehmer(gruppe_id: int, data: dict) -> dict:
    """Add or update a single participant (manual admin entry)."""
    return upsert_teilnehmer(gruppe_id, data)


def update_teilnehmer(gruppe_id: int, user_id: int, data: dict) -> dict:
    """Update profile attributes of an existing group member."""
    gruppe = get_gruppe(gruppe_id)
    mitglied = GruppenMitglied.query.filter_by(
        user_id=user_id, gruppe_id=gruppe.id
    ).first()
    if mitglied is None:
        raise ValidationError("Teilnehmer nicht in dieser Erhebung gefunden.")

    attrs = _parse_teilnehmer_attrs(data)
    _apply_profil(mitglied, attrs)
    db.session.commit()
    return _teilnehmer_entry(mitglied, mitglied.user, gruppe)


def import_teilnehmer(gruppe_id: int, rows: list) -> dict:
    """Bulk-import participants from a list of row dicts.

    Each row is processed independently; valid rows are committed even when
    others fail. Existing members are updated (attributes overwritten).
    """
    if not rows:
        raise ValidationError("Keine Daten zum Importieren vorhanden.")

    erstellt = 0
    aktualisiert = 0
    neue_accounts = 0
    fehler: list[dict] = []

    for idx, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            fehler.append({"zeile": idx, "email": None, "fehler": "Ungültige Zeile."})
            continue
        try:
            had_user = bool(
                User.query.filter_by(
                    email=(row.get("email") or "").strip().lower()
                ).first()
            )
            result = upsert_teilnehmer(gruppe_id, row)
            if result["updated"]:
                aktualisiert += 1
            else:
                erstellt += 1
            if not had_user:
                neue_accounts += 1
        except ValidationError as exc:
            db.session.rollback()
            fehler.append(
                {
                    "zeile": idx,
                    "email": (row.get("email") or "").strip() or None,
                    "fehler": str(exc),
                }
            )

    return {
        "erstellt": erstellt,
        "aktualisiert": aktualisiert,
        "neue_accounts": neue_accounts,
        "fehler": fehler,
    }


def remove_teilnehmer(gruppe_id: int, user_id: int) -> None:
    """Remove a participant from a group; entries are retained."""
    mitglied = GruppenMitglied.query.filter_by(
        user_id=user_id, gruppe_id=gruppe_id
    ).first()
    if mitglied is None:
        raise ValidationError("Mitgliedschaft nicht gefunden.")
    db.session.delete(mitglied)
    db.session.commit()


def reset_pin(user_id: int) -> str:
    """Reset a participant's PIN to the fixed temporary PIN."""
    user = db.session.get(User, user_id)
    if user is None:
        raise ValidationError("Teilnehmer nicht gefunden.")
    temp_pin = auth_service.teilnehmer_temp_pin()
    user.pin_hash = auth_service.hash_pin(temp_pin)
    user.pin_temporaer = True
    db.session.commit()
    return temp_pin


# Allowed admin-triggered submission status transitions.
_ADMIN_STATUS_UEBERGAENGE = {
    EinreichungStatus.EINGEREICHT: {EinreichungStatus.IN_BEARBEITUNG},
    EinreichungStatus.IN_BEARBEITUNG: {EinreichungStatus.ABGESCHLOSSEN},
}


def set_einreichung_status(user_id: int, gruppe_id: int, neuer_status: str) -> dict:
    """Change a participant's submission status (admin-side transitions)."""
    try:
        ziel = EinreichungStatus(neuer_status)
    except ValueError as exc:
        raise ValidationError("Ungültiger Status.") from exc

    einreichung = Einreichung.query.filter_by(
        user_id=user_id, gruppe_id=gruppe_id
    ).first()
    if einreichung is None:
        raise ValidationError("Keine Einreichung vorhanden.")

    erlaubt = _ADMIN_STATUS_UEBERGAENGE.get(einreichung.status, set())
    if ziel not in erlaubt:
        raise ValidationError(
            f"Übergang von {einreichung.status.value} zu {ziel.value} ist nicht erlaubt."
        )

    einreichung.status = ziel
    db.session.commit()
    return einreichung.to_dict()
