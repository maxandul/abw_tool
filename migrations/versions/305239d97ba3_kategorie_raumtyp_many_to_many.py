"""kategorie raumtyp many-to-many

Revision ID: 305239d97ba3
Revises: 246c1fbe7c2f
Create Date: 2026-06-03 20:45:38.523481

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '305239d97ba3'
down_revision = '246c1fbe7c2f'
branch_labels = None
depends_on = None


def upgrade():
    # Create new M2M association table
    op.create_table(
        'kategorie_raumtyp',
        sa.Column('kategorie_id', sa.Integer(), nullable=False),
        sa.Column('raumtyp_id',   sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['kategorie_id'], ['kategorie.id']),
        sa.ForeignKeyConstraint(['raumtyp_id'],   ['raumtyp.id']),
        sa.PrimaryKeyConstraint('kategorie_id', 'raumtyp_id'),
    )

    # Migrate existing single raumtyp_id values into the new M2M table
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id, raumtyp_id FROM kategorie WHERE raumtyp_id IS NOT NULL")
    ).fetchall()
    if rows:
        conn.execute(
            sa.text("INSERT INTO kategorie_raumtyp (kategorie_id, raumtyp_id) VALUES (:kid, :rid)"),
            [{"kid": r[0], "rid": r[1]} for r in rows],
        )

    # Drop old single-valued FK column from kategorie
    with op.batch_alter_table('kategorie', schema=None) as batch_op:
        batch_op.drop_column('raumtyp_id')


def downgrade():
    with op.batch_alter_table('kategorie', schema=None) as batch_op:
        batch_op.add_column(sa.Column('raumtyp_id', sa.INTEGER(), nullable=True))
        batch_op.create_foreign_key(None, 'raumtyp', ['raumtyp_id'], ['id'])
    op.drop_table('kategorie_raumtyp')
