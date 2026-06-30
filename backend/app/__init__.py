"""Flask application factory.

Creates and configures the Flask app, initialises extensions, registers
blueprints and serves the React single-page application from
``backend/static``.
"""

import os

from flask import Flask, jsonify, send_from_directory

from config import get_config
from extensions import db, migrate


def create_app(config_class=None) -> Flask:
    """Application factory."""
    app = Flask(
        __name__,
        static_folder=os.path.join(os.pardir, "static"),
        template_folder=os.path.join(os.pardir, "templates"),
    )
    app.config.from_object(config_class or get_config())

    db.init_app(app)
    migrate.init_app(app, db)

    # Import models so Flask-Migrate detects them.
    from models import (  # noqa: F401
        Eintrag,
        Einreichung,
        Gruppe,
        GruppenMitglied,
        Kategorie,
        Raumtyp,
        User,
    )

    _register_blueprints(app)
    _register_cli(app)
    _register_api_errors(app)
    _register_security_headers(app)
    _register_spa(app)

    return app


def _register_security_headers(app: Flask) -> None:
    """Add conservative security headers to every response.

    These work over plain HTTP and do not affect LAN access. A Content-Security-
    Policy is intentionally omitted here to avoid breaking the bundled SPA.
    """

    @app.after_request
    def _set_security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("Referrer-Policy", "same-origin")
        return response


def _register_api_errors(app: Flask) -> None:
    """Return JSON (not HTML) for unhandled API errors."""

    @app.errorhandler(500)
    def handle_500(err):
        from flask import request
        from werkzeug.exceptions import InternalServerError

        if request.path.startswith("/api/"):
            if app.debug:
                return jsonify({"data": None, "error": str(err)}), 500
            return jsonify(
                {
                    "data": None,
                    "error": "Interner Serverfehler – bitte Backend neu starten.",
                }
            ), 500
        return InternalServerError(original_exception=err)


def _register_blueprints(app: Flask) -> None:
    """Register all feature blueprints."""
    from app.admin.routes import admin_bp
    from app.auth.routes import auth_bp
    from app.auswertung.routes import auswertung_bp
    from app.teilnehmer.routes import teilnehmer_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(teilnehmer_bp)
    app.register_blueprint(auswertung_bp)


def _register_cli(app: Flask) -> None:
    """Register custom CLI commands (e.g. seeding)."""

    @app.cli.command("seed")
    def seed() -> None:
        """Seed default room types and categories."""
        from services.seed_service import seed_default_data

        seed_default_data()
        print("Seed abgeschlossen.")


def _register_spa(app: Flask) -> None:
    """Serve the React SPA and its static assets with client-side routing."""

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_spa(path: str):
        static_dir = app.static_folder
        if path and static_dir and os.path.exists(os.path.join(static_dir, path)):
            return send_from_directory(static_dir, path)
        index_path = os.path.join(static_dir or "", "index.html")
        if os.path.exists(index_path):
            return send_from_directory(static_dir, "index.html")
        # Fallback before the frontend has been built.
        return jsonify(
            {
                "data": None,
                "error": "Frontend wurde noch nicht gebaut. Bitte build.bat ausführen.",
            }
        ), 200
