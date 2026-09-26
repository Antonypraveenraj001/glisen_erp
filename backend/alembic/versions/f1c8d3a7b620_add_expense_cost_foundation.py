"""add expense cost foundation

Revision ID: f1c8d3a7b620
Revises: e7b31f4d9c20
Create Date: 2026-09-26
"""

from alembic import op
import sqlalchemy as sa


revision = "f1c8d3a7b620"

down_revision = "e7b31f4d9c20"

branch_labels = None

depends_on = None


def upgrade() -> None:

    # ============================================================
    # STAFF MASTER
    # ============================================================

    op.create_table(
        "staff",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "staff_name",
            sa.String(
                length=200,
            ),
            nullable=False,
        ),

        sa.Column(
            "designation",
            sa.String(
                length=150,
            ),
            nullable=True,
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
            "joining_date",
            sa.Date(),
            nullable=True,
        ),

        sa.Column(
            "relieving_date",
            sa.Date(),
            nullable=True,
        ),

        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text(
                "1"
            ),
            nullable=False,
        ),

        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True
            ),
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(
                timezone=True
            ),
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
            nullable=False,
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),
    )


    op.create_index(
        "ix_staff_id",
        "staff",
        [
            "id",
        ],
        unique=False,
    )


    op.create_index(
        "ix_staff_staff_name",
        "staff",
        [
            "staff_name",
        ],
        unique=False,
    )


    op.create_index(
        "ix_staff_is_active",
        "staff",
        [
            "is_active",
        ],
        unique=False,
    )


    # ============================================================
    # EXPENSE COST TYPE
    #
    # Existing Expense rows automatically become GENERAL.
    #
    # This keeps the existing Expense module working safely while
    # we build the new costing workflow.
    # ============================================================

    op.add_column(
        "expenses",

        sa.Column(
            "expense_type",
            sa.String(
                length=30,
            ),
            server_default="GENERAL",
            nullable=False,
        ),
    )


    op.create_index(
        "ix_expenses_expense_type",
        "expenses",
        [
            "expense_type",
        ],
        unique=False,
    )


    # ============================================================
    # DIRECT PRODUCTION EXPENSE LINK
    # ============================================================

    op.add_column(
        "expenses",

        sa.Column(
            "production_order_id",
            sa.Integer(),
            nullable=True,
        ),
    )


    op.create_index(
        "ix_expenses_production_order_id",
        "expenses",
        [
            "production_order_id",
        ],
        unique=False,
    )


    op.create_foreign_key(
        "fk_expenses_production_order_id",
        "expenses",
        "production_orders",
        [
            "production_order_id",
        ],
        [
            "id",
        ],
        ondelete="RESTRICT",
    )


    # ============================================================
    # EXPENSE AMOUNT CAPACITY
    #
    # Existing table used Numeric(12, 2).
    # Use Numeric(14, 2) because production-linked expenses and
    # company overhead records may be larger.
    # ============================================================

    op.alter_column(
        "expenses",
        "amount",
        existing_type=sa.Numeric(
            precision=12,
            scale=2,
        ),
        type_=sa.Numeric(
            precision=14,
            scale=2,
        ),
        existing_nullable=False,
    )


def downgrade() -> None:

    # ============================================================
    # RESTORE EXPENSE AMOUNT
    # ============================================================

    op.alter_column(
        "expenses",
        "amount",
        existing_type=sa.Numeric(
            precision=14,
            scale=2,
        ),
        type_=sa.Numeric(
            precision=12,
            scale=2,
        ),
        existing_nullable=False,
    )


    # ============================================================
    # REMOVE PRODUCTION LINK
    # ============================================================

    op.drop_constraint(
        "fk_expenses_production_order_id",
        "expenses",
        type_="foreignkey",
    )


    op.drop_index(
        "ix_expenses_production_order_id",
        table_name="expenses",
    )


    op.drop_column(
        "expenses",
        "production_order_id",
    )


    # ============================================================
    # REMOVE EXPENSE TYPE
    # ============================================================

    op.drop_index(
        "ix_expenses_expense_type",
        table_name="expenses",
    )


    op.drop_column(
        "expenses",
        "expense_type",
    )


    # ============================================================
    # REMOVE STAFF MASTER
    # ============================================================

    op.drop_index(
        "ix_staff_is_active",
        table_name="staff",
    )


    op.drop_index(
        "ix_staff_staff_name",
        table_name="staff",
    )


    op.drop_index(
        "ix_staff_id",
        table_name="staff",
    )


    op.drop_table(
        "staff"
    )