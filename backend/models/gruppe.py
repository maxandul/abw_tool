"""Gruppe (group) model."""

import uuid
from datetime import datetime

from extensions import db


def generate_token() -> str:
    """Generate a unique token for the self-registration link."""
    return uuid.uuid4().hex


# Explicit allow-list of Kategorien offered to participants of a Gruppe. No
# rows for a given Gruppe means "unrestricted" – all active current-structure
# Kategorien are offered (the default, backward-compatible behaviour).
gruppe_kategorie = db.Table(
    "gruppe_kategorie",
    db.Column("gruppe_id", db.Integer, db.ForeignKey("gruppe.id"), primary_key=True),
    db.Column("kategorie_id", db.Integer, db.ForeignKey("kategorie.id"), primary_key=True),
)


class Gruppe(db.Model):
    """A survey group with a defined collection period."""

    __tablename__ = "gruppe"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    zeitraum_von = db.Column(db.Date, nullable=False)
    zeitraum_bis = db.Column(db.Date, nullable=False)
    registrierung_link_token = db.Column(
        db.String(64), unique=True, nullable=False, default=generate_token
    )
    aktiv = db.Column(db.Boolean, nullable=False, default=True)
    abgeschlossen = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)

    mitglieder = db.relationship(
        "GruppenMitglied", back_populates="gruppe", cascade="all, delete-orphan"
    )
    kategorien = db.relationship(
        "Kategorie", secondary=gruppe_kategorie, lazy="selectin"
    )

    def to_dict(self) -> dict:
        """Return a JSON-serialisable representation of the group."""
        return {
            "id": self.id,
            "name": self.name,
            "zeitraum_von": self.zeitraum_von.isoformat() if self.zeitraum_von else None,
            "zeitraum_bis": self.zeitraum_bis.isoformat() if self.zeitraum_bis else None,
            "aktiv": self.aktiv,
            "abgeschlossen": self.abgeschlossen,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            # None/empty = unrestricted (alle aktiven Tätigkeiten).
            "kategorie_ids": [k.id for k in self.kategorien] or None,
        }
