"""Optional participant title for calendar recognition."""
from alembic import op
import sqlalchemy as sa

revision = 'h8c9d0e1f2a3'
down_revision = 'g7b8c9d0e1f2'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('eintrag') as batch:
        batch.add_column(sa.Column('eigener_name', sa.String(100), nullable=True))


def downgrade():
    with op.batch_alter_table('eintrag') as batch:
        batch.drop_column('eigener_name')
