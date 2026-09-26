"""add monthly recurring cost history

Revision ID: g2d4a8e9c731
Revises: f1c8d3a7b620
Create Date: 2026-09-26
"""

from alembic import op
import sqlalchemy as sa


revision = "g2d4a8e9c731"

down_revision = "f1c8d3a7b620"

branch_labels = None

depends_on = None


def upgrade() -> None:

    # ============================================================
    # STAFF SALARY HISTORY
    # ============================================================

    op.create_table(
        "staff_salary_rates",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "staff_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "monthly_salary",
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
                "staff_id",
            ],
            [
                "staff.id",
            ],
            ondelete="RESTRICT",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

        sa.UniqueConstraint(
            "staff_id",
            "effective_from",
            name=(
                "uq_staff_salary_rates_"
                "staff_effective_from"
            ),
        ),
    )


    op.create_index(
        "ix_staff_salary_rates_id",
        "staff_salary_rates",
        [
            "id",
        ],
        unique=False,
    )


    op.create_index(
        "ix_staff_salary_rates_staff_id",
        "staff_salary_rates",
        [
            "staff_id",
        ],
        unique=False,
    )


    op.create_index(
        "ix_staff_salary_rates_effective_from",
        "staff_salary_rates",
        [
            "effective_from",
        ],
        unique=False,
    )


    op.create_index(
        "ix_staff_salary_rates_effective_to",
        "staff_salary_rates",
        [
            "effective_to",
        ],
        unique=False,
    )


    # ============================================================
    # EXISTING STAFF
    #
    # Create an initial salary-history record from each current
    # Staff Master row.
    #
    # If joining date exists, salary is effective from there.
    # Otherwise it starts from today as the safest fallback.
    # ============================================================

    op.execute(
        """
        INSERT INTO staff_salary_rates
        (
            staff_id,
            monthly_salary,
            effective_from,
            effective_to,
            created_at
        )
        SELECT
            id,
            monthly_salary,
            COALESCE(
                joining_date,
                CURRENT_DATE
            ),
            relieving_date,
            CURRENT_TIMESTAMP
        FROM staff
        """
    )


    # ============================================================
    # RECURRING EXPENSE FIELDS
    # ============================================================

    op.add_column(
        "expenses",

        sa.Column(
            "is_monthly_recurring",
            sa.Boolean(),
            server_default=sa.text(
                "0"
            ),
            nullable=False,
        ),
    )


    op.add_column(
        "expenses",

        sa.Column(
            "effective_from",
            sa.Date(),
            nullable=True,
        ),
    )


    op.add_column(
        "expenses",

        sa.Column(
            "effective_to",
            sa.Date(),
            nullable=True,
        ),
    )


    op.create_index(
        "ix_expenses_is_monthly_recurring",
        "expenses",
        [
            "is_monthly_recurring",
        ],
        unique=False,
    )


    op.create_index(
        "ix_expenses_effective_from",
        "expenses",
        [
            "effective_from",
        ],
        unique=False,
    )


    op.create_index(
        "ix_expenses_effective_to",
        "expenses",
        [
            "effective_to",
        ],
        unique=False,
    )


    # ============================================================
    # EXISTING COMPANY OVERHEADS
    #
    # Every existing OVERHEAD becomes a monthly recurring regular
    # expense starting from the first day of its expense month.
    #
    # Your current ₹20,000 rent dated 01-Sep-2026 therefore becomes
    # ₹20,000 per month from September 2026 onward.
    # ============================================================

    op.execute(
        """
        UPDATE expenses
        SET
            is_monthly_recurring = 1,
            effective_from =
                DATE_SUB(
                    expense_date,
                    INTERVAL DAY(expense_date) - 1 DAY
                ),
            effective_to = NULL
        WHERE expense_type = 'OVERHEAD'
        """
    )


def downgrade() -> None:

    # ============================================================
    # EXPENSE RECURRING FIELDS
    # ============================================================

    op.drop_index(
        "ix_expenses_effective_to",
        table_name="expenses",
    )


    op.drop_index(
        "ix_expenses_effective_from",
        table_name="expenses",
    )


    op.drop_index(
        "ix_expenses_is_monthly_recurring",
        table_name="expenses",
    )


    op.drop_column(
        "expenses",
        "effective_to",
    )


    op.drop_column(
        "expenses",
        "effective_from",
    )


    op.drop_column(
        "expenses",
        "is_monthly_recurring",
    )


    # ============================================================
    # STAFF SALARY HISTORY
    # ============================================================

    op.drop_index(
        "ix_staff_salary_rates_effective_to",
        table_name="staff_salary_rates",
    )


    op.drop_index(
        "ix_staff_salary_rates_effective_from",
        table_name="staff_salary_rates",
    )


    op.drop_index(
        "ix_staff_salary_rates_staff_id",
        table_name="staff_salary_rates",
    )


    op.drop_index(
        "ix_staff_salary_rates_id",
        table_name="staff_salary_rates",
    )


    op.drop_table(
        "staff_salary_rates"
    )