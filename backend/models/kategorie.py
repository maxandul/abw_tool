"""Kategorie (activity category) model."""

import enum

from extensions import db


class Vertraulichkeit(enum.Enum):
    OFFEN       = "OFFEN"        # Externe dürfen zuhören
    INTERN      = "INTERN"       # Nur Kolleginnen/Kollegen
    VERTRAULICH = "VERTRAULICH"  # Abgeschlossener Raum nötig


class Gruppengroesse(enum.Enum):
    ALLEIN = "ALLEIN"   # 1 Person
    KLEIN  = "KLEIN"    # 2–5 Personen
    MITTEL = "MITTEL"   # 6–15 Personen
    GROSS  = "GROSS"    # 16+ Personen

# Many-to-many association table between Kategorie and Raumtyp.
kategorie_raumtyp = db.Table(
    "kategorie_raumtyp",
    db.Column("kategorie_id", db.Integer, db.ForeignKey("kategorie.id"), primary_key=True),
    db.Column("raumtyp_id",   db.Integer, db.ForeignKey("raumtyp.id"),   primary_key=True),
)


class Kategorie(db.Model):
    """An activity category that participants assign to their time blocks."""

    __tablename__ = "kategorie"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    beschreibung = db.Column(db.Text, nullable=True)
    farbe = db.Column(db.String(7), nullable=True)  # Hex colour, e.g. #4472C4
    vertraulichkeit = db.Column(db.Enum(Vertraulichkeit), nullable=True)
    gruppengroesse  = db.Column(db.Enum(Gruppengroesse),  nullable=True)
    aktiv = db.Column(db.Boolean, nullable=False, default=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    raumtypen = db.relationship(
        "Raumtyp",
        secondary=kategorie_raumtyp,
        back_populates="kategorien",
        lazy="select",
    )

    def to_dict(self) -> dict:
        """Return a JSON-serialisable representation of the category."""
        return {
            "id": self.id,
            "name": self.name,
            "beschreibung": self.beschreibung,
            "farbe": self.farbe,
            "raumtyp_ids": [r.id for r in self.raumtypen],
            "raumtyp_namen": [r.name for r in self.raumtypen],
            "vertraulichkeit": self.vertraulichkeit.value if self.vertraulichkeit else None,
            "gruppengroesse": self.gruppengroesse.value if self.gruppengroesse else None,
            "aktiv": self.aktiv,
            "sort_order": self.sort_order,
        }
