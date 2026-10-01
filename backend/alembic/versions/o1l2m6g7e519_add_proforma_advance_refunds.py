"""add proforma advance refunds

Revision ID: o1l2m6g7e519
Revises: n0k1l5f6d408
Create Date: 2026-10-01

"""

from typing import (
    Sequence,
    Union,
)

from alembic import op
import sqlalchemy as sa


revision: str = (
    "o1l2m6g7e519"
)

down_revision: Union[
    str,
    Sequence[str],
    None,
] = (
    "n0k1l5f6d408"
)

branch_labels = None

depends_on = None


def upgrade() -> None:

    op.create_table(
        "proforma_payment_refunds",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "proforma_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "refund_date",
            sa.DateTime(),
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
            "refund_mode",
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

        sa.CheckConstraint(
            "amount > 0",
            name=(
                "ck_proforma_payment_refund_"
                "amount_positive"
            ),
        ),

        sa.ForeignKeyConstraint(
            [
                "proforma_id",
            ],
            [
                "proformas.id",
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
    )


    op.create_index(
        "ix_proforma_payment_refunds_id",
        "proforma_payment_refunds",
        [
            "id",
        ],
        unique=False,
    )


    op.create_index(
        (
            "ix_proforma_payment_refunds_"
            "proforma_id"
        ),
        "proforma_payment_refunds",
        [
            "proforma_id",
        ],
        unique=False,
    )


    op.create_index(
        (
            "ix_proforma_payment_refunds_"
            "refund_date"
        ),
        "proforma_payment_refunds",
        [
            "refund_date",
        ],
        unique=False,
    )


    op.create_index(
        (
            "ix_proforma_payment_refunds_"
            "created_by"
        ),
        "proforma_payment_refunds",
        [
            "created_by",
        ],
        unique=False,
    )


def downgrade() -> None:

    op.drop_index(
        (
            "ix_proforma_payment_refunds_"
            "created_by"
        ),
        table_name=(
            "proforma_payment_refunds"
        ),
    )


    op.drop_index(
        (
            "ix_proforma_payment_refunds_"
            "refund_date"
        ),
        table_name=(
            "proforma_payment_refunds"
        ),
    )


    op.drop_index(
        (
            "ix_proforma_payment_refunds_"
            "proforma_id"
        ),
        table_name=(
            "proforma_payment_refunds"
        ),
    )


    op.drop_index(
        "ix_proforma_payment_refunds_id",
        table_name=(
            "proforma_payment_refunds"
        ),
    )


    op.drop_table(
        "proforma_payment_refunds"
    )