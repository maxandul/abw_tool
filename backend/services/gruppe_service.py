"""Business logic for groups, group participants and the admin dashboard."""

from app.utils import ValidationError, parse_date
from constants import DEFAULT_SHARING_RATIO
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
from models.gruppe import generate_token
from services import auth_service


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

    if not partial or "sharing_ratio" in data:
        ratio = data.get("sharing_ratio", DEFAULT_SHARING_RATIO)
        try:
            ratio = float(ratio)
        except (TypeError, ValueError) as exc:
            raise ValidationError("Sharing-Ratio muss eine Zahl sein.") from exc
        if ratio <= 0:
            raise ValidationError("Sharing-Ratio muss grösser als 0 sein.")
        cleaned["sharing_ratio"] = ratio

    return cleaned


def gruppe_stats(gruppe: Gruppe) -> dict:
    """Compute participant and submission statistics for a group."""
    member_user_ids = [m.user_id for m in gruppe.mitglieder]
    anzahl_teilnehmer = len(member_user_ids)

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
        "status_counts": status_counts,
        "teilnehmer_ohne_eintraege": ohne_eintraege,
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
    """Generate a new registration token, invalidating the old link."""
    gruppe = get_gruppe(gruppe_id)
    gruppe.registrierung_link_token = generate_token()
    db.session.commit()
    return gruppe


def deactivate_gruppe(gruppe_id: int) -> Gruppe:
    """Soft-delete a group (data is retained and remains analysable)."""
    gruppe = get_gruppe(gruppe_id)
    gruppe.aktiv = False
    db.session.commit()
    return gruppe


def dashboard() -> dict:
    """Aggregate dashboard data across all active groups."""
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
    result = []
    for m in gruppe.mitglieder:
        user = m.user
        einreichung = Einreichung.query.filter_by(
            user_id=user.id, gruppe_id=gruppe.id
        ).first()
        eintraege = Eintrag.query.filter_by(
            user_id=user.id, gruppe_id=gruppe.id
        ).all()
        letzter = max((e.datum for e in eintraege), default=None)
        gruppen_namen = [gm.gruppe.name for gm in user.mitgliedschaften]
        result.append(
            {
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
            }
        )
    return result


def add_teilnehmer(gruppe_id: int, email: str) -> dict:
    """Add a participant by email, linking or creating the account.

    Returns a dict that includes a temporary PIN only when a new account is
    created (the admin communicates it to the participant).
    """
    gruppe = get_gruppe(gruppe_id)
    email = (email or "").strip().lower()
    if not email or "@" not in email:
        raise ValidationError("Bitte eine gültige E-Mail-Adresse angeben.")

    user = User.query.filter_by(email=email).first()
    temp_pin = None
    if user is None:
        temp_pin = auth_service.generate_temp_pin()
        user = User(
            email=email,
            pin_hash=auth_service.hash_pin(temp_pin),
            rolle=Rolle.TEILNEHMER,
            aktiv=True,
            pin_temporaer=True,
        )
        db.session.add(user)
        db.session.flush()

    existing = GruppenMitglied.query.filter_by(
        user_id=user.id, gruppe_id=gruppe.id
    ).first()
    if existing:
        raise ValidationError("Diese Person ist bereits in der Gruppe.")

    db.session.add(GruppenMitglied(user_id=user.id, gruppe_id=gruppe.id))
    db.session.commit()
    return {"user": user.to_dict(), "temporaerer_pin": temp_pin}


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
    """Reset a participant's PIN to a random temporary PIN and return it."""
    user = db.session.get(User, user_id)
    if user is None:
        raise ValidationError("Teilnehmer nicht gefunden.")
    temp_pin = auth_service.generate_temp_pin()
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
