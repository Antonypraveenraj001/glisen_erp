"""add settings module foundation

Revision ID: j6g7d1b2f064
Revises: i5f6c0a1e953
Create Date: 2026-09-28

"""

from typing import (
    Sequence,
    Union,
)

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "j6g7d1b2f064"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "i5f6c0a1e953"

branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None

depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


def upgrade() -> None:

    # ============================================================
    # EXPAND COMPANY SETTINGS
    # ============================================================

    op.add_column(
        "company_settings",
        sa.Column(
            "pan_number",
            sa.String(length=10),
            nullable=True,
        ),
    )

    op.add_column(
        "company_settings",
        sa.Column(
            "website",
            sa.String(length=200),
            nullable=True,
        ),
    )

    op.add_column(
        "company_settings",
        sa.Column(
            "logo_path",
            sa.String(length=500),
            nullable=True,
        ),
    )

    op.add_column(
        "company_settings",
        sa.Column(
            "bank_account_name",
            sa.String(length=200),
            nullable=True,
        ),
    )

    op.add_column(
        "company_settings",
        sa.Column(
            "bank_name",
            sa.String(length=200),
            nullable=True,
        ),
    )

    op.add_column(
        "company_settings",
        sa.Column(
            "bank_account_number",
            sa.String(length=50),
            nullable=True,
        ),
    )

    op.add_column(
        "company_settings",
        sa.Column(
            "bank_ifsc_code",
            sa.String(length=20),
            nullable=True,
        ),
    )

    op.add_column(
        "company_settings",
        sa.Column(
            "bank_branch",
            sa.String(length=200),
            nullable=True,
        ),
    )

    op.add_column(
        "company_settings",
        sa.Column(
            "upi_id",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_company_settings_pan_number",
        "company_settings",
        [
            "pan_number",
        ],
        unique=False,
    )

    # ============================================================
    # DOCUMENT SETTINGS
    # ============================================================

    op.create_table(
        "document_settings",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "default_print_mode",
            sa.String(length=30),
            nullable=False,
            server_default="company_header",
        ),

        sa.Column(
            "letterhead_top_space_mm",
            sa.Numeric(
                precision=6,
                scale=2,
            ),
            nullable=False,
            server_default="40.00",
        ),

        sa.Column(
            "show_logo",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("1"),
        ),

        sa.Column(
            "show_gst_number",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("1"),
        ),

        sa.Column(
            "show_contact_details",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("1"),
        ),

        sa.Column(
            "show_bank_details_on_proforma",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
        ),

        sa.Column(
            "show_bank_details_on_final_bill",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("1"),
        ),

        sa.Column(
            "show_authorized_signature",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("1"),
        ),

        sa.Column(
            "authorized_signatory_name",
            sa.String(length=200),
            nullable=True,
        ),

        sa.Column(
            "authorized_signatory_designation",
            sa.String(length=150),
            nullable=True,
        ),

        sa.Column(
            "footer_text",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "proforma_validity_days",
            sa.Integer(),
            nullable=False,
            server_default="30",
        ),

        sa.Column(
            "proforma_payment_terms",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "proforma_delivery_terms",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "proforma_terms_and_conditions",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.PrimaryKeyConstraint(
            "id",
        ),
    )

    # ============================================================
    # BUSINESS SETTINGS
    # ============================================================

    op.create_table(
        "business_settings",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "currency_code",
            sa.String(length=10),
            nullable=False,
            server_default="INR",
        ),

        sa.Column(
            "timezone",
            sa.String(length=100),
            nullable=False,
            server_default="Asia/Kolkata",
        ),

        sa.Column(
            "default_gst_percent",
            sa.Numeric(
                precision=5,
                scale=2,
            ),
            nullable=False,
            server_default="18.00",
        ),

        sa.Column(
            "default_page_size",
            sa.Integer(),
            nullable=False,
            server_default="10",
        ),

        sa.Column(
            "financial_year_start_month",
            sa.Integer(),
            nullable=False,
            server_default="4",
        ),

        sa.Column(
            "financial_year_start_day",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),

        sa.Column(
            "enquiry_prefix",
            sa.String(length=20),
            nullable=False,
            server_default="ENQ",
        ),

        sa.Column(
            "proforma_prefix",
            sa.String(length=20),
            nullable=False,
            server_default="PRO",
        ),

        sa.Column(
            "production_prefix",
            sa.String(length=20),
            nullable=False,
            server_default="PROD",
        ),

        sa.Column(
            "finished_goods_receipt_prefix",
            sa.String(length=20),
            nullable=False,
            server_default="FGR",
        ),

        sa.Column(
            "invoice_prefix",
            sa.String(length=20),
            nullable=False,
            server_default="INV",
        ),

        sa.Column(
            "credit_note_prefix",
            sa.String(length=20),
            nullable=False,
            server_default="CN",
        ),

        sa.Column(
            "sequence_digits",
            sa.Integer(),
            nullable=False,
            server_default="4",
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.PrimaryKeyConstraint(
            "id",
        ),
    )

    # ============================================================
    # FINANCIAL YEARS
    # ============================================================

    op.create_table(
        "financial_years",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "name",
            sa.String(length=20),
            nullable=False,
        ),

        sa.Column(
            "start_date",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "end_date",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default="ACTIVE",
        ),

        sa.Column(
            "opened_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.Column(
            "opened_by",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "closed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "closed_by",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "notes",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.ForeignKeyConstraint(
            [
                "opened_by",
            ],
            [
                "users.id",
            ],
            ondelete="SET NULL",
        ),

        sa.ForeignKeyConstraint(
            [
                "closed_by",
            ],
            [
                "users.id",
            ],
            ondelete="SET NULL",
        ),

        sa.PrimaryKeyConstraint(
            "id",
        ),

        sa.UniqueConstraint(
            "name",
            name="uq_financial_year_name",
        ),

        sa.UniqueConstraint(
            "start_date",
            name="uq_financial_year_start",
        ),

        sa.UniqueConstraint(
            "end_date",
            name="uq_financial_year_end",
        ),
    )

    op.create_index(
        "ix_financial_years_name",
        "financial_years",
        [
            "name",
        ],
        unique=False,
    )

    op.create_index(
        "ix_financial_years_status",
        "financial_years",
        [
            "status",
        ],
        unique=False,
    )

    # ============================================================
    # BACKUP SETTINGS
    # ============================================================

    op.create_table(
        "backup_settings",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "automatic_backup_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
        ),

        sa.Column(
            "backup_time",
            sa.Time(),
            nullable=False,
            server_default="22:00:00",
        ),

        sa.Column(
            "primary_backup_path",
            sa.String(length=1000),
            nullable=True,
        ),

        sa.Column(
            "secondary_backup_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
        ),

        sa.Column(
            "secondary_backup_path",
            sa.String(length=1000),
            nullable=True,
        ),

        sa.Column(
            "retention_days",
            sa.Integer(),
            nullable=False,
            server_default="30",
        ),

        sa.Column(
            "include_uploads",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("1"),
        ),

        sa.Column(
            "verify_after_backup",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("1"),
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.PrimaryKeyConstraint(
            "id",
        ),
    )

    # ============================================================
    # BACKUP LOGS
    # ============================================================

    op.create_table(
        "backup_logs",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "backup_type",
            sa.String(length=50),
            nullable=False,
        ),

        sa.Column(
            "filename",
            sa.String(length=500),
            nullable=False,
        ),

        sa.Column(
            "primary_path",
            sa.String(length=1000),
            nullable=True,
        ),

        sa.Column(
            "secondary_path",
            sa.String(length=1000),
            nullable=True,
        ),

        sa.Column(
            "file_size_bytes",
            sa.BigInteger(),
            nullable=True,
        ),

        sa.Column(
            "checksum_sha256",
            sa.String(length=64),
            nullable=True,
        ),

        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
        ),

        sa.Column(
            "financial_year_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "created_by",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "app_version",
            sa.String(length=50),
            nullable=True,
        ),

        sa.Column(
            "schema_revision",
            sa.String(length=100),
            nullable=True,
        ),

        sa.Column(
            "manifest_version",
            sa.String(length=30),
            nullable=True,
        ),

        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "verified_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "error_message",
            sa.Text(),
            nullable=True,
        ),

        sa.ForeignKeyConstraint(
            [
                "financial_year_id",
            ],
            [
                "financial_years.id",
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
            ondelete="SET NULL",
        ),

        sa.PrimaryKeyConstraint(
            "id",
        ),
    )

    op.create_index(
        "ix_backup_logs_backup_type",
        "backup_logs",
        [
            "backup_type",
        ],
        unique=False,
    )

    op.create_index(
        "ix_backup_logs_status",
        "backup_logs",
        [
            "status",
        ],
        unique=False,
    )

    op.create_index(
        "ix_backup_logs_checksum_sha256",
        "backup_logs",
        [
            "checksum_sha256",
        ],
        unique=False,
    )

    # ============================================================
    # NUMBER AUDIT LOG
    # ============================================================

    op.create_table(
        "number_audit_logs",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "financial_year_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "document_type",
            sa.String(length=30),
            nullable=False,
        ),

        sa.Column(
            "document_number",
            sa.String(length=100),
            nullable=False,
        ),

        sa.Column(
            "action",
            sa.String(length=30),
            nullable=False,
        ),

        sa.Column(
            "reason",
            sa.Text(),
            nullable=False,
        ),

        sa.Column(
            "performed_by",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "performed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.ForeignKeyConstraint(
            [
                "financial_year_id",
            ],
            [
                "financial_years.id",
            ],
            ondelete="RESTRICT",
        ),

        sa.ForeignKeyConstraint(
            [
                "performed_by",
            ],
            [
                "users.id",
            ],
            ondelete="RESTRICT",
        ),

        sa.PrimaryKeyConstraint(
            "id",
        ),

        sa.UniqueConstraint(
            "document_type",
            "document_number",
            name=(
                "uq_number_audit_"
                "document_type_number"
            ),
        ),
    )

    op.create_index(
        "ix_number_audit_document_type",
        "number_audit_logs",
        [
            "document_type",
        ],
        unique=False,
    )

    op.create_index(
        "ix_number_audit_document_number",
        "number_audit_logs",
        [
            "document_number",
        ],
        unique=False,
    )

    op.create_index(
        "ix_number_audit_action",
        "number_audit_logs",
        [
            "action",
        ],
        unique=False,
    )

    # ============================================================
    # FINANCIAL YEAR TRANSITION LOG
    # ============================================================

    op.create_table(
        "financial_year_transition_logs",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "from_financial_year_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "to_financial_year_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "backup_log_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
        ),

        sa.Column(
            "validation_summary",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "carry_forward_summary",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "started_by",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.Column(
            "completed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.Column(
            "error_message",
            sa.Text(),
            nullable=True,
        ),

        sa.ForeignKeyConstraint(
            [
                "from_financial_year_id",
            ],
            [
                "financial_years.id",
            ],
            ondelete="RESTRICT",
        ),

        sa.ForeignKeyConstraint(
            [
                "to_financial_year_id",
            ],
            [
                "financial_years.id",
            ],
            ondelete="RESTRICT",
        ),

        sa.ForeignKeyConstraint(
            [
                "backup_log_id",
            ],
            [
                "backup_logs.id",
            ],
            ondelete="SET NULL",
        ),

        sa.ForeignKeyConstraint(
            [
                "started_by",
            ],
            [
                "users.id",
            ],
            ondelete="RESTRICT",
        ),

        sa.PrimaryKeyConstraint(
            "id",
        ),
    )

    op.create_index(
        "ix_financial_year_transition_status",
        "financial_year_transition_logs",
        [
            "status",
        ],
        unique=False,
    )

    # ============================================================
    # OPENING STOCK SNAPSHOT
    # ============================================================

    op.create_table(
        "financial_year_opening_stock",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "financial_year_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "product_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "opening_quantity",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            nullable=False,
            server_default="0.00",
        ),

        sa.Column(
            "unit_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            nullable=False,
            server_default="0.00",
        ),

        sa.Column(
            "opening_value",
            sa.Numeric(
                precision=16,
                scale=2,
            ),
            nullable=False,
            server_default="0.00",
        ),

        sa.Column(
            "source_closing_date",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.ForeignKeyConstraint(
            [
                "financial_year_id",
            ],
            [
                "financial_years.id",
            ],
            ondelete="RESTRICT",
        ),

        sa.ForeignKeyConstraint(
            [
                "product_id",
            ],
            [
                "products.id",
            ],
            ondelete="RESTRICT",
        ),

        sa.PrimaryKeyConstraint(
            "id",
        ),

        sa.UniqueConstraint(
            "financial_year_id",
            "product_id",
            name=(
                "uq_financial_year_"
                "opening_stock_product"
            ),
        ),
    )

    # ============================================================
    # OPENING WIP SNAPSHOT
    # ============================================================

    op.create_table(
        "financial_year_opening_wip",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "financial_year_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "production_order_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "material_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            nullable=False,
            server_default="0.00",
        ),

        sa.Column(
            "operation_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            nullable=False,
            server_default="0.00",
        ),

        sa.Column(
            "direct_expense_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            nullable=False,
            server_default="0.00",
        ),

        sa.Column(
            "allocated_staff_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            nullable=False,
            server_default="0.00",
        ),

        sa.Column(
            "allocated_overhead_cost",
            sa.Numeric(
                precision=14,
                scale=2,
            ),
            nullable=False,
            server_default="0.00",
        ),

        sa.Column(
            "total_opening_wip",
            sa.Numeric(
                precision=16,
                scale=2,
            ),
            nullable=False,
            server_default="0.00",
        ),

        sa.Column(
            "source_closing_date",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.ForeignKeyConstraint(
            [
                "financial_year_id",
            ],
            [
                "financial_years.id",
            ],
            ondelete="RESTRICT",
        ),

        sa.ForeignKeyConstraint(
            [
                "production_order_id",
            ],
            [
                "production_orders.id",
            ],
            ondelete="RESTRICT",
        ),

        sa.PrimaryKeyConstraint(
            "id",
        ),

        sa.UniqueConstraint(
            "financial_year_id",
            "production_order_id",
            name=(
                "uq_financial_year_"
                "opening_wip_production"
            ),
        ),
    )

    # ============================================================
    # SYSTEM STATE
    # ============================================================

    op.create_table(
        "system_state",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "maintenance_mode",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
        ),

        sa.Column(
            "maintenance_reason",
            sa.String(length=500),
            nullable=True,
        ),

        sa.Column(
            "restore_in_progress",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
        ),

        sa.Column(
            "year_transition_in_progress",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("0"),
        ),

        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text(
                "CURRENT_TIMESTAMP"
            ),
        ),

        sa.PrimaryKeyConstraint(
            "id",
        ),
    )

    # ============================================================
    # DEFAULT SINGLETON SETTINGS ROWS
    # ============================================================

    document_settings_table = sa.table(
        "document_settings",
        sa.column(
            "id",
            sa.Integer(),
        ),
    )

    business_settings_table = sa.table(
        "business_settings",
        sa.column(
            "id",
            sa.Integer(),
        ),
    )

    backup_settings_table = sa.table(
        "backup_settings",
        sa.column(
            "id",
            sa.Integer(),
        ),
    )

    system_state_table = sa.table(
        "system_state",
        sa.column(
            "id",
            sa.Integer(),
        ),
    )

    op.bulk_insert(
        document_settings_table,
        [
            {
                "id": 1,
            },
        ],
    )

    op.bulk_insert(
        business_settings_table,
        [
            {
                "id": 1,
            },
        ],
    )

    op.bulk_insert(
        backup_settings_table,
        [
            {
                "id": 1,
            },
        ],
    )

    op.bulk_insert(
        system_state_table,
        [
            {
                "id": 1,
            },
        ],
    )


