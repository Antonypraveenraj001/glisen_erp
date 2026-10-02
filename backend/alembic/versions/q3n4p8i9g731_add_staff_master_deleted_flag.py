"""add staff master deleted flag

Revision ID: q3n4p8i9g731
Revises: p2m3n7h8f620
Create Date: 2026-10-02
"""

from alembic import op
import sqlalchemy as sa


revision = "q3n4p8i9g731"
down_revision = "p2m3n7h8f620"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "staff",
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )

    op.create_index(
        "ix_staff_is_deleted",
        "staff",
        ["is_deleted"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_staff_is_deleted",
        table_name="staff",
    )

    op.drop_column(
        "staff",
        "is_deleted",
    )
