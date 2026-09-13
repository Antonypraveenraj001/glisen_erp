from io import BytesIO
from decimal import Decimal

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font
from openpyxl.utils import get_column_letter


class GSTReportExcelService:

    @staticmethod
    def build_excel(
        report: dict,
    ) -> BytesIO:

        workbook = Workbook()

        summary_sheet = workbook.active
        summary_sheet.title = "GST Summary"

        detail_sheet = workbook.create_sheet(
            "GST Details"
        )

        # ========================================================
        # SUMMARY SHEET
        # ========================================================

        summary_sheet["A1"] = "GST Report"

        summary_sheet["A1"].font = Font(
            bold=True,
            size=16,
        )

        summary_sheet.merge_cells(
            "A1:D1"
        )

        summary_sheet["A3"] = "Start Date"
        summary_sheet["B3"] = (
            report["start_date"]
            if report["start_date"]
            is not None
            else "All"
        )

        summary_sheet["A4"] = "End Date"
        summary_sheet["B4"] = (
            report["end_date"]
            if report["end_date"]
            is not None
            else "All"
        )

        summary_sheet["A6"] = "Invoice Count"
        summary_sheet["B6"] = report[
            "invoice_count"
        ]

        summary_sheet["A7"] = (
            "Credit Note Count"
        )
        summary_sheet["B7"] = report[
            "credit_note_count"
        ]

        summary_rows = [
            (
                "Taxable Amount",
                report[
                    "gross_taxable_amount"
                ],
                report[
                    "credit_taxable_amount"
                ],
                report[
                    "net_taxable_amount"
                ],
            ),
            (
                "CGST",
                report[
                    "gross_cgst_amount"
                ],
                report[
                    "credit_cgst_amount"
                ],
                report[
                    "net_cgst_amount"
                ],
            ),
            (
                "SGST",
                report[
                    "gross_sgst_amount"
                ],
                report[
                    "credit_sgst_amount"
                ],
                report[
                    "net_sgst_amount"
                ],
            ),
            (
                "IGST",
                report[
                    "gross_igst_amount"
                ],
                report[
                    "credit_igst_amount"
                ],
                report[
                    "net_igst_amount"
                ],
            ),
            (
                "GST Total",
                report[
                    "gross_tax_amount"
                ],
                report[
                    "credit_tax_amount"
                ],
                report[
                    "net_tax_amount"
                ],
            ),
            (
                "Invoice Total",
                report[
                    "gross_invoice_total"
                ],
                report[
                    "credit_note_total"
                ],
                report[
                    "net_sales_total"
                ],
            ),
        ]

        summary_sheet["A10"] = "Category"
        summary_sheet["B10"] = "Gross"
        summary_sheet["C10"] = "Credit"
        summary_sheet["D10"] = "Net"

        for cell in summary_sheet[10]:
            cell.font = Font(
                bold=True
            )

            cell.alignment = Alignment(
                horizontal="center"
            )

        row_number = 11

        for (
            label,
            gross,
            credit,
            net,
        ) in summary_rows:

            summary_sheet.cell(
                row=row_number,
                column=1,
                value=label,
            )

            summary_sheet.cell(
                row=row_number,
                column=2,
                value=float(gross),
            )

            summary_sheet.cell(
                row=row_number,
                column=3,
                value=float(credit),
            )

            summary_sheet.cell(
                row=row_number,
                column=4,
                value=float(net),
            )

            row_number += 1

        for row in range(
            11,
            row_number,
        ):
            for column in range(
                2,
                5,
            ):
                summary_sheet.cell(
                    row=row,
                    column=column,
                ).number_format = (
                    '#,##0.00'
                )

        # ========================================================
        # DETAILS SHEET
        # ========================================================

        headers = [
            "Date",
            "Document Number",
            "Document Type",
            "Reference Invoice",
            "Customer",
            "GSTIN",
            "Taxable Amount",
            "CGST",
            "SGST",
            "IGST",
            "GST Total",
            "Grand Total",
        ]

        detail_sheet.append(
            headers
        )

        for cell in detail_sheet[1]:
            cell.font = Font(
                bold=True
            )

            cell.alignment = Alignment(
                horizontal="center"
            )

        for item in report["items"]:

            detail_sheet.append(
                [
                    item[
                        "document_date"
                    ],
                    item[
                        "document_number"
                    ],
                    item[
                        "document_type"
                    ],
                    item.get(
                        "reference_invoice_number"
                    ),
                    item[
                        "company_name"
                    ],
                    item.get(
                        "gst_number"
                    ),
                    float(
                        Decimal(
                            str(
                                item[
                                    "taxable_amount"
                                ]
                            )
                        )
                    ),
                    float(
                        Decimal(
                            str(
                                item[
                                    "cgst_amount"
                                ]
                            )
                        )
                    ),
                    float(
                        Decimal(
                            str(
                                item[
                                    "sgst_amount"
                                ]
                            )
                        )
                    ),
                    float(
                        Decimal(
                            str(
                                item[
                                    "igst_amount"
                                ]
                            )
                        )
                    ),
                    float(
                        Decimal(
                            str(
                                item[
                                    "tax_amount"
                                ]
                            )
                        )
                    ),
                    float(
                        Decimal(
                            str(
                                item[
                                    "grand_total"
                                ]
                            )
                        )
                    ),
                ]
            )

        for row in detail_sheet.iter_rows(
            min_row=2,
            min_col=7,
            max_col=12,
        ):
            for cell in row:
                cell.number_format = (
                    '#,##0.00'
                )

        # ========================================================
        # COLUMN WIDTHS
        # ========================================================

        for sheet in (
            summary_sheet,
            detail_sheet,
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
                        if cell.value
                        is None
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

        detail_sheet.freeze_panes = (
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