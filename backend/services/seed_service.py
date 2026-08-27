"""Seed default Tätigkeiten (activity types).

Runs on every app start. A brand-new (empty) ``kategorie`` table gets the
current Arbeitsform-based starter catalog. An existing, populated table is
only ever upgraded in-place for its *legacy* (pre-Arbeitsform-restructure)
rows via ``_ensure_catalog`` (renames + missing rows) – current-structure
Kategorien created by an admin are never touched by this module.
"""

from extensions import db
from models import (
    AbwesenheitGrund,
    Arbeitsform,
    Arbeitsort,
    Eintrag,
    Gruppengroesse,
    Kategorie,
    Planung,
    Rueckzugsbedarf,
    Stoerung,
    Taetigkeitsgruppe,
    Teilnehmerkreis,
)

# (sort_order, name, farbe, arbeitsform, arbeitsort, gruppengroesse,
#  teilnehmerkreis, rueckzugsbedarf, abwesenheit_grund, beschreibung)
ARBEITSFORM_DEFAULT_TAETIGKEITEN = [
    # Einzelarbeit – Grüntöne
    (1, "Einzelarbeit am Arbeitsplatz, Rückzug erforderlich", "#58D68D",
     Arbeitsform.EINZELARBEIT, Arbeitsort.UEBLICHER_ARBEITSPLATZ, None, None,
     Rueckzugsbedarf.ERFORDERLICH, None,
     "Konzentrierte Einzelarbeit am üblichen Arbeitsplatz/Standort, die einen ruhigen Rückzugsort braucht."),
    (2, "Einzelarbeit am Arbeitsplatz, gemeinsames Umfeld möglich", "#2ECC71",
     Arbeitsform.EINZELARBEIT, Arbeitsort.UEBLICHER_ARBEITSPLATZ, None, None,
     Rueckzugsbedarf.GEMEINSAM_MOEGLICH, None,
     "Einzelarbeit am üblichen Arbeitsplatz/Standort, die auch in einem offenen/gemeinsamen Umfeld möglich ist."),
    (3, "Homeoffice, Rückzug erforderlich", "#27AE60",
     Arbeitsform.EINZELARBEIT, Arbeitsort.HOMEOFFICE, None, None,
     Rueckzugsbedarf.ERFORDERLICH, None,
     "Konzentrierte Einzelarbeit im Homeoffice, die einen ruhigen Rückzugsort braucht."),
    (4, "Homeoffice, gemeinsames Umfeld möglich", "#1E8449",
     Arbeitsform.EINZELARBEIT, Arbeitsort.HOMEOFFICE, None, None,
     Rueckzugsbedarf.GEMEINSAM_MOEGLICH, None,
     "Einzelarbeit im Homeoffice ohne besonderen Rückzugsbedarf."),
    (5, "Anderer VD-Standort", "#145A32",
     Arbeitsform.EINZELARBEIT, Arbeitsort.ANDERER_VD_STANDORT, None, None,
     Rueckzugsbedarf.GEMEINSAM_MOEGLICH, None,
     "Einzelarbeit an einem anderen Standort der Verwaltungsdirektion."),
    (6, "Mobil/extern", "#0B5A2E",
     Arbeitsform.EINZELARBEIT, Arbeitsort.MOBIL_EXTERN, None, None,
     Rueckzugsbedarf.GEMEINSAM_MOEGLICH, None,
     "Einzelarbeit unterwegs, im Aussendienst oder an einem externen Ort."),
    # Besprechung/Meeting – Blautöne
    (10, "Meeting 2-4 Personen, standortintern, Rückzug erforderlich", "#85C1E9",
     Arbeitsform.MEETING, None, Gruppengroesse.ZWEI_BIS_VIER, Teilnehmerkreis.STANDORTINTERN,
     Rueckzugsbedarf.ERFORDERLICH, None,
     "Besprechung mit 2-4 standortinternen Personen, die einen separaten Raum braucht."),
    (11, "Meeting 2-4 Personen, standortintern, gemeinsames Umfeld möglich", "#5DADE2",
     Arbeitsform.MEETING, None, Gruppengroesse.ZWEI_BIS_VIER, Teilnehmerkreis.STANDORTINTERN,
     Rueckzugsbedarf.GEMEINSAM_MOEGLICH, None,
     "Besprechung mit 2-4 standortinternen Personen, auch in offener Umgebung möglich."),
    (12, "Meeting 2-4 Personen, standortübergreifend/extern", "#3498DB",
     Arbeitsform.MEETING, None, Gruppengroesse.ZWEI_BIS_VIER,
     Teilnehmerkreis.STANDORTUEBERGREIFEND_EXTERN, Rueckzugsbedarf.GEMEINSAM_MOEGLICH, None,
     "Besprechung mit 2-4 Personen unter Beteiligung anderer Standorte oder Externer."),
    (13, "Meeting 5-8 Personen, standortintern", "#2874A6",
     Arbeitsform.MEETING, None, Gruppengroesse.FUENF_BIS_ACHT, Teilnehmerkreis.STANDORTINTERN,
     Rueckzugsbedarf.GEMEINSAM_MOEGLICH, None,
     "Sitzung mit 5-8 standortinternen Personen."),
    (14, "Meeting 5-8 Personen, standortübergreifend/extern", "#1A5276",
     Arbeitsform.MEETING, None, Gruppengroesse.FUENF_BIS_ACHT,
     Teilnehmerkreis.STANDORTUEBERGREIFEND_EXTERN, Rueckzugsbedarf.GEMEINSAM_MOEGLICH, None,
     "Sitzung mit 5-8 Personen unter Beteiligung anderer Standorte oder Externer."),
    (15, "Meeting 9-12 Personen, standortintern", "#154360",
     Arbeitsform.MEETING, None, Gruppengroesse.NEUN_BIS_ZWOELF, Teilnehmerkreis.STANDORTINTERN,
     Rueckzugsbedarf.GEMEINSAM_MOEGLICH, None,
     "Grössere Sitzung oder Workshop mit 9-12 standortinternen Personen."),
    (16, "Meeting 13+ Personen, standortintern", "#0E2F44",
     Arbeitsform.MEETING, None, Gruppengroesse.DREIZEHN_PLUS, Teilnehmerkreis.STANDORTINTERN,
     Rueckzugsbedarf.GEMEINSAM_MOEGLICH, None,
     "Grossveranstaltung, Workshop oder Info-Anlass mit 13 oder mehr standortinternen Personen."),
    # Abwesenheit – Grautöne
    (30, "Teilzeit", "#D5D8DC",
     Arbeitsform.ABWESENHEIT, None, None, None, None, AbwesenheitGrund.TEILZEIT,
     "Vereinbarte freie Zeit aufgrund eines Teilzeitpensums (regulär nicht gearbeitet)."),
    (31, "Abwesend (Ferien, Krankheit, Feiertag etc.)", "#7F8C8D",
     Arbeitsform.ABWESENHEIT, None, None, None, None, AbwesenheitGrund.SONSTIGES,
     "Abwesend wegen Ferien, Krankheit, Feiertag oder Ähnlichem."),
]

