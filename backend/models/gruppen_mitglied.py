"""GruppenMitglied (group membership) model – many-to-many between User and Gruppe."""

from datetime import datetime

from extensions import db


class GruppenMitglied(db.Model):
    """Association between a participant and a group.

    A single person can be a member of several active groups at the same time.
    """

    __tablename__ = "gruppen_mitglied"
    __table_args__ = (
        db.UniqueConstraint("user_id", "gruppe_id", name="uq_user_gruppe"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    gruppe_id = db.Column(db.Integer, db.ForeignKey("gruppe.id"), nullable=False)
    joined_at = db.Column(db.DateTime, nullable=False, default=datetime.now)
    # Profile attributes per Erhebung (may differ across groups for the same person).
    vorname = db.Column(db.String(255), nullable=True)
    nachname = db.Column(db.String(255), nullable=True)
    funktion = db.Column(db.String(255), nullable=True)
    organisationseinheit = db.Column(db.String(255), nullable=True)
    beschaeftigungsgrad = db.Column(db.Float, nullable=False, default=100.0)

    user = db.relationship("User", back_populates="mitgliedschaften")
    gruppe = db.relationship("Gruppe", back_populates="mitglieder")

    def profil_dict(self) -> dict:
        """Return erhebungs-specific profile fields."""
        return {
            "vorname": self.vorname,
            "nachname": self.nachname,
            "funktion": self.funktion,
            "organisationseinheit": self.organisationseinheit,
            "beschaeftigungsgrad": self.beschaeftigungsgrad,
        }
