"""Participant (Teilnehmer) API routes (Dok. 4)."""

from flask import Blueprint, request

from app.helpers import err, login_required, ok, pin_final_required
from app.utils import ValidationError, parse_date
from services import auth_service, eintrag_service, kategorie_service
from models import Gruppe, GruppenMitglied, User

teilnehmer_bp = Blueprint("teilnehmer", __name__, url_prefix="/api")


# ---------------------------------------------------------------------------
# Entries
# ---------------------------------------------------------------------------

@teilnehmer_bp.route("/eintraege", methods=["GET"])
@login_required
def get_eintraege():
    """Return entries for a group within a date range.

    Query params: gruppe_id, datum_von (YYYY-MM-DD), datum_bis (YYYY-MM-DD)
    """
    user = auth_service.current_user()
    try:
        gruppe_id = int(request.args.get("gruppe_id") or 0)
        datum_von = parse_date(request.args.get("datum_von") or "", "datum_von")
        datum_bis = parse_date(request.args.get("datum_bis") or "", "datum_bis")
    except (ValidationError, ValueError) as exc:
        return err(str(exc), 400)

    if not gruppe_id:
        return err("gruppe_id fehlt.", 400)

    data = eintrag_service.list_eintraege(user.id, gruppe_id, datum_von, datum_bis)
    return ok(data)


@teilnehmer_bp.route("/eintraege", methods=["POST"])
@login_required
@pin_final_required
def post_eintrag():
    """Create a new entry."""
    user = auth_service.current_user()
    body = request.get_json(silent=True) or {}
    gruppe_id = body.get("gruppe_id")
    if not gruppe_id:
        return err("gruppe_id fehlt.", 400)
    gruppe = Gruppe.query.get(int(gruppe_id))
    if gruppe and gruppe.abgeschlossen:
        return err("Diese Erhebung ist abgeschlossen. Es können keine Einträge mehr erfasst werden.", 403)
    try:
        eintrag = eintrag_service.create_eintrag(user.id, int(gruppe_id), body)
        return ok(eintrag.to_dict(), 201)
    except ValidationError as exc:
        return err(str(exc), 400)


@teilnehmer_bp.route("/eintraege/<int:eintrag_id>", methods=["PUT"])
@login_required
@pin_final_required
def put_eintrag(eintrag_id: int):
    """Update an existing entry."""
    user = auth_service.current_user()
    try:
        eintrag = eintrag_service.update_eintrag(
            user.id, eintrag_id, request.get_json(silent=True) or {}
        )
        return ok(eintrag.to_dict())
    except ValidationError as exc:
        return err(str(exc), 400)


@teilnehmer_bp.route("/eintraege/<int:eintrag_id>", methods=["DELETE"])
@login_required
@pin_final_required
def delete_eintrag(eintrag_id: int):
    """Delete an entry."""
    user = auth_service.current_user()
    try:
        eintrag_service.delete_eintrag(user.id, eintrag_id)
        return ok({"message": "Eintrag gelöscht."})
    except ValidationError as exc:
        return err(str(exc), 400)


# ---------------------------------------------------------------------------
# Submission (Einreichung)
# ---------------------------------------------------------------------------

@teilnehmer_bp.route("/einreichung", methods=["GET"])
@login_required
def get_einreichung():
    """Return the current submission status for a group."""
    user = auth_service.current_user()
    gruppe_id = request.args.get("gruppe_id")
    if not gruppe_id:
        return err("gruppe_id fehlt.", 400)
    return ok(eintrag_service.get_einreichung(user.id, int(gruppe_id)))


@teilnehmer_bp.route("/einreichung/luecken", methods=["GET"])
@login_required
def get_luecken():
    """Check all working days for gaps before submission."""
    user = auth_service.current_user()
    gruppe_id = request.args.get("gruppe_id")
    if not gruppe_id:
        return err("gruppe_id fehlt.", 400)
    return ok(eintrag_service.pruefe_luecken(user.id, int(gruppe_id)))


@teilnehmer_bp.route("/einreichung/einreichen", methods=["POST"])
@login_required
@pin_final_required
def einreichen():
    """Submit entries (OFFEN → EINGEREICHT, IN_BEARBEITUNG → ABGESCHLOSSEN)."""
    user = auth_service.current_user()
    body = request.get_json(silent=True) or {}
    gruppe_id = body.get("gruppe_id")
    if not gruppe_id:
        return err("gruppe_id fehlt.", 400)
    try:
        einreichung = eintrag_service.einreichen(user.id, int(gruppe_id))
        return ok(einreichung.to_dict())
    except ValidationError as exc:
        return err(str(exc), 400)


@teilnehmer_bp.route("/einreichung/entsperren", methods=["POST"])
@login_required
@pin_final_required
def entsperren():
    """Unlock entries for editing (EINGEREICHT → IN_BEARBEITUNG, self-service)."""
    user = auth_service.current_user()
    body = request.get_json(silent=True) or {}
    gruppe_id = body.get("gruppe_id")
    if not gruppe_id:
        return err("gruppe_id fehlt.", 400)
    try:
        einreichung = eintrag_service.entsperren(user.id, int(gruppe_id))
        return ok(einreichung.to_dict())
    except ValidationError as exc:
        return err(str(exc), 400)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@teilnehmer_bp.route("/meine-gruppen", methods=["GET"])
@login_required
def get_meine_gruppen():
    """Return all groups the current participant belongs to (including closed)."""
    user = auth_service.current_user()
    gruppen = [
        {
            "id": m.gruppe.id,
            "name": m.gruppe.name,
            "zeitraum_von": m.gruppe.zeitraum_von.isoformat() if m.gruppe.zeitraum_von else None,
            "zeitraum_bis": m.gruppe.zeitraum_bis.isoformat() if m.gruppe.zeitraum_bis else None,
            "aktiv": m.gruppe.aktiv,
            "abgeschlossen": m.gruppe.abgeschlossen,
        }
        for m in user.mitgliedschaften
    ]
    return ok(gruppen)


@teilnehmer_bp.route("/dashboard", methods=["GET"])
@login_required
def get_dashboard():
    """Participant dashboard for a specific group."""
    user = auth_service.current_user()
    gruppe_id = request.args.get("gruppe_id")
    if not gruppe_id:
        return err("gruppe_id fehlt.", 400)
    try:
        return ok(eintrag_service.get_dashboard(user.id, int(gruppe_id)))
    except ValidationError as exc:
        return err(str(exc), 404)


# ---------------------------------------------------------------------------
# Categories (read-only for participants)
# ---------------------------------------------------------------------------

@teilnehmer_bp.route("/kategorien", methods=["GET"])
@login_required
def get_kategorien():
    """Return active, current-structure categories (Kategorien from the
    superseded Arbeitsform-less system are not offered for new entries).

    Query param: gruppe_id (optional) – if that Gruppe has an explicit
    Tätigkeiten-Zuordnung, only those are returned.
    """
    gruppe_id_raw = request.args.get("gruppe_id")
    gruppe_id = int(gruppe_id_raw) if gruppe_id_raw else None
    return ok(
        kategorie_service.list_kategorien(nur_aktiv=True, nur_neu=True, gruppe_id=gruppe_id)
    )
