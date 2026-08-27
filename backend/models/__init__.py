"""SQLAlchemy models for the Tätigkeitserhebung application.

Importing this package registers all models with SQLAlchemy so that
Flask-Migrate can detect them.
"""

from .user import User, Rolle
from .gruppe import Gruppe
from .gruppen_mitglied import GruppenMitglied
from .raumtyp import Raumtyp
from .kategorie import (
    Kategorie,
    Taetigkeitsgruppe,
    Stoerung,
    Planung,
    Arbeitsform,
    Arbeitsort,
    Gruppengroesse,
    Teilnehmerkreis,
    Rueckzugsbedarf,
    AbwesenheitGrund,
)
from .eintrag import Eintrag
from .einreichung import Einreichung, EinreichungStatus

__all__ = [
    "User",
    "Rolle",
    "Gruppe",
    "GruppenMitglied",
    "Raumtyp",
    "Kategorie",
    "Taetigkeitsgruppe",
    "Stoerung",
    "Planung",
    "Arbeitsform",
    "Arbeitsort",
    "Gruppengroesse",
    "Teilnehmerkreis",
    "Rueckzugsbedarf",
    "AbwesenheitGrund",
    "Eintrag",
    "Einreichung",
    "EinreichungStatus",
]
