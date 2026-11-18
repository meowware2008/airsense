"""Add WhatsApp alert fields

Revision ID: b7c1d2e3f4a5
Revises: af786819c96c
Create Date: 2026-11-17 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c1d2e3f4a5'
down_revision: Union[str, Sequence[str], None] = 'af786819c96c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('whatsapp_number', sa.String(length=20), nullable=True))
    op.add_column(
        'alert_preferences',
        sa.Column('whatsapp_enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column('alert_preferences', 'whatsapp_enabled')
    op.drop_column('users', 'whatsapp_number')
