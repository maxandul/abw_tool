"""Configuration for production and read-only operation."""

import os
import secrets
from datetime import timedelta
from pathlib import Path
from urllib.parse import quote

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = BACKEND_DIR / "data"

load_dotenv(PROJECT_ROOT / ".env")

_UNSAFE_SECRET_KEYS = {"", "dev-secret-key-change-me", "dein-geheimer-schluessel"}


def _default_database_uri() -> str:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{(DATA_DIR / 'taetigkeitserhebung.db').as_posix()}"


def _readonly_database_uri() -> str:
    raw_path = os.getenv("READONLY_DATABASE_PATH", "").strip()
    if not raw_path:
        raise RuntimeError("READONLY_DATABASE_PATH fehlt. Read-only-Modus über START_APP.bat starten.")
    path = Path(raw_path).resolve()
    encoded = quote(path.as_posix(), safe="/:")
    return f"sqlite:///file:{encoded}?mode=ro&uri=true"


def _resolve_secret_key() -> str:
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
            pass
        return generated
    except OSError:
        return secrets.token_hex(32)


class Config:
    APP_MODE = os.getenv("APP_MODE", "production").strip().lower()
    READ_ONLY = APP_MODE == "readonly"
    READONLY_SNAPSHOT_TIMESTAMP = os.getenv("READONLY_SNAPSHOT_TIMESTAMP", "")
    READONLY_SNAPSHOT_SOURCE = os.getenv("READONLY_SNAPSHOT_SOURCE", "")

    SECRET_KEY = _resolve_secret_key()
    SQLALCHEMY_DATABASE_URI = (
        _readonly_database_uri()
        if READ_ONLY
        else os.getenv("DATABASE_URL") or _default_database_uri()
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)
    SESSION_PERMANENT = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    JSON_AS_ASCII = False


class ProductionConfig(Config):
    DEBUG = False


class DevelopmentConfig(Config):
    DEBUG = True


def get_config() -> type[Config]:
    env = os.getenv("FLASK_ENV", "production").lower()
    if env == "development" and not Config.READ_ONLY:
        return DevelopmentConfig
    return ProductionConfig
