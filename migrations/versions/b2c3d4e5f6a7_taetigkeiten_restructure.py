"""taetigkeiten restructure – remove raumtyp/vertraulichkeit

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-29 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("kategorie_raumtyp")

    with op.batch_alter_table("kategorie", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "taetigkeitsgruppe",
                sa.Enum(
                    "EINZELARBEIT",
                    "ZU_ZWEIT_DREIT",
                    "GRUPPE_4PLUS",
                    "EXTERN",
                    name="taetigkeitsgruppe",
                ),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "stoerung",
                sa.Enum("ERLAUBT", "UNGESTOERT", name="stoerung"),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "planung",
                sa.Enum("GEPLANT", "UNGEPLANT", name="planung"),
                nullable=True,
            )
        )

    op.execute(
        "UPDATE kategorie SET taetigkeitsgruppe = 'EXTERN' WHERE taetigkeitsgruppe IS NULL"
    )

    with op.batch_alter_table("kategorie", schema=None) as batch_op:
        batch_op.drop_column("vertraulichkeit")
        batch_op.drop_column("gruppengroesse")
        batch_op.alter_column("taetigkeitsgruppe", nullable=False)


def downgrade():
    with op.batch_alter_table("kategorie", schema=None) as batch_op:
        batch_op.add_column(sa.Column("vertraulichkeit", sa.VARCHAR(length=12), nullable=True))
        batch_op.add_column(sa.Column("gruppengroesse", sa.VARCHAR(length=6), nullable=True))
        batch_op.drop_column("planung")
        batch_op.drop_column("stoerung")
        batch_op.drop_column("taetigkeitsgruppe")

    op.create_table(
        "kategorie_raumtyp",
        sa.Column("kategorie_id", sa.Integer(), nullable=False),
        sa.Column("raumtyp_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["kategorie_id"], ["kategorie.id"]),
        sa.ForeignKeyConstraint(["raumtyp_id"], ["raumtyp.id"]),
        sa.PrimaryKeyConstraint("kategorie_id", "raumtyp_id"),
    )
