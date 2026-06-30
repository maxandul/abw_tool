"""Configuration classes for the Flask application.

Secrets and environment-specific values are loaded from a .env file via
python-dotenv. Defaults are provided so the app can run in development
without a .env file, but a SECRET_KEY must always be set in production.
"""

import os
import secrets
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = BACKEND_DIR / "data"

load_dotenv(PROJECT_ROOT / ".env")

# Values that must never be used as a real secret key in production.
_UNSAFE_SECRET_KEYS = {"", "dev-secret-key-change-me", "dein-geheimer-schluessel"}


def _default_database_uri() -> str:
    """Return an absolute SQLite URI so the path is independent of the cwd."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    db_path = DATA_DIR / "taetigkeitserhebung.db"
    return f"sqlite:///{db_path.as_posix()}"


def _resolve_secret_key() -> str:
    """Return a strong secret key, generating and persisting one if needed.

    Priority:
      1. SECRET_KEY from the environment / .env (if it is a real value).
      2. A previously generated key stored in ``backend/data/secret_key``.
      3. A freshly generated random key, persisted to that file.

    This keeps the "just double-click to start" workflow intact while ensuring
    the app never falls back to a publicly known default key. The key file
    stays out of version control (backend/data is git-ignored), and sessions
    survive restarts because the key is reused.
    """
    env_key = os.getenv("SECRET_KEY", "").strip()
    if env_key and env_key not in _UNSAFE_SECRET_KEYS:
        return env_key

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    key_file = DATA_DIR / "secret_key"
    try:
        if key_file.exists():
            stored = key_file.read_text(encoding="utf-8").strip()
            if stored:
                return stored
        generated = secrets.token_hex(32)
        key_file.write_text(generated, encoding="utf-8")
        try:
            os.chmod(key_file, 0o600)
        except OSError:
            pass  # Best-effort on platforms/filesystems without POSIX perms.
        return generated
    except OSError:
        # If the file cannot be written (e.g. read-only share), fall back to a
        # process-lifetime random key. Sessions reset on restart, but the key
        # is still never a known constant.
        return secrets.token_hex(32)


class Config:
    """Base configuration shared across all environments."""

    SECRET_KEY = _resolve_secret_key()

    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL") or _default_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Session: expires after 8 hours of inactivity or when the browser closes.
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)
    SESSION_PERMANENT = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    JSON_AS_ASCII = False


class ProductionConfig(Config):
    """Production configuration (default for the deployed server)."""

    DEBUG = False


class DevelopmentConfig(Config):
    """Development configuration for local work on the developer laptop."""

    DEBUG = True


def get_config() -> type[Config]:
    """Select the configuration class based on FLASK_ENV."""
    env = os.getenv("FLASK_ENV", "production").lower()
    if env == "development":
        return DevelopmentConfig
    return ProductionConfig
