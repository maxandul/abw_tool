"""Raumtyp (room type) model."""

from extensions import db


class Raumtyp(db.Model):
    """A type of room/space that activity categories can be mapped to."""

    __tablename__ = "raumtyp"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    beschreibung = db.Column(db.Text, nullable=True)
    aktiv = db.Column(db.Boolean, nullable=False, default=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    kategorien = db.relationship(
        "Kategorie",
        secondary="kategorie_raumtyp",
        back_populates="raumtypen",
        lazy="select",
    )

    def to_dict(self) -> dict:
        """Return a JSON-serialisable representation of the room type."""
        return {
            "id": self.id,
            "name": self.name,
            "beschreibung": self.beschreibung,
            "aktiv": self.aktiv,
            "sort_order": self.sort_order,
        }
