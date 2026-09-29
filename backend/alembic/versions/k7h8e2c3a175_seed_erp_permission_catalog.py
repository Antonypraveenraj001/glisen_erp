"""seed erp permission catalog

Revision ID: k7h8e2c3a175
Revises: j6g7d1b2f064
Create Date: 2026-09-29

"""

from typing import (
    Sequence,
    Union,
)

from alembic import op
import sqlalchemy as sa


revision: str = "k7h8e2c3a175"

down_revision: Union[
    str,
    Sequence[str],
    None,
] = "j6g7d1b2f064"

branch_labels = None

depends_on = None


# ================================================================
# DATABASE PERMISSION CATALOGUE
#
# Runtime display metadata lives in:
# app/constants/permission_catalog.py
#
# This migration remains self-contained so historical migrations
# do not depend on future application code.
# ================================================================

PERMISSIONS = (

    ("dashboard.view", "Dashboard", "Open and view the ERP dashboard."),

    ("enquiries.view", "Enquiries", "View Enquiries."),
    ("enquiries.create", "Enquiries", "Create Enquiries."),
    ("enquiries.edit", "Enquiries", "Edit Enquiries."),
    ("enquiries.cancel", "Enquiries", "Cancel Enquiries."),
    ("enquiries.delete", "Enquiries", "Delete Enquiries."),

    ("proformas.view", "Proformas", "View Proformas."),
    ("proformas.create", "Proformas", "Create Proformas."),
    ("proformas.edit", "Proformas", "Edit Proformas."),
    ("proformas.confirm", "Proformas", "Confirm customer orders."),
    ("proformas.cancel", "Proformas", "Cancel Proformas."),
    ("proformas.delete", "Proformas", "Delete Proformas."),

    (
        "purchase_bills.view",
        "Purchase Bills",
        "View Purchase Bills.",
    ),
    (
        "purchase_bills.create",
        "Purchase Bills",
        "Create Purchase Bills.",
    ),
    (
        "purchase_bills.edit",
        "Purchase Bills",
        "Edit Purchase Bills.",
    ),
    (
        "purchase_bills.cancel",
        "Purchase Bills",
        "Cancel Purchase Bills.",
    ),
    (
        "purchase_bills.ai_scan",
        "Purchase Bills",
        "Use Purchase Bill AI scanning.",
    ),
    (
        "purchase_bills.payment",
        "Purchase Bills",
        "Record supplier payments.",
    ),

    ("products.view", "Products", "View Products."),
    ("products.create", "Products", "Create Products."),
    ("products.edit", "Products", "Edit Products."),
    (
        "products.deactivate",
        "Products",
        "Deactivate Products.",
    ),

    ("suppliers.view", "Suppliers", "View Suppliers."),
    ("suppliers.create", "Suppliers", "Create Suppliers."),
    ("suppliers.edit", "Suppliers", "Edit Suppliers."),
    (
        "suppliers.deactivate",
        "Suppliers",
        "Deactivate Suppliers.",
    ),

    ("customers.view", "Customers", "View Customers."),
    (
        "customers.edit",
        "Customers",
        "Edit Customer Master details.",
    ),

    ("stock.view", "Stock", "View Store stock."),
    (
        "stock.issue",
        "Stock",
        "Issue Store material to Production.",
    ),

    (
        "production.view",
        "Production",
        "View Production Orders.",
    ),
    (
        "production.start",
        "Production",
        "Start Production.",
    ),
    (
        "production.edit",
        "Production",
        "Edit Production Orders.",
    ),
    (
        "production.operations",
        "Production",
        "Manage Production operations.",
    ),
    (
        "production.complete",
        "Production",
        "Complete Production Orders.",
    ),

    (
        "finished_products.view",
        "Finished Products",
        "View Finished Products.",
    ),
    (
        "finished_products.receive",
        "Finished Products",
        "Receive completed Production output.",
    ),

    (
        "final_billing.view",
        "Final Billing",
        "View Final Bills.",
    ),
    (
        "final_billing.create_edit",
        "Final Billing",
        "Create and edit Final Bills.",
    ),
    (
        "final_billing.issue",
        "Final Billing",
        "Issue invoices.",
    ),
    (
        "final_billing.revision",
        "Final Billing",
        "Create revised invoices.",
    ),
    (
        "final_billing.credit_note",
        "Final Billing",
        "Create Credit Notes.",
    ),
    (
        "final_billing.payment",
        "Final Billing",
        "Record customer payments.",
    ),

    ("gst.view", "GST", "View GST reports."),
    ("gst.export", "GST", "Download GST Excel reports."),

    ("expenses.view", "Expenses", "View Expenses."),
    ("expenses.create", "Expenses", "Create Expenses."),
    ("expenses.edit", "Expenses", "Edit Expenses."),
    ("expenses.delete", "Expenses", "Delete Expenses."),

    (
        "staff.view",
        "Staff",
        "View Staff and salary information.",
    ),
    (
        "staff.manage",
        "Staff",
        "Manage Staff and salary information.",
    ),

    (
        "financial.view",
        "Financial Analyzer",
        "View Financial Analyzer.",
    ),
    (
        "financial.export",
        "Financial Analyzer",
        "Download Financial Analyzer reports.",
    ),

    (
        "settings.view",
        "Settings",
        "Open the Settings module.",
    ),
    (
        "settings.company.manage",
        "Settings",
        "Manage Company Settings.",
    ),
    (
        "settings.documents.manage",
        "Settings",
        "Manage Document Settings.",
    ),
    (
        "settings.business.manage",
        "Settings",
        "Manage Business and Numbering Settings.",
    ),

    (
        "users.view",
        "Users & Access",
        "View ERP users and roles.",
    ),
    (
        "users.manage",
        "Users & Access",
        "Manage ERP users.",
    ),
    (
        "permissions.manage",
        "Users & Access",
        "Manage role permissions.",
    ),

    (
        "numbering.skip",
        "Numbering",
        "Skip or reserve document numbers.",
    ),
    (
        "numbering.audit.view",
        "Numbering",
        "View Number Audit Log.",
    ),

    (
        "backup.view",
        "Backup & Recovery",
        "View backup configuration and history.",
    ),
    (
        "backup.manage",
        "Backup & Recovery",
        "Create, verify and restore backups.",
    ),

    (
        "financial_year.view",
        "Financial Year",
        "View Financial Year information.",
    ),
    (
        "financial_year.manage",
        "Financial Year",
        "Close and transition Financial Years.",
    ),
)


