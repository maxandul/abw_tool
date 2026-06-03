"""Business logic for activity categories."""

from app.utils import ValidationError
from extensions import db
from models import Eintrag, Kategorie, Raumtyp


def _eintrag_count(kategorie_id: int) -> int:
    """Count entries referencing a category."""
    return Eintrag.query.filter_by(kategorie_id=kategorie_id).count()


def _validate(data: dict, partial: bool = False) -> dict:
    """Validate and normalise category input."""
    cleaned = {}

    if not partial or "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            raise ValidationError("Der Kategoriename ist erforderlich.")
        cleaned["name"] = name

    if "beschreibung" in data or not partial:
        cleaned["beschreibung"] = (data.get("beschreibung") or "").strip() or None

    if "farbe" in data or not partial:
        farbe = (data.get("farbe") or "").strip() or None
        if farbe and (not farbe.startswith("#") or len(farbe) not in (4, 7)):
            raise ValidationError("Farbe muss ein Hex-Wert sein (z.B. #4472C4).")
        cleaned["farbe"] = farbe

    if "raumtyp_id" in data or not partial:
        raumtyp_id = data.get("raumtyp_id")
        if raumtyp_id in ("", None):
            cleaned["raumtyp_id"] = None
        else:
            try:
                raumtyp_id = int(raumtyp_id)
            except (TypeError, ValueError) as exc:
                raise ValidationError("Ungültiger Raumtyp.") from exc
            if db.session.get(Raumtyp, raumtyp_id) is None:
                raise ValidationError("Raumtyp nicht gefunden.")
            cleaned["raumtyp_id"] = raumtyp_id

    if "sort_order" in data or not partial:
        try:
            cleaned["sort_order"] = int(data.get("sort_order") or 0)
        except (TypeError, ValueError) as exc:
            raise ValidationError("Sortierung muss eine Zahl sein.") from exc

    return cleaned


def list_kategorien(nur_aktiv: bool = False) -> list[dict]:
    """List categories, optionally only active ones, with entry counts."""
    query = Kategorie.query
    if nur_aktiv:
        query = query.filter_by(aktiv=True)
    kategorien = query.order_by(Kategorie.sort_order, Kategorie.id).all()
    return [
        {**k.to_dict(), "anzahl_eintraege": _eintrag_count(k.id)} for k in kategorien
    ]


def create_kategorie(data: dict) -> Kategorie:
    """Create a new category."""
    cleaned = _validate(data)
    kategorie = Kategorie(**cleaned)
    db.session.add(kategorie)
    db.session.commit()
    return kategorie


def update_kategorie(kategorie_id: int, data: dict, modus: str = "ueberschreiben") -> Kategorie:
    """Update a category.

    modus="ueberschreiben": update in place (existing entries keep the
    reference but show the new name/colour).
    modus="neu": create a new category with the provided data; the existing
    category and its entries remain unchanged.
    """
    kategorie = db.session.get(Kategorie, kategorie_id)
    if kategorie is None:
        raise ValidationError("Kategorie nicht gefunden.")

    cleaned = _validate(data, partial=True)

    if modus == "neu":
        merged = {
            "name": cleaned.get("name", kategorie.name),
            "beschreibung": cleaned.get("beschreibung", kategorie.beschreibung),
            "farbe": cleaned.get("farbe", kategorie.farbe),
            "raumtyp_id": cleaned.get("raumtyp_id", kategorie.raumtyp_id),
            "sort_order": cleaned.get("sort_order", kategorie.sort_order),
        }
        neue = Kategorie(**merged)
        db.session.add(neue)
        db.session.commit()
        return neue

    for key, value in cleaned.items():
        setattr(kategorie, key, value)
    db.session.commit()
    return kategorie


def set_aktiv(kategorie_id: int, aktiv: bool) -> Kategorie:
    """Deactivate (soft-delete) or reactivate a category."""
    kategorie = db.session.get(Kategorie, kategorie_id)
    if kategorie is None:
        raise ValidationError("Kategorie nicht gefunden.")
    kategorie.aktiv = aktiv
    db.session.commit()
    return kategorie
