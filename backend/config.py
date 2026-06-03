"""Configuration classes for the Flask application.

Secrets and environment-specific values are loaded from a .env file via
python-dotenv. Defaults are provided so the app can run in development
without a .env file, but a SECRET_KEY must always be set in production.
"""

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = BACKEND_DIR / "data"

load_dotenv(PROJECT_ROOT / ".env")


def _default_database_uri() -> str:
    """Return an absolute SQLite URI so the path is independent of the cwd."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    db_path = DATA_DIR / "taetigkeitserhebung.db"
    return f"sqlite:///{db_path.as_posix()}"


class Config:
    """Base configuration shared across all environments."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")

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