# ================================================================
# CURRENT READ ACCESS
#
# These permissions mirror the existing application where most
# operational GET endpoints are available to every active user.
#
# We preserve that behaviour during migration. Boss can later
# remove View permissions using the matrix.
# ================================================================

GENERAL_PERMISSIONS = {
    "dashboard.view",

    "enquiries.view",
    "proformas.view",

    "purchase_bills.view",

    "products.view",
    "suppliers.view",
    "customers.view",

    "stock.view",

    "production.view",
    "finished_products.view",

    "final_billing.view",

    "gst.view",
    "gst.export",

    "settings.view",
}


# ================================================================
# DEFAULT ROLE MAPPINGS
#
# These intentionally mirror the current hard-coded role access.
# The permission system will not control existing routes until the
# next implementation stage.
# ================================================================

ROLE_PERMISSIONS = {

    "Admin": (
        GENERAL_PERMISSIONS
        | {
            "enquiries.create",
            "enquiries.edit",
            "enquiries.cancel",
            "enquiries.delete",

            "proformas.create",
            "proformas.edit",
            "proformas.confirm",
            "proformas.cancel",
            "proformas.delete",

            "products.create",
            "products.edit",
            "products.deactivate",

            "suppliers.create",
            "suppliers.edit",
            "suppliers.deactivate",

            "customers.edit",

            "stock.issue",

            "production.start",
            "production.edit",
            "production.operations",
            "production.complete",

            "finished_products.receive",

            "final_billing.create_edit",
            "final_billing.issue",
            "final_billing.revision",
            "final_billing.credit_note",
            "final_billing.payment",

            "expenses.view",
            "expenses.create",
            "expenses.edit",
            "expenses.delete",

            "staff.view",
            "staff.manage",

            "financial.view",
            "financial.export",

            "settings.company.manage",
            "settings.documents.manage",

            "users.view",
            "users.manage",
        }
    ),

    "Purchase": (
        GENERAL_PERMISSIONS
        | {
            "purchase_bills.create",
            "purchase_bills.edit",
            "purchase_bills.cancel",
            "purchase_bills.ai_scan",

            "products.create",
            "products.edit",

            "suppliers.create",
            "suppliers.edit",
        }
    ),

    "Sales": (
        GENERAL_PERMISSIONS
        | {
            "enquiries.create",
            "enquiries.edit",
            "enquiries.cancel",

            "proformas.create",
            "proformas.edit",
            "proformas.confirm",
            "proformas.cancel",

            "products.create",

            "customers.edit",

            "final_billing.create_edit",
            "final_billing.issue",
            "final_billing.revision",
            "final_billing.credit_note",
        }
    ),

    "Accounts": (
        GENERAL_PERMISSIONS
        | {
            "purchase_bills.payment",

            "final_billing.create_edit",
            "final_billing.issue",
            "final_billing.revision",
            "final_billing.credit_note",
            "final_billing.payment",

            "expenses.view",
            "expenses.create",
            "expenses.edit",
            "expenses.delete",

            "staff.view",
            "staff.manage",

            "financial.view",
            "financial.export",
        }
    ),

    "Production": (
        GENERAL_PERMISSIONS
        | {
            "stock.issue",

            "production.start",
            "production.edit",
            "production.operations",
            "production.complete",

            "finished_products.receive",
        }
    ),

    "Store": (
        GENERAL_PERMISSIONS
        | {
            "stock.issue",
            "finished_products.receive",
        }
    ),
}


