"""Shared Flask extension instances.

These are instantiated here without an app and initialised inside the
application factory via ``init_app`` to avoid circular imports.
"""

from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
