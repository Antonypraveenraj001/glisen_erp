"""create production tracking tables

Revision ID: 14d2d7738759
Revises: a8499b554c80
Create Date: 2026-09-01 15:56:21.208175

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# ============================================================
# REVISION IDENTIFIERS
# ============================================================

revision: str = "14d2d7738759"

down_revision: Union[
    str,
    Sequence[str],
    None
] = "a8499b554c80"

branch_labels: Union[
    str,
    Sequence[str],
    None
] = None

depends_on: Union[
    str,
    Sequence[str],
    None
] = None


# ============================================================
# UPGRADE
# ============================================================

def upgrade() -> None:
    """
    Create the production tracking foundation.

    Production flow:

        Proforma
            |
            v
        Production Order
            |
            +-- Production Operations
            |
            +-- Production Materials

    This migration intentionally does NOT modify the existing
    products table.
    """

    # ========================================================
    # PRODUCTION ORDERS
    # ========================================================

    op.create_table(
        "production_orders",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "production_number",
            sa.String(length=30),
            nullable=False,
        ),

        sa.Column(
            "proforma_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "product_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "quantity",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "planned_start_date",
            sa.Date(),
            nullable=True,
        ),

        sa.Column(
            "actual_start_date",
            sa.Date(),
            nullable=True,
        ),

        sa.Column(
            "actual_end_date",
            sa.Date(),
            nullable=True,
        ),

        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=False,
        ),

        # ----------------------------------------------------
        # Relationships
        # ----------------------------------------------------

        sa.ForeignKeyConstraint(
            ["proforma_id"],
            ["proformas.id"],
        ),

        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    # ========================================================
    # PRODUCTION ORDER INDEXES
    # ========================================================

    op.create_index(
        op.f("ix_production_orders_id"),
        "production_orders",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_production_orders_product_id"),
        "production_orders",
        ["product_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_production_orders_production_number"),
        "production_orders",
        ["production_number"],
        unique=True,
    )

    op.create_index(
        op.f("ix_production_orders_proforma_id"),
        "production_orders",
        ["proforma_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_production_orders_status"),
        "production_orders",
        ["status"],
        unique=False,
    )

    # ========================================================
    # PRODUCTION MATERIALS
    # ========================================================

    op.create_table(
        "production_materials",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "production_order_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "product_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "material_name",
            sa.String(length=200),
            nullable=False,
        ),

        sa.Column(
            "unit",
            sa.String(length=30),
            nullable=True,
        ),

        sa.Column(
            "quantity_required",
            sa.Numeric(
                precision=12,
                scale=2,
            ),
            nullable=False,
        ),

        sa.Column(
            "quantity_issued",
            sa.Numeric(
                precision=12,
                scale=2,
            ),
            nullable=False,
        ),

        sa.Column(
            "unit_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            nullable=False,
        ),

        sa.Column(
            "material_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            nullable=False,
        ),

        # ----------------------------------------------------
        # Relationships
        # ----------------------------------------------------

        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
        ),

        sa.ForeignKeyConstraint(
            ["production_order_id"],
            ["production_orders.id"],
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    # ========================================================
    # PRODUCTION MATERIAL INDEXES
    # ========================================================

    op.create_index(
        op.f("ix_production_materials_id"),
        "production_materials",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_production_materials_product_id"),
        "production_materials",
        ["product_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_production_materials_production_order_id"),
        "production_materials",
        ["production_order_id"],
        unique=False,
    )

    # ========================================================
    # PRODUCTION OPERATIONS
    # ========================================================

    op.create_table(
        "production_operations",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "production_order_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "operation_name",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "machine_name",
            sa.String(length=150),
            nullable=True,
        ),

        sa.Column(
            "hourly_rate",
            sa.Numeric(
                precision=12,
                scale=2,
            ),
            nullable=False,
        ),

        sa.Column(
            "planned_hours",
            sa.Numeric(
                precision=10,
                scale=2,
            ),
            nullable=False,
        ),

        sa.Column(
            "actual_hours",
            sa.Numeric(
                precision=10,
                scale=2,
            ),
            nullable=False,
        ),

        sa.Column(
            "operation_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "started_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "completed_at",
            sa.DateTime(),
            nullable=True,
        ),

        # ----------------------------------------------------
        # Relationship
        # ----------------------------------------------------

        sa.ForeignKeyConstraint(
            ["production_order_id"],
            ["production_orders.id"],
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    # ========================================================
    # PRODUCTION OPERATION INDEXES
    # ========================================================

    op.create_index(
        op.f("ix_production_operations_id"),
        "production_operations",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_production_operations_production_order_id"),
        "production_operations",
        ["production_order_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_production_operations_status"),
        "production_operations",
        ["status"],
        unique=False,
    )


# ============================================================
# DOWNGRADE
# ============================================================

def downgrade() -> None:
    """
    Remove the production tracking tables.

    Existing products, proformas and all other ERP tables
    remain untouched.
    """

    # ========================================================
    # PRODUCTION OPERATIONS
    # ========================================================

    op.drop_index(
        op.f("ix_production_operations_status"),
        table_name="production_operations",
    )

    op.drop_index(
        op.f("ix_production_operations_production_order_id"),
        table_name="production_operations",
    )

    op.drop_index(
        op.f("ix_production_operations_id"),
        table_name="production_operations",
    )

    op.drop_table("production_operations")

    # ========================================================
    # PRODUCTION MATERIALS
    # ========================================================

    op.drop_index(
        op.f("ix_production_materials_production_order_id"),
        table_name="production_materials",
    )

    op.drop_index(
        op.f("ix_production_materials_product_id"),
        table_name="production_materials",
    )

    op.drop_index(
        op.f("ix_production_materials_id"),
        table_name="production_materials",
    )

    op.drop_table("production_materials")

    # ========================================================
    # PRODUCTION ORDERS
    # ========================================================

    op.drop_index(
        op.f("ix_production_orders_status"),
        table_name="production_orders",
    )

    op.drop_index(
        op.f("ix_production_orders_proforma_id"),
        table_name="production_orders",
    )

    op.drop_index(
        op.f("ix_production_orders_production_number"),
        table_name="production_orders",
    )

    op.drop_index(
        op.f("ix_production_orders_product_id"),
        table_name="production_orders",
    )

    op.drop_index(
        op.f("ix_production_orders_id"),
        table_name="production_orders",
    )

    op.drop_table("production_orders")