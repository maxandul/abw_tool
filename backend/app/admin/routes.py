"""Admin API routes (Dok. 3)."""

import socket

from flask import Blueprint, request

from app.helpers import admin_required, err, login_required, ok
from app.utils import ValidationError, parse_date
from extensions import db
from models import Gruppe, GruppenMitglied, Rolle, User
from services import (
    auth_service,
    eintrag_service,
    gruppe_service,
    kategorie_service,
    raumtyp_service,
)

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

APP_PORT = 5000


@admin_bp.route("/server-url", methods=["GET"])
@admin_required
def server_url():
    """Return the app URL using the server hostname (stable on the org network)."""
    hostname = socket.gethostname().lower()
    return ok({"app_url": f"http://{hostname}:{APP_PORT}", "hostname": hostname})


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
    """Deprecated – registration links are no longer supported."""
    return err("Registrierungslinks werden nicht mehr unterstützt.", 410)


@admin_bp.route("/gruppen/<int:gruppe_id>/abschliessen", methods=["POST"])
@admin_required
def abschliessen_gruppe(gruppe_id: int):
    """Close a group so participants can no longer enter data."""
    try:
        g = gruppe_service.abschliessen_gruppe(gruppe_id)
        return ok(g.to_dict())
    except ValidationError as exc:
        return err(str(exc), 400)


@admin_bp.route("/gruppen/<int:gruppe_id>/wiederoeffnen", methods=["POST"])
@admin_required
def wiederoeffnen_gruppe(gruppe_id: int):
    """Re-open a closed group."""
    try:
        g = gruppe_service.wiederoeffnen_gruppe(gruppe_id)
        return ok(g.to_dict())
    except ValidationError as exc:
        return err(str(exc), 400)


@admin_bp.route("/gruppen/<int:gruppe_id>", methods=["DELETE"])
@admin_required
def delete_gruppe(gruppe_id: int):
    """Archive a group (only allowed when abgeschlossen=True). Data is retained."""
    try:
        gruppe_service.deactivate_gruppe(gruppe_id)
        return ok({"message": "Erhebung wurde archiviert."})
    except ValidationError as exc:
        return err(str(exc), 400)


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
    """Add or update a participant in a group (manual entry)."""
    body = request.get_json(silent=True) or {}
    try:
        result = gruppe_service.add_teilnehmer(gruppe_id, body)
        status = 200 if result.get("updated") else 201
        return ok(result, status)
    except ValidationError as exc:
        return err(str(exc), 400)


@admin_bp.route(
    "/gruppen/<int:gruppe_id>/teilnehmer/<int:user_id>", methods=["PUT"]
)
@admin_required
def put_teilnehmer(gruppe_id: int, user_id: int):
    """Update profile attributes of a group member."""
    body = request.get_json(silent=True) or {}
    try:
        return ok(gruppe_service.update_teilnehmer(gruppe_id, user_id, body))
    except ValidationError as exc:
        return err(str(exc), 400)


@admin_bp.route("/gruppen/<int:gruppe_id>/teilnehmer/import", methods=["POST"])
@admin_required
def import_teilnehmer(gruppe_id: int):
    """Bulk-import participants from a JSON array of row objects."""
    body = request.get_json(silent=True) or {}
    rows = body.get("rows") or []
    try:
        return ok(gruppe_service.import_teilnehmer(gruppe_id, rows))
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
# Teilnehmer-Einträge (Admin-Einsicht und -Bearbeitung im Namen des Teilnehmers)
# ---------------------------------------------------------------------------

def _get_mitglied(gruppe_id: int, user_id: int) -> GruppenMitglied:
    mitglied = GruppenMitglied.query.filter_by(
        gruppe_id=gruppe_id, user_id=user_id
    ).first()
    if mitglied is None:
        raise ValidationError("Teilnehmer gehört nicht zu dieser Erhebung.")
    return mitglied


def _mitglied_anzeigename(mitglied: GruppenMitglied) -> str:
    name = " ".join(p for p in (mitglied.vorname, mitglied.nachname) if p).strip()
    if name:
        return name
    if mitglied.user and mitglied.user.email:
        return mitglied.user.email
    return f"Teilnehmer {mitglied.user_id}"


@admin_bp.route(
    "/gruppen/<int:gruppe_id>/teilnehmer/<int:user_id>/kontext", methods=["GET"]
)
@admin_required
def admin_eintraege_kontext(gruppe_id: int, user_id: int):
    """Group + participant metadata for the admin entry view."""
    try:
        mitglied = _get_mitglied(gruppe_id, user_id)
    except ValidationError as exc:
        return err(str(exc), 404)
    gruppe = db.session.get(Gruppe, gruppe_id)
    if gruppe is None:
        return err("Erhebung nicht gefunden.", 404)
    return ok({
        "gruppe": {
            "id": gruppe.id,
            "name": gruppe.name,
            "zeitraum_von": gruppe.zeitraum_von.isoformat() if gruppe.zeitraum_von else None,
            "zeitraum_bis": gruppe.zeitraum_bis.isoformat() if gruppe.zeitraum_bis else None,
            "aktiv": gruppe.aktiv,
            "abgeschlossen": gruppe.abgeschlossen,
        },
        "teilnehmer": {
            "user_id": mitglied.user_id,
            "name": _mitglied_anzeigename(mitglied),
            "email": mitglied.user.email if mitglied.user else None,
            "beschaeftigungsgrad": mitglied.beschaeftigungsgrad,
        },
        "einreichung": eintrag_service.get_einreichung(user_id, gruppe_id),
    })


