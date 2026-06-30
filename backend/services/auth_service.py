"""Authentication helpers: PIN hashing/verification and session handling.

PINs are hashed with bcrypt; the plaintext PIN is never stored, so an admin
can reset but never read a participant's PIN.
"""

import secrets

import bcrypt
from flask import session

from extensions import db
from models import Rolle, User

SESSION_USER_ID = "user_id"
SESSION_ROLLE = "rolle"


def hash_pin(pin: str) -> str:
    """Hash a plaintext PIN with bcrypt and return the UTF-8 hash string."""
    return bcrypt.hashpw(pin.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_pin(pin: str, pin_hash: str) -> bool:
    """Check a plaintext PIN against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(pin.encode("utf-8"), pin_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def generate_temp_pin() -> str:
    """Generate a random 4-digit temporary PIN (admin accounts only)."""
    return f"{secrets.randbelow(10000):04d}"


def teilnehmer_temp_pin() -> str:
    """Return the fixed temporary PIN for participants."""
    from constants import TEILNEHMER_TEMP_PIN

    return TEILNEHMER_TEMP_PIN


def admin_exists() -> bool:
    """Return True if at least one admin account exists."""
    return User.query.filter_by(rolle=Rolle.ADMIN).count() > 0


def create_admin(email: str, pin: str) -> User:
    """Create the first (or an additional) admin account."""
    user = User(
        email=email.strip().lower(),
        pin_hash=hash_pin(pin),
        rolle=Rolle.ADMIN,
        aktiv=True,
        pin_temporaer=False,
    )
    db.session.add(user)
    db.session.commit()
    return user


def login_user(user: User) -> None:
    """Store the authenticated user's id and role in the session."""
    session[SESSION_USER_ID] = user.id
    session[SESSION_ROLLE] = user.rolle.value


def logout_user() -> None:
    """Clear the current session."""
    session.clear()


def current_user() -> User | None:
    """Return the currently logged-in user, or None."""
    user_id = session.get(SESSION_USER_ID)
    if user_id is None:
        return None
    return db.session.get(User, user_id)
