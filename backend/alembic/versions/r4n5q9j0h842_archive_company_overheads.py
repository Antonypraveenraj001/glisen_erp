# Archive company overhead masters.
#
# Revision ID: r4n5q9j0h842
# Revises: q3n4p8i9g731
# Create Date: 2026-10-02

from alembic import op
import sqlalchemy as sa


revision = "r4n5q9j0h842"
down_revision = "q3n4p8i9g731"
branch_labels = None
depends_on = None


def upgrade() -> None:

    op.add_column(
        "expenses",
        sa.Column(
            "is_archived",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
        ),
    )

    op.create_index(
        "ix_expenses_is_archived",
        "expenses",
        ["is_archived"],
        unique=False,
    )


def downgrade() -> None:

    op.drop_index(
        "ix_expenses_is_archived",
        table_name="expenses",
    )

    op.drop_column(
        "expenses",
        "is_archived",
    )
