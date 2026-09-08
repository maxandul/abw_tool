"""raeumlichkeit für meeting

Fügt Kategorie und Eintrag das neue Merkmal "Räumlichkeit" (üblicher
Standort / anderer VD-Standort / extern) hinzu, das bei Besprechung/Meeting
zur Verfügung steht – analog zu Arbeitsort bei Einzelarbeit.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-09-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade():
    raeumlichkeit_enum = sa.Enum(
        "UEBLICHER_STANDORT", "ANDERER_VD_STANDORT", "EXTERN", name="raeumlichkeit"
    )
    with op.batch_alter_table("kategorie", schema=None) as batch_op:
        batch_op.add_column(sa.Column("raeumlichkeit", raeumlichkeit_enum, nullable=True))
    with op.batch_alter_table("eintrag", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "raeumlichkeit",
                sa.Enum("UEBLICHER_STANDORT", "ANDERER_VD_STANDORT", "EXTERN", name="raeumlichkeit"),
                nullable=True,
            )
        )


def downgrade():
    with op.batch_alter_table("eintrag", schema=None) as batch_op:
        batch_op.drop_column("raeumlichkeit")
    with op.batch_alter_table("kategorie", schema=None) as batch_op:
        batch_op.drop_column("raeumlichkeit")
