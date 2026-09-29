"""
Runtime metadata for the Glisen ERP permission system.

This file controls how permissions are presented in the
Settings -> Users & Access permission matrix.

Database seeding is handled by the Alembic migration.
"""


PERMISSION_CATALOG = (

    # ============================================================
    # DASHBOARD
    # ============================================================

    {
        "name": "dashboard.view",
        "module": "Dashboard",
        "label": "View Dashboard",
        "description": "Open and view the ERP dashboard.",
        "depends_on": None,
        "boss_only": False,
    },

    # ============================================================
    # ENQUIRIES
    # ============================================================

    {
        "name": "enquiries.view",
        "module": "Enquiries",
        "label": "View",
        "description": "View Enquiries.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "enquiries.create",
        "module": "Enquiries",
        "label": "Create",
        "description": "Create new Enquiries.",
        "depends_on": "enquiries.view",
        "boss_only": False,
    },

    {
        "name": "enquiries.edit",
        "module": "Enquiries",
        "label": "Edit",
        "description": "Edit existing Enquiries.",
        "depends_on": "enquiries.view",
        "boss_only": False,
    },

    {
        "name": "enquiries.cancel",
        "module": "Enquiries",
        "label": "Cancel",
        "description": "Mark an Enquiry as Cancelled.",
        "depends_on": "enquiries.view",
        "boss_only": False,
    },

    {
        "name": "enquiries.delete",
        "module": "Enquiries",
        "label": "Delete",
        "description": "Delete an Enquiry record.",
        "depends_on": "enquiries.view",
        "boss_only": False,
    },

    # ============================================================
    # PROFORMAS
    # ============================================================

    {
        "name": "proformas.view",
        "module": "Proformas",
        "label": "View",
        "description": "View Proformas.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "proformas.create",
        "module": "Proformas",
        "label": "Create",
        "description": "Create new Proformas.",
        "depends_on": "proformas.view",
        "boss_only": False,
    },

    {
        "name": "proformas.edit",
        "module": "Proformas",
        "label": "Edit",
        "description": "Edit Proforma content and normal status values.",
        "depends_on": "proformas.view",
        "boss_only": False,
    },

    {
        "name": "proformas.confirm",
        "module": "Proformas",
        "label": "Confirm Order",
        "description": "Confirm a Proforma as a customer order.",
        "depends_on": "proformas.view",
        "boss_only": False,
    },

    {
        "name": "proformas.cancel",
        "module": "Proformas",
        "label": "Cancel",
        "description": "Change a Proforma to Cancelled.",
        "depends_on": "proformas.view",
        "boss_only": False,
    },

    {
        "name": "proformas.delete",
        "module": "Proformas",
        "label": "Delete",
        "description": "Delete a Proforma record.",
        "depends_on": "proformas.view",
        "boss_only": False,
    },

    # ============================================================
    # PURCHASE BILLS
    # ============================================================

    {
        "name": "purchase_bills.view",
        "module": "Purchase Bills",
        "label": "View",
        "description": "View Purchase Bills and payment summaries.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "purchase_bills.create",
        "module": "Purchase Bills",
        "label": "Create",
        "description": "Create Purchase Bills.",
        "depends_on": "purchase_bills.view",
        "boss_only": False,
    },

    {
        "name": "purchase_bills.edit",
        "module": "Purchase Bills",
        "label": "Edit",
        "description": "Edit Purchase Bills.",
        "depends_on": "purchase_bills.view",
        "boss_only": False,
    },

    {
        "name": "purchase_bills.cancel",
        "module": "Purchase Bills",
        "label": "Cancel",
        "description": "Cancel Purchase Bills.",
        "depends_on": "purchase_bills.view",
        "boss_only": False,
    },

    {
        "name": "purchase_bills.ai_scan",
        "module": "Purchase Bills",
        "label": "AI Scan",
        "description": "Use AI extraction for Purchase Bills.",
        "depends_on": "purchase_bills.view",
        "boss_only": False,
    },

    {
        "name": "purchase_bills.payment",
        "module": "Purchase Bills",
        "label": "Record Supplier Payment",
        "description": "Record payments made against Purchase Bills.",
        "depends_on": "purchase_bills.view",
        "boss_only": False,
    },

    # ============================================================
    # PRODUCTS
    # ============================================================

    {
        "name": "products.view",
        "module": "Products",
        "label": "View",
        "description": "View purchased/raw-material Products.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "products.create",
        "module": "Products",
        "label": "Create",
        "description": "Create Products.",
        "depends_on": "products.view",
        "boss_only": False,
    },

    {
        "name": "products.edit",
        "module": "Products",
        "label": "Edit",
        "description": "Edit Products.",
        "depends_on": "products.view",
        "boss_only": False,
    },

    {
        "name": "products.deactivate",
        "module": "Products",
        "label": "Deactivate",
        "description": "Deactivate Products.",
        "depends_on": "products.view",
        "boss_only": False,
    },

    # ============================================================
    # SUPPLIERS
    # ============================================================

    {
        "name": "suppliers.view",
        "module": "Suppliers",
        "label": "View",
        "description": "View Suppliers.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "suppliers.create",
        "module": "Suppliers",
        "label": "Create",
        "description": "Create Suppliers.",
        "depends_on": "suppliers.view",
        "boss_only": False,
    },

    {
        "name": "suppliers.edit",
        "module": "Suppliers",
        "label": "Edit",
        "description": "Edit Suppliers.",
        "depends_on": "suppliers.view",
        "boss_only": False,
    },

    {
        "name": "suppliers.deactivate",
        "module": "Suppliers",
        "label": "Deactivate",
        "description": "Deactivate Suppliers.",
        "depends_on": "suppliers.view",
        "boss_only": False,
    },

    # ============================================================
    # CUSTOMERS
    #
    # Customer creation remains automatic from Enquiry.
    # ============================================================

    {
        "name": "customers.view",
        "module": "Customers",
        "label": "View",
        "description": "View Customer Master records.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "customers.edit",
        "module": "Customers",
        "label": "Edit",
        "description": "Edit Customer Master details.",
        "depends_on": "customers.view",
        "boss_only": False,
    },

    # ============================================================
    # STOCK
    # ============================================================

    {
        "name": "stock.view",
        "module": "Stock",
        "label": "View",
        "description": "View Store stock and stock movement history.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "stock.issue",
        "module": "Stock",
        "label": "Material Issue",
        "description": "Issue Store material to Production.",
        "depends_on": "stock.view",
        "boss_only": False,
    },

    # ============================================================
    # PRODUCTION
    # ============================================================

    {
        "name": "production.view",
        "module": "Production",
        "label": "View",
        "description": "View Production Orders.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "production.start",
        "module": "Production",
        "label": "Start Production",
        "description": "Start Production from a confirmed Proforma.",
        "depends_on": "production.view",
        "boss_only": False,
    },

    {
        "name": "production.edit",
        "module": "Production",
        "label": "Edit Production",
        "description": "Edit Production Order information and status.",
        "depends_on": "production.view",
        "boss_only": False,
    },

    {
        "name": "production.operations",
        "module": "Production",
        "label": "Manage Operations",
        "description": "Create, edit and complete Production operations.",
        "depends_on": "production.view",
        "boss_only": False,
    },

    {
        "name": "production.complete",
        "module": "Production",
        "label": "Complete Production",
        "description": "Mark a Production Order as completed.",
        "depends_on": "production.view",
        "boss_only": False,
    },

    # ============================================================
    # FINISHED PRODUCTS
    # ============================================================

    {
        "name": "finished_products.view",
        "module": "Finished Products",
        "label": "View",
        "description": "View Finished Products and receipt details.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "finished_products.receive",
        "module": "Finished Products",
        "label": "Receive Finished Product",
        "description": "Receive completed Production into Finished Products.",
        "depends_on": "finished_products.view",
        "boss_only": False,
    },

    # ============================================================
    # FINAL BILLING
    # ============================================================

    {
        "name": "final_billing.view",
        "module": "Final Billing",
        "label": "View",
        "description": "View Final Bills.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "final_billing.create_edit",
        "module": "Final Billing",
        "label": "Create / Edit",
        "description": "Create and edit draft Final Bills.",
        "depends_on": "final_billing.view",
        "boss_only": False,
    },

    {
        "name": "final_billing.issue",
        "module": "Final Billing",
        "label": "Issue Invoice",
        "description": "Issue a draft Final Bill as an invoice.",
        "depends_on": "final_billing.view",
        "boss_only": False,
    },

    {
        "name": "final_billing.revision",
        "module": "Final Billing",
        "label": "Create Revision",
        "description": "Create a revised invoice.",
        "depends_on": "final_billing.view",
        "boss_only": False,
    },

    {
        "name": "final_billing.credit_note",
        "module": "Final Billing",
        "label": "Create Credit Note",
        "description": "Create a Credit Note against an invoice.",
        "depends_on": "final_billing.view",
        "boss_only": False,
    },

    {
        "name": "final_billing.payment",
        "module": "Final Billing",
        "label": "Record Customer Payment",
        "description": "Record customer payments against invoices.",
        "depends_on": "final_billing.view",
        "boss_only": False,
    },

    # ============================================================
    # GST
    # ============================================================

    {
        "name": "gst.view",
        "module": "GST",
        "label": "View",
        "description": "View Sales and Purchase GST reports.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "gst.export",
        "module": "GST",
        "label": "Download Excel",
        "description": "Download GST reports as Excel files.",
        "depends_on": "gst.view",
        "boss_only": False,
    },

    # ============================================================
    # EXPENSES
    # ============================================================

    {
        "name": "expenses.view",
        "module": "Expenses",
        "label": "View",
        "description": "View company Expenses.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "expenses.create",
        "module": "Expenses",
        "label": "Create",
        "description": "Create Expenses.",
        "depends_on": "expenses.view",
        "boss_only": False,
    },

    {
        "name": "expenses.edit",
        "module": "Expenses",
        "label": "Edit",
        "description": "Edit Expenses.",
        "depends_on": "expenses.view",
        "boss_only": False,
    },

    {
        "name": "expenses.delete",
        "module": "Expenses",
        "label": "Delete",
        "description": "Delete eligible Expense records.",
        "depends_on": "expenses.view",
        "boss_only": False,
    },

    # ============================================================
    # STAFF
    # ============================================================

    {
        "name": "staff.view",
        "module": "Staff",
        "label": "View",
        "description": "View Staff and salary information.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "staff.manage",
        "module": "Staff",
        "label": "Manage Staff",
        "description": "Create, edit and deactivate Staff records.",
        "depends_on": "staff.view",
        "boss_only": False,
    },

    # ============================================================
    # FINANCIAL ANALYZER
    # ============================================================

    {
        "name": "financial.view",
        "module": "Financial Analyzer",
        "label": "View",
        "description": "View Financial Analyzer.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "financial.export",
        "module": "Financial Analyzer",
        "label": "Download Excel",
        "description": "Download Financial Analyzer Excel reports.",
        "depends_on": "financial.view",
        "boss_only": False,
    },

    # ============================================================
    # SETTINGS
    # ============================================================

    {
        "name": "settings.view",
        "module": "Settings",
        "label": "Open Settings",
        "description": "Open the Settings module.",
        "depends_on": None,
        "boss_only": False,
    },

    {
        "name": "settings.company.manage",
        "module": "Settings",
        "label": "Edit Company Settings",
        "description": "Edit Company profile, logo and bank details.",
        "depends_on": "settings.view",
        "boss_only": False,
    },

    {
        "name": "settings.documents.manage",
        "module": "Settings",
        "label": "Edit Document Settings",
        "description": "Edit document, print and Proforma defaults.",
        "depends_on": "settings.view",
        "boss_only": False,
    },

    {
        "name": "settings.business.manage",
        "module": "Settings",
        "label": "Business & Numbering",
        "description": "Edit business defaults and numbering configuration.",
        "depends_on": "settings.view",
        "boss_only": True,
    },

    # ============================================================
    # USERS & ACCESS
    # ============================================================

    {
        "name": "users.view",
        "module": "Users & Access",
        "label": "View Users",
        "description": "View ERP users and roles.",
        "depends_on": "settings.view",
        "boss_only": False,
    },

    {
        "name": "users.manage",
        "module": "Users & Access",
        "label": "Manage Users",
        "description": "Create, edit, activate and deactivate ERP users.",
        "depends_on": "users.view",
        "boss_only": False,
    },

    {
        "name": "permissions.manage",
        "module": "Users & Access",
        "label": "Role Permission Matrix",
        "description": "Change permissions assigned to ERP roles.",
        "depends_on": "users.view",
        "boss_only": True,
    },

    # ============================================================
    # NUMBER AUDIT
    # ============================================================

    {
        "name": "numbering.skip",
        "module": "Numbering",
        "label": "Skip / Reserve Number",
        "description": "Skip or reserve the next controlled document number.",
        "depends_on": "settings.view",
        "boss_only": True,
    },

    {
        "name": "numbering.audit.view",
        "module": "Numbering",
        "label": "View Number Audit Log",
        "description": "View skipped and reserved document-number history.",
        "depends_on": "settings.view",
        "boss_only": True,
    },

    # ============================================================
    # BACKUP & RECOVERY
    # ============================================================

    {
        "name": "backup.view",
        "module": "Backup & Recovery",
        "label": "View Backup Status",
        "description": "View backup configuration and backup history.",
        "depends_on": "settings.view",
        "boss_only": True,
    },

    {
        "name": "backup.manage",
        "module": "Backup & Recovery",
        "label": "Backup / Restore",
        "description": "Create, verify and restore Glisen ERP backups.",
        "depends_on": "backup.view",
        "boss_only": True,
    },

    # ============================================================
    # FINANCIAL YEAR
    # ============================================================

    {
        "name": "financial_year.view",
        "module": "Financial Year",
        "label": "View Financial Year",
        "description": "View Financial Year and transition information.",
        "depends_on": "settings.view",
        "boss_only": True,
    },

    {
        "name": "financial_year.manage",
        "module": "Financial Year",
        "label": "Close / Transition Year",
        "description": "Close a Financial Year and start the next year.",
        "depends_on": "financial_year.view",
        "boss_only": True,
    },
)


PERMISSION_NAMES = tuple(
    item["name"]
    for item in PERMISSION_CATALOG
)


PERMISSION_METADATA = {
    item["name"]: item
    for item in PERMISSION_CATALOG
}


BOSS_ONLY_PERMISSION_NAMES = {
    item["name"]
    for item in PERMISSION_CATALOG
    if item["boss_only"]
}