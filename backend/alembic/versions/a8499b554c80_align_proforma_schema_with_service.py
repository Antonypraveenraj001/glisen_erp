"""align proforma schema with service

Revision ID: a8499b554c80
Revises: beb2a6dca7aa
Create Date: 2026-08-26 09:18:37.361844

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# ============================================================
# REVISION IDENTIFIERS
# ============================================================

revision: str = "a8499b554c80"

down_revision: Union[
    str,
    Sequence[str],
    None
] = "beb2a6dca7aa"

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
    Align existing Proforma database tables with the
    current Proforma SQLAlchemy models and service layer.
    """

    # ========================================================
    # PROFORMA ITEMS
    # ========================================================

    # Add new columns required by ProformaItem model.
    #
    # server_default is intentionally used here because the
    # existing table may already contain rows.
    #
    # After the migration, defaults are removed so that the
    # database schema remains clean.

    op.add_column(
        "proforma_items",
        sa.Column(
            "unit_price",
            sa.Numeric(14, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "proforma_items",
        sa.Column(
            "discount_percent",
            sa.Numeric(5, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "proforma_items",
        sa.Column(
            "tax_percent",
            sa.Numeric(5, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "proforma_items",
        sa.Column(
            "discount_amount",
            sa.Numeric(14, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "proforma_items",
        sa.Column(
            "tax_amount",
            sa.Numeric(14, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "proforma_items",
        sa.Column(
            "line_total",
            sa.Numeric(14, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    # --------------------------------------------------------
    # Remove obsolete ProformaItem columns
    # --------------------------------------------------------

    op.drop_column(
        "proforma_items",
        "rate",
    )

    op.drop_column(
        "proforma_items",
        "gst_amount",
    )

    op.drop_column(
        "proforma_items",
        "gst_percentage",
    )

    op.drop_column(
        "proforma_items",
        "total_amount",
    )

    op.drop_column(
        "proforma_items",
        "hsn_code",
    )

    op.drop_column(
        "proforma_items",
        "product_name",
    )

    # --------------------------------------------------------
    # Remove temporary defaults
    # --------------------------------------------------------

    op.alter_column(
        "proforma_items",
        "unit_price",
        server_default=None,
    )

    op.alter_column(
        "proforma_items",
        "discount_percent",
        server_default=None,
    )

    op.alter_column(
        "proforma_items",
        "tax_percent",
        server_default=None,
    )

    op.alter_column(
        "proforma_items",
        "discount_amount",
        server_default=None,
    )

    op.alter_column(
        "proforma_items",
        "tax_amount",
        server_default=None,
    )

    op.alter_column(
        "proforma_items",
        "line_total",
        server_default=None,
    )

    # ========================================================
    # PROFORMAS
    # ========================================================

    op.add_column(
        "proformas",
        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),
    )

    op.add_column(
        "proformas",
        sa.Column(
            "terms_and_conditions",
            sa.Text(),
            nullable=True,
        ),
    )

    op.add_column(
        "proformas",
        sa.Column(
            "discount_amount",
            sa.Numeric(14, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "proformas",
        sa.Column(
            "taxable_amount",
            sa.Numeric(14, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "proformas",
        sa.Column(
            "tax_amount",
            sa.Numeric(14, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    # --------------------------------------------------------
    # Remove created_by foreign key
    # --------------------------------------------------------
    #
    # The previous schema contains:
    #
    # created_by -> users.id
    #
    # The current Proforma model/service does not contain
    # created_by, so the old foreign key and column are removed.

    op.drop_constraint(
        "proformas_ibfk_1",
        "proformas",
        type_="foreignkey",
    )

    op.drop_column(
        "proformas",
        "remarks",
    )

    op.drop_column(
        "proformas",
        "created_by",
    )

    op.drop_column(
        "proformas",
        "gst_amount",
    )

    # --------------------------------------------------------
    # Remove temporary defaults
    # --------------------------------------------------------

    op.alter_column(
        "proformas",
        "discount_amount",
        server_default=None,
    )

    op.alter_column(
        "proformas",
        "taxable_amount",
        server_default=None,
    )

    op.alter_column(
        "proformas",
        "tax_amount",
        server_default=None,
    )


# ============================================================
# DOWNGRADE
# ============================================================

def downgrade() -> None:
    """
    Restore the previous Proforma database structure.
    """

    # ========================================================
    # PROFORMAS
    # ========================================================

    op.add_column(
        "proformas",
        sa.Column(
            "gst_amount",
            sa.Numeric(14, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "proformas",
        sa.Column(
            "created_by",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
    )

    op.add_column(
        "proformas",
        sa.Column(
            "remarks",
            sa.Text(),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "proformas_ibfk_1",
        "proformas",
        "users",
        ["created_by"],
        ["id"],
    )

    op.drop_column(
        "proformas",
        "tax_amount",
    )

    op.drop_column(
        "proformas",
        "taxable_amount",
    )

    op.drop_column(
        "proformas",
        "discount_amount",
    )

    op.drop_column(
        "proformas",
        "terms_and_conditions",
    )

    op.drop_column(
        "proformas",
        "notes",
    )

    # ========================================================
    # PROFORMA ITEMS
    # ========================================================

    op.add_column(
        "proforma_items",
        sa.Column(
            "product_name",
            sa.String(200),
            nullable=False,
            server_default="",
        ),
    )

    op.add_column(
        "proforma_items",
        sa.Column(
            "hsn_code",
            sa.String(20),
            nullable=True,
        ),
    )

    op.add_column(
        "proforma_items",
        sa.Column(
            "total_amount",
            sa.Numeric(14, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "proforma_items",
        sa.Column(
            "gst_percentage",
            sa.Numeric(5, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "proforma_items",
        sa.Column(
            "gst_amount",
            sa.Numeric(14, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.add_column(
        "proforma_items",
        sa.Column(
            "rate",
            sa.Numeric(14, 2),
            nullable=False,
            server_default="0.00",
        ),
    )

    op.drop_column(
        "proforma_items",
        "line_total",
    )

    op.drop_column(
        "proforma_items",
        "tax_amount",
    )

    op.drop_column(
        "proforma_items",
        "discount_amount",
    )

    op.drop_column(
        "proforma_items",
        "tax_percent",
    )

    op.drop_column(
        "proforma_items",
        "discount_percent",
    )

    op.drop_column(
        "proforma_items",
        "unit_price",
    )