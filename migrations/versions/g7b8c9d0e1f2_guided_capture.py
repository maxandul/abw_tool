"""Versioned five-type capture; historical responses are never inferred."""
from alembic import op
import sqlalchemy as sa
revision = 'g7b8c9d0e1f2'
down_revision = 'f6a7b8c9d0e1'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('kategorie') as batch:
        batch.add_column(sa.Column('schema_version', sa.Integer(), nullable=False, server_default='1'))
        batch.alter_column('arbeitsform', type_=sa.String(32), existing_type=sa.String(12))
        batch.alter_column('gruppengroesse', type_=sa.String(32), existing_type=sa.String(16))
    with op.batch_alter_table('eintrag') as batch:
        batch.alter_column('gruppengroesse', type_=sa.String(32), existing_type=sa.String(16))
        batch.add_column(sa.Column('raumnutzung', sa.String(32), nullable=True))
        batch.add_column(sa.Column('online_dabei', sa.Boolean(), nullable=True))
        batch.add_column(sa.Column('rueckzug_gruende', sa.JSON(), nullable=True))

def downgrade():
    # Downgrading would make v2 responses unreadable by the old application.
    raise RuntimeError('Für eine Rückkehr zur alten Version bitte die Sicherung vor dem Update wiederherstellen.')
