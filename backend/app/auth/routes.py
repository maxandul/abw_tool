"""Authentication routes: bootstrap setup, login, logout, PIN change."""

import threading
import time

from flask import Blueprint, request

from app.helpers import err, login_required, ok
from extensions import db
from models import Rolle, User
from services import auth_service

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

MIN_PIN_LENGTH = 4

# ---------------------------------------------------------------------------
# Simple in-memory brute-force throttle for the login endpoint.
#
# Tracks failed attempts per client IP. After MAX_FAILS failures the IP is
# locked out for LOCK_SECONDS. Successful logins reset the counter. This lives
# in process memory (the app runs as a single long-lived server), so it adds
# no infrastructure and does not affect normal LAN usage – each PC has its own
# IP, and a legitimate user almost never hits the limit.
# ---------------------------------------------------------------------------

_MAX_FAILS = 10
_LOCK_SECONDS = 300  # 5 minutes
_WINDOW_SECONDS = 300  # failures older than this no longer count

_login_attempts: dict[str, dict] = {}
_login_lock = threading.Lock()


def _client_key() -> str:
    """Identify the caller for throttling (best-effort, proxy-aware)."""
    fwd = request.headers.get("X-Forwarded-For", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.remote_addr or "unknown"


def _check_login_allowed(key: str) -> float:
    """Return remaining lockout seconds (0 if the caller may attempt a login)."""
    now = time.time()
    with _login_lock:
        rec = _login_attempts.get(key)
        if not rec:
            return 0.0
        if rec.get("locked_until", 0) > now:
            return rec["locked_until"] - now
        # Drop stale failures outside the rolling window.
        if now - rec.get("last", 0) > _WINDOW_SECONDS:
            _login_attempts.pop(key, None)
        return 0.0


def _register_login_failure(key: str) -> None:
    now = time.time()
    with _login_lock:
        rec = _login_attempts.get(key)
        if not rec or now - rec.get("last", 0) > _WINDOW_SECONDS:
            rec = {"fails": 0, "last": now, "locked_until": 0}
        rec["fails"] += 1
        rec["last"] = now
        if rec["fails"] >= _MAX_FAILS:
            rec["locked_until"] = now + _LOCK_SECONDS
            rec["fails"] = 0
        _login_attempts[key] = rec


def _register_login_success(key: str) -> None:
    with _login_lock:
        _login_attempts.pop(key, None)


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
    client_key = _client_key()
    wartezeit = _check_login_allowed(client_key)
    if wartezeit > 0:
        return err(
            "Zu viele Fehlversuche. Bitte in "
            f"{int(wartezeit // 60) + 1} Minute(n) erneut versuchen.",
            429,
        )

    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    pin = body.get("pin") or ""

    from models import User

    user = User.query.filter_by(email=email).first()
    # Always run a bcrypt verification (real or dummy) so the response time does
    # not reveal whether the e-mail exists.
    if user is None or not user.aktiv:
        auth_service.dummy_verify()
        _register_login_failure(client_key)
        return err("E-Mail-Adresse oder PIN ist falsch.", 401)
    if not auth_service.verify_pin(pin, user.pin_hash):
        _register_login_failure(client_key)
        return err("E-Mail-Adresse oder PIN ist falsch.", 401)

    _register_login_success(client_key)
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
