"""add final bill payments

Revision ID: e7b31f4d9c20
Revises: d7a2f4c9b611
Create Date: 2026-09-22
"""

from alembic import op
import sqlalchemy as sa


revision = "e7b31f4d9c20"

down_revision = "d7a2f4c9b611"

branch_labels = None

depends_on = None


def upgrade() -> None:

    op.create_table(
        "final_bill_payments",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "final_bill_id",
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
                length=30,
            ),
            nullable=True,
        ),

        sa.Column(
            "payment_mode",
            sa.String(
                length=50,
            ),
            nullable=True,
        ),

        sa.Column(
            "reference_number",
            sa.String(
                length=100,
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
                "final_bill_id",
            ],
            [
                "final_bills.id",
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
        "ix_final_bill_payments_id",
        "final_bill_payments",
        [
            "id",
        ],
        unique=False,
    )


    op.create_index(
        "ix_final_bill_payments_final_bill_id",
        "final_bill_payments",
        [
            "final_bill_id",
        ],
        unique=False,
    )


    op.create_index(
        "ix_final_bill_payments_payment_date",
        "final_bill_payments",
        [
            "payment_date",
        ],
        unique=False,
    )


    op.create_index(
        "ix_final_bill_payments_created_by",
        "final_bill_payments",
        [
            "created_by",
        ],
        unique=False,
    )


def downgrade() -> None:

    op.drop_index(
        "ix_final_bill_payments_created_by",
        table_name="final_bill_payments",
    )


    op.drop_index(
        "ix_final_bill_payments_payment_date",
        table_name="final_bill_payments",
    )


    op.drop_index(
        "ix_final_bill_payments_final_bill_id",
        table_name="final_bill_payments",
    )


    op.drop_index(
        "ix_final_bill_payments_id",
        table_name="final_bill_payments",
    )


    op.drop_table(
        "final_bill_payments"
    )