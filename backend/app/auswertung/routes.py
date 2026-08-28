"""Analysis (Auswertung) API routes (Dok. 5)."""

from datetime import date

from flask import Blueprint, make_response, request

from app.helpers import admin_required, err, ok
from app.utils import ValidationError, parse_date, parse_float_list, parse_int_list, parse_string_list
from services import auswertung_service, export_service

auswertung_bp = Blueprint("auswertung", __name__, url_prefix="/api/auswertung")


def _parse_teilnehmer_filter(args) -> dict:
    funktionen = parse_string_list(args.get("funktionen"))
    organisationseinheiten = parse_string_list(args.get("organisationseinheiten"))
    beschaeftigungsgrade = parse_float_list(args.get("beschaeftigungsgrade"))
    flt = {}
    if funktionen:
        flt["funktionen"] = funktionen
    if organisationseinheiten:
        flt["organisationseinheiten"] = organisationseinheiten
    if beschaeftigungsgrade:
        flt["beschaeftigungsgrade"] = beschaeftigungsgrade
    return flt


def _parse_merkmal_filter(args) -> dict:
    """Parse the Arbeitsform/Merkmal filter (Lastprofil, Bedarf, Anteile)."""
    flt = {}
    for key in (
        "arbeitsformen", "arbeitsorte", "rueckzugsbedarfe",
        "gruppengroessen", "teilnehmerkreise",
    ):
        werte = parse_string_list(args.get(key))
        if werte:
            flt[key] = werte
    return flt


def _parse_filter(args):
    """Parse shared filter query parameters."""
    gruppe_ids = parse_int_list(args.get("gruppe_ids", ""))
    if not gruppe_ids:
        raise ValidationError("gruppe_ids fehlt.")

    gruppen = auswertung_service._get_gruppen(gruppe_ids)
    default_von, default_bis = auswertung_service._default_zeitraum(gruppen)

    datum_von = parse_date(args.get("datum_von") or default_von.isoformat(), "datum_von")
    datum_bis = parse_date(args.get("datum_bis") or default_bis.isoformat(), "datum_bis")

    wochentage_raw = args.get("wochentage")
    wochentage = parse_int_list(wochentage_raw) if wochentage_raw else None

    teilnehmer_filter = _parse_teilnehmer_filter(args)
    merkmal_filter = _parse_merkmal_filter(args)

    return gruppe_ids, datum_von, datum_bis, wochentage, gruppen, teilnehmer_filter, merkmal_filter


@auswertung_bp.route("/teilnehmer-filter", methods=["GET"])
@admin_required
def get_teilnehmer_filter():
    """Distinct Funktion / OE / Beschäftigungsgrad values for selected groups."""
    try:
        gruppe_ids = parse_int_list(request.args.get("gruppe_ids", ""))
        if not gruppe_ids:
            raise ValidationError("gruppe_ids fehlt.")
        return ok(auswertung_service.get_teilnehmer_filter_optionen(gruppe_ids))
    except ValidationError as exc:
        return err(str(exc), 400)


@auswertung_bp.route("/sample", methods=["GET"])
@admin_required
def get_sample():
    """Sample description: size, FTE, participation and completeness."""
    try:
        gruppe_ids, datum_von, datum_bis, wochentage, _, teilnehmer_filter, _ = _parse_filter(
            request.args
        )
        data = auswertung_service.berechne_sample(
            gruppe_ids,
            datum_von,
            datum_bis,
            wochentage,
            teilnehmer_filter=teilnehmer_filter or None,
        )
        return ok(data)
    except ValidationError as exc:
        return err(str(exc), 400)


@auswertung_bp.route("/lastprofil", methods=["GET"])
@admin_required
def get_lastprofil():
    """Heatmap data: per-slot mean/max occupancy (requires kategorie_ids)."""
    try:
        gruppe_ids, datum_von, datum_bis, wochentage, _, teilnehmer_filter, merkmal_filter = (
            _parse_filter(request.args)
        )
        kat_raw = request.args.get("kategorie_ids")
        kategorie_ids = parse_int_list(kat_raw) if kat_raw else None
        data = auswertung_service.berechne_lastprofil(
            gruppe_ids,
            datum_von,
            datum_bis,
            wochentage,
            kategorie_ids,
            teilnehmer_filter=teilnehmer_filter or None,
            merkmal_filter=merkmal_filter or None,
        )
        return ok(data)
    except ValidationError as exc:
        return err(str(exc), 400)


