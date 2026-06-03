"""Participant routes.

Implemented incrementally. Entry/submission/dashboard endpoints follow in a
later build stage (Dok. 4).
"""

from flask import Blueprint

teilnehmer_bp = Blueprint("teilnehmer", __name__, url_prefix="/api")
