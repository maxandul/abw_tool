"""Business logic for Tätigkeiten (activity types, stored as Kategorie)."""

from app.utils import ValidationError
from extensions import db
from models import Eintrag, Kategorie, Taetigkeitsgruppe


def _eintrag_count(kategorie_id: int) -> int:
    return Eintrag.query.filter_by(kategorie_id=kategorie_id).count()


def _validate(data: dict, partial: bool = False) -> dict:
    """Validate and normalise Tätigkeit input."""
    cleaned = {}

    if not partial or "name" in data:
        name = (data.get("name") or "").strip()
        if not name:
            raise ValidationError("Der Name der Tätigkeit ist erforderlich.")
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

    gruppe_raw = data.get("taetigkeitsgruppe")
    if "taetigkeitsgruppe" in data or not partial:
        if not gruppe_raw:
            raise ValidationError("Tätigkeitsgruppe ist erforderlich.")
        try:
            gruppe = Taetigkeitsgruppe(gruppe_raw)
        except ValueError as exc:
            raise ValidationError(f"Ungültige Tätigkeitsgruppe: {gruppe_raw}") from exc
        cleaned["taetigkeitsgruppe"] = gruppe

    return cleaned


def list_kategorien(nur_aktiv: bool = False) -> list[dict]:
    query = Kategorie.query
    if nur_aktiv:
        query = query.filter_by(aktiv=True)
    kategorien = query.order_by(Kategorie.sort_order, Kategorie.id).all()
    return [
        {**k.to_dict(), "anzahl_eintraege": _eintrag_count(k.id)} for k in kategorien
    ]


def create_kategorie(data: dict) -> Kategorie:
    cleaned = _validate(data)
    kategorie = Kategorie(**cleaned)
    db.session.add(kategorie)
    db.session.commit()
    return kategorie


def update_kategorie(kategorie_id: int, data: dict, modus: str = "ueberschreiben") -> Kategorie:
    kategorie = db.session.get(Kategorie, kategorie_id)
    if kategorie is None:
        raise ValidationError("Tätigkeit nicht gefunden.")

    cleaned = _validate(data, partial=True)

    if modus == "neu":
        merged = {
            "name": cleaned.get("name", kategorie.name),
            "beschreibung": cleaned.get("beschreibung", kategorie.beschreibung),
            "farbe": cleaned.get("farbe", kategorie.farbe),
            "sort_order": cleaned.get("sort_order", kategorie.sort_order),
            "taetigkeitsgruppe": cleaned.get("taetigkeitsgruppe", kategorie.taetigkeitsgruppe),
            "stoerung": kategorie.stoerung,
            "planung": kategorie.planung,
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
    kategorie = db.session.get(Kategorie, kategorie_id)
    if kategorie is None:
        raise ValidationError("Tätigkeit nicht gefunden.")
    kategorie.aktiv = aktiv
    db.session.commit()
    return kategorie
