"""Authentication routes: bootstrap setup, login, logout, PIN change."""

from flask import Blueprint, request

from app.helpers import err, login_required, ok
from extensions import db
from models import Rolle, User
from services import auth_service

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

MIN_PIN_LENGTH = 4


@auth_bp.route("/setup-status", methods=["GET"])
def setup_status():
    """Report whether the initial admin bootstrap is still available."""
    return ok({"admin_exists": auth_service.admin_exists()})


@auth_bp.route("/setup", methods=["POST"])
def setup():
    """Create the first admin account. Permanently disabled once one exists."""
    if auth_service.admin_exists():
        return err("Setup ist nicht mehr verfügbar.", 404)

    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    pin = body.get("pin") or ""
    pin_bestaetigung = body.get("pin_bestaetigung") or ""

    if not email or "@" not in email:
        return err("Bitte eine gültige E-Mail-Adresse angeben.", 400)
    if len(pin) < MIN_PIN_LENGTH:
        return err(f"Der PIN muss mindestens {MIN_PIN_LENGTH} Zeichen haben.", 400)
    if pin != pin_bestaetigung:
        return err("Die PINs stimmen nicht überein.", 400)

    user = auth_service.create_admin(email, pin)
    return ok({"user": user.to_dict()}, 201)


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate a user with email + PIN."""
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    pin = body.get("pin") or ""

    from models import User

    user = User.query.filter_by(email=email).first()
    if user is None or not user.aktiv or not auth_service.verify_pin(pin, user.pin_hash):
        return err("E-Mail-Adresse oder PIN ist falsch.", 401)

    auth_service.login_user(user)

    gruppen = [
        {
            "id": m.gruppe.id,
            "name": m.gruppe.name,
            "aktiv": m.gruppe.aktiv,
            "abgeschlossen": m.gruppe.abgeschlossen,
            "zeitraum_von": m.gruppe.zeitraum_von.isoformat() if m.gruppe.zeitraum_von else None,
            "zeitraum_bis": m.gruppe.zeitraum_bis.isoformat() if m.gruppe.zeitraum_bis else None,
        }
        for m in user.mitgliedschaften
    ]

    return ok(
        {
            "user": user.to_dict(),
            "pin_temporaer": user.pin_temporaer,
            "gruppen": gruppen,
        }
    )


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Clear the current session."""
    auth_service.logout_user()
    return ok({"message": "Abgemeldet."})


@auth_bp.route("/me", methods=["GET"])
def me():
    """Return the currently logged-in user, or null."""
    user = auth_service.current_user()
    return ok({"user": user.to_dict() if user else None})


@auth_bp.route("/kontakt", methods=["GET"])
@login_required
def kontakt():
    """Return admin email addresses for the contact section in the help page."""
    admins = User.query.filter_by(rolle=Rolle.ADMIN, aktiv=True).order_by(User.email).all()
    return ok({"admins": [u.email for u in admins]})


@auth_bp.route("/pin-aendern", methods=["POST"])
@login_required
def pin_aendern():
    """Change the PIN of the logged-in user (used after a temporary PIN)."""
    body = request.get_json(silent=True) or {}
    neuer_pin = body.get("neuer_pin") or ""
    bestaetigung = body.get("bestaetigung") or ""

    if len(neuer_pin) < MIN_PIN_LENGTH:
        return err(f"Der PIN muss mindestens {MIN_PIN_LENGTH} Zeichen haben.", 400)
    if neuer_pin != bestaetigung:
        return err("Die PINs stimmen nicht überein.", 400)

    user = auth_service.current_user()
    if user is None:
        return err("Nicht angemeldet.", 401)

    user.pin_hash = auth_service.hash_pin(neuer_pin)
    user.pin_temporaer = False
    db.session.commit()

    gruppen = [
        {
            "id": m.gruppe.id,
            "name": m.gruppe.name,
            "aktiv": m.gruppe.aktiv,
            "abgeschlossen": m.gruppe.abgeschlossen,
            "zeitraum_von": m.gruppe.zeitraum_von.isoformat() if m.gruppe.zeitraum_von else None,
            "zeitraum_bis": m.gruppe.zeitraum_bis.isoformat() if m.gruppe.zeitraum_bis else None,
        }
        for m in user.mitgliedschaften
    ]
    return ok({"message": "PIN wurde geändert.", "user": user.to_dict(), "gruppen": gruppen})