# ---------------------------------------------------------------------------
# Legacy (pre-Arbeitsform-restructure) catalog – kept only to upgrade
# existing installs' legacy Kategorien in-place (renames, missing rows).
# Never used for new installs and never touches current-structure rows.
# ---------------------------------------------------------------------------

# (sort_order, name, farbe, gruppe, stoerung, planung, beschreibung)
LEGACY_DEFAULT_TAETIGKEITEN = [
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
    (30, "Teilzeit", "#D5D8DC", Taetigkeitsgruppe.EXTERN, None, None,
     "Vereinbarte freie Zeit aufgrund eines Teilzeitpensums (regulär nicht gearbeitet)."),
    (31, "Homeoffice", "#BDC3C7", Taetigkeitsgruppe.EXTERN, None, None,
     "Arbeit im Homeoffice."),
    (32, "Mobil / anderer Standort", "#95A5A6", Taetigkeitsgruppe.EXTERN, None, None,
     "Arbeit ausserhalb des Erhebungsstandorts: Aussendienst, anderer Standort, unterwegs."),
    (33, "Abwesend", "#7F8C8D", Taetigkeitsgruppe.EXTERN, None, None,
     "Abwesend wegen Ferien, Krankheit, Feiertag oder Ähnlichem."),
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
    # "Teilzeit / frei" split into a dedicated "Teilzeit" activity; "Abwesend"
    # (vacation/sick/etc.) is added as a separate new category.
    (Taetigkeitsgruppe.EXTERN, "Teilzeit / frei", "Teilzeit"),
]


def _insert_default_taetigkeiten() -> None:
    """Insert the current (Arbeitsform-based) starter catalog. Only called
    for a truly empty ``kategorie`` table – i.e. a fresh install."""
    for row in ARBEITSFORM_DEFAULT_TAETIGKEITEN:
        (
            sort_order, name, farbe, arbeitsform, arbeitsort, gruppengroesse,
            teilnehmerkreis, rueckzugsbedarf, abwesenheit_grund, beschreibung,
        ) = row
        db.session.add(
            Kategorie(
                name=name,
                farbe=farbe,
                beschreibung=beschreibung,
                arbeitsform=arbeitsform,
                arbeitsort=arbeitsort,
                gruppengroesse=gruppengroesse,
                teilnehmerkreis=teilnehmerkreis,
                rueckzugsbedarf=rueckzugsbedarf,
                abwesenheit_grund=abwesenheit_grund,
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
    """Bring an existing DB's *legacy* Kategorien in line with the legacy
    default catalog. Never touches current-structure (Arbeitsform-based)
    Kategorien, and does nothing at all on an install that has no legacy
    Kategorien in the first place (e.g. a fresh, new-structure-only install)."""
    if Kategorie.query.filter(Kategorie.taetigkeitsgruppe.isnot(None)).count() == 0:
        return

    _apply_renames()

    for row in LEGACY_DEFAULT_TAETIGKEITEN:
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
    """Detect a pre-Tätigkeiten category seed (neither the legacy nor the
    current structure's classification fields are set anywhere)."""
    if Kategorie.query.count() == 0:
        return False
    if Eintrag.query.count() > 0:
        return False
    if Kategorie.query.filter(Kategorie.arbeitsform.isnot(None)).count() > 0:
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
