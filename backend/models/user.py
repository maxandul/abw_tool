"""User model and role enumeration."""

import enum
from datetime import datetime

from extensions import db


class Rolle(enum.Enum):
    """User roles within the application."""

    ADMIN = "ADMIN"
    TEILNEHMER = "TEILNEHMER"


class User(db.Model):
    """An application user, either an administrator or a participant."""

    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    pin_hash = db.Column(db.String(255), nullable=False)
    rolle = db.Column(db.Enum(Rolle), nullable=False, default=Rolle.TEILNEHMER)
    aktiv = db.Column(db.Boolean, nullable=False, default=True)
    # True when an admin reset the PIN; the user must choose a new PIN on login.
    pin_temporaer = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)

    mitgliedschaften = db.relationship(
        "GruppenMitglied", back_populates="user", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        """Return a JSON-serialisable representation (without the PIN hash)."""
        return {
            "id": self.id,
            "email": self.email,
            "rolle": self.rolle.value,
            "aktiv": self.aktiv,
            "pin_temporaer": self.pin_temporaer,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
