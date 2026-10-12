"""Fix missing supplier and purchase bill schema columns.

Revision ID: s5p6r0k1l953
Revises: r4n5q9j0h842
"""

from alembic import op
import sqlalchemy as sa


revision = "s5p6r0k1l953"
down_revision = "r4n5q9j0h842"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    required = {
        "suppliers": {"created_by"},
        "purchase_bills": {"updated_at"},
        "purchase_bill_items": {
            "created_by",
            "created_at",
            "updated_at",
        },
    }

    missing = {}

    for table, expected_columns in required.items():
        existing_columns = {
            column["name"]
            for column in inspector.get_columns(table)
        }

        missing[table] = (
            expected_columns - existing_columns
        )

    # Validate before changing any tables.
    # Existing records must not receive an invented creator.
    for table in ("suppliers", "purchase_bill_items"):
        if "created_by" in missing[table]:
            count = bind.execute(
                sa.text(f"SELECT COUNT(*) FROM `{table}`")
            ).scalar_one()

            if count:
                raise RuntimeError(
                    f"Cannot add required {table}.created_by: "
                    f"{count} existing records need a valid "
                    "creator before migration."
                )

    if "created_by" in missing["suppliers"]:
        op.add_column(
            "suppliers",
            sa.Column(
                "created_by",
                sa.Integer(),
                nullable=False,
            ),
        )

        op.create_foreign_key(
            "fk_suppliers_created_by",
            "suppliers",
            "users",
            ["created_by"],
            ["id"],
        )

    if "updated_at" in missing["purchase_bills"]:
        op.add_column(
            "purchase_bills",
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=False,
            ),
        )

    if "created_by" in missing["purchase_bill_items"]:
        op.add_column(
            "purchase_bill_items",
            sa.Column(
                "created_by",
                sa.Integer(),
                nullable=False,
            ),
        )

        op.create_foreign_key(
            "fk_purchase_bill_items_created_by",
            "purchase_bill_items",
            "users",
            ["created_by"],
            ["id"],
        )

    for column_name in ("created_at", "updated_at"):
        if column_name in missing["purchase_bill_items"]:
            op.add_column(
                "purchase_bill_items",
                sa.Column(
                    column_name,
                    sa.DateTime(),
                    server_default=sa.text("CURRENT_TIMESTAMP"),
                    nullable=False,
                ),
            )


def downgrade() -> None:
    raise RuntimeError(
        "Automatic downgrade is disabled because some "
        "databases already contained these columns. "
        "Dropping them could destroy existing business data."
    )
