"""Flask entry point.

Run with ``python backend\\run.py`` (from the project root) or via the
Flask CLI with ``FLASK_APP=backend/run.py``. Ensures the backend directory
is importable regardless of the current working directory.
"""

import os
import sys

# Make backend/ importable as the top-level package root.
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app  # noqa: E402

app = create_app()


def _seed_on_start() -> None:
    """Seed default data on start (safe: only inserts when tables are empty)."""
    from services.seed_service import seed_default_data

    with app.app_context():
        try:
            seed_default_data()
        except Exception as exc:  # noqa: BLE001
            # Tables may not exist yet before the first migration; ignore.
            print(f"Seed übersprungen: {exc}")


if __name__ == "__main__":
    _seed_on_start()
    app.run(host="0.0.0.0", port=5000)
