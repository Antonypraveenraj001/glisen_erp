"""add finished product cost snapshot

Revision ID: i5f6c0a1e953
Revises: h4e5b9f0d842
Create Date: 2026-09-26
"""

from alembic import op
import sqlalchemy as sa


revision = "i5f6c0a1e953"

down_revision = "h4e5b9f0d842"

branch_labels = None

depends_on = None


def upgrade() -> None:

    # ============================================================
    # FINISHED PRODUCT COST COMPONENTS
    # ============================================================

    op.add_column(
        "finished_products",
        sa.Column(
            "material_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            server_default="0.00",
            nullable=False,
        ),
    )


    op.add_column(
        "finished_products",
        sa.Column(
            "operation_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            server_default="0.00",
            nullable=False,
        ),
    )


    op.add_column(
        "finished_products",
        sa.Column(
            "direct_expense_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            server_default="0.00",
            nullable=False,
        ),
    )


    op.add_column(
        "finished_products",
        sa.Column(
            "allocated_staff_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            server_default="0.00",
            nullable=False,
        ),
    )


    op.add_column(
        "finished_products",
        sa.Column(
            "allocated_overhead_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            server_default="0.00",
            nullable=False,
        ),
    )


    op.add_column(
        "finished_products",
        sa.Column(
            "total_production_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            server_default="0.00",
            nullable=False,
        ),
    )


    op.add_column(
        "finished_products",
        sa.Column(
            "unit_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            server_default="0.00",
            nullable=False,
        ),
    )


    op.add_column(
        "finished_products",
        sa.Column(
            "cost_snapshot_at",
            sa.DateTime(),
            nullable=True,
        ),
    )


    op.create_index(
        "ix_finished_products_cost_snapshot_at",
        "finished_products",
        [
            "cost_snapshot_at",
        ],
        unique=False,
    )


def downgrade() -> None:

    op.drop_index(
        "ix_finished_products_cost_snapshot_at",
        table_name="finished_products",
    )


    op.drop_column(
        "finished_products",
        "cost_snapshot_at",
    )


    op.drop_column(
        "finished_products",
        "unit_cost",
    )


    op.drop_column(
        "finished_products",
        "total_production_cost",
    )


    op.drop_column(
        "finished_products",
        "allocated_overhead_cost",
    )


    op.drop_column(
        "finished_products",
        "allocated_staff_cost",
    )


    op.drop_column(
        "finished_products",
        "direct_expense_cost",
    )


    op.drop_column(
        "finished_products",
        "operation_cost",
    )


    op.drop_column(
        "finished_products",
        "material_cost",
    )