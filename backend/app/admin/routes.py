"""Admin API routes (Dok. 3)."""

from flask import Blueprint, request

from app.helpers import admin_required, err, ok
from app.utils import ValidationError
from services import gruppe_service, kategorie_service, raumtyp_service

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@admin_bp.route("/dashboard", methods=["GET"])
@admin_required
def dashboard():
    """Aggregated dashboard data for all active groups."""
    return ok(gruppe_service.dashboard())


# ---------------------------------------------------------------------------
# Gruppen
# ---------------------------------------------------------------------------

@admin_bp.route("/gruppen", methods=["GET"])
@admin_required
def get_gruppen():
    """List all groups. Query param ?include_inaktiv=1 includes deactivated ones."""
    include_inaktiv = request.args.get("include_inaktiv") in ("1", "true", "True")
    return ok(gruppe_service.list_gruppen(include_inaktiv=include_inaktiv))


@admin_bp.route("/gruppen", methods=["POST"])
@admin_required
def post_gruppe():
    """Create a new group."""
    try:
        gruppe = gruppe_service.create_gruppe(request.get_json(silent=True) or {})
        return ok(gruppe.to_dict(), 201)
    except ValidationError as exc:
        return err(str(exc), 400)


@admin_bp.route("/gruppen/<int:gruppe_id>", methods=["GET"])
@admin_required
def get_gruppe(gruppe_id: int):
    """Return a single group with statistics."""
    try:
        gruppe = gruppe_service.get_gruppe(gruppe_id)
        return ok({**gruppe.to_dict(), "stats": gruppe_service.gruppe_stats(gruppe)})
    except ValidationError as exc:
        return err(str(exc), 404)


@admin_bp.route("/gruppen/<int:gruppe_id>", methods=["PUT"])
@admin_required
def put_gruppe(gruppe_id: int):
    """Update a group."""
    try:
        gruppe = gruppe_service.update_gruppe(
            gruppe_id, request.get_json(silent=True) or {}
        )
        return ok(gruppe.to_dict())
    except ValidationError as exc:
        return err(str(exc), 400)


@admin_bp.route("/gruppen/<int:gruppe_id>/neuer-token", methods=["POST"])
@admin_required
def neuer_token(gruppe_id: int):
    """Generate a new registration token (invalidates the old link)."""
    try:
        gruppe = gruppe_service.regenerate_token(gruppe_id)
        return ok(gruppe.to_dict())
    except ValidationError as exc:
        return err(str(exc), 404)


@admin_bp.route("/gruppen/<int:gruppe_id>", methods=["DELETE"])
@admin_required
def delete_gruppe(gruppe_id: int):
    """Soft-delete (deactivate) a group."""
    try:
        gruppe_service.deactivate_gruppe(gruppe_id)
        return ok({"message": "Gruppe wurde deaktiviert."})
    except ValidationError as exc:
        return err(str(exc), 404)


# ---------------------------------------------------------------------------
# Teilnehmer
# ---------------------------------------------------------------------------

@admin_bp.route("/gruppen/<int:gruppe_id>/teilnehmer", methods=["GET"])
@admin_required
def get_teilnehmer(gruppe_id: int):
    """List participants of a group."""
    try:
        return ok(gruppe_service.list_teilnehmer(gruppe_id))
    except ValidationError as exc:
        return err(str(exc), 404)


@admin_bp.route("/gruppen/<int:gruppe_id>/teilnehmer", methods=["POST"])
@admin_required
def post_teilnehmer(gruppe_id: int):
    """Add a participant to a group by email address."""
    body = request.get_json(silent=True) or {}
    try:
        result = gruppe_service.add_teilnehmer(gruppe_id, body.get("email") or "")
        return ok(result, 201)
    except ValidationError as exc:
        return err(str(exc), 400)


@admin_bp.route(
    "/gruppen/<int:gruppe_id>/teilnehmer/<int:user_id>", methods=["DELETE"]
)
@admin_required
def delete_teilnehmer(gruppe_id: int, user_id: int):
    """Remove a participant from a group (entries are retained)."""
    try:
        gruppe_service.remove_teilnehmer(gruppe_id, user_id)
        return ok({"message": "Teilnehmer wurde aus der Gruppe entfernt."})
    except ValidationError as exc:
        return err(str(exc), 400)


