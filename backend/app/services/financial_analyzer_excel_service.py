from io import BytesIO
from decimal import Decimal

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font
from openpyxl.utils import get_column_letter


class FinancialAnalyzerExcelService:

    @staticmethod
    def build_excel(
        analysis: dict,
    ) -> BytesIO:

        workbook = Workbook()

        summary_sheet = workbook.active
        summary_sheet.title = "Financial Summary"

        expense_sheet = workbook.create_sheet(
            "Expense Breakdown"
        )

        # ========================================================
        # SUMMARY SHEET
        # ========================================================

        summary_sheet["A1"] = "Financial Analyzer"

        summary_sheet["A1"].font = Font(
            bold=True,
            size=16,
        )

        summary_sheet.merge_cells(
            "A1:D1"
        )

        summary_sheet["A3"] = "Start Date"
        summary_sheet["B3"] = (
            analysis["start_date"]
            if analysis["start_date"] is not None
            else "All"
        )

        summary_sheet["A4"] = "End Date"
        summary_sheet["B4"] = (
            analysis["end_date"]
            if analysis["end_date"] is not None
            else "All"
        )

        summary_sheet["A6"] = "Invoice Count"
        summary_sheet["B6"] = analysis[
            "invoice_count"
        ]

        summary_sheet["A7"] = (
            "Credit Note Count"
        )
        summary_sheet["B7"] = analysis[
            "credit_note_count"
        ]

        summary_sheet["A8"] = (
            "Expense Count"
        )
        summary_sheet["B8"] = analysis[
            "expense_count"
        ]

        summary_sheet["A10"] = "Financial Metric"
        summary_sheet["B10"] = "Amount"

        for cell in summary_sheet[10]:
            cell.font = Font(
                bold=True
            )

            cell.alignment = Alignment(
                horizontal="center"
            )

        financial_rows = [
            (
                "Gross Sales",
                analysis[
                    "gross_sales"
                ],
            ),
            (
                "Credit Notes",
                analysis[
                    "credit_notes"
                ],
            ),
            (
                "Net Sales",
                analysis[
                    "net_sales"
                ],
            ),
            (
                "Total Expenses",
                analysis[
                    "total_expenses"
                ],
            ),
            (
                "Net Profit",
                analysis[
                    "net_profit"
                ],
            ),
        ]

        row_number = 11

        for label, amount in financial_rows:

            summary_sheet.cell(
                row=row_number,
                column=1,
                value=label,
            )

            summary_sheet.cell(
                row=row_number,
                column=2,
                value=float(
                    Decimal(
                        str(amount)
                    )
                ),
            )

            summary_sheet.cell(
                row=row_number,
                column=2,
            ).number_format = (
                "#,##0.00"
            )

            row_number += 1

        # ========================================================
        # EXPENSE BREAKDOWN SHEET
        # ========================================================

        headers = [
            "Category",
            "Expense Count",
            "Amount",
        ]

        expense_sheet.append(
            headers
        )

        for cell in expense_sheet[1]:
            cell.font = Font(
                bold=True
            )

            cell.alignment = Alignment(
                horizontal="center"
            )

        for item in analysis[
            "expense_breakdown"
        ]:

            expense_sheet.append(
                [
                    item["category"],
                    item["count"],
                    float(
                        Decimal(
                            str(
                                item["amount"]
                            )
                        )
                    ),
                ]
            )

        for row in expense_sheet.iter_rows(
            min_row=2,
            min_col=3,
            max_col=3,
        ):
            for cell in row:
                cell.number_format = (
                    "#,##0.00"
                )

        # ========================================================
        # TOTAL EXPENSE ROW
        # ========================================================

        total_row = (
            expense_sheet.max_row + 2
        )

        expense_sheet.cell(
            row=total_row,
            column=1,
            value="Total Expenses",
        )

        expense_sheet.cell(
            row=total_row,
            column=1,
        ).font = Font(
            bold=True
        )

        expense_sheet.cell(
            row=total_row,
            column=3,
            value=float(
                Decimal(
                    str(
                        analysis[
                            "total_expenses"
                        ]
                    )
                )
            ),
        )

        expense_sheet.cell(
            row=total_row,
            column=3,
        ).font = Font(
            bold=True
        )

        expense_sheet.cell(
            row=total_row,
            column=3,
        ).number_format = (
            "#,##0.00"
        )

        # ========================================================
        # COLUMN WIDTHS
        # ========================================================

        for sheet in (
            summary_sheet,
            expense_sheet,
        ):

            for column_cells in sheet.columns:

                max_length = 0

                column_letter = (
                    get_column_letter(
                        column_cells[0].column
                    )
                )

                for cell in column_cells:

                    value = (
                        ""
                        if cell.value is None
                        else str(
                            cell.value
                        )
                    )

                    max_length = max(
                        max_length,
                        len(value),
                    )

                sheet.column_dimensions[
                    column_letter
                ].width = min(
                    max_length + 2,
                    40,
                )

        # ========================================================
        # FREEZE PANES
        # ========================================================

        expense_sheet.freeze_panes = (
            "A2"
        )

        # ========================================================
        # OUTPUT
        # ========================================================

        output = BytesIO()

        workbook.save(
            output
        )

        output.seek(0)

        return output