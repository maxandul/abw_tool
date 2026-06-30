"""Seed default Tätigkeiten (activity types).

Runs on app start when the kategorie table is empty, or replaces legacy
seed data when there are no Einträge yet.  Existing databases are upgraded
in-place via ``_ensure_catalog`` (renames + missing rows).
"""

from extensions import db
from models import Eintrag, Kategorie, Planung, Stoerung, Taetigkeitsgruppe

# (sort_order, name, farbe, gruppe, stoerung, planung, beschreibung)
DEFAULT_TAETIGKEITEN = [
    # Einzelarbeit – Grüntöne
    (1, "Call, Zuhörer erlaubt", "#58D68D", Taetigkeitsgruppe.EINZELARBEIT, Stoerung.ERLAUBT, None,
     "Telefon- oder Video-Call, bei dem andere mithören dürfen."),
    (2, "Call, keine Zuhörer, geplant", "#2ECC71", Taetigkeitsgruppe.EINZELARBEIT, Stoerung.UNGESTOERT, Planung.GEPLANT,
     "Geplanter Call ohne Zuhörer im Raum."),
    (3, "Call, keine Zuhörer, ungeplant", "#27AE60", Taetigkeitsgruppe.EINZELARBEIT, Stoerung.UNGESTOERT, Planung.UNGEPLANT,
     "Spontaner Call ohne Zuhörer im Raum."),
    (4, "Stille Einzelarbeit, Störung erlaubt", "#1E8449", Taetigkeitsgruppe.EINZELARBEIT, Stoerung.ERLAUBT, None,
     "Konzentrierte Einzelarbeit; kurze Unterbrechungen sind möglich."),
    (5, "Stille Einzelarbeit, ungestört", "#145A32", Taetigkeitsgruppe.EINZELARBEIT, Stoerung.UNGESTOERT, None,
     "Konzentrierte Einzelarbeit ohne Unterbrechungen."),
    # Zu zweit / zu dritt (physisch) – Blautöne
    (10, "Störung erlaubt, geplant (2/3)", "#85C1E9", Taetigkeitsgruppe.ZU_ZWEIT_DREIT, Stoerung.ERLAUBT, Planung.GEPLANT,
     "Geplantes Gespräch zu zweit oder zu dritt vor Ort. Unterbrechungen oder Zuhörer sind möglich."),
    (11, "Störung erlaubt, ungeplant (2/3)", "#5DADE2", Taetigkeitsgruppe.ZU_ZWEIT_DREIT, Stoerung.ERLAUBT, Planung.UNGEPLANT,
     "Spontanes Gespräch zu zweit oder zu dritt vor Ort. Unterbrechungen oder Zuhörer sind möglich."),
    (12, "Ungestört, geplant (2/3)", "#3498DB", Taetigkeitsgruppe.ZU_ZWEIT_DREIT, Stoerung.UNGESTOERT, Planung.GEPLANT,
     "Geplantes Gespräch zu zweit oder zu dritt vor Ort ohne Unterbrechungen und ohne Zuhörer."),
    (13, "Ungestört, ungeplant (2/3)", "#2874A6", Taetigkeitsgruppe.ZU_ZWEIT_DREIT, Stoerung.UNGESTOERT, Planung.UNGEPLANT,
     "Spontanes Gespräch zu zweit oder zu dritt vor Ort ohne Unterbrechungen und ohne Zuhörer."),
    # In Gruppen (4+, physisch) – Rottöne
    (20, "Störung erlaubt, geplant (4+)", "#F1948A", Taetigkeitsgruppe.GRUPPE_4PLUS, Stoerung.ERLAUBT, Planung.GEPLANT,
     "Geplante Gruppensitzung oder Workshop vor Ort. Unterbrechungen oder Zuhörer sind möglich."),
    (21, "Störung erlaubt, ungeplant (4+)", "#EC7063", Taetigkeitsgruppe.GRUPPE_4PLUS, Stoerung.ERLAUBT, Planung.UNGEPLANT,
     "Spontane Gruppenarbeit oder Ad-hoc-Meeting vor Ort. Unterbrechungen oder Zuhörer sind möglich."),
    (22, "Ungestört, geplant (4+)", "#E74C3C", Taetigkeitsgruppe.GRUPPE_4PLUS, Stoerung.UNGESTOERT, Planung.GEPLANT,
     "Geplante Gruppensitzung vor Ort ohne Unterbrechungen und ohne Zuhörer."),
    (23, "Ungestört, ungeplant (4+)", "#C0392B", Taetigkeitsgruppe.GRUPPE_4PLUS, Stoerung.UNGESTOERT, Planung.UNGEPLANT,
     "Spontane Gruppenarbeit vor Ort ohne Unterbrechungen und ohne Zuhörer."),
    # Extern – Grautöne
    (30, "Teilzeit / frei", "#D5D8DC", Taetigkeitsgruppe.EXTERN, None, None,
     "Nicht gearbeitet aufgrund Teilzeitpensum oder freier Zeit."),
    (31, "Homeoffice", "#BDC3C7", Taetigkeitsgruppe.EXTERN, None, None,
     "Arbeit im Homeoffice."),
    (32, "Mobil / anderer Standort", "#95A5A6", Taetigkeitsgruppe.EXTERN, None, None,
     "Arbeit ausserhalb des Erhebungsstandorts: Aussendienst, anderer Standort, unterwegs."),
]

