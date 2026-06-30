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


def _serve(host: str = "0.0.0.0", port: int = 5000) -> None:
    """Serve the app.

    Uses the production-grade waitress WSGI server when available (more robust
    under concurrent access from many participants), and transparently falls
    back to Flask's built-in server if waitress is not installed. Either way the
    app is reachable over plain HTTP at http://<host-name>:5000 on the LAN.
    """
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
    _serve()
