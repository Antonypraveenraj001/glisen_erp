"""create enquiry table

Revision ID: create_enquiry_table
Revises: b656edf005c4
Create Date: 2026-08-24

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "create_enquiry_table"
down_revision: Union[str, Sequence[str], None] = "b656edf005c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "enquiries",
        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "enquiry_number",
            sa.String(length=30),
            nullable=False,
        ),
        sa.Column(
            "enquiry_date",
            sa.Date(),
            nullable=False,
        ),
        sa.Column(
            "customer_id",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "company_name",
            sa.String(length=200),
            nullable=False,
        ),
        sa.Column(
            "contact_person",
            sa.String(length=150),
            nullable=True,
        ),
        sa.Column(
            "phone",
            sa.String(length=30),
            nullable=True,
        ),
        sa.Column(
            "email",
            sa.String(length=150),
            nullable=True,
        ),
        sa.Column(
            "machine_name",
            sa.String(length=200),
            nullable=True,
        ),
        sa.Column(
            "machine_model",
            sa.String(length=150),
            nullable=True,
        ),
        sa.Column(
            "application",
            sa.String(length=300),
            nullable=True,
        ),
        sa.Column(
            "quantity",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "requirements",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "remarks",
            sa.Text(),
            nullable=True,
        ),
        sa.Column(
            "status",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_enquiries_id"),
        "enquiries",
        ["id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_enquiries_enquiry_number"),
        "enquiries",
        ["enquiry_number"],
        unique=True,
    )

    op.create_index(
        op.f("ix_enquiries_customer_id"),
        "enquiries",
        ["customer_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_enquiries_status"),
        "enquiries",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_enquiries_status"),
        table_name="enquiries",
    )

    op.drop_index(
        op.f("ix_enquiries_customer_id"),
        table_name="enquiries",
    )

    op.drop_index(
        op.f("ix_enquiries_enquiry_number"),
        table_name="enquiries",
    )

    op.drop_index(
        op.f("ix_enquiries_id"),
        table_name="enquiries",
    )

    op.drop_table("enquiries")