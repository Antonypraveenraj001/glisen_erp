from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class ExpenseCategorySummary(BaseModel):
    category: str
    amount: Decimal
    count: int


class FinancialAnalyzerResponse(BaseModel):
    start_date: date | None
    end_date: date | None

    # ========================================================
    # COUNTS
    # ========================================================

    invoice_count: int
    credit_note_count: int
    expense_count: int

    finished_product_count: int

    # ========================================================
    # SALES
    # ========================================================

    gross_sales: Decimal
    credit_notes: Decimal
    net_sales: Decimal

    # ========================================================
    # PRODUCTION COST
    # ========================================================

    actual_material_cost: Decimal
    actual_operation_cost: Decimal
    total_production_cost: Decimal

    # ========================================================
    # COMPANY EXPENSES
    # ========================================================

    total_expenses: Decimal

    # ========================================================
    # TOTAL BUSINESS COST / PROFIT
    # ========================================================

    total_business_cost: Decimal
    net_profit: Decimal

    # ========================================================
    # EXPENSE BREAKDOWN
    # ========================================================

    expense_breakdown: list[
        ExpenseCategorySummary
    ]