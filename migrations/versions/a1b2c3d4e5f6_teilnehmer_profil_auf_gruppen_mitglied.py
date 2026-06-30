"""teilnehmer profil auf gruppen_mitglied

Revision ID: a1b2c3d4e5f6
Revises: 697401039325
Create Date: 2026-06-29 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "697401039325"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("gruppen_mitglied", schema=None) as batch_op:
        batch_op.add_column(sa.Column("vorname", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("nachname", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("funktion", sa.String(length=255), nullable=True))
        batch_op.add_column(
            sa.Column("organisationseinheit", sa.String(length=255), nullable=True)
        )
        batch_op.add_column(
            sa.Column(
                "beschaeftigungsgrad",
                sa.Float(),
                nullable=False,
                server_default="100",
            )
        )


def downgrade():
    with op.batch_alter_table("gruppen_mitglied", schema=None) as batch_op:
        batch_op.drop_column("beschaeftigungsgrad")
        batch_op.drop_column("organisationseinheit")
        batch_op.drop_column("funktion")
        batch_op.drop_column("nachname")
        batch_op.drop_column("vorname")