@admin_bp.route(
    "/gruppen/<int:gruppe_id>/teilnehmer/<int:user_id>/eintraege", methods=["GET"]
)
@admin_required
def admin_get_eintraege(gruppe_id: int, user_id: int):
    """List a participant's entries within a date range."""
    try:
        _get_mitglied(gruppe_id, user_id)
        datum_von = parse_date(request.args.get("datum_von") or "", "datum_von")
        datum_bis = parse_date(request.args.get("datum_bis") or "", "datum_bis")
    except ValidationError as exc:
        return err(str(exc), 400)
    return ok(
        eintrag_service.list_eintraege(user_id, gruppe_id, datum_von, datum_bis)
    )


@admin_bp.route(
    "/gruppen/<int:gruppe_id>/teilnehmer/<int:user_id>/eintraege", methods=["POST"]
)
@admin_required
def admin_post_eintrag(gruppe_id: int, user_id: int):
    """Create an entry on behalf of a participant (admin override)."""
    try:
        _get_mitglied(gruppe_id, user_id)
        eintrag = eintrag_service.create_eintrag(
            user_id, gruppe_id, request.get_json(silent=True) or {}, als_admin=True
        )
        return ok(eintrag.to_dict(), 201)
    except ValidationError as exc:
        return err(str(exc), 400)


@admin_bp.route(
    "/gruppen/<int:gruppe_id>/teilnehmer/<int:user_id>/eintraege/<int:eintrag_id>",
    methods=["PUT"],
)
@admin_required
def admin_put_eintrag(gruppe_id: int, user_id: int, eintrag_id: int):
    """Update a participant's entry (admin override)."""
    try:
        _get_mitglied(gruppe_id, user_id)
        eintrag = eintrag_service.update_eintrag(
            user_id, eintrag_id, request.get_json(silent=True) or {}, als_admin=True
        )
        return ok(eintrag.to_dict())
    except ValidationError as exc:
        return err(str(exc), 400)


@admin_bp.route(
    "/gruppen/<int:gruppe_id>/teilnehmer/<int:user_id>/eintraege/<int:eintrag_id>",
    methods=["DELETE"],
)
@admin_required
def admin_delete_eintrag(gruppe_id: int, user_id: int, eintrag_id: int):
    """Delete a participant's entry (admin override)."""
    try:
        _get_mitglied(gruppe_id, user_id)
        eintrag_service.delete_eintrag(user_id, eintrag_id, als_admin=True)
        return ok({"message": "Eintrag gelöscht."})
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


@admin_bp.route("/kategorien/<int:kategorie_id>/reaktivieren", methods=["POST"])
@admin_required
def reaktivieren_kategorie(kategorie_id: int):
    """Reactivate a previously deactivated category."""
    try:
        k = kategorie_service.set_aktiv(kategorie_id, True)
        return ok({"message": f"Kategorie '{k.name}' wurde reaktiviert."})
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


@admin_bp.route("/raumtypen/<int:raumtyp_id>/reaktivieren", methods=["POST"])
@admin_required
def reaktivieren_raumtyp(raumtyp_id: int):
    """Reactivate a previously deactivated room type."""
    try:
        r = raumtyp_service.set_aktiv(raumtyp_id, True)
        return ok({"message": f"Raumtyp '{r.name}' wurde reaktiviert."})
    except ValidationError as exc:
        return err(str(exc), 400)


# ---------------------------------------------------------------------------
# Admin-Verwaltung
# ---------------------------------------------------------------------------

@admin_bp.route("/admins", methods=["GET"])
@admin_required
def get_admins():
    """List all admin accounts."""
    admins = User.query.filter_by(rolle=Rolle.ADMIN).order_by(User.created_at).all()
    return ok([u.to_dict() for u in admins])


@admin_bp.route("/admins", methods=["POST"])
@admin_required
def post_admin():
    """Create a new admin with a temporary PIN."""
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    if not email or "@" not in email:
        return err("Bitte eine gültige E-Mail-Adresse angeben.", 400)
    if User.query.filter_by(email=email).first():
        return err("Diese E-Mail-Adresse ist bereits registriert.", 409)

    temp_pin = auth_service.generate_temp_pin()
    user = User(
        email=email,
        pin_hash=auth_service.hash_pin(temp_pin),
        rolle=Rolle.ADMIN,
        aktiv=True,
        pin_temporaer=True,
    )
    db.session.add(user)
    db.session.commit()
    return ok({"user": user.to_dict(), "temp_pin": temp_pin}, 201)


@admin_bp.route("/admins/<int:user_id>/pin-reset", methods=["POST"])
@admin_required
def reset_admin_pin(user_id: int):
    """Reset an admin's PIN to a new temporary PIN."""
    user = db.session.get(User, user_id)
    if user is None or user.rolle != Rolle.ADMIN:
        return err("Admin nicht gefunden.", 404)

    temp_pin = auth_service.generate_temp_pin()
    user.pin_hash = auth_service.hash_pin(temp_pin)
    user.pin_temporaer = True
    db.session.commit()
    return ok({"temp_pin": temp_pin})


@admin_bp.route("/admins/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_admin(user_id: int):
    """Delete an admin account. Cannot delete own account or last admin."""
    current = auth_service.current_user()
    if current and current.id == user_id:
        return err("Du kannst deinen eigenen Account nicht löschen.", 400)

    user = db.session.get(User, user_id)
    if user is None or user.rolle != Rolle.ADMIN:
        return err("Admin nicht gefunden.", 404)

    if User.query.filter_by(rolle=Rolle.ADMIN).count() <= 1:
        return err("Der letzte Admin-Account kann nicht gelöscht werden.", 400)

    db.session.delete(user)
    db.session.commit()
    return ok({"message": "Admin gelöscht."})
