"""add recurring payment history

Revision ID: p2m3n7h8f620
Revises: o1l2m6g7e519
Create Date: 2026-10-02
"""

from alembic import op
import sqlalchemy as sa


revision = (
    "p2m3n7h8f620"
)

down_revision = (
    "o1l2m6g7e519"
)

branch_labels = None

depends_on = None


def upgrade() -> None:

    op.create_table(
        "recurring_payments",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "payment_kind",
            sa.String(
                length=30
            ),
            nullable=False,
        ),

        sa.Column(
            "staff_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "expense_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "period_start",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "payment_date",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "amount",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            nullable=False,
        ),

        sa.Column(
            "payment_mode",
            sa.String(
                length=50
            ),
            nullable=True,
        ),

        sa.Column(
            "reference_number",
            sa.String(
                length=100
            ),
            nullable=True,
        ),

        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "created_by",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            [
                "staff_id",
            ],
            [
                "staff.id",
            ],
            ondelete="RESTRICT",
        ),

        sa.ForeignKeyConstraint(
            [
                "expense_id",
            ],
            [
                "expenses.id",
            ],
            ondelete="RESTRICT",
        ),

        sa.ForeignKeyConstraint(
            [
                "created_by",
            ],
            [
                "users.id",
            ],
            ondelete="RESTRICT",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

        sa.UniqueConstraint(
            "staff_id",
            "period_start",
            name=(
                "uq_recurring_payment_"
                "staff_period"
            ),
        ),

        sa.UniqueConstraint(
            "expense_id",
            "period_start",
            name=(
                "uq_recurring_payment_"
                "expense_period"
            ),
        ),

        sa.CheckConstraint(
            """
            (
                payment_kind = 'STAFF_SALARY'
                AND staff_id IS NOT NULL
                AND expense_id IS NULL
            )
            OR
            (
                payment_kind = 'OVERHEAD'
                AND staff_id IS NULL
                AND expense_id IS NOT NULL
            )
            """,
            name=(
                "ck_recurring_payment_"
                "valid_source"
            ),
        ),

        sa.CheckConstraint(
            "amount > 0",
            name=(
                "ck_recurring_payment_"
                "amount_positive"
            ),
        ),
    )


    op.create_index(
        "ix_recurring_payments_id",
        "recurring_payments",
        [
            "id",
        ],
        unique=False,
    )


    op.create_index(
        "ix_recurring_payments_payment_kind",
        "recurring_payments",
        [
            "payment_kind",
        ],
        unique=False,
    )


    op.create_index(
        "ix_recurring_payments_staff_id",
        "recurring_payments",
        [
            "staff_id",
        ],
        unique=False,
    )


    op.create_index(
        "ix_recurring_payments_expense_id",
        "recurring_payments",
        [
            "expense_id",
        ],
        unique=False,
    )


    op.create_index(
        "ix_recurring_payments_period_start",
        "recurring_payments",
        [
            "period_start",
        ],
        unique=False,
    )


    op.create_index(
        "ix_recurring_payments_payment_date",
        "recurring_payments",
        [
            "payment_date",
        ],
        unique=False,
    )


    op.create_index(
        "ix_recurring_payments_reference_number",
        "recurring_payments",
        [
            "reference_number",
        ],
        unique=False,
    )


    op.create_index(
        "ix_recurring_payments_created_by",
        "recurring_payments",
        [
            "created_by",
        ],
        unique=False,
    )


def downgrade() -> None:

    op.drop_index(
        "ix_recurring_payments_created_by",
        table_name=(
            "recurring_payments"
        ),
    )


    op.drop_index(
        "ix_recurring_payments_reference_number",
        table_name=(
            "recurring_payments"
        ),
    )


    op.drop_index(
        "ix_recurring_payments_payment_date",
        table_name=(
            "recurring_payments"
        ),
    )


    op.drop_index(
        "ix_recurring_payments_period_start",
        table_name=(
            "recurring_payments"
        ),
    )


    op.drop_index(
        "ix_recurring_payments_expense_id",
        table_name=(
            "recurring_payments"
        ),
    )


    op.drop_index(
        "ix_recurring_payments_staff_id",
        table_name=(
            "recurring_payments"
        ),
    )


    op.drop_index(
        "ix_recurring_payments_payment_kind",
        table_name=(
            "recurring_payments"
        ),
    )


    op.drop_index(
        "ix_recurring_payments_id",
        table_name=(
            "recurring_payments"
        ),
    )


    op.drop_table(
        "recurring_payments"
    )