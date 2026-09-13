from collections import defaultdict
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session

from app.services.expense_service import ExpenseService
from app.services.gst_report_service import GSTReportService


class FinancialAnalyzerService:

    @staticmethod
    def money(value) -> Decimal:
        return Decimal(str(value)).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

    @staticmethod
    def get_analysis(
        db: Session,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict:

        if (
            start_date is not None
            and end_date is not None
            and start_date > end_date
        ):
            raise ValueError(
                "Start date cannot be after end date."
            )

        gst_report = GSTReportService.get_report(
            db=db,
            start_date=start_date,
            end_date=end_date,
        )

        expenses = ExpenseService.get_all(
            db=db,
            start_date=start_date,
            end_date=end_date,
        )

        total_expenses = Decimal("0.00")

        category_totals = defaultdict(
            lambda: {
                "amount": Decimal("0.00"),
                "count": 0,
            }
        )

        for expense in expenses:
            amount = FinancialAnalyzerService.money(
                expense.amount
            )

            total_expenses += amount

            category_totals[
                expense.category
            ]["amount"] += amount

            category_totals[
                expense.category
            ]["count"] += 1

        gross_sales = FinancialAnalyzerService.money(
            gst_report["gross_invoice_total"]
        )

        credit_notes = FinancialAnalyzerService.money(
            gst_report["credit_note_total"]
        )

        net_sales = FinancialAnalyzerService.money(
            gst_report["net_sales_total"]
        )

        total_expenses = FinancialAnalyzerService.money(
            total_expenses
        )

        net_profit = FinancialAnalyzerService.money(
            net_sales - total_expenses
        )

        expense_breakdown = []

        for category in sorted(category_totals):
            data = category_totals[category]

            expense_breakdown.append(
                {
                    "category": category,
                    "amount": (
                        FinancialAnalyzerService.money(
                            data["amount"]
                        )
                    ),
                    "count": data["count"],
                }
            )

        return {
            "start_date": start_date,
            "end_date": end_date,

            "invoice_count": (
                gst_report["invoice_count"]
            ),

            "credit_note_count": (
                gst_report["credit_note_count"]
            ),

            "expense_count": len(expenses),

            "gross_sales": gross_sales,
            "credit_notes": credit_notes,
            "net_sales": net_sales,

            "total_expenses": total_expenses,
            "net_profit": net_profit,

            "expense_breakdown": (
                expense_breakdown
            ),
        }