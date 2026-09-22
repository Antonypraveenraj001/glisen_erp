"""add customer details to enquiry

Revision ID: d7a2f4c9b611
Revises: c9d1e7b4a210
Create Date: 2026-09-22

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d7a2f4c9b611"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "c9d1e7b4a210"

branch_labels = None
depends_on = None


def upgrade() -> None:

    op.add_column(
        "enquiries",
        sa.Column(
            "gst_number",
            sa.String(length=50),
            nullable=True,
        ),
    )

    op.add_column(
        "enquiries",
        sa.Column(
            "address",
            sa.String(length=500),
            nullable=True,
        ),
    )

    op.add_column(
        "enquiries",
        sa.Column(
            "city",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "enquiries",
        sa.Column(
            "state",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "enquiries",
        sa.Column(
            "pincode",
            sa.String(length=20),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_enquiries_gst_number",
        "enquiries",
        ["gst_number"],
        unique=False,
    )


def downgrade() -> None:

    op.drop_index(
        "ix_enquiries_gst_number",
        table_name="enquiries",
    )

    op.drop_column(
        "enquiries",
        "pincode",
    )

    op.drop_column(
        "enquiries",
        "state",
    )

    op.drop_column(
        "enquiries",
        "city",
    )

    op.drop_column(
        "enquiries",
        "address",
    )

    op.drop_column(
        "enquiries",
        "gst_number",
    )