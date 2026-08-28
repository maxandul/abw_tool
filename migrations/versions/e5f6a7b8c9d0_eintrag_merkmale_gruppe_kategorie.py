"""eintrag merkmale + gruppe/kategorie zuordnung

Fügt Eintrag die (optionalen) Merkmalsspalten hinzu, die Teilnehmende
ausfüllen, wenn die Kategorie sie offen gelassen hat, sowie die
gruppe_kategorie-Zuordnungstabelle für die pro-Erhebung wählbare
Tätigkeiten-Auswahl (keine Zeilen = unbeschränkt = alle aktiven).

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-28 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("eintrag", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "arbeitsort",
                sa.Enum(
                    "UEBLICHER_ARBEITSPLATZ",
                    "HOMEOFFICE",
                    "ANDERER_VD_STANDORT",
                    "MOBIL_EXTERN",
                    name="arbeitsort",
                ),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "rueckzugsbedarf",
                sa.Enum("ERFORDERLICH", "GEMEINSAM_MOEGLICH", name="rueckzugsbedarf"),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "gruppengroesse",
                sa.Enum(
                    "ZWEI_BIS_VIER",
                    "FUENF_BIS_ACHT",
                    "NEUN_BIS_ZWOELF",
                    "DREIZEHN_PLUS",
                    name="gruppengroesse",
                ),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "teilnehmerkreis",
                sa.Enum(
                    "STANDORTINTERN", "STANDORTUEBERGREIFEND_EXTERN", name="teilnehmerkreis"
                ),
                nullable=True,
            )
        )

    op.create_table(
        "gruppe_kategorie",
        sa.Column("gruppe_id", sa.Integer(), nullable=False),
        sa.Column("kategorie_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["gruppe_id"], ["gruppe.id"]),
        sa.ForeignKeyConstraint(["kategorie_id"], ["kategorie.id"]),
        sa.PrimaryKeyConstraint("gruppe_id", "kategorie_id"),
    )


def downgrade():
    op.drop_table("gruppe_kategorie")

    with op.batch_alter_table("eintrag", schema=None) as batch_op:
        batch_op.drop_column("teilnehmerkreis")
        batch_op.drop_column("gruppengroesse")
        batch_op.drop_column("rueckzugsbedarf")
        batch_op.drop_column("arbeitsort")