# (gruppe, old_name, new_name) – preserves Eintrag FKs on rename.
_CATALOG_RENAMES: list[tuple[Taetigkeitsgruppe, str, str]] = [
    (Taetigkeitsgruppe.EINZELARBEIT, "Störung erlaubt", "Stille Einzelarbeit, Störung erlaubt"),
    (Taetigkeitsgruppe.EINZELARBEIT, "Ungestört", "Stille Einzelarbeit, ungestört"),
    (Taetigkeitsgruppe.EINZELARBEIT, "Still, Störung erlaubt", "Stille Einzelarbeit, Störung erlaubt"),
    (Taetigkeitsgruppe.EINZELARBEIT, "Still, ungestört", "Stille Einzelarbeit, ungestört"),
    (Taetigkeitsgruppe.ZU_ZWEIT_DREIT, "Störung erlaubt, geplant", "Störung erlaubt, geplant (2/3)"),
    (Taetigkeitsgruppe.ZU_ZWEIT_DREIT, "Störung erlaubt, ungeplant", "Störung erlaubt, ungeplant (2/3)"),
    (Taetigkeitsgruppe.ZU_ZWEIT_DREIT, "Ungestört, geplant", "Ungestört, geplant (2/3)"),
    (Taetigkeitsgruppe.ZU_ZWEIT_DREIT, "Ungestört, ungeplant", "Ungestört, ungeplant (2/3)"),
    (Taetigkeitsgruppe.GRUPPE_4PLUS, "Störung erlaubt, geplant", "Störung erlaubt, geplant (4+)"),
    (Taetigkeitsgruppe.GRUPPE_4PLUS, "Störung erlaubt, ungeplant", "Störung erlaubt, ungeplant (4+)"),
    (Taetigkeitsgruppe.GRUPPE_4PLUS, "Ungestört, geplant", "Ungestört, geplant (4+)"),
    (Taetigkeitsgruppe.GRUPPE_4PLUS, "Ungestört, ungeplant", "Ungestört, ungeplant (4+)"),
]


def _insert_default_taetigkeiten() -> None:
    for row in DEFAULT_TAETIGKEITEN:
        sort_order, name, farbe, gruppe, stoerung, planung, beschreibung = row
        db.session.add(
            Kategorie(
                name=name,
                farbe=farbe,
                beschreibung=beschreibung,
                taetigkeitsgruppe=gruppe,
                stoerung=stoerung,
                planung=planung,
                sort_order=sort_order,
            )
        )


def _apply_renames() -> None:
    for gruppe, old_name, new_name in _CATALOG_RENAMES:
        kat = Kategorie.query.filter_by(taetigkeitsgruppe=gruppe, name=old_name).first()
        if kat is None:
            continue
        target = Kategorie.query.filter_by(taetigkeitsgruppe=gruppe, name=new_name).first()
        if target is None:
            kat.name = new_name
        elif target.id != kat.id:
            kat.aktiv = False


def _ensure_catalog() -> None:
    """Bring an existing DB in line with the current default catalog."""
    _apply_renames()

    for row in DEFAULT_TAETIGKEITEN:
        sort_order, name, farbe, gruppe, stoerung, planung, beschreibung = row
        kat = Kategorie.query.filter_by(taetigkeitsgruppe=gruppe, name=name).first()
        if kat is None:
            kat = Kategorie.query.filter_by(
                taetigkeitsgruppe=gruppe, sort_order=sort_order
            ).first()
        if kat is None:
            db.session.add(
                Kategorie(
                    name=name,
                    farbe=farbe,
                    beschreibung=beschreibung,
                    taetigkeitsgruppe=gruppe,
                    stoerung=stoerung,
                    planung=planung,
                    sort_order=sort_order,
                    aktiv=True,
                )
            )
        else:
            kat.name = name
            kat.farbe = farbe
            kat.beschreibung = beschreibung
            kat.stoerung = stoerung
            kat.planung = planung
            kat.sort_order = sort_order
            kat.aktiv = True


def _needs_legacy_reseed() -> bool:
    """Detect pre-Tätigkeiten category seed (no stoerung/planung fields set)."""
    if Kategorie.query.count() == 0:
        return False
    if Eintrag.query.count() > 0:
        return False
    return Kategorie.query.filter(Kategorie.stoerung.isnot(None)).count() == 0


def seed_default_data() -> None:
    """Seed or upgrade default Tätigkeiten."""
    if _needs_legacy_reseed():
        Kategorie.query.delete()
        db.session.flush()
        _insert_default_taetigkeiten()
    elif Kategorie.query.count() == 0:
        _insert_default_taetigkeiten()
    else:
        _ensure_catalog()

    db.session.commit()
