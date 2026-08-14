"""Flask application factory."""

import html
import os
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from config import get_config
from extensions import db, migrate


def create_app(config_class=None) -> Flask:
    app = Flask(
        __name__,
        static_folder=os.path.join(os.pardir, "static"),
        template_folder=os.path.join(os.pardir, "templates"),
    )
    app.config.from_object(config_class or get_config())

    db.init_app(app)
    migrate.init_app(app, db)

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
    _register_readonly_guard(app)
    _register_security_headers(app)
    _register_spa(app)
    return app


def _register_readonly_guard(app: Flask) -> None:
    """Block all state-changing API calls in read-only mode.

    Login and logout only change the signed browser session and therefore stay
    available. The database itself is additionally opened with SQLite mode=ro.
    """
    if not app.config.get("READ_ONLY"):
        return

    allowed_session_posts = {"/api/auth/login", "/api/auth/logout"}

    @app.before_request
    def _reject_writes():
        if request.method in {"GET", "HEAD", "OPTIONS"}:
            return None
        if request.path in allowed_session_posts:
            return None
        if request.path.startswith("/api/"):
            return jsonify(
                {
                    "data": None,
                    "error": "Read-only-Modus: Änderungen sind in dieser Kopie gesperrt.",
                }
            ), 403
        return None


def _register_security_headers(app: Flask) -> None:
    @app.after_request
    def _set_security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("Referrer-Policy", "same-origin")
        return response


def _register_api_errors(app: Flask) -> None:
    @app.errorhandler(500)
    def handle_500(err):
        from werkzeug.exceptions import InternalServerError

        if request.path.startswith("/api/"):
            if app.debug:
                return jsonify({"data": None, "error": str(err)}), 500
            return jsonify(
                {"data": None, "error": "Interner Serverfehler – bitte Backend neu starten."}
            ), 500
        return InternalServerError(original_exception=err)


def _register_blueprints(app: Flask) -> None:
    from app.admin.routes import admin_bp
    from app.auth.routes import auth_bp
    from app.auswertung.routes import auswertung_bp
    from app.teilnehmer.routes import teilnehmer_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(teilnehmer_bp)
    app.register_blueprint(auswertung_bp)


def _register_cli(app: Flask) -> None:
    @app.cli.command("seed")
    def seed() -> None:
        if app.config.get("READ_ONLY"):
            raise RuntimeError("Seed ist im Read-only-Modus gesperrt.")
        from services.seed_service import seed_default_data

        seed_default_data()
        print("Seed abgeschlossen.")


def _readonly_banner(app: Flask) -> str:
    timestamp = html.escape(app.config.get("READONLY_SNAPSHOT_TIMESTAMP") or "unbekannt")
    return (
        '<div role="status" style="position:fixed;left:0;right:0;bottom:0;z-index:9999;'
        'padding:9px 16px;background:#fef3c7;color:#78350f;border-top:1px solid #f59e0b;'
        'font:600 14px/1.3 system-ui,sans-serif;text-align:center">'
        f'Read-only-Modus – Datenstand: {timestamp}. Änderungen sind gesperrt.'
        '</div>'
    )


def _register_spa(app: Flask) -> None:
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_spa(path: str):
        static_dir = app.static_folder
        if path and static_dir and os.path.exists(os.path.join(static_dir, path)):
            return send_from_directory(static_dir, path)

        index_path = Path(static_dir or "") / "index.html"
        if index_path.exists():
            if not app.config.get("READ_ONLY"):
                return send_from_directory(static_dir, "index.html")
            index_html = index_path.read_text(encoding="utf-8")
            banner = _readonly_banner(app)
            index_html = index_html.replace("</body>", f"{banner}</body>")
            return app.response_class(index_html, mimetype="text/html")

        return jsonify(
            {"data": None, "error": "Frontend wurde noch nicht gebaut. Bitte build.bat ausführen."}
        ), 200
