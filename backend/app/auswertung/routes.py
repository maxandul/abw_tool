"""Analysis routes.

Implemented incrementally. Lastprofil/Raumbedarf/Anteile/export endpoints
follow in a later build stage (Dok. 5).
"""

from flask import Blueprint

auswertung_bp = Blueprint("auswertung", __name__, url_prefix="/api/auswertung")