def downgrade() -> None:

    op.drop_table(
        "system_state"
    )

    op.drop_table(
        "financial_year_opening_wip"
    )

    op.drop_table(
        "financial_year_opening_stock"
    )

    op.drop_index(
        "ix_financial_year_transition_status",
        table_name=(
            "financial_year_transition_logs"
        ),
    )

    op.drop_table(
        "financial_year_transition_logs"
    )

    op.drop_index(
        "ix_number_audit_action",
        table_name="number_audit_logs",
    )

    op.drop_index(
        "ix_number_audit_document_number",
        table_name="number_audit_logs",
    )

    op.drop_index(
        "ix_number_audit_document_type",
        table_name="number_audit_logs",
    )

    op.drop_table(
        "number_audit_logs"
    )

    op.drop_index(
        "ix_backup_logs_checksum_sha256",
        table_name="backup_logs",
    )

    op.drop_index(
        "ix_backup_logs_status",
        table_name="backup_logs",
    )

    op.drop_index(
        "ix_backup_logs_backup_type",
        table_name="backup_logs",
    )

    op.drop_table(
        "backup_logs"
    )

    op.drop_table(
        "backup_settings"
    )

    op.drop_index(
        "ix_financial_years_status",
        table_name="financial_years",
    )

    op.drop_index(
        "ix_financial_years_name",
        table_name="financial_years",
    )

    op.drop_table(
        "financial_years"
    )

    op.drop_table(
        "business_settings"
    )

    op.drop_table(
        "document_settings"
    )

    op.drop_index(
        "ix_company_settings_pan_number",
        table_name="company_settings",
    )

    op.drop_column(
        "company_settings",
        "upi_id",
    )

    op.drop_column(
        "company_settings",
        "bank_branch",
    )

    op.drop_column(
        "company_settings",
        "bank_ifsc_code",
    )

    op.drop_column(
        "company_settings",
        "bank_account_number",
    )

    op.drop_column(
        "company_settings",
        "bank_name",
    )

    op.drop_column(
        "company_settings",
        "bank_account_name",
    )

    op.drop_column(
        "company_settings",
        "logo_path",
    )

    op.drop_column(
        "company_settings",
        "website",
    )

    op.drop_column(
        "company_settings",
        "pan_number",
    )