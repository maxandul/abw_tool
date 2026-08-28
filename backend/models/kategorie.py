"""Kategorie (Tätigkeit) model."""

import enum

from extensions import db


class Taetigkeitsgruppe(enum.Enum):
    """Legacy top-level grouping (pre-Arbeitsform restructure).

    Kept only so existing Kategorie rows from the first Erhebung keep
    working unchanged. New Kategorien no longer set this field – see
    ``Arbeitsform`` instead.
    """

    EINZELARBEIT = "EINZELARBEIT"
    ZU_ZWEIT_DREIT = "ZU_ZWEIT_DREIT"
    GRUPPE_4PLUS = "GRUPPE_4PLUS"
    EXTERN = "EXTERN"


class Stoerung(enum.Enum):
    """Legacy: whether interruptions are acceptable (not used for Extern)."""

    ERLAUBT = "ERLAUBT"
    UNGESTOERT = "UNGESTOERT"


class Planung(enum.Enum):
    """Legacy: planned vs spontaneous (only for 2–3 and 4+ groups)."""

    GEPLANT = "GEPLANT"
    UNGEPLANT = "UNGEPLANT"


class Arbeitsform(enum.Enum):
    """Top-level grouping for participant dropdown and analysis."""

    EINZELARBEIT = "EINZELARBEIT"
    MEETING = "MEETING"
    ABWESENHEIT = "ABWESENHEIT"


class Arbeitsort(enum.Enum):
    """Where Einzelarbeit takes place."""

    UEBLICHER_ARBEITSPLATZ = "UEBLICHER_ARBEITSPLATZ"
    HOMEOFFICE = "HOMEOFFICE"
    ANDERER_VD_STANDORT = "ANDERER_VD_STANDORT"
    MOBIL_EXTERN = "MOBIL_EXTERN"


class Gruppengroesse(enum.Enum):
    """Size bracket for a Meeting."""

    ZWEI_BIS_VIER = "ZWEI_BIS_VIER"
    FUENF_BIS_ACHT = "FUENF_BIS_ACHT"
    NEUN_BIS_ZWOELF = "NEUN_BIS_ZWOELF"
    DREIZEHN_PLUS = "DREIZEHN_PLUS"


class Teilnehmerkreis(enum.Enum):
    """Who takes part in a Meeting."""

    STANDORTINTERN = "STANDORTINTERN"
    STANDORTUEBERGREIFEND_EXTERN = "STANDORTUEBERGREIFEND_EXTERN"


class Rueckzugsbedarf(enum.Enum):
    """Whether Einzelarbeit/Meeting needs a quiet, separate space."""

    ERFORDERLICH = "ERFORDERLICH"
    GEMEINSAM_MOEGLICH = "GEMEINSAM_MOEGLICH"


class AbwesenheitGrund(enum.Enum):
    """Reason for Abwesenheit."""

    TEILZEIT = "TEILZEIT"
    SONSTIGES = "SONSTIGES"


TAETIGKEITSGRUPPE_LABELS = {
    Taetigkeitsgruppe.EINZELARBEIT: "Einzelarbeit",
    Taetigkeitsgruppe.ZU_ZWEIT_DREIT: "Zu zweit/zu dritt (physisch)",
    Taetigkeitsgruppe.GRUPPE_4PLUS: "In Gruppen (4+, physisch)",
    Taetigkeitsgruppe.EXTERN: "Extern",
}

ARBEITSFORM_LABELS = {
    Arbeitsform.EINZELARBEIT: "Einzelarbeit",
    Arbeitsform.MEETING: "Besprechung/Meeting",
    Arbeitsform.ABWESENHEIT: "Abwesenheit",
}

ARBEITSORT_LABELS = {
    Arbeitsort.UEBLICHER_ARBEITSPLATZ: "Üblicher Arbeitsplatz/Standort",
    Arbeitsort.HOMEOFFICE: "Homeoffice",
    Arbeitsort.ANDERER_VD_STANDORT: "Anderer VD-Standort",
    Arbeitsort.MOBIL_EXTERN: "Mobil/extern",
}

GRUPPENGROESSE_LABELS = {
    Gruppengroesse.ZWEI_BIS_VIER: "2-4 Personen",
    Gruppengroesse.FUENF_BIS_ACHT: "5-8 Personen",
    Gruppengroesse.NEUN_BIS_ZWOELF: "9-12 Personen",
    Gruppengroesse.DREIZEHN_PLUS: "13+ Personen",
}

TEILNEHMERKREIS_LABELS = {
    Teilnehmerkreis.STANDORTINTERN: "Standortintern",
    Teilnehmerkreis.STANDORTUEBERGREIFEND_EXTERN: "Standortübergreifend/extern",
}

RUECKZUGSBEDARF_LABELS = {
    Rueckzugsbedarf.ERFORDERLICH: "Rückzug erforderlich",
    Rueckzugsbedarf.GEMEINSAM_MOEGLICH: "Gemeinsames Umfeld möglich",
}

ABWESENHEIT_GRUND_LABELS = {
    AbwesenheitGrund.TEILZEIT: "Teilzeit",
    AbwesenheitGrund.SONSTIGES: "Sonstiges (Ferien, Krankheit, Feiertag etc.)",
}


