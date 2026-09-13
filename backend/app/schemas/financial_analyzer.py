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

    invoice_count: int
    credit_note_count: int
    expense_count: int

    gross_sales: Decimal
    credit_notes: Decimal
    net_sales: Decimal

    total_expenses: Decimal
    net_profit: Decimal

    expense_breakdown: list[
        ExpenseCategorySummary
    ]