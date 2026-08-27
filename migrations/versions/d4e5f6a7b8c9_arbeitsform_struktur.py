"""arbeitsform struktur – neue Tätigkeiten-Klassierung

Rein additiv: bestehende Kategorien (aus der ersten Erhebung) bleiben
unverändert und behalten ihre bisherige Klassierung über
taetigkeitsgruppe/stoerung/planung. Neue Kategorien werden künftig über
arbeitsform (+ die dazugehörigen Attribute) klassiert; taetigkeitsgruppe
wird dafür nullable.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-08-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("kategorie", schema=None) as batch_op:
        batch_op.alter_column("taetigkeitsgruppe", nullable=True)
        batch_op.add_column(
            sa.Column(
                "arbeitsform",
                sa.Enum("EINZELARBEIT", "MEETING", "ABWESENHEIT", name="arbeitsform"),
                nullable=True,
            )
        )
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
        batch_op.add_column(
            sa.Column(
                "rueckzugsbedarf",
                sa.Enum("ERFORDERLICH", "GEMEINSAM_MOEGLICH", name="rueckzugsbedarf"),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column(
                "abwesenheit_grund",
                sa.Enum("TEILZEIT", "SONSTIGES", name="abwesenheitgrund"),
                nullable=True,
            )
        )


def downgrade():
    with op.batch_alter_table("kategorie", schema=None) as batch_op:
        batch_op.drop_column("abwesenheit_grund")
        batch_op.drop_column("rueckzugsbedarf")
        batch_op.drop_column("teilnehmerkreis")
        batch_op.drop_column("gruppengroesse")
        batch_op.drop_column("arbeitsort")
        batch_op.drop_column("arbeitsform")
        batch_op.alter_column("taetigkeitsgruppe", nullable=False)
