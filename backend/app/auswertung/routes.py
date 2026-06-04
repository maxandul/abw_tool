"""Analysis (Auswertung) API routes (Dok. 5)."""

from datetime import date

from flask import Blueprint, make_response, request

from app.helpers import admin_required, err, ok
from app.utils import ValidationError, parse_date, parse_int_list
from services import auswertung_service, export_service

auswertung_bp = Blueprint("auswertung", __name__, url_prefix="/api/auswertung")


def _parse_filter(args):
    """Parse shared filter query parameters."""
    gruppe_ids = parse_int_list(args.get("gruppe_ids", ""))
    if not gruppe_ids:
        raise ValidationError("gruppe_ids fehlt.")

    gruppen = auswertung_service._get_gruppen(gruppe_ids)
    default_von, default_bis = auswertung_service._default_zeitraum(gruppen)

    datum_von = parse_date(args.get("datum_von") or default_von.isoformat(), "datum_von")
    datum_bis = parse_date(args.get("datum_bis") or default_bis.isoformat(), "datum_bis")

    raumtyp_id_raw = args.get("raumtyp_id")
    raumtyp_id = int(raumtyp_id_raw) if raumtyp_id_raw else None

    wochentage_raw = args.get("wochentage")
    wochentage = parse_int_list(wochentage_raw) if wochentage_raw else None

    return gruppe_ids, datum_von, datum_bis, raumtyp_id, wochentage, gruppen


@auswertung_bp.route("/lastprofil", methods=["GET"])
@admin_required
def get_lastprofil():
    """Heatmap data: per-slot mean/max occupancy (requires kategorie_ids)."""
    try:
        gruppe_ids, datum_von, datum_bis, _, wochentage, _ = _parse_filter(request.args)
        kat_raw = request.args.get("kategorie_ids")
        kategorie_ids = parse_int_list(kat_raw) if kat_raw else None
        data = auswertung_service.berechne_lastprofil(
            gruppe_ids, datum_von, datum_bis, wochentage, kategorie_ids
        )
        return ok(data)
    except ValidationError as exc:
        return err(str(exc), 400)


@auswertung_bp.route("/raumbedarf", methods=["GET"])
@admin_required
def get_raumbedarf():
    """Room demand table: recommended units per room type."""
    try:
        gruppe_ids, datum_von, datum_bis, _, _, _ = _parse_filter(request.args)
        data = auswertung_service.berechne_raumbedarf(gruppe_ids, datum_von, datum_bis)
        return ok(data)
    except ValidationError as exc:
        return err(str(exc), 400)


@auswertung_bp.route("/anteile", methods=["GET"])
@admin_required
def get_anteile():
    """Time share per room type and main category group."""
    try:
        gruppe_ids, datum_von, datum_bis, raumtyp_id, _, _ = _parse_filter(request.args)
        data = auswertung_service.berechne_anteile(
            gruppe_ids, datum_von, datum_bis, raumtyp_id
        )
        return ok(data)
    except ValidationError as exc:
        return err(str(exc), 400)


@auswertung_bp.route("/kennzahlen", methods=["GET"])
@admin_required
def get_kennzahlen():
    """Four headline KPI tiles."""
    try:
        gruppe_ids, datum_von, datum_bis, _, _, _ = _parse_filter(request.args)
        data = auswertung_service.berechne_kennzahlen(gruppe_ids, datum_von, datum_bis)
        return ok(data)
    except ValidationError as exc:
        return err(str(exc), 400)


@auswertung_bp.route("/export", methods=["GET"])
@admin_required
def get_export():
    """Generate and download a fully self-contained HTML analysis file."""
    try:
        gruppe_ids, datum_von, datum_bis, raumtyp_id, wochentage, gruppen = _parse_filter(
            request.args
        )
        lastprofil = auswertung_service.berechne_lastprofil(
            gruppe_ids, datum_von, datum_bis
        )
        raumbedarf = auswertung_service.berechne_raumbedarf(gruppe_ids, datum_von, datum_bis)
        anteile = auswertung_service.berechne_anteile(gruppe_ids, datum_von, datum_bis)
        kennzahlen = auswertung_service.berechne_kennzahlen(gruppe_ids, datum_von, datum_bis)

        gruppen_namen = [g.name for g in gruppen]
        html = export_service.generiere_export_html(
            lastprofil, raumbedarf, anteile, kennzahlen,
            gruppen_namen, datum_von, datum_bis
        )

        safe_namen = "_".join(n.replace(" ", "_") for n in gruppen_namen)
        filename = f"auswertung_{safe_namen}_{date.today().isoformat()}.html"

        response = make_response(html)
        response.headers["Content-Type"] = "text/html; charset=utf-8"
        response.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    except ValidationError as exc:
        return err(str(exc), 400)
