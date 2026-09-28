from decimal import Decimal
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import (
    Alignment,
    Font,
)
from openpyxl.utils import (
    get_column_letter,
)


class FinancialAnalyzerExcelService:

    # ========================================================
    # DECIMAL
    # ========================================================

    @staticmethod
    def decimal(
        value,
    ) -> Decimal:

        return Decimal(
            str(
                value
                if value is not None
                else 0
            )
        )

    # ========================================================
    # WRITE MONEY
    # ========================================================

    @staticmethod
    def write_money(
        sheet,
        row: int,
        column: int,
        value,
        *,
        bold: bool = False,
    ) -> None:

        cell = sheet.cell(
            row=row,
            column=column,
            value=float(
                FinancialAnalyzerExcelService
                .decimal(
                    value
                )
            ),
        )

        cell.number_format = (
            "₹#,##0.00;[Red]-₹#,##0.00"
        )

        if bold:
            cell.font = Font(
                bold=True
            )

    # ========================================================
    # SECTION HEADING
    # ========================================================

    @staticmethod
    def section_heading(
        sheet,
        row: int,
        title: str,
    ) -> None:

        cell = sheet.cell(
            row=row,
            column=1,
            value=title,
        )

        cell.font = Font(
            bold=True,
            size=12,
        )

    # ========================================================
    # BUILD EXCEL
    # ========================================================

    @staticmethod
    def build_excel(
        analysis: dict,
    ) -> BytesIO:

        workbook = Workbook()

        summary_sheet = (
            workbook.active
        )

        summary_sheet.title = (
            "Financial Summary"
        )

        production_sheet = (
            workbook.create_sheet(
                "Finished Product Cost"
            )
        )

        expense_sheet = (
            workbook.create_sheet(
                "Period Expenses"
            )
        )

        # ====================================================
        # FINANCIAL SUMMARY
        # ====================================================

        summary_sheet["A1"] = (
            "Glisen ERP - Financial Analyzer"
        )

        summary_sheet["A1"].font = Font(
            bold=True,
            size=16,
        )

        summary_sheet.merge_cells(
            "A1:D1"
        )

        summary_sheet["A3"] = (
            "Start Date"
        )

        summary_sheet["B3"] = (
            analysis[
                "start_date"
            ]
            if analysis[
                "start_date"
            ] is not None
            else "All"
        )

        summary_sheet["A4"] = (
            "End Date"
        )

        summary_sheet["B4"] = (
            analysis[
                "end_date"
            ]
            if analysis[
                "end_date"
            ] is not None
            else "All"
        )

        # ====================================================
        # RECORD SUMMARY
        # ====================================================

        FinancialAnalyzerExcelService.section_heading(
            summary_sheet,
            6,
            "Record Summary",
        )

        record_rows = [
            (
                "Effective Invoices",
                analysis[
                    "invoice_count"
                ],
            ),
            (
                "Issued Credit Notes",
                analysis[
                    "credit_note_count"
                ],
            ),
            (
                "Finished Products",
                analysis[
                    "finished_product_count"
                ],
            ),
            (
                "Frozen Cost Snapshots",
                analysis[
                    "snapshot_finished_product_count"
                ],
            ),
            (
                "Legacy Finished Products",
                analysis[
                    "legacy_finished_product_count"
                ],
            ),
            (
                "General Expense Records",
                analysis[
                    "general_expense_count"
                ],
            ),
        ]

        row_number = 7

        for (
            label,
            value,
        ) in record_rows:

            summary_sheet.cell(
                row=row_number,
                column=1,
                value=label,
            )

            summary_sheet.cell(
                row=row_number,
                column=2,
                value=value,
            )

            row_number += 1

        # ====================================================
        # SALES
        # ====================================================

        row_number += 1

        FinancialAnalyzerExcelService.section_heading(
            summary_sheet,
            row_number,
            "Sales Revenue",
        )

        row_number += 1

        sales_rows = [
            (
                "Gross Sales Revenue",
                analysis[
                    "gross_sales"
                ],
                False,
            ),
            (
                "Less: Credit Notes",
                (
                    -FinancialAnalyzerExcelService
                    .decimal(
                        analysis[
                            "credit_notes"
                        ]
                    )
                ),
                False,
            ),
            (
                "Net Sales Revenue",
                analysis[
                    "net_sales"
                ],
                True,
            ),
        ]

        for (
            label,
            amount,
            bold,
        ) in sales_rows:

            summary_sheet.cell(
                row=row_number,
                column=1,
                value=label,
            )

            if bold:
                summary_sheet.cell(
                    row=row_number,
                    column=1,
                ).font = Font(
                    bold=True
                )

            FinancialAnalyzerExcelService.write_money(
                summary_sheet,
                row_number,
                2,
                amount,
                bold=bold,
            )

            row_number += 1

        # ====================================================
        # FINISHED PRODUCT COST
        # ====================================================

        row_number += 1

        FinancialAnalyzerExcelService.section_heading(
            summary_sheet,
            row_number,
            "Finished Product Cost",
        )

        row_number += 1

        finished_product_rows = [
            (
                "Material Cost",
                analysis[
                    "actual_material_cost"
                ],
                False,
            ),
            (
                "Operation Cost",
                analysis[
                    "actual_operation_cost"
                ],
                False,
            ),
            (
                "Direct Production Expense",
                analysis[
                    "direct_production_cost"
                ],
                False,
            ),
            (
                "Production Direct Cost",
                analysis[
                    "production_direct_cost"
                ],
                True,
            ),
            (
                "Allocated Staff Cost",
                analysis[
                    "allocated_staff_cost"
                ],
                False,
            ),
            (
                "Allocated Overhead Cost",
                analysis[
                    "allocated_overhead_cost"
                ],
                False,
            ),
            (
                "Allocated Indirect Cost",
                analysis[
                    "allocated_indirect_cost"
                ],
                False,
            ),
            (
                "Total Finished Product Cost",
                analysis[
                    "total_production_cost"
                ],
                True,
            ),
        ]

        for (
            label,
            amount,
            bold,
        ) in finished_product_rows:

            summary_sheet.cell(
                row=row_number,
                column=1,
                value=label,
            )

            if bold:
                summary_sheet.cell(
                    row=row_number,
                    column=1,
                ).font = Font(
                    bold=True
                )

            FinancialAnalyzerExcelService.write_money(
                summary_sheet,
                row_number,
                2,
                amount,
                bold=bold,
            )

            row_number += 1

        # ====================================================
        # PERIOD COMPANY EXPENSES
        # ====================================================

        row_number += 1

        FinancialAnalyzerExcelService.section_heading(
            summary_sheet,
            row_number,
            "Period Company Expenses",
        )

        row_number += 1

        period_expense_rows = [
            (
                "Staff Salary",
                analysis[
                    "staff_salary_cost"
                ],
                False,
            ),
            (
                "Company Overhead",
                analysis[
                    "company_overhead_cost"
                ],
                False,
            ),
            (
                "General Expenses",
                analysis[
                    "total_general_expenses"
                ],
                False,
            ),
            (
                "Total Period Company Expenses",
                analysis[
                    "total_expenses"
                ],
                True,
            ),
        ]

        for (
            label,
            amount,
            bold,
        ) in period_expense_rows:

            summary_sheet.cell(
                row=row_number,
                column=1,
                value=label,
            )

            if bold:
                summary_sheet.cell(
                    row=row_number,
                    column=1,
                ).font = Font(
                    bold=True
                )

            FinancialAnalyzerExcelService.write_money(
                summary_sheet,
                row_number,
                2,
                amount,
                bold=bold,
            )

            row_number += 1

        # ====================================================
        # BUSINESS COST / PROFIT
        # ====================================================

        row_number += 1

        FinancialAnalyzerExcelService.section_heading(
            summary_sheet,
            row_number,
            "Business Cost & Profit",
        )

        row_number += 1

        business_rows = [
            (
                "Net Sales Revenue",
                analysis[
                    "net_sales"
                ],
                False,
            ),
            (
                "Less: Production Direct Cost",
                (
                    -FinancialAnalyzerExcelService
                    .decimal(
                        analysis[
                            "production_direct_cost"
                        ]
                    )
                ),
                False,
            ),
            (
                "Less: Period Company Expenses",
                (
                    -FinancialAnalyzerExcelService
                    .decimal(
                        analysis[
                            "total_expenses"
                        ]
                    )
                ),
                False,
            ),
            (
                "Total Business Cost",
                analysis[
                    "total_business_cost"
                ],
                True,
            ),
            (
                "Net Profit / Loss",
                analysis[
                    "net_profit"
                ],
                True,
            ),
        ]

        for (
            label,
            amount,
            bold,
        ) in business_rows:

            summary_sheet.cell(
                row=row_number,
                column=1,
                value=label,
            )

            if bold:
                summary_sheet.cell(
                    row=row_number,
                    column=1,
                ).font = Font(
                    bold=True
                )

            FinancialAnalyzerExcelService.write_money(
                summary_sheet,
                row_number,
                2,
                amount,
                bold=bold,
            )

            row_number += 1

        # ====================================================
        # ACCOUNTING BASIS
        # ====================================================

        row_number += 1

        FinancialAnalyzerExcelService.section_heading(
            summary_sheet,
            row_number,
            "Accounting Basis",
        )

        row_number += 1

        accounting_notes = [
            (
                "Revenue Basis",
                (
                    "Sales revenue excludes GST and "
                    "uses effective Issued invoice values."
                ),
            ),
            (
                "Finished Product Cost",
                (
                    "Material + Operation + Direct Production "
                    "+ Allocated Staff + Allocated Overhead."
                ),
            ),
            (
                "P&L Production Cost",
                (
                    "Material + Operation + Direct Production. "
                    "Allocated Staff and Overhead are not "
                    "charged again."
                ),
            ),
            (
                "Period Company Expenses",
                (
                    "Actual Staff Salary + Recurring Overhead "
                    "+ General Expenses for the reporting period."
                ),
            ),
            (
                "Total Business Cost",
                (
                    "Production Direct Cost "
                    "+ Period Company Expenses."
                ),
            ),
        ]

        for (
            label,
            note,
        ) in accounting_notes:

            summary_sheet.cell(
                row=row_number,
                column=1,
                value=label,
            ).font = Font(
                bold=True
            )

            summary_sheet.cell(
                row=row_number,
                column=2,
                value=note,
            )

            summary_sheet.cell(
                row=row_number,
                column=2,
            ).alignment = Alignment(
                wrap_text=True,
                vertical="top",
            )

            row_number += 1

        # ====================================================
        # FINISHED PRODUCT COST SHEET
        # ====================================================

        production_sheet["A1"] = (
            "Finished Product Cost Structure"
        )

        production_sheet["A1"].font = Font(
            bold=True,
            size=15,
        )

        production_sheet.merge_cells(
            "A1:C1"
        )

        production_sheet["A2"] = (
            "Product manufacturing valuation. "
            "Allocated staff and overhead are shown here "
            "for product costing."
        )

        production_sheet.merge_cells(
            "A2:C2"
        )

        production_sheet["A2"].alignment = Alignment(
            wrap_text=True
        )

        production_headers = [
            "Cost Component",
            "Amount",
            "Cost Basis",
        ]

        production_sheet.append(
            production_headers
        )

        for cell in production_sheet[3]:

            cell.font = Font(
                bold=True
            )

            cell.alignment = Alignment(
                horizontal="center"
            )

        production_data = [
            (
                "Finished Products",
                analysis[
                    "finished_product_count"
                ],
                (
                    "Finished Products received "
                    "during the reporting period"
                ),
                False,
            ),
            (
                "Frozen Cost Snapshots",
                analysis[
                    "snapshot_finished_product_count"
                ],
                (
                    "Finished Products with immutable "
                    "cost snapshots"
                ),
                False,
            ),
            (
                "Legacy Finished Products",
                analysis[
                    "legacy_finished_product_count"
                ],
                (
                    "Historical records created before "
                    "cost snapshots"
                ),
                False,
            ),
            (
                "Material Cost",
                analysis[
                    "actual_material_cost"
                ],
                (
                    "Store / Shop Floor material cost"
                ),
                True,
            ),
            (
                "Operation Cost",
                analysis[
                    "actual_operation_cost"
                ],
                (
                    "Production operation cost"
                ),
                True,
            ),
            (
                "Direct Production Expense",
                analysis[
                    "direct_production_cost"
                ],
                (
                    "Expense linked directly to "
                    "Production Orders"
                ),
                True,
            ),
            (
                "Production Direct Cost",
                analysis[
                    "production_direct_cost"
                ],
                (
                    "Material + Operation + Direct"
                ),
                True,
            ),
            (
                "Allocated Staff Cost",
                analysis[
                    "allocated_staff_cost"
                ],
                (
                    "Staff share frozen into "
                    "Finished Product cost"
                ),
                True,
            ),
            (
                "Allocated Overhead Cost",
                analysis[
                    "allocated_overhead_cost"
                ],
                (
                    "Overhead share frozen into "
                    "Finished Product cost"
                ),
                True,
            ),
            (
                "Allocated Indirect Cost",
                analysis[
                    "allocated_indirect_cost"
                ],
                (
                    "Allocated Staff "
                    "+ Allocated Overhead"
                ),
                True,
            ),
            (
                "Total Finished Product Cost",
                analysis[
                    "total_production_cost"
                ],
                (
                    "Complete manufacturing valuation"
                ),
                True,
            ),
        ]

        for (
            metric,
            amount,
            notes,
            is_money,
        ) in production_data:

            production_sheet.append(
                [
                    metric,
                    (
                        float(
                            FinancialAnalyzerExcelService
                            .decimal(
                                amount
                            )
                        )
                        if is_money
                        else int(
                            amount
                        )
                    ),
                    notes,
                ]
            )

            current_row = (
                production_sheet
                .max_row
            )

            if is_money:

                production_sheet.cell(
                    row=current_row,
                    column=2,
                ).number_format = (
                    "₹#,##0.00;[Red]-₹#,##0.00"
                )

        total_production_row = (
            production_sheet
            .max_row
        )

        production_sheet.cell(
            row=total_production_row,
            column=1,
        ).font = Font(
            bold=True
        )

        production_sheet.cell(
            row=total_production_row,
            column=2,
        ).font = Font(
            bold=True
        )

        # ====================================================
        # PERIOD EXPENSE SHEET
        # ====================================================

        expense_sheet["A1"] = (
            "Period Company Expenses"
        )

        expense_sheet["A1"].font = Font(
            bold=True,
            size=15,
        )

        expense_sheet.merge_cells(
            "A1:C1"
        )

        expense_sheet["A2"] = (
            "Recurring cost period"
        )

        expense_sheet["B2"] = (
            (
                f"{analysis['recurring_cost_start_date']}"
                f" to "
                f"{analysis['recurring_cost_end_date']}"
            )
            if (
                analysis[
                    "recurring_cost_start_date"
                ]
                is not None
                and
                analysis[
                    "recurring_cost_end_date"
                ]
                is not None
            )
            else "No recurring cost period"
        )

        expense_sheet["A4"] = (
            "Expense Component"
        )

        expense_sheet["B4"] = (
            "Amount"
        )

        expense_sheet["C4"] = (
            "ERP Source"
        )

        for cell in expense_sheet[4]:

            cell.font = Font(
                bold=True
            )

            cell.alignment = Alignment(
                horizontal="center"
            )

        expense_summary_rows = [
            (
                "Staff Salary",
                analysis[
                    "staff_salary_cost"
                ],
                "Staff Salary Rate History",
            ),
            (
                "Company Overhead",
                analysis[
                    "company_overhead_cost"
                ],
                "Recurring Overhead Rate History",
            ),
            (
                "General Expenses",
                analysis[
                    "total_general_expenses"
                ],
                "Expense Register",
            ),
            (
                "Total Period Company Expenses",
                analysis[
                    "total_expenses"
                ],
                (
                    "Salary + Overhead + General"
                ),
            ),
        ]

        expense_row = 5

        for (
            label,
            amount,
            source,
        ) in expense_summary_rows:

            expense_sheet.cell(
                row=expense_row,
                column=1,
                value=label,
            )

            FinancialAnalyzerExcelService.write_money(
                expense_sheet,
                expense_row,
                2,
                amount,
                bold=(
                    label
                    ==
                    "Total Period Company Expenses"
                ),
            )

            expense_sheet.cell(
                row=expense_row,
                column=3,
                value=source,
            )

            if (
                label
                ==
                "Total Period Company Expenses"
            ):

                expense_sheet.cell(
                    row=expense_row,
                    column=1,
                ).font = Font(
                    bold=True
                )

            expense_row += 1

        # ====================================================
        # GENERAL EXPENSE BREAKDOWN
        # ====================================================

        expense_row += 2

        expense_sheet.cell(
            row=expense_row,
            column=1,
            value="General Expense Breakdown",
        ).font = Font(
            bold=True,
            size=12,
        )

        expense_row += 1

        breakdown_header_row = (
            expense_row
        )

        expense_sheet.cell(
            row=expense_row,
            column=1,
            value="Category",
        )

        expense_sheet.cell(
            row=expense_row,
            column=2,
            value="Record Count",
        )

        expense_sheet.cell(
            row=expense_row,
            column=3,
            value="Amount",
        )

        for cell in expense_sheet[
            breakdown_header_row
        ]:

            cell.font = Font(
                bold=True
            )

            cell.alignment = Alignment(
                horizontal="center"
            )

        expense_row += 1

        for item in analysis[
            "expense_breakdown"
        ]:

            expense_sheet.cell(
                row=expense_row,
                column=1,
                value=item[
                    "category"
                ],
            )

            expense_sheet.cell(
                row=expense_row,
                column=2,
                value=item[
                    "count"
                ],
            )

            FinancialAnalyzerExcelService.write_money(
                expense_sheet,
                expense_row,
                3,
                item[
                    "amount"
                ],
            )

            expense_row += 1

        if (
            not analysis[
                "expense_breakdown"
            ]
        ):

            expense_sheet.cell(
                row=expense_row,
                column=1,
                value=(
                    "No General Expenses "
                    "for this period."
                ),
            )

        # ====================================================
        # P&L NOTE
        # ====================================================

        expense_row += 2

        expense_sheet.cell(
            row=expense_row,
            column=1,
            value="P&L Treatment",
        ).font = Font(
            bold=True
        )

        expense_sheet.cell(
            row=expense_row,
            column=2,
            value=(
                "Allocated Finished Product staff and "
                "overhead costs are not added again. "
                "The Financial Analyzer recognizes the "
                "actual period salary and recurring "
                "overhead once."
            ),
        )

        expense_sheet.merge_cells(
            start_row=expense_row,
            start_column=2,
            end_row=expense_row,
            end_column=3,
        )

        expense_sheet.cell(
            row=expense_row,
            column=2,
        ).alignment = Alignment(
            wrap_text=True,
            vertical="top",
        )

        # ====================================================
        # COLUMN WIDTHS
        # ====================================================

        for sheet in (
            summary_sheet,
            production_sheet,
            expense_sheet,
        ):

            for column_cells in (
                sheet.columns
            ):

                max_length = 0

                column_letter = (
                    get_column_letter(
                        column_cells[
                            0
                        ].column
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
                        len(
                            value
                        ),
                    )

                sheet.column_dimensions[
                    column_letter
                ].width = min(
                    max_length + 3,
                    60,
                )

        # ====================================================
        # FREEZE PANES
        # ====================================================

        production_sheet.freeze_panes = (
            "A4"
        )

        expense_sheet.freeze_panes = (
            "A5"
        )

        # ====================================================
        # OUTPUT
        # ====================================================

        output = BytesIO()

        workbook.save(
            output
        )

        output.seek(
            0
        )

        return output