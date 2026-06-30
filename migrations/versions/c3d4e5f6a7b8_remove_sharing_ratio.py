"""remove sharing_ratio from gruppe

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-29 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("gruppe", schema=None) as batch_op:
        batch_op.drop_column("sharing_ratio")


def downgrade():
    with op.batch_alter_table("gruppe", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("sharing_ratio", sa.Float(), nullable=False, server_default="1.2")
        )