class Kategorie(db.Model):
    """A Tätigkeit (activity type) that participants assign to time blocks.

    Kategorien created going forward use the ``arbeitsform``-based fields.
    Kategorien from the first Erhebung (before this restructure) keep using
    the legacy ``taetigkeitsgruppe``/``stoerung``/``planung`` fields and are
    identified by ``arbeitsform IS NULL``; they are intentionally never
    migrated into the new structure and no longer offered to participants
    for new entries (see ``kategorie_service.list_kategorien``).
    """

    __tablename__ = "kategorie"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    beschreibung = db.Column(db.Text, nullable=True)
    farbe = db.Column(db.String(7), nullable=True)
    aktiv = db.Column(db.Boolean, nullable=False, default=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    # Legacy classification (pre-Arbeitsform restructure).
    taetigkeitsgruppe = db.Column(db.Enum(Taetigkeitsgruppe), nullable=True)
    stoerung = db.Column(db.Enum(Stoerung), nullable=True)
    planung = db.Column(db.Enum(Planung), nullable=True)

    # Current classification.
    arbeitsform = db.Column(db.Enum(Arbeitsform), nullable=True)
    arbeitsort = db.Column(db.Enum(Arbeitsort), nullable=True)
    gruppengroesse = db.Column(db.Enum(Gruppengroesse), nullable=True)
    teilnehmerkreis = db.Column(db.Enum(Teilnehmerkreis), nullable=True)
    rueckzugsbedarf = db.Column(db.Enum(Rueckzugsbedarf), nullable=True)
    abwesenheit_grund = db.Column(db.Enum(AbwesenheitGrund), nullable=True)

    @property
    def ist_legacy(self) -> bool:
        """True for Kategorien from before the Arbeitsform restructure."""
        return self.arbeitsform is None

    @property
    def offene_merkmale(self) -> list[str]:
        """Attribute fields applicable to this Arbeitsform that the admin
        left undefined – the participant must supply these at entry time."""
        if self.arbeitsform is None:
            return []
        if self.arbeitsform == Arbeitsform.EINZELARBEIT:
            felder = []
            if self.arbeitsort is None:
                felder.append("arbeitsort")
            # Rückzugsbedarf ist nur beim üblichen Arbeitsplatz/Standort relevant.
            # Ist der Arbeitsort selbst noch offen, hängt das erst von der
            # späteren Wahl der Teilnehmenden ab – als potenziell offenes
            # Merkmal trotzdem gelistet.
            if self.rueckzugsbedarf is None and (
                self.arbeitsort is None or self.arbeitsort == Arbeitsort.UEBLICHER_ARBEITSPLATZ
            ):
                felder.append("rueckzugsbedarf")
            return felder
        elif self.arbeitsform == Arbeitsform.MEETING:
            felder = ["gruppengroesse", "teilnehmerkreis", "rueckzugsbedarf"]
        else:
            felder = []
        return [f for f in felder if getattr(self, f) is None]

    def to_dict(self) -> dict:
        """Return a JSON-serialisable representation of the Tätigkeit."""
        return {
            "id": self.id,
            "name": self.name,
            "beschreibung": self.beschreibung,
            "farbe": self.farbe,
            "aktiv": self.aktiv,
            "sort_order": self.sort_order,
            "ist_legacy": self.ist_legacy,
            "offene_merkmale": self.offene_merkmale,
            # Legacy fields (only populated for pre-restructure Kategorien).
            "taetigkeitsgruppe": self.taetigkeitsgruppe.value if self.taetigkeitsgruppe else None,
            "taetigkeitsgruppe_label": TAETIGKEITSGRUPPE_LABELS.get(self.taetigkeitsgruppe)
            if self.taetigkeitsgruppe
            else None,
            "stoerung": self.stoerung.value if self.stoerung else None,
            "planung": self.planung.value if self.planung else None,
            # Current fields.
            "arbeitsform": self.arbeitsform.value if self.arbeitsform else None,
            "arbeitsform_label": ARBEITSFORM_LABELS.get(self.arbeitsform) if self.arbeitsform else None,
            "arbeitsort": self.arbeitsort.value if self.arbeitsort else None,
            "arbeitsort_label": ARBEITSORT_LABELS.get(self.arbeitsort) if self.arbeitsort else None,
            "gruppengroesse": self.gruppengroesse.value if self.gruppengroesse else None,
            "gruppengroesse_label": GRUPPENGROESSE_LABELS.get(self.gruppengroesse)
            if self.gruppengroesse
            else None,
            "teilnehmerkreis": self.teilnehmerkreis.value if self.teilnehmerkreis else None,
            "teilnehmerkreis_label": TEILNEHMERKREIS_LABELS.get(self.teilnehmerkreis)
            if self.teilnehmerkreis
            else None,
            "rueckzugsbedarf": self.rueckzugsbedarf.value if self.rueckzugsbedarf else None,
            "rueckzugsbedarf_label": RUECKZUGSBEDARF_LABELS.get(self.rueckzugsbedarf)
            if self.rueckzugsbedarf
            else None,
            "abwesenheit_grund": self.abwesenheit_grund.value if self.abwesenheit_grund else None,
            "abwesenheit_grund_label": ABWESENHEIT_GRUND_LABELS.get(self.abwesenheit_grund)
            if self.abwesenheit_grund
            else None,
        }
