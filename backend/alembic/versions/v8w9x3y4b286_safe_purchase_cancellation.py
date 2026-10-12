"""Keep cancelled purchase numbers reusable and snapshot pre-purchase price.

Revision ID: v8w9x3y4b286
Revises: u7x8y2z3a175

The original bill number and all cancelled records are retained. A nullable
unique active-bill key replaces the old global unique bill-number index.
Historical prices are not backfilled with guesses. Back up MySQL before DDL.
"""

from alembic import op
import sqlalchemy as sa


revision = "v8w9x3y4b286"
down_revision = "u7x8y2z3a175"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    indexes = {idx["name"]: idx for idx in inspector.get_indexes("purchase_bills")}
    old_index = indexes.get("ix_purchase_bills_bill_number")

    # Validate the expected existing constraint before any MySQL DDL.
    if (
        (old_index is None or not old_index.get("unique"))
        and "ix_purchase_bills_active_bill_number" not in indexes
    ):
        raise RuntimeError(
            "Unexpected purchase_bills bill-number indexes; "
            "review schema before attempting migration."
        )

    bill_columns = {c["name"] for c in inspector.get_columns("purchase_bills")}
    item_columns = {c["name"] for c in inspector.get_columns("purchase_bill_items")}

    if "active_bill_number" not in bill_columns:
        op.add_column(
            "purchase_bills",
            sa.Column("active_bill_number", sa.String(100), nullable=True),
        )

    if "previous_purchase_price" not in item_columns:
        op.add_column(
            "purchase_bill_items",
            sa.Column("previous_purchase_price", sa.Numeric(12, 2), nullable=True),
        )

    # Retain every original bill_number; historical cancelled rows get NULL.
    # Only one active record may hold any given number.
    bind.execute(sa.text(
        "UPDATE purchase_bills SET active_bill_number = "
        "CASE WHEN is_active = 1 THEN bill_number ELSE NULL END"
    ))

    if "ix_purchase_bills_active_bill_number" not in indexes:
        op.create_index(
            "ix_purchase_bills_active_bill_number",
            "purchase_bills", ["active_bill_number"], unique=True,
        )

    if old_index is not None and old_index.get("unique"):
        # The replacement unique index exists before the old one is removed.
        op.drop_index("ix_purchase_bills_bill_number", table_name="purchase_bills")
        op.create_index(
            "ix_purchase_bills_bill_number",
            "purchase_bills", ["bill_number"], unique=False,
        )
    elif old_index is None:
        op.create_index(
            "ix_purchase_bills_bill_number",
            "purchase_bills", ["bill_number"], unique=False,
        )


def downgrade() -> None:
    raise RuntimeError(
        "Automatic downgrade disabled: repeated cancelled invoice numbers "
        "could conflict with the old unique bill-number index."
    )
