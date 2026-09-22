"""separate manufactured outputs from stock products

Revision ID: c9d1e7b4a210
Revises: 49f5016ccf1e
Create Date: 2026-09-21

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9d1e7b4a210"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "49f5016ccf1e"

branch_labels = None
depends_on = None


def upgrade() -> None:

    # ========================================================
    # PRODUCTION ORDERS
    # ========================================================

    op.add_column(
        "production_orders",
        sa.Column(
            "proforma_item_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.add_column(
        "production_orders",
        sa.Column(
            "product_name",
            sa.String(length=500),
            nullable=True,
        ),
    )

    op.add_column(
        "production_orders",
        sa.Column(
            "unit",
            sa.String(length=50),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_production_orders_proforma_item_id",
        "production_orders",
        ["proforma_item_id"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_production_orders_proforma_item_id",
        "production_orders",
        "proforma_items",
        ["proforma_item_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # Preserve names of existing historical production orders.
    op.execute(
        """
        UPDATE production_orders po
        INNER JOIN products p
            ON p.id = po.product_id
        SET
            po.product_name = p.product_name,
            po.unit = COALESCE(p.unit, 'Nos')
        WHERE po.product_name IS NULL
        """
    )

    op.execute(
        """
        UPDATE production_orders
        SET unit = 'Nos'
        WHERE unit IS NULL
           OR TRIM(unit) = ''
        """
    )

    op.alter_column(
        "production_orders",
        "product_name",
        existing_type=sa.String(length=500),
        nullable=False,
    )

    op.alter_column(
        "production_orders",
        "unit",
        existing_type=sa.String(length=50),
        nullable=False,
    )

    # Purchased-product link becomes legacy/optional.
    op.alter_column(
        "production_orders",
        "product_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


    # ========================================================
    # FINISHED GOODS RECEIPTS
    # ========================================================

    # Manufactured output no longer requires a Products-table row.
    op.alter_column(
        "finished_goods_receipts",
        "product_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


    # ========================================================
    # FINISHED PRODUCTS
    # ========================================================

    op.add_column(
        "finished_products",
        sa.Column(
            "product_name",
            sa.String(length=500),
            nullable=True,
        ),
    )

    op.add_column(
        "finished_products",
        sa.Column(
            "unit",
            sa.String(length=50),
            nullable=True,
        ),
    )

    # Preserve existing Finished Product names.
    op.execute(
        """
        UPDATE finished_products fp
        INNER JOIN products p
            ON p.id = fp.product_master_id
        SET
            fp.product_name = p.product_name,
            fp.unit = COALESCE(p.unit, 'Nos')
        WHERE fp.product_name IS NULL
        """
    )

    op.execute(
        """
        UPDATE finished_products
        SET unit = 'Nos'
        WHERE unit IS NULL
           OR TRIM(unit) = ''
        """
    )

    op.alter_column(
        "finished_products",
        "product_name",
        existing_type=sa.String(length=500),
        nullable=False,
    )

    op.alter_column(
        "finished_products",
        "unit",
        existing_type=sa.String(length=50),
        nullable=False,
    )

    # Purchased-product link becomes legacy/optional.
    op.alter_column(
        "finished_products",
        "product_master_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:

    op.alter_column(
        "finished_products",
        "product_master_id",
        existing_type=sa.Integer(),
        nullable=False,
    )

    op.drop_column(
        "finished_products",
        "unit",
    )

    op.drop_column(
        "finished_products",
        "product_name",
    )

    op.alter_column(
        "finished_goods_receipts",
        "product_id",
        existing_type=sa.Integer(),
        nullable=False,
    )

    op.alter_column(
        "production_orders",
        "product_id",
        existing_type=sa.Integer(),
        nullable=False,
    )

    op.drop_constraint(
        "fk_production_orders_proforma_item_id",
        "production_orders",
        type_="foreignkey",
    )

    op.drop_index(
        "ix_production_orders_proforma_item_id",
        table_name="production_orders",
    )

    op.drop_column(
        "production_orders",
        "unit",
    )

    op.drop_column(
        "production_orders",
        "product_name",
    )

    op.drop_column(
        "production_orders",
        "proforma_item_id",
    )