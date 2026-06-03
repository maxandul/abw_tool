"""Einreichung (submission state) model."""

import enum
from datetime import datetime

from extensions import db


class EinreichungStatus(enum.Enum):
    """Lifecycle states of a participant's submission within a group."""

    OFFEN = "OFFEN"
    EINGEREICHT = "EINGEREICHT"
    IN_BEARBEITUNG = "IN_BEARBEITUNG"
    ABGESCHLOSSEN = "ABGESCHLOSSEN"


class Einreichung(db.Model):
    """Tracks the submission status of one participant for one group.

    Created automatically with the participant's first entry in a group.
    """

    __tablename__ = "einreichung"
    __table_args__ = (
        db.UniqueConstraint("user_id", "gruppe_id", name="uq_einreichung_user_gruppe"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    gruppe_id = db.Column(db.Integer, db.ForeignKey("gruppe.id"), nullable=False)
    status = db.Column(
        db.Enum(EinreichungStatus),
        nullable=False,
        default=EinreichungStatus.OFFEN,
    )
    eingereicht_am = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.now, onupdate=datetime.now
    )

    user = db.relationship("User")
    gruppe = db.relationship("Gruppe")

    def to_dict(self) -> dict:
        """Return a JSON-serialisable representation of the submission state."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "gruppe_id": self.gruppe_id,
            "status": self.status.value,
            "eingereicht_am": (
                self.eingereicht_am.isoformat() if self.eingereicht_am else None
            ),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
