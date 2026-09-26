"""add overhead rate history

Revision ID: h4e5b9f0d842
Revises: g2d4a8e9c731
Create Date: 2026-09-26
"""

from alembic import op
import sqlalchemy as sa


revision = "h4e5b9f0d842"

down_revision = "g2d4a8e9c731"

branch_labels = None

depends_on = None


def upgrade() -> None:

    # ============================================================
    # RECURRING OVERHEAD RATE HISTORY
    # ============================================================

    op.create_table(
        "expense_recurring_rates",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "expense_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "monthly_amount",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            nullable=False,
        ),

        sa.Column(
            "effective_from",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "effective_to",
            sa.Date(),
            nullable=True,
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
                "expense_id",
            ],
            [
                "expenses.id",
            ],
            ondelete="RESTRICT",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

        sa.UniqueConstraint(
            "expense_id",
            "effective_from",
            name=(
                "uq_expense_recurring_rates_"
                "expense_effective_from"
            ),
        ),
    )


    op.create_index(
        "ix_expense_recurring_rates_id",
        "expense_recurring_rates",
        [
            "id",
        ],
        unique=False,
    )


    op.create_index(
        "ix_expense_recurring_rates_expense_id",
        "expense_recurring_rates",
        [
            "expense_id",
        ],
        unique=False,
    )


    op.create_index(
        "ix_expense_recurring_rates_effective_from",
        "expense_recurring_rates",
        [
            "effective_from",
        ],
        unique=False,
    )


    op.create_index(
        "ix_expense_recurring_rates_effective_to",
        "expense_recurring_rates",
        [
            "effective_to",
        ],
        unique=False,
    )


    # ============================================================
    # EXISTING MONTHLY OVERHEADS
    #
    # Example:
    #
    # Rent ₹20,000
    # effective_from 01-Sep-2026
    #
    # becomes the first historical monthly rate.
    # ============================================================

    op.execute(
        """
        INSERT INTO expense_recurring_rates
        (
            expense_id,
            monthly_amount,
            effective_from,
            effective_to,
            created_at
        )
        SELECT
            id,
            amount,
            effective_from,
            effective_to,
            CURRENT_TIMESTAMP
        FROM expenses
        WHERE
            expense_type = 'OVERHEAD'
            AND is_monthly_recurring = 1
            AND effective_from IS NOT NULL
        """
    )


def downgrade() -> None:

    op.drop_index(
        "ix_expense_recurring_rates_effective_to",
        table_name="expense_recurring_rates",
    )


    op.drop_index(
        "ix_expense_recurring_rates_effective_from",
        table_name="expense_recurring_rates",
    )


    op.drop_index(
        "ix_expense_recurring_rates_expense_id",
        table_name="expense_recurring_rates",
    )


    op.drop_index(
        "ix_expense_recurring_rates_id",
        table_name="expense_recurring_rates",
    )


    op.drop_table(
        "expense_recurring_rates"
    )