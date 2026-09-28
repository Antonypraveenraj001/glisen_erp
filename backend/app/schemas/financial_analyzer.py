from datetime import date
from decimal import Decimal

from pydantic import BaseModel


# ============================================================
# GENERAL EXPENSE CATEGORY SUMMARY
# ============================================================


class ExpenseCategorySummary(BaseModel):

    category: str

    amount: Decimal

    count: int


# ============================================================
# FINANCIAL ANALYZER RESPONSE
# ============================================================


class FinancialAnalyzerResponse(BaseModel):

    start_date: date | None

    end_date: date | None

    # ========================================================
    # COUNTS
    # ========================================================

    invoice_count: int

    credit_note_count: int

    # Backward-compatible field.
    # Now represents GENERAL expense records only.
    expense_count: int

    general_expense_count: int

    finished_product_count: int

    snapshot_finished_product_count: int

    legacy_finished_product_count: int

    # ========================================================
    # SALES REVENUE
    # ========================================================

    gross_sales: Decimal

    credit_notes: Decimal

    net_sales: Decimal

    # ========================================================
    # FINISHED PRODUCT COST
    # ========================================================

    actual_material_cost: Decimal

    actual_operation_cost: Decimal

    direct_production_cost: Decimal

    # --------------------------------------------------------
    # Allocated indirect cost stored inside Finished Product
    # snapshots.
    #
    # These figures are for product costing / traceability.
    # They are not added again to P&L.
    # --------------------------------------------------------

    allocated_staff_cost: Decimal

    allocated_overhead_cost: Decimal

    allocated_indirect_cost: Decimal

    # Material
    # + Operation
    # + Direct Production Expense
    production_direct_cost: Decimal

    # Full Finished Product valuation:
    #
    # Production Direct Cost
    # + Allocated Staff
    # + Allocated Overhead
    total_production_cost: Decimal

    # ========================================================
    # PERIOD COMPANY EXPENSES
    # ========================================================

    staff_salary_cost: Decimal

    company_overhead_cost: Decimal

    total_general_expenses: Decimal

    # Salary
    # + Company Overhead
    # + General Expenses
    total_expenses: Decimal

    # ========================================================
    # BUSINESS COST / PROFIT
    # ========================================================

    # Production Direct Cost
    # + Period Company Expenses
    #
    # Allocated staff/overhead are deliberately not added
    # again here.
    total_business_cost: Decimal

    net_profit: Decimal

    # ========================================================
    # RECURRING-COST PERIOD
    # ========================================================

    recurring_cost_start_date: date | None

    recurring_cost_end_date: date | None

    # ========================================================
    # GENERAL EXPENSE BREAKDOWN
    # ========================================================

    expense_breakdown: list[
        ExpenseCategorySummary
    ]