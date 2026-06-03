"""Admin routes.

Implemented incrementally. Group/participant/category/room-type and
dashboard endpoints follow in a later build stage (Dok. 3).
"""

from flask import Blueprint

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")
