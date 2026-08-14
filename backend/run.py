"""Flask entry point for production and read-only operation."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# The mode and network paths are required before importing the app config.
load_dotenv(PROJECT_ROOT / ".env")
APP_MODE = os.getenv("APP_MODE", "production").strip().lower()
if APP_MODE not in {"production", "readonly"}:
    raise SystemExit("APP_MODE muss 'production' oder 'readonly' sein.")

if APP_MODE == "readonly":
    from services.backup_service import prepare_readonly_snapshot

    source_value = (os.getenv("BACKUP_SOURCE") or os.getenv("BACKUP_TARGET") or "").strip()
    if not source_value:
        raise SystemExit("BACKUP_SOURCE fehlt in der .env-Datei.")

    local_root = Path(os.getenv("LOCALAPPDATA") or (Path.home() / ".abw_tool"))
    local_directory = local_root / "ABWTool" / "readonly"
    try:
        snapshot = prepare_readonly_snapshot(Path(source_value), local_directory)
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(f"Read-only-Start fehlgeschlagen: {exc}") from exc

    os.environ["READONLY_DATABASE_PATH"] = str(snapshot.local_path)
    os.environ["READONLY_SNAPSHOT_TIMESTAMP"] = snapshot.source_modified.strftime(
        "%d.%m.%Y, %H:%M:%S"
    )
    os.environ["READONLY_SNAPSHOT_SOURCE"] = str(snapshot.source_path)
    print(f"Read-only-Snapshot geladen: {snapshot.source_path}")

from app import create_app  # noqa: E402
from extensions import db  # noqa: E402

app = create_app()


def _init_db() -> None:
    if app.config.get("READ_ONLY"):
        print("Read-only-Modus: Migrationen und Seed werden übersprungen.")
        return

    from flask_migrate import upgrade
    from services.seed_service import seed_default_data

    with app.app_context():
        try:
            upgrade()
        except Exception as exc:  # noqa: BLE001
            print(f"Migration übersprungen (kein Migrationspfad gefunden?): {exc}")
        try:
            seed_default_data()
        except Exception as exc:  # noqa: BLE001
            print(f"Seed übersprungen: {exc}")


def _start_backups():
    if app.config.get("READ_ONLY"):
        return None
    target_value = os.getenv("BACKUP_TARGET", "").strip()
    if not target_value:
        print("Automatische Backups deaktiviert: BACKUP_TARGET ist nicht gesetzt.")
        return None

    from services.backup_service import BackupScheduler

    with app.app_context():
        database_name = db.engine.url.database
    if not database_name:
        print("Automatische Backups deaktiviert: keine SQLite-Datei erkannt.")
        return None

    try:
        interval = int(os.getenv("BACKUP_INTERVAL_MINUTES", "60"))
        keep = int(os.getenv("BACKUP_KEEP", "30"))
    except ValueError as exc:
        raise SystemExit("BACKUP_INTERVAL_MINUTES und BACKUP_KEEP müssen Ganzzahlen sein.") from exc

    scheduler = BackupScheduler(
        Path(database_name),
        Path(target_value),
        interval,
        keep=keep,
    )
    scheduler.start()
    print(f"Automatische Backups aktiv: alle {max(1, interval)} Minute(n) nach {target_value}")
    return scheduler


def _serve(port: int = 5000) -> None:
    host = "127.0.0.1" if app.config.get("READ_ONLY") else "0.0.0.0"
    if app.debug:
        app.run(host=host, port=port)
        return
    try:
        from waitress import serve

        print(f"Server läuft (waitress) auf http://{host}:{port}")
        serve(app, host=host, port=port, threads=8)
    except ImportError:
        print("waitress nicht gefunden – nutze den eingebauten Server.")
        app.run(host=host, port=port)


if __name__ == "__main__":
    _init_db()
    _backup_scheduler = _start_backups()
    _serve()
