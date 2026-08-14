"""Create one consistent backup using the configured production database."""

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ["APP_MODE"] = "production"

from app import create_app  # noqa: E402
from extensions import db  # noqa: E402
from services.backup_service import create_consistent_backup  # noqa: E402


def main() -> int:
    target_value = os.getenv("BACKUP_TARGET", "").strip()
    if not target_value:
        print("Fehler: BACKUP_TARGET fehlt in der .env-Datei.")
        return 1

    app = create_app()
    with app.app_context():
        database_name = db.engine.url.database
    if not database_name:
        print("Fehler: Die konfigurierte Datenbank ist keine SQLite-Datei.")
        return 1

    keep = int(os.getenv("BACKUP_KEEP", "30"))
    backup = create_consistent_backup(Path(database_name), Path(target_value), keep=keep)
    print(f"Backup erstellt: {backup}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
