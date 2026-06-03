"""Kategorie (activity category) model."""

from extensions import db


class Kategorie(db.Model):
    """An activity category that participants assign to their time blocks."""

    __tablename__ = "kategorie"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    beschreibung = db.Column(db.Text, nullable=True)
    farbe = db.Column(db.String(7), nullable=True)  # Hex colour, e.g. #4472C4
    raumtyp_id = db.Column(db.Integer, db.ForeignKey("raumtyp.id"), nullable=True)
    aktiv = db.Column(db.Boolean, nullable=False, default=True)
    sort_order = db.Column(db.Integer, nullable=False, default=0)

    raumtyp = db.relationship("Raumtyp", back_populates="kategorien")

    def to_dict(self) -> dict:
        """Return a JSON-serialisable representation of the category."""
        return {
            "id": self.id,
            "name": self.name,
            "beschreibung": self.beschreibung,
            "farbe": self.farbe,
            "raumtyp_id": self.raumtyp_id,
            "raumtyp_name": self.raumtyp.name if self.raumtyp else None,
            "aktiv": self.aktiv,
            "sort_order": self.sort_order,
        }