def upgrade() -> None:

    connection = op.get_bind()

    permissions_table = sa.table(
        "permissions",
        sa.column("id", sa.Integer()),
        sa.column("name", sa.String()),
        sa.column("module", sa.String()),
        sa.column("description", sa.String()),
    )

    roles_table = sa.table(
        "roles",
        sa.column("id", sa.Integer()),
        sa.column("name", sa.String()),
    )

    role_permissions_table = sa.table(
        "role_permissions",
        sa.column("id", sa.Integer()),
        sa.column("role_id", sa.Integer()),
        sa.column("permission_id", sa.Integer()),
    )

    # ============================================================
    # CLEAN OLD DUPLICATE ROLE-PERMISSION ROWS
    #
    # The original RBAC table did not have a unique constraint.
    # ============================================================

    connection.execute(
        sa.text(
            """
            DELETE rp1
            FROM role_permissions rp1
            INNER JOIN role_permissions rp2
                ON rp1.role_id = rp2.role_id
                AND rp1.permission_id = rp2.permission_id
                AND rp1.id > rp2.id
            """
        )
    )

    # ============================================================
    # ENFORCE UNIQUE ROLE + PERMISSION COMBINATION
    # ============================================================

    op.create_unique_constraint(
        "uq_role_permissions_role_permission",
        "role_permissions",
        [
            "role_id",
            "permission_id",
        ],
    )

    # ============================================================
    # INSERT / UPDATE PERMISSION CATALOGUE
    # ============================================================

    permission_ids: dict[str, int] = {}

    for (
        permission_name,
        module_name,
        description,
    ) in PERMISSIONS:

        existing = connection.execute(
            sa.select(
                permissions_table.c.id
            ).where(
                permissions_table.c.name
                == permission_name
            )
        ).first()

        if existing is None:

            connection.execute(
                permissions_table.insert().values(
                    name=permission_name,
                    module=module_name,
                    description=description,
                )
            )

        else:

            connection.execute(
                permissions_table.update()
                .where(
                    permissions_table.c.id
                    == existing[0]
                )
                .values(
                    module=module_name,
                    description=description,
                )
            )

        permission_row = connection.execute(
            sa.select(
                permissions_table.c.id
            ).where(
                permissions_table.c.name
                == permission_name
            )
        ).first()

        if permission_row is None:
            raise RuntimeError(
                f"Unable to create permission: {permission_name}"
            )

        permission_ids[
            permission_name
        ] = permission_row[0]

    # ============================================================
    # LOAD SYSTEM ROLES
    # ============================================================

    role_rows = connection.execute(
        sa.select(
            roles_table.c.id,
            roles_table.c.name,
        )
    ).all()

    role_ids = {
        row.name: row.id
        for row in role_rows
    }

    # ============================================================
    # BOSS = EVERY PERMISSION
    # ============================================================

    all_permission_names = {
        item[0]
        for item in PERMISSIONS
    }

    mappings = {
        **ROLE_PERMISSIONS,
        "Boss": all_permission_names,
    }

    # ============================================================
    # ADD DEFAULT ASSIGNMENTS
    #
    # Existing assignments are preserved.
    # ============================================================

    for (
        role_name,
        permission_names,
    ) in mappings.items():

        role_id = role_ids.get(
            role_name
        )

        if role_id is None:
            continue

        for permission_name in sorted(
            permission_names
        ):

            permission_id = (
                permission_ids[
                    permission_name
                ]
            )

            existing_assignment = (
                connection.execute(
                    sa.select(
                        role_permissions_table.c.id
                    )
                    .where(
                        role_permissions_table.c.role_id
                        == role_id
                    )
                    .where(
                        role_permissions_table.c.permission_id
                        == permission_id
                    )
                )
                .first()
            )

            if existing_assignment is None:

                connection.execute(
                    role_permissions_table
                    .insert()
                    .values(
                        role_id=role_id,
                        permission_id=permission_id,
                    )
                )


def downgrade() -> None:

    connection = op.get_bind()

    permissions_table = sa.table(
        "permissions",
        sa.column("id", sa.Integer()),
        sa.column("name", sa.String()),
    )

    role_permissions_table = sa.table(
        "role_permissions",
        sa.column("permission_id", sa.Integer()),
    )

    permission_names = [
        item[0]
        for item in PERMISSIONS
    ]

    permission_rows = connection.execute(
        sa.select(
            permissions_table.c.id
        ).where(
            permissions_table.c.name.in_(
                permission_names
            )
        )
    ).all()

    permission_ids = [
        row.id
        for row in permission_rows
    ]

    if permission_ids:

        connection.execute(
            role_permissions_table
            .delete()
            .where(
                role_permissions_table
                .c
                .permission_id
                .in_(
                    permission_ids
                )
            )
        )

        connection.execute(
            permissions_table
            .delete()
            .where(
                permissions_table
                .c
                .id
                .in_(
                    permission_ids
                )
            )
        )

    op.drop_constraint(
        "uq_role_permissions_role_permission",
        "role_permissions",
        type_="unique",
    )