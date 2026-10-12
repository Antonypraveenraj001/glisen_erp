"""Add isolated backup restore verification history.

Revision ID: t6v7w1x2y064
Revises: s5p6r0k1l953

Adds only a new audit table. Does not modify backups, users, or business data.
"""
from alembic import op
import sqlalchemy as sa

revision = "t6v7w1x2y064"
down_revision = "s5p6r0k1l953"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "backup_restore_verifications",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("backup_log_id", sa.Integer(), sa.ForeignKey("backup_logs.id", ondelete="SET NULL"), nullable=True),
        sa.Column("scheduled_slot_utc", sa.DateTime(), nullable=False),
        sa.Column("started_at_utc", sa.DateTime(), nullable=False),
        sa.Column("completed_at_utc", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("test_database_name", sa.String(length=100), nullable=True),
        sa.Column("table_count", sa.Integer(), nullable=True),
        sa.Column("schema_revision", sa.String(length=100), nullable=True),
        sa.Column("archive_sha256", sa.String(length=64), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("cleanup_completed", sa.Boolean(), nullable=True),
        sa.Column("boss_notified_at_utc", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("scheduled_slot_utc", name="uq_backup_restore_verifications_slot"),
    )
    op.create_index(
        "ix_backup_restore_verifications_backup_log_id",
        "backup_restore_verifications", ["backup_log_id"], unique=False,
    )
    op.create_index(
        "ix_backup_restore_verifications_started_at_utc",
        "backup_restore_verifications", ["started_at_utc"], unique=False,
    )
    op.create_index(
        "ix_backup_restore_verifications_status",
        "backup_restore_verifications", ["status"], unique=False,
    )


def downgrade() -> None:
    raise RuntimeError(
        "Automatic downgrade disabled: deleting restore verification audit "
        "history requires an explicit retention decision."
    )
