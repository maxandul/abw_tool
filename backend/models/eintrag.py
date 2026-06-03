"""Eintrag (time-block entry) model."""

from datetime import datetime

from extensions import db


class Eintrag(db.Model):
    """A single time block recorded by a participant for a given day.

    Overlap validation per (user_id, gruppe_id, datum) is enforced in the
    service layer, not via a database constraint.
    """

    __tablename__ = "eintrag"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    gruppe_id = db.Column(db.Integer, db.ForeignKey("gruppe.id"), nullable=False)
    kategorie_id = db.Column(db.Integer, db.ForeignKey("kategorie.id"), nullable=False)
    datum = db.Column(db.Date, nullable=False)
    zeit_von = db.Column(db.Time, nullable=False)
    zeit_bis = db.Column(db.Time, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.now, onupdate=datetime.now
    )

    user = db.relationship("User")
    gruppe = db.relationship("Gruppe")
    kategorie = db.relationship("Kategorie")

    def to_dict(self) -> dict:
        """Return a JSON-serialisable representation of the entry."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "gruppe_id": self.gruppe_id,
            "kategorie_id": self.kategorie_id,
            "datum": self.datum.isoformat() if self.datum else None,
            "zeit_von": self.zeit_von.strftime("%H:%M") if self.zeit_von else None,
            "zeit_bis": self.zeit_bis.strftime("%H:%M") if self.zeit_bis else None,
        }
