"""Create isolated international billing tables.

Revision ID: u7x8y2z3a175
Revises: t6v7w1x2y064

No existing tables, records, numbering sequences, or stock are changed.
"""

from alembic import op
import sqlalchemy as sa

revision = "u7x8y2z3a175"
down_revision = "t6v7w1x2y064"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "international_bills",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("bill_number", sa.String(40), nullable=False),
        sa.Column("bill_date", sa.Date(), nullable=False),
        sa.Column("seller_name", sa.String(200), nullable=False),
        sa.Column("seller_address", sa.Text(), nullable=True),
        sa.Column("seller_contact", sa.String(200), nullable=True),
        sa.Column("customer_name", sa.String(200), nullable=False),
        sa.Column("customer_country", sa.String(120), nullable=False),
        sa.Column("customer_address", sa.Text(), nullable=True),
        sa.Column("customer_contact", sa.String(200), nullable=True),
        sa.Column("currency_code", sa.String(3), nullable=False),
        sa.Column("cost_currency_code", sa.String(3), nullable=False),
        sa.Column("exchange_rate", sa.Numeric(18, 6), nullable=False),
        sa.Column("tax_label", sa.String(60), nullable=False),
        sa.Column("payment_terms", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("subtotal", sa.Numeric(18, 2), nullable=False),
        sa.Column("discount_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("taxable_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("tax_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("grand_total", sa.Numeric(18, 2), nullable=False),
        sa.Column("sales_cost_currency", sa.Numeric(18, 2), nullable=False),
        sa.Column("cost_amount", sa.Numeric(18, 2), nullable=True),
        sa.Column("gross_profit", sa.Numeric(18, 2), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_international_bills_bill_number", "international_bills", ["bill_number"], unique=True)
    op.create_index("ix_international_bills_bill_date", "international_bills", ["bill_date"])

    op.create_table(
        "international_bill_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("international_bill_id", sa.Integer(), sa.ForeignKey("international_bills.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("finished_product_id", sa.Integer(), nullable=True),
        sa.Column("finished_product_number", sa.String(30), nullable=True),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("unit", sa.String(50), nullable=False),
        sa.Column("quantity", sa.Numeric(12, 2), nullable=False),
        sa.Column("unit_price", sa.Numeric(18, 2), nullable=False),
        sa.Column("discount_percent", sa.Numeric(5, 2), nullable=False),
        sa.Column("tax_percent", sa.Numeric(5, 2), nullable=False),
        sa.Column("line_subtotal", sa.Numeric(18, 2), nullable=False),
        sa.Column("discount_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("taxable_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("tax_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("line_total", sa.Numeric(18, 2), nullable=False),
        sa.Column("unit_cost", sa.Numeric(18, 2), nullable=True),
        sa.Column("cost_amount", sa.Numeric(18, 2), nullable=True),
        sa.Column("cost_source", sa.String(30), nullable=False),
    )
    op.create_index("ix_international_bill_items_international_bill_id", "international_bill_items", ["international_bill_id"])


def downgrade() -> None:
    raise RuntimeError(
        "Automatic downgrade is disabled: international invoice history must not be deleted."
    )
