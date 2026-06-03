"""Business logic for activity categories."""

from app.utils import ValidationError
from extensions import db
from models import Eintrag, Gruppengroesse, Kategorie, Raumtyp, Vertraulichkeit


def _eintrag_count(kategorie_id: int) -> int:
    """Count entries referencing a category."""
    return Eintrag.query.filter_by(kategorie_id=kategorie_id).count()


def _resolve_raumtypen(ids) -> list:
    """Resolve a list of raumtyp IDs to Raumtyp objects."""
    if not ids:
        return []
    result = []
    for rid in ids:
        try:
            rid = int(rid)
        except (TypeError, ValueError) as exc:
            raise ValidationError("Ungültige Raumtyp-ID.") from exc
        r = db.session.get(Raumtyp, rid)
        if r is None:
            raise ValidationError(f"Raumtyp {rid} nicht gefunden.")
        result.append(r)
    return result


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

    if "sort_order" in data or not partial:
        try:
            cleaned["sort_order"] = int(data.get("sort_order") or 0)
        except (TypeError, ValueError) as exc:
            raise ValidationError("Sortierung muss eine Zahl sein.") from exc

    if "vertraulichkeit" in data or not partial:
        v = data.get("vertraulichkeit")
        if v in (None, ""):
            cleaned["vertraulichkeit"] = None
        else:
            try:
                cleaned["vertraulichkeit"] = Vertraulichkeit(v)
            except ValueError as exc:
                raise ValidationError(f"Ungültige Vertraulichkeit: {v}") from exc

    if "gruppengroesse" in data or not partial:
        g = data.get("gruppengroesse")
        if g in (None, ""):
            cleaned["gruppengroesse"] = None
        else:
            try:
                cleaned["gruppengroesse"] = Gruppengroesse(g)
            except ValueError as exc:
                raise ValidationError(f"Ungültige Gruppengrösse: {g}") from exc

    # raumtyp_ids is a list; also accept legacy single raumtyp_id
    if "raumtyp_ids" in data or "raumtyp_id" in data or not partial:
        ids_raw = data.get("raumtyp_ids") or (
            [data["raumtyp_id"]] if data.get("raumtyp_id") else []
        )
        cleaned["raumtyp_ids"] = ids_raw  # will be resolved in apply_update

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
    raumtypen = _resolve_raumtypen(cleaned.pop("raumtyp_ids", []))
    kategorie = Kategorie(**cleaned)
    kategorie.raumtypen = raumtypen
    db.session.add(kategorie)
    db.session.commit()
    return kategorie


def update_kategorie(kategorie_id: int, data: dict, modus: str = "ueberschreiben") -> Kategorie:
    """Update a category.

    modus="ueberschreiben": update in place.
    modus="neu": create a new category with the provided data.
    """
    kategorie = db.session.get(Kategorie, kategorie_id)
    if kategorie is None:
        raise ValidationError("Kategorie nicht gefunden.")

    cleaned = _validate(data, partial=True)
    raumtypen = _resolve_raumtypen(cleaned.pop("raumtyp_ids", None) or [])

    if modus == "neu":
        merged = {
            "name": cleaned.get("name", kategorie.name),
            "beschreibung": cleaned.get("beschreibung", kategorie.beschreibung),
            "farbe": cleaned.get("farbe", kategorie.farbe),
            "sort_order": cleaned.get("sort_order", kategorie.sort_order),
        }
        neue = Kategorie(**merged)
        neue.raumtypen = raumtypen or list(kategorie.raumtypen)
        db.session.add(neue)
        db.session.commit()
        return neue

    for key, value in cleaned.items():
        setattr(kategorie, key, value)
    if "raumtyp_ids" in data or "raumtyp_id" in data:
        kategorie.raumtypen = raumtypen
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
