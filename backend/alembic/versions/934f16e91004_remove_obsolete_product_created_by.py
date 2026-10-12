"""remove obsolete product created_by

Revision ID: 934f16e91004
Revises: 14d2d7738759
Create Date: 2026-09-02 19:36:02.728880
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


# Revision identifiers used by Alembic.
revision: str = "934f16e91004"
down_revision: Union[str, Sequence[str], None] = "14d2d7738759"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove obsolete created_by only when present."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)

    columns = {
        column["name"]
        for column in inspector.get_columns("products")
    }

    # Fresh installations may already have the correct schema.
    if "created_by" not in columns:
        return

    # Remove any foreign key referencing created_by.
    foreign_keys = inspector.get_foreign_keys("products")

    for fk in foreign_keys:
        constrained_columns = fk.get("constrained_columns") or []

        if "created_by" in constrained_columns:
            constraint_name = fk.get("name")

            if constraint_name:
                op.drop_constraint(
                    constraint_name,
                    "products",
                    type_="foreignkey",
                )

    # Remove the obsolete column.
    op.drop_column("products", "created_by")


def downgrade() -> None:
    """Restore the original created_by structure."""

    op.add_column(
        "products",
        sa.Column(
            "created_by",
            mysql.INTEGER(),
            server_default=sa.text("'1'"),
            autoincrement=False,
            nullable=False,
        ),
    )

    op.create_foreign_key(
        op.f("fk_products_created_by"),
        "products",
        "users",
        ["created_by"],
        ["id"],
    )