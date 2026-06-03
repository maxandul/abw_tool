"""Participant (Teilnehmer) API routes (Dok. 4)."""

from flask import Blueprint, request

from app.helpers import err, login_required, ok
from app.utils import ValidationError, parse_date
from services import auth_service, eintrag_service, kategorie_service
from extensions import db
from models import Gruppe, GruppenMitglied, Rolle, User

teilnehmer_bp = Blueprint("teilnehmer", __name__, url_prefix="/api")


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

@teilnehmer_bp.route("/registrierung/<string:token>", methods=["GET"])
def registrierung_info(token: str):
    """Resolve a registration token and return group details."""
    gruppe = Gruppe.query.filter_by(registrierung_link_token=token).first()
    if gruppe is None or not gruppe.aktiv:
        return err("Der Registrierungslink ist ungültig oder abgelaufen.", 404)
    return ok({
        "gruppe_id": gruppe.id,
        "gruppe_name": gruppe.name,
        "zeitraum_von": gruppe.zeitraum_von.isoformat(),
        "zeitraum_bis": gruppe.zeitraum_bis.isoformat(),
    })


@teilnehmer_bp.route("/auth/registrieren", methods=["POST"])
def registrieren():
    """Self-registration via group link token.

    If the email already exists, the existing account is linked to the group
    (no new PIN is needed – the participant uses their current PIN).
    """
    body = request.get_json(silent=True) or {}
    token = (body.get("token") or "").strip()
    email = (body.get("email") or "").strip().lower()
    pin = body.get("pin") or ""
    pin_bestaetigung = body.get("pin_bestaetigung") or ""

    gruppe = Gruppe.query.filter_by(registrierung_link_token=token).first()
    if gruppe is None or not gruppe.aktiv:
        return err("Der Registrierungslink ist ungültig oder abgelaufen.", 404)

    if not email or "@" not in email:
        return err("Bitte eine gültige E-Mail-Adresse angeben.", 400)

    user = User.query.filter_by(email=email).first()
    already_linked = user is not None and GruppenMitglied.query.filter_by(
        user_id=user.id, gruppe_id=gruppe.id
    ).first() is not None

    if already_linked:
        return err("Diese E-Mail-Adresse ist bereits in dieser Gruppe registriert.", 409)

    if user is None:
        if len(pin) < 4:
            return err("Der PIN muss mindestens 4 Zeichen haben.", 400)
        if pin != pin_bestaetigung:
            return err("Die PINs stimmen nicht überein.", 400)
        user = User(
            email=email,
            pin_hash=auth_service.hash_pin(pin),
            rolle=Rolle.TEILNEHMER,
            aktiv=True,
            pin_temporaer=False,
        )
        db.session.add(user)
        db.session.flush()

    db.session.add(GruppenMitglied(user_id=user.id, gruppe_id=gruppe.id))
    db.session.commit()

    auth_service.login_user(user)
    return ok({"user": user.to_dict(), "gruppe_id": gruppe.id}, 201)


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
    """Return all active categories (for the entry dropdown and info box)."""
    return ok(kategorie_service.list_kategorien(nur_aktiv=True))