@admin_bp.route("/teilnehmer/<int:user_id>/pin-reset", methods=["POST"])
@admin_required
def pin_reset(user_id: int):
    """Reset a participant's PIN to a random temporary value."""
    try:
        temp_pin = gruppe_service.reset_pin(user_id)
        return ok({"temporaerer_pin": temp_pin})
    except ValidationError as exc:
        return err(str(exc), 404)


@admin_bp.route(
    "/teilnehmer/<int:user_id>/einreichung/<int:gruppe_id>", methods=["PUT"]
)
@admin_required
def put_einreichung_status(user_id: int, gruppe_id: int):
    """Change the submission status of a participant (admin transitions)."""
    body = request.get_json(silent=True) or {}
    try:
        result = gruppe_service.set_einreichung_status(
            user_id, gruppe_id, body.get("status") or ""
        )
        return ok(result)
    except ValidationError as exc:
        return err(str(exc), 400)


# ---------------------------------------------------------------------------
# Kategorien
# ---------------------------------------------------------------------------

@admin_bp.route("/kategorien", methods=["GET"])
@admin_required
def get_kategorien():
    """List all categories (including deactivated)."""
    return ok(kategorie_service.list_kategorien())


@admin_bp.route("/kategorien", methods=["POST"])
@admin_required
def post_kategorie():
    """Create a new category."""
    try:
        k = kategorie_service.create_kategorie(request.get_json(silent=True) or {})
        return ok(k.to_dict(), 201)
    except ValidationError as exc:
        return err(str(exc), 400)


@admin_bp.route("/kategorien/<int:kategorie_id>", methods=["PUT"])
@admin_required
def put_kategorie(kategorie_id: int):
    """Update a category.

    Query param: ?modus=ueberschreiben (default) | neu
    """
    modus = request.args.get("modus", "ueberschreiben")
    try:
        k = kategorie_service.update_kategorie(
            kategorie_id, request.get_json(silent=True) or {}, modus=modus
        )
        return ok(k.to_dict())
    except ValidationError as exc:
        return err(str(exc), 400)


@admin_bp.route("/kategorien/<int:kategorie_id>", methods=["DELETE"])
@admin_required
def delete_kategorie(kategorie_id: int):
    """Soft-delete (deactivate) a category."""
    try:
        k = kategorie_service.set_aktiv(kategorie_id, False)
        return ok({"message": f"Kategorie '{k.name}' wurde deaktiviert."})
    except ValidationError as exc:
        return err(str(exc), 400)


# ---------------------------------------------------------------------------
# Raumtypen
# ---------------------------------------------------------------------------

@admin_bp.route("/raumtypen", methods=["GET"])
@admin_required
def get_raumtypen():
    """List all room types (including deactivated)."""
    return ok(raumtyp_service.list_raumtypen())


@admin_bp.route("/raumtypen", methods=["POST"])
@admin_required
def post_raumtyp():
    """Create a new room type."""
    try:
        r = raumtyp_service.create_raumtyp(request.get_json(silent=True) or {})
        return ok(r.to_dict(), 201)
    except ValidationError as exc:
        return err(str(exc), 400)


@admin_bp.route("/raumtypen/<int:raumtyp_id>", methods=["PUT"])
@admin_required
def put_raumtyp(raumtyp_id: int):
    """Update a room type."""
    try:
        r = raumtyp_service.update_raumtyp(
            raumtyp_id, request.get_json(silent=True) or {}
        )
        return ok(r.to_dict())
    except ValidationError as exc:
        return err(str(exc), 400)


@admin_bp.route("/raumtypen/<int:raumtyp_id>", methods=["DELETE"])
@admin_required
def delete_raumtyp(raumtyp_id: int):
    """Soft-delete a room type (only if no active categories reference it)."""
    try:
        r = raumtyp_service.set_aktiv(raumtyp_id, False)
        return ok({"message": f"Raumtyp '{r.name}' wurde deaktiviert."})
    except ValidationError as exc:
        return err(str(exc), 400)
