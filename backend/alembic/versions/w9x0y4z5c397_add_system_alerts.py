"""Create persistent Boss system alerts.

Revision ID: w9x0y4z5c397
Revises: v8w9x3y4b286
"""

from alembic import op
import sqlalchemy as sa


revision = "w9x0y4z5c397"
down_revision = "v8w9x3y4b286"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "system_alerts",

        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            autoincrement=True,
        ),

        sa.Column(
            "dedupe_key",
            sa.String(length=160),
            nullable=False,
        ),

        sa.Column(
            "category",
            sa.String(length=64),
            nullable=False,
        ),

        sa.Column(
            "severity",
            sa.String(length=20),
            nullable=False,
            server_default="ERROR",
        ),

        sa.Column(
            "title",
            sa.String(length=200),
            nullable=False,
        ),

        sa.Column(
            "message",
            sa.Text(),
            nullable=False,
        ),

        sa.Column(
            "occurrence_count",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),

        sa.Column(
            "first_occurred_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),

        sa.Column(
            "last_occurred_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),

        sa.Column(
            "acknowledged_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.Column(
            "acknowledged_by_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "resolved_at",
            sa.DateTime(),
            nullable=True,
        ),

        sa.ForeignKeyConstraint(
            ["acknowledged_by_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),

        sa.UniqueConstraint(
            "dedupe_key",
            name="uq_system_alerts_dedupe_key",
        ),
    )

    op.create_index(
        "ix_system_alerts_category",
        "system_alerts",
        ["category"],
    )

    op.create_index(
        "ix_system_alerts_state",
        "system_alerts",
        ["resolved_at", "acknowledged_at"],
    )


def downgrade() -> None:
    raise RuntimeError(
        "Automatic downgrade disabled: "
        "system alert history must be preserved."
    )
