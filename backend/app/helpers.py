"""Shared helpers: JSON responses and authentication/authorization decorators."""

from functools import wraps

from flask import jsonify, session

from models import Rolle
from services.auth_service import SESSION_ROLLE, SESSION_USER_ID, current_user


def ok(data=None, status: int = 200):
    """Return a successful JSON response in the ``{data, error}`` envelope."""
    return jsonify({"data": data, "error": None}), status


def err(message: str, status: int = 400):
    """Return an error JSON response in the ``{data, error}`` envelope."""
    return jsonify({"data": None, "error": message}), status


def login_required(view):
    """Ensure a user is logged in."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        if session.get(SESSION_USER_ID) is None:
            return err("Nicht angemeldet.", 401)
        return view(*args, **kwargs)

    return wrapper


def admin_required(view):
    """Ensure the logged-in user is an admin."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        if session.get(SESSION_USER_ID) is None:
            return err("Nicht angemeldet.", 401)
        if session.get(SESSION_ROLLE) != Rolle.ADMIN.value:
            return err("Keine Berechtigung.", 403)
        return view(*args, **kwargs)

    return wrapper


def pin_final_required(view):
    """Block state-changing actions while the user still has a temporary PIN.

    Defense in depth: the frontend already redirects to the PIN-change screen
    after login, but this stops a participant who still has the shared starter
    PIN from writing data via the API directly before choosing their own PIN.
    """

    @wraps(view)
    def wrapper(*args, **kwargs):
        if session.get(SESSION_USER_ID) is None:
            return err("Nicht angemeldet.", 401)
        user = current_user()
        if user is not None and user.pin_temporaer:
            return err(
                "Bitte zuerst einen eigenen PIN vergeben, bevor Daten erfasst werden.",
                403,
            )
        return view(*args, **kwargs)

    return wrapper
