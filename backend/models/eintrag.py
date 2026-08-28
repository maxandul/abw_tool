"""Eintrag (time-block entry) model."""

from datetime import datetime

from extensions import db
from models.kategorie import (
    ARBEITSORT_LABELS,
    GRUPPENGROESSE_LABELS,
    RUECKZUGSBEDARF_LABELS,
    TEILNEHMERKREIS_LABELS,
    Arbeitsort,
    Gruppengroesse,
    Rueckzugsbedarf,
    Teilnehmerkreis,
)


class Eintrag(db.Model):
    """A single time block recorded by a participant for a given day.

    Overlap validation per (user_id, gruppe_id, datum) is enforced in the
    service layer, not via a database constraint.

    Arbeitsort/Rueckzugsbedarf/Gruppengroesse/Teilnehmerkreis here are only
    ever set when the Kategorie left the corresponding attribute open (see
    ``Kategorie.offene_merkmale``) – the participant fills them in at entry
    time. Where the Kategorie already defines an attribute, it is
    authoritative and this column stays ``None``; see the ``effective_*``
    properties for the value that actually applies.
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

    # Participant-supplied values for attributes the Kategorie left open.
    arbeitsort = db.Column(db.Enum(Arbeitsort), nullable=True)
    rueckzugsbedarf = db.Column(db.Enum(Rueckzugsbedarf), nullable=True)
    gruppengroesse = db.Column(db.Enum(Gruppengroesse), nullable=True)
    teilnehmerkreis = db.Column(db.Enum(Teilnehmerkreis), nullable=True)

    user = db.relationship("User")
    gruppe = db.relationship("Gruppe")
    kategorie = db.relationship("Kategorie")

    @property
    def effective_arbeitsort(self) -> Arbeitsort | None:
        return (self.kategorie.arbeitsort if self.kategorie else None) or self.arbeitsort

    @property
    def effective_rueckzugsbedarf(self) -> Rueckzugsbedarf | None:
        return (self.kategorie.rueckzugsbedarf if self.kategorie else None) or self.rueckzugsbedarf

    @property
    def effective_gruppengroesse(self) -> Gruppengroesse | None:
        return (self.kategorie.gruppengroesse if self.kategorie else None) or self.gruppengroesse

    @property
    def effective_teilnehmerkreis(self) -> Teilnehmerkreis | None:
        return (self.kategorie.teilnehmerkreis if self.kategorie else None) or self.teilnehmerkreis

    def to_dict(self) -> dict:
        """Return a JSON-serialisable representation of the entry."""
        eff_arbeitsort = self.effective_arbeitsort
        eff_rueckzugsbedarf = self.effective_rueckzugsbedarf
        eff_gruppengroesse = self.effective_gruppengroesse
        eff_teilnehmerkreis = self.effective_teilnehmerkreis
        return {
            "id": self.id,
            "user_id": self.user_id,
            "gruppe_id": self.gruppe_id,
            "kategorie_id": self.kategorie_id,
            "datum": self.datum.isoformat() if self.datum else None,
            "zeit_von": self.zeit_von.strftime("%H:%M") if self.zeit_von else None,
            "zeit_bis": self.zeit_bis.strftime("%H:%M") if self.zeit_bis else None,
            # Participant-supplied values (only set where the Kategorie left
            # the attribute open).
            "arbeitsort": self.arbeitsort.value if self.arbeitsort else None,
            "rueckzugsbedarf": self.rueckzugsbedarf.value if self.rueckzugsbedarf else None,
            "gruppengroesse": self.gruppengroesse.value if self.gruppengroesse else None,
            "teilnehmerkreis": self.teilnehmerkreis.value if self.teilnehmerkreis else None,
            # Effective values (Kategorie's value if it defines one, else the
            # participant's own) – what analysis and display should use.
            "effective_arbeitsort": eff_arbeitsort.value if eff_arbeitsort else None,
            "effective_arbeitsort_label": ARBEITSORT_LABELS.get(eff_arbeitsort) if eff_arbeitsort else None,
            "effective_rueckzugsbedarf": eff_rueckzugsbedarf.value if eff_rueckzugsbedarf else None,
            "effective_rueckzugsbedarf_label": RUECKZUGSBEDARF_LABELS.get(eff_rueckzugsbedarf)
            if eff_rueckzugsbedarf
            else None,
            "effective_gruppengroesse": eff_gruppengroesse.value if eff_gruppengroesse else None,
            "effective_gruppengroesse_label": GRUPPENGROESSE_LABELS.get(eff_gruppengroesse)
            if eff_gruppengroesse
            else None,
            "effective_teilnehmerkreis": eff_teilnehmerkreis.value if eff_teilnehmerkreis else None,
            "effective_teilnehmerkreis_label": TEILNEHMERKREIS_LABELS.get(eff_teilnehmerkreis)
            if eff_teilnehmerkreis
            else None,
        }
