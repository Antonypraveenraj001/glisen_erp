"""add proforma advance payments

Revision ID: n0k1l5f6d408
Revises: m9j0k4e5c397
Create Date: 2026-10-01

"""

from typing import (
    Sequence,
    Union,
)

from alembic import op
import sqlalchemy as sa


revision: str = (
    "n0k1l5f6d408"
)

down_revision: Union[
    str,
    Sequence[str],
    None,
] = (
    "m9j0k4e5c397"
)

branch_labels = None

depends_on = None


def upgrade() -> None:

    op.create_table(
        "proforma_payments",

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
            "payment_date",
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
            "payment_type",
            sa.String(
                length=30
            ),
            server_default="Advance",
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

        sa.CheckConstraint(
            "amount > 0",
            name=(
                "ck_proforma_payment_"
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
        "ix_proforma_payments_id",
        "proforma_payments",
        [
            "id",
        ],
        unique=False,
    )


    op.create_index(
        (
            "ix_proforma_payments_"
            "proforma_id"
        ),
        "proforma_payments",
        [
            "proforma_id",
        ],
        unique=False,
    )


    op.create_index(
        (
            "ix_proforma_payments_"
            "payment_date"
        ),
        "proforma_payments",
        [
            "payment_date",
        ],
        unique=False,
    )


    op.create_index(
        (
            "ix_proforma_payments_"
            "created_by"
        ),
        "proforma_payments",
        [
            "created_by",
        ],
        unique=False,
    )


def downgrade() -> None:

    op.drop_index(
        (
            "ix_proforma_payments_"
            "created_by"
        ),
        table_name=(
            "proforma_payments"
        ),
    )


    op.drop_index(
        (
            "ix_proforma_payments_"
            "payment_date"
        ),
        table_name=(
            "proforma_payments"
        ),
    )


    op.drop_index(
        (
            "ix_proforma_payments_"
            "proforma_id"
        ),
        table_name=(
            "proforma_payments"
        ),
    )


    op.drop_index(
        "ix_proforma_payments_id",
        table_name=(
            "proforma_payments"
        ),
    )


    op.drop_table(
        "proforma_payments"
    )