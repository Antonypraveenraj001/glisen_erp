"""create purchase bill ai draft queue

Revision ID: m9j0k4e5c397
Revises: l8i9f3d4b286
Create Date: 2026-10-01

"""

from typing import (
    Sequence,
    Union,
)

from alembic import op
import sqlalchemy as sa


revision: str = "m9j0k4e5c397"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "l8i9f3d4b286"

branch_labels = None

depends_on = None


def upgrade() -> None:

    # ========================================================
    # PURCHASE BILL AI BATCH
    # ========================================================

    op.create_table(
        "purchase_bill_ai_batches",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "total_files",
            sa.Integer(),
            nullable=False,
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
        "ix_purchase_bill_ai_batches_id",
        "purchase_bill_ai_batches",
        [
            "id",
        ],
        unique=False,
    )


    op.create_index(
        (
            "ix_purchase_bill_ai_batches_"
            "created_by"
        ),
        "purchase_bill_ai_batches",
        [
            "created_by",
        ],
        unique=False,
    )


    op.create_index(
        (
            "ix_purchase_bill_ai_batches_"
            "created_at"
        ),
        "purchase_bill_ai_batches",
        [
            "created_at",
        ],
        unique=False,
    )


    # ========================================================
    # PURCHASE BILL AI DRAFT
    # ========================================================

    op.create_table(
        "purchase_bill_ai_drafts",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "batch_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "sequence_number",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "original_filename",
            sa.String(
                length=500
            ),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(
                length=30
            ),
            server_default="QUEUED",
            nullable=False,
        ),

        sa.Column(
            "extracted_data",
            sa.JSON(),
            nullable=True,
        ),

        sa.Column(
            "error_message",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "confirmed_purchase_bill_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "created_by",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "processing_started_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "processing_completed_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "confirmed_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "cancelled_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
            nullable=False,
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
            nullable=False,
        ),

        sa.CheckConstraint(
            (
                "status IN ("
                "'QUEUED', "
                "'PROCESSING', "
                "'READY', "
                "'FAILED', "
                "'CONFIRMED', "
                "'CANCELLED'"
                ")"
            ),
            name=(
                "ck_purchase_bill_ai_draft_status"
            ),
        ),

        sa.ForeignKeyConstraint(
            [
                "batch_id",
            ],
            [
                "purchase_bill_ai_batches.id",
            ],
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            [
                "confirmed_purchase_bill_id",
            ],
            [
                "purchase_bills.id",
            ],
            ondelete="SET NULL",
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

        sa.UniqueConstraint(
            "batch_id",
            "sequence_number",
            name=(
                "uq_purchase_bill_ai_draft_"
                "batch_sequence"
            ),
        ),
    )


    op.create_index(
        "ix_purchase_bill_ai_drafts_id",
        "purchase_bill_ai_drafts",
        [
            "id",
        ],
        unique=False,
    )


    op.create_index(
        (
            "ix_purchase_bill_ai_drafts_"
            "batch_id"
        ),
        "purchase_bill_ai_drafts",
        [
            "batch_id",
        ],
        unique=False,
    )


    op.create_index(
        (
            "ix_purchase_bill_ai_drafts_"
            "status"
        ),
        "purchase_bill_ai_drafts",
        [
            "status",
        ],
        unique=False,
    )


    op.create_index(
        (
            "ix_purchase_bill_ai_drafts_"
            "confirmed_purchase_bill_id"
        ),
        "purchase_bill_ai_drafts",
        [
            "confirmed_purchase_bill_id",
        ],
        unique=False,
    )


    op.create_index(
        (
            "ix_purchase_bill_ai_drafts_"
            "created_by"
        ),
        "purchase_bill_ai_drafts",
        [
            "created_by",
        ],
        unique=False,
    )


    op.create_index(
        (
            "ix_purchase_bill_ai_drafts_"
            "created_at"
        ),
        "purchase_bill_ai_drafts",
        [
            "created_at",
        ],
        unique=False,
    )


def downgrade() -> None:

    op.drop_index(
        (
            "ix_purchase_bill_ai_drafts_"
            "created_at"
        ),
        table_name=(
            "purchase_bill_ai_drafts"
        ),
    )


    op.drop_index(
        (
            "ix_purchase_bill_ai_drafts_"
            "created_by"
        ),
        table_name=(
            "purchase_bill_ai_drafts"
        ),
    )


    op.drop_index(
        (
            "ix_purchase_bill_ai_drafts_"
            "confirmed_purchase_bill_id"
        ),
        table_name=(
            "purchase_bill_ai_drafts"
        ),
    )


    op.drop_index(
        (
            "ix_purchase_bill_ai_drafts_"
            "status"
        ),
        table_name=(
            "purchase_bill_ai_drafts"
        ),
    )


    op.drop_index(
        (
            "ix_purchase_bill_ai_drafts_"
            "batch_id"
        ),
        table_name=(
            "purchase_bill_ai_drafts"
        ),
    )


    op.drop_index(
        "ix_purchase_bill_ai_drafts_id",
        table_name=(
            "purchase_bill_ai_drafts"
        ),
    )


    op.drop_table(
        "purchase_bill_ai_drafts"
    )


    op.drop_index(
        (
            "ix_purchase_bill_ai_batches_"
            "created_at"
        ),
        table_name=(
            "purchase_bill_ai_batches"
        ),
    )


    op.drop_index(
        (
            "ix_purchase_bill_ai_batches_"
            "created_by"
        ),
        table_name=(
            "purchase_bill_ai_batches"
        ),
    )


    op.drop_index(
        "ix_purchase_bill_ai_batches_id",
        table_name=(
            "purchase_bill_ai_batches"
        ),
    )


    op.drop_table(
        "purchase_bill_ai_batches"
    )