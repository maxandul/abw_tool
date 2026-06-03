"""Flask entry point.

Run with ``python backend\\run.py`` (from the project root) or via the
Flask CLI with ``FLASK_APP=backend/run.py``. Ensures the backend directory
is importable regardless of the current working directory.

On every start this module:
  1. Applies any pending database migrations (flask_migrate.upgrade).
  2. Seeds the default room types and categories if the tables are empty.

This means a fresh checkout works out of the box without having to run
``flask db upgrade`` or ``setup.bat`` manually first.
"""

import os
import sys

# Make backend/ importable as the top-level package root.
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app  # noqa: E402

app = create_app()


def _init_db() -> None:
    """Apply migrations and seed default data on every start."""
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


if __name__ == "__main__":
    _init_db()
    app.run(host="0.0.0.0", port=5000)
