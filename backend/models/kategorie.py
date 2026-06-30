"""Kategorie (Tätigkeit) model."""

import enum

from extensions import db


class Taetigkeitsgruppe(enum.Enum):
    """Top-level grouping for participant dropdown and analysis."""

    EINZELARBEIT = "EINZELARBEIT"
    ZU_ZWEIT_DREIT = "ZU_ZWEIT_DREIT"
    GRUPPE_4PLUS = "GRUPPE_4PLUS"
    EXTERN = "EXTERN"


class Stoerung(enum.Enum):
    """Whether interruptions are acceptable (not used for Extern)."""

    ERLAUBT = "ERLAUBT"
    UNGESTOERT = "UNGESTOERT"


class Planung(enum.Enum):
    """Planned vs spontaneous (only for 2–3 and 4+ groups)."""

    GEPLANT = "GEPLANT"
    UNGEPLANT = "UNGEPLANT"


TAETIGKEITSGRUPPE_LABELS = {
    Taetigkeitsgruppe.EINZELARBEIT: "Einzelarbeit",
    Taetigkeitsgruppe.ZU_ZWEIT_DREIT: "Zu zweit/zu dritt (physisch)",
    Taetigkeitsgruppe.GRUPPE_4PLUS: "In Gruppen (4+, physisch)",
    Taetigkeitsgruppe.EXTERN: "Extern",
}


class Kategorie(db.Model):
    """A Tätigkeit (activity type) that participants assign to time blocks."""

    __tablename__ = "kategorie"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    beschreibung = db.Column(db.Text, nullable=True)
    farbe = db.Column(db.String(7), nullable=True)
    taetigkeitsgruppe = db.Column(db.Enum(Taetigkeitsgruppe), nullable=False)
    stoerung = db.Column(db.Enum(Stoerung), nullable=True)
    planung = db.Column(db.Enum(Planung), nullable=True)
    aktiv = db.Column(db.Boolean, nullable=False, default=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    def to_dict(self) -> dict:
        """Return a JSON-serialisable representation of the Tätigkeit."""
        return {
            "id": self.id,
            "name": self.name,
            "beschreibung": self.beschreibung,
            "farbe": self.farbe,
            "taetigkeitsgruppe": self.taetigkeitsgruppe.value,
            "taetigkeitsgruppe_label": TAETIGKEITSGRUPPE_LABELS.get(
                self.taetigkeitsgruppe, self.taetigkeitsgruppe.value
            ),
            "stoerung": self.stoerung.value if self.stoerung else None,
            "planung": self.planung.value if self.planung else None,
            "aktiv": self.aktiv,
            "sort_order": self.sort_order,
        }
