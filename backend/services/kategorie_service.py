"""Business logic for Tätigkeiten (activity types, stored as Kategorie)."""

from app.utils import ValidationError
from extensions import db
from models import (
    AbwesenheitGrund,
    Arbeitsform,
    Arbeitsort,
    Eintrag,
    Gruppengroesse,
    Kategorie,
    Rueckzugsbedarf,
    Teilnehmerkreis,
)


def _eintrag_count(kategorie_id: int) -> int:
    return Eintrag.query.filter_by(kategorie_id=kategorie_id).count()


def _enum_or_400(enum_cls, raw, feldname: str):
    try:
        return enum_cls(raw)
    except ValueError as exc:
        raise ValidationError(f"Ungültiger Wert für {feldname}: {raw}") from exc


def _validate(data: dict, partial: bool = False) -> dict:
    """Validate and normalise Tätigkeit input for the current (Arbeitsform-based)
    structure. Legacy fields (taetigkeitsgruppe/stoerung/planung) are never
    written here – they only exist on Kategorien from before the restructure.
    """
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

    arbeitsform_raw = data.get("arbeitsform")
    if "arbeitsform" in data or not partial:
        if not arbeitsform_raw:
            raise ValidationError("Arbeitsform ist erforderlich.")
        arbeitsform = _enum_or_400(Arbeitsform, arbeitsform_raw, "Arbeitsform")
        cleaned["arbeitsform"] = arbeitsform

        # Reset every attribute field first, then only fill in what applies
        # to the chosen Arbeitsform – prevents stale leftovers from a
        # previous form state ending up on the saved row. All of these are
        # optional: only Name und Arbeitsform sind Pflicht, die Merkmale
        # dienen lediglich der Kategorisierung, wo sinnvoll.
        cleaned["arbeitsort"] = None
        cleaned["gruppengroesse"] = None
        cleaned["teilnehmerkreis"] = None
        cleaned["rueckzugsbedarf"] = None
        cleaned["abwesenheit_grund"] = None

        if arbeitsform == Arbeitsform.EINZELARBEIT:
            if data.get("arbeitsort"):
                cleaned["arbeitsort"] = _enum_or_400(Arbeitsort, data["arbeitsort"], "Arbeitsort")
            if data.get("rueckzugsbedarf"):
                cleaned["rueckzugsbedarf"] = _enum_or_400(
                    Rueckzugsbedarf, data["rueckzugsbedarf"], "Rückzugsbedarf"
                )
        elif arbeitsform == Arbeitsform.MEETING:
            if data.get("gruppengroesse"):
                cleaned["gruppengroesse"] = _enum_or_400(
                    Gruppengroesse, data["gruppengroesse"], "Gruppengrösse"
                )
            if data.get("teilnehmerkreis"):
                cleaned["teilnehmerkreis"] = _enum_or_400(
                    Teilnehmerkreis, data["teilnehmerkreis"], "Teilnehmendenkreis"
                )
            if data.get("rueckzugsbedarf"):
                cleaned["rueckzugsbedarf"] = _enum_or_400(
                    Rueckzugsbedarf, data["rueckzugsbedarf"], "Rückzugsbedarf"
                )
        elif arbeitsform == Arbeitsform.ABWESENHEIT:
            if data.get("abwesenheit_grund"):
                cleaned["abwesenheit_grund"] = _enum_or_400(
                    AbwesenheitGrund, data["abwesenheit_grund"], "Grund"
                )

    return cleaned


def list_kategorien(nur_aktiv: bool = False, nur_neu: bool = False) -> list[dict]:
    query = Kategorie.query
    if nur_aktiv:
        query = query.filter_by(aktiv=True)
    if nur_neu:
        query = query.filter(Kategorie.arbeitsform.isnot(None))
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
    if kategorie.ist_legacy:
        raise ValidationError(
            "Tätigkeiten aus dem bisherigen System können nicht mehr bearbeitet werden."
        )

    cleaned = _validate(data, partial=True)

    if modus == "neu":
        merged = {
            "name": cleaned.get("name", kategorie.name),
            "beschreibung": cleaned.get("beschreibung", kategorie.beschreibung),
            "farbe": cleaned.get("farbe", kategorie.farbe),
            "sort_order": cleaned.get("sort_order", kategorie.sort_order),
            "arbeitsform": cleaned.get("arbeitsform", kategorie.arbeitsform),
            "arbeitsort": cleaned.get("arbeitsort", kategorie.arbeitsort),
            "gruppengroesse": cleaned.get("gruppengroesse", kategorie.gruppengroesse),
            "teilnehmerkreis": cleaned.get("teilnehmerkreis", kategorie.teilnehmerkreis),
            "rueckzugsbedarf": cleaned.get("rueckzugsbedarf", kategorie.rueckzugsbedarf),
            "abwesenheit_grund": cleaned.get("abwesenheit_grund", kategorie.abwesenheit_grund),
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


def reorder_kategorien(arbeitsform: str, ids: list[int]) -> None:
    """Persist a new manual order for all Kategorien of one Arbeitsform.

    ``ids`` must be exactly the set of (current) Kategorie IDs for that
    Arbeitsform, in the desired order.
    """
    form = _enum_or_400(Arbeitsform, arbeitsform, "Arbeitsform")

    vorhanden = Kategorie.query.filter_by(arbeitsform=form).all()
    vorhanden_ids = {k.id for k in vorhanden}
    if set(ids) != vorhanden_ids:
        raise ValidationError(
            "Die Sortierliste muss genau die Tätigkeiten dieser Arbeitsform enthalten."
        )

    by_id = {k.id: k for k in vorhanden}
    for index, kategorie_id in enumerate(ids):
        by_id[kategorie_id].sort_order = (index + 1) * 10
    db.session.commit()