@auswertung_bp.route("/raumbedarf", methods=["GET"])
@admin_required
def get_raumbedarf():
    """Demand table: recommended units per Tätigkeit."""
    try:
        gruppe_ids, datum_von, datum_bis, _, _, teilnehmer_filter, merkmal_filter = _parse_filter(
            request.args
        )
        data = auswertung_service.berechne_raumbedarf(
            gruppe_ids, datum_von, datum_bis,
            teilnehmer_filter=teilnehmer_filter or None,
            merkmal_filter=merkmal_filter or None,
        )
        return ok(data)
    except ValidationError as exc:
        return err(str(exc), 400)


@auswertung_bp.route("/anteile", methods=["GET"])
@admin_required
def get_anteile():
    """Time share per Tätigkeitsgruppe and individual Tätigkeit."""
    try:
        gruppe_ids, datum_von, datum_bis, _, _, teilnehmer_filter, merkmal_filter = _parse_filter(
            request.args
        )
        data = auswertung_service.berechne_anteile(
            gruppe_ids, datum_von, datum_bis,
            teilnehmer_filter=teilnehmer_filter or None,
            merkmal_filter=merkmal_filter or None,
        )
        return ok(data)
    except ValidationError as exc:
        return err(str(exc), 400)


@auswertung_bp.route("/kennzahlen", methods=["GET"])
@admin_required
def get_kennzahlen():
    """Four headline KPI tiles."""
    try:
        gruppe_ids, datum_von, datum_bis, _, _, teilnehmer_filter, _ = _parse_filter(
            request.args
        )
        data = auswertung_service.berechne_kennzahlen(
            gruppe_ids, datum_von, datum_bis, teilnehmer_filter=teilnehmer_filter or None
        )
        return ok(data)
    except ValidationError as exc:
        return err(str(exc), 400)


@auswertung_bp.route("/export", methods=["GET"])
@admin_required
def get_export():
    """Generate and download a self-contained, interactive HTML analysis file.

    The export embeds the anonymised raw data of the selected groups and
    recomputes all views client-side, so the recipient can change the
    Teilnehmer-Filter and Lastprofil-Tätigkeiten without a server.
    """
    try:
        gruppe_ids, datum_von, datum_bis, _, gruppen, teilnehmer_filter, merkmal_filter = (
            _parse_filter(request.args)
        )
        rohdaten = auswertung_service.export_rohdaten(
            gruppe_ids, datum_von, datum_bis
        )

        kat_raw = request.args.get("kategorie_ids")
        initial_kategorie_ids = parse_int_list(kat_raw) if kat_raw else []
        initial_filter = {
            "funktionen": teilnehmer_filter.get("funktionen", []),
            "organisationseinheiten": teilnehmer_filter.get(
                "organisationseinheiten", []
            ),
            "beschaeftigungsgrade": teilnehmer_filter.get("beschaeftigungsgrade", []),
            "kategorie_ids": initial_kategorie_ids,
            "arbeitsformen": merkmal_filter.get("arbeitsformen", []),
            "arbeitsorte": merkmal_filter.get("arbeitsorte", []),
            "rueckzugsbedarfe": merkmal_filter.get("rueckzugsbedarfe", []),
            "gruppengroessen": merkmal_filter.get("gruppengroessen", []),
            "teilnehmerkreise": merkmal_filter.get("teilnehmerkreise", []),
        }

        gruppen_namen = [g.name for g in gruppen]
        html = export_service.generiere_export_html(
            rohdaten, initial_filter, datum_von, datum_bis
        )

        safe_namen = "_".join(n.replace(" ", "_") for n in gruppen_namen)
        filename = f"auswertung_{safe_namen}_{date.today().isoformat()}.html"

        response = make_response(html)
        response.headers["Content-Type"] = "text/html; charset=utf-8"
        response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    except ValidationError as exc:
        return err(str(exc), 400)
