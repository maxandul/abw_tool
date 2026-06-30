"""Business logic for room types."""

from app.utils import ValidationError
from extensions import db
from models import Kategorie, Raumtyp


def _validate(data: dict, partial: bool = False) -> dict:
    """Validate and normalise room type input."""
    cleaned = {}
    if not partial or "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            raise ValidationError("Der Raumtyp-Name ist erforderlich.")
        cleaned["name"] = name
    if "beschreibung" in data or not partial:
        cleaned["beschreibung"] = (data.get("beschreibung") or "").strip() or None
    if "sort_order" in data or not partial:
        try:
            cleaned["sort_order"] = int(data.get("sort_order") or 0)
        except (TypeError, ValueError) as exc:
            raise ValidationError("Sortierung muss eine Zahl sein.") from exc
    return cleaned


def _kategorie_count(_raumtyp_id: int, _nur_aktiv: bool = False) -> int:
    """Legacy hook – room types are no longer linked to Tätigkeiten."""
    return 0


def list_raumtypen(nur_aktiv: bool = False) -> list[dict]:
    """List room types with the number of linked categories."""
    query = Raumtyp.query
    if nur_aktiv:
        query = query.filter_by(aktiv=True)
    raumtypen = query.order_by(Raumtyp.sort_order, Raumtyp.id).all()
    return [
        {**r.to_dict(), "anzahl_kategorien": _kategorie_count(r.id)}
        for r in raumtypen
    ]


def create_raumtyp(data: dict) -> Raumtyp:
    """Create a new room type."""
    cleaned = _validate(data)
    raumtyp = Raumtyp(**cleaned)
    db.session.add(raumtyp)
    db.session.commit()
    return raumtyp


def update_raumtyp(raumtyp_id: int, data: dict) -> Raumtyp:
    """Update an existing room type."""
    raumtyp = db.session.get(Raumtyp, raumtyp_id)
    if raumtyp is None:
        raise ValidationError("Raumtyp nicht gefunden.")
    cleaned = _validate(data, partial=True)
    for key, value in cleaned.items():
        setattr(raumtyp, key, value)
    db.session.commit()
    return raumtyp


def set_aktiv(raumtyp_id: int, aktiv: bool) -> Raumtyp:
    """Deactivate or reactivate a room type.

    Deactivation is only allowed when no active categories reference it.
    """
    raumtyp = db.session.get(Raumtyp, raumtyp_id)
    if raumtyp is None:
        raise ValidationError("Raumtyp nicht gefunden.")

    raumtyp.aktiv = aktiv
    db.session.commit()
    return raumtyp
