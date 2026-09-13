from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session

from app.models.company_settings import CompanySettings
from app.models.final_bill import FinalBill


class GSTReportService:

    # ============================================================
    # DECIMAL HELPERS
    # ============================================================

    @staticmethod
    def decimal(value) -> Decimal:
        return Decimal(
            str(
                value
                if value is not None
                else Decimal("0.00")
            )
        )

    @staticmethod
    def money(value) -> Decimal:
        return (
            GSTReportService
            .decimal(value)
            .quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP,
            )
        )

    # ============================================================
    # DATE FILTER
    # ============================================================

    @staticmethod
    def within_date_range(
        document_date: date,
        start_date: date | None,
        end_date: date | None,
    ) -> bool:

        if (
            start_date is not None
            and document_date < start_date
        ):
            return False

        if (
            end_date is not None
            and document_date > end_date
        ):
            return False

        return True

    # ============================================================
    # GST COMPONENT RESOLUTION
    # ============================================================

    @staticmethod
    def resolve_gst_components(
        bill: FinalBill,
        company_state_code: str,
    ) -> tuple[
        Decimal,
        Decimal,
        Decimal,
    ]:

        tax_amount = (
            GSTReportService.money(
                bill.tax_amount
            )
        )

        stored_cgst = (
            GSTReportService.money(
                bill.cgst_amount
            )
        )

        stored_sgst = (
            GSTReportService.money(
                bill.sgst_amount
            )
        )

        stored_igst = (
            GSTReportService.money(
                bill.igst_amount
            )
        )

        stored_total = (
            stored_cgst
            + stored_sgst
            + stored_igst
        )

        # If the stored GST split is already valid,
        # preserve the issued document values.
        if (
            GSTReportService.money(
                stored_total
            )
            == tax_amount
        ):
            return (
                stored_cgst,
                stored_sgst,
                stored_igst,
            )

        # Historical invoices created before GST split
        # support may contain correct total GST but
        # zero CGST / SGST / IGST fields.
        customer_gst_number = (
            bill.gst_number
            or ""
        ).strip().upper()

        if (
            len(customer_gst_number) != 15
            or not customer_gst_number[:2].isdigit()
        ):
            raise ValueError(
                "Cannot determine GST split for "
                f"{bill.invoice_number}: "
                "customer GST number is invalid."
            )

        customer_state_code = (
            customer_gst_number[:2]
        )

        if (
            customer_state_code
            == company_state_code
        ):

            cgst_amount = (
                GSTReportService.money(
                    tax_amount
                    / Decimal("2")
                )
            )

            sgst_amount = (
                GSTReportService.money(
                    tax_amount
                    - cgst_amount
                )
            )

            igst_amount = Decimal(
                "0.00"
            )

        else:

            cgst_amount = Decimal(
                "0.00"
            )

            sgst_amount = Decimal(
                "0.00"
            )

            igst_amount = (
                tax_amount
            )

        return (
            cgst_amount,
            sgst_amount,
            igst_amount,
        )

    # ============================================================
    # GST REPORT
    # ============================================================

    @staticmethod
    def get_report(
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

        company_settings = (
            db.query(CompanySettings)
            .first()
        )

        if company_settings is None:
            raise ValueError(
                "Company GST settings have not "
                "been configured."
            )

        company_state_code = (
            company_settings.state_code
            or ""
        ).strip()

        if (
            len(company_state_code) != 2
            or not company_state_code.isdigit()
        ):
            raise ValueError(
                "Company GST state code is invalid."
            )

        # ========================================================
        # LOAD ALL ISSUED FINAL BILL DOCUMENTS
        # ========================================================

        issued_documents = (
            db.query(FinalBill)
            .filter(
                FinalBill.status
                == "Issued"
            )
            .all()
        )

        # ========================================================
        # EFFECTIVE INVOICE SELECTION
        #
        # One sale chain can contain:
        #
        # Original Tax Invoice
        # R1
        # R2
        # ...
        #
        # Only the latest Issued version counts as sale value.
        # ========================================================

        invoice_chains: dict[
            int,
            list[FinalBill],
        ] = {}

        issued_credit_notes: list[
            FinalBill
        ] = []

        for bill in issued_documents:

            invoice_type = (
                bill.invoice_type
                or ""
            ).strip().lower()

            if invoice_type == "credit note":
                issued_credit_notes.append(
                    bill
                )
                continue

            if invoice_type not in {
                "tax invoice",
                "revised invoice",
            }:
                continue

            if (
                invoice_type
                == "revised invoice"
            ):

                if (
                    bill.parent_invoice_id
                    is None
                ):
                    continue

                root_invoice_id = (
                    bill.parent_invoice_id
                )

            else:

                root_invoice_id = (
                    bill.id
                )

            invoice_chains.setdefault(
                root_invoice_id,
                [],
            ).append(
                bill
            )

        effective_invoices: list[
            FinalBill
        ] = []

        for chain in invoice_chains.values():

            latest_bill = max(
                chain,
                key=lambda bill: (
                    bill.revision_number,
                    bill.id,
                ),
            )

            if GSTReportService.within_date_range(
                document_date=(
                    latest_bill.invoice_date
                ),
                start_date=start_date,
                end_date=end_date,
            ):
                effective_invoices.append(
                    latest_bill
                )

        filtered_credit_notes = [
            bill
            for bill in issued_credit_notes
            if GSTReportService.within_date_range(
                document_date=(
                    bill.invoice_date
                ),
                start_date=start_date,
                end_date=end_date,
            )
        ]

        # ========================================================
        # CREDIT NOTE PARENT REFERENCES
        # ========================================================

        parent_ids = {
            bill.parent_invoice_id
            for bill in filtered_credit_notes
            if bill.parent_invoice_id
            is not None
        }

        parent_map: dict[int, FinalBill] = {}

        if parent_ids:

            parent_bills = (
                db.query(FinalBill)
                .filter(
                    FinalBill.id.in_(
                        parent_ids
                    )
                )
                .all()
            )

            parent_map = {
                bill.id: bill
                for bill in parent_bills
            }

        # ========================================================
        # TOTALS
        # ========================================================

        gross_taxable_amount = Decimal(
            "0.00"
        )

        gross_cgst_amount = Decimal(
            "0.00"
        )

        gross_sgst_amount = Decimal(
            "0.00"
        )

        gross_igst_amount = Decimal(
            "0.00"
        )

        gross_tax_amount = Decimal(
            "0.00"
        )

        gross_invoice_total = Decimal(
            "0.00"
        )

        credit_taxable_amount = Decimal(
            "0.00"
        )

        credit_cgst_amount = Decimal(
            "0.00"
        )

        credit_sgst_amount = Decimal(
            "0.00"
        )

        credit_igst_amount = Decimal(
            "0.00"
        )

        credit_tax_amount = Decimal(
            "0.00"
        )

        credit_note_total = Decimal(
            "0.00"
        )

        items: list[dict] = []

        # ========================================================
        # EFFECTIVE INVOICES
        # ========================================================

        for bill in effective_invoices:

            (
                cgst_amount,
                sgst_amount,
                igst_amount,
            ) = (
                GSTReportService
                .resolve_gst_components(
                    bill=bill,
                    company_state_code=(
                        company_state_code
                    ),
                )
            )

            taxable_amount = (
                GSTReportService.money(
                    bill.taxable_amount
                )
            )

            tax_amount = (
                GSTReportService.money(
                    bill.tax_amount
                )
            )

            grand_total = (
                GSTReportService.money(
                    bill.grand_total
                )
            )

            gross_taxable_amount += (
                taxable_amount
            )

            gross_cgst_amount += (
                cgst_amount
            )

            gross_sgst_amount += (
                sgst_amount
            )

            gross_igst_amount += (
                igst_amount
            )

            gross_tax_amount += (
                tax_amount
            )

            gross_invoice_total += (
                grand_total
            )

            items.append(
                {
                    "document_id": (
                        bill.id
                    ),
                    "document_number": (
                        bill.invoice_number
                    ),
                    "document_date": (
                        bill.invoice_date
                    ),
                    "document_type": (
                        bill.invoice_type
                    ),
                    "reference_invoice_number": (
                        None
                    ),
                    "customer_id": (
                        bill.customer_id
                    ),
                    "company_name": (
                        bill.company_name
                    ),
                    "gst_number": (
                        bill.gst_number
                    ),
                    "taxable_amount": (
                        taxable_amount
                    ),
                    "cgst_amount": (
                        cgst_amount
                    ),
                    "sgst_amount": (
                        sgst_amount
                    ),
                    "igst_amount": (
                        igst_amount
                    ),
                    "tax_amount": (
                        tax_amount
                    ),
                    "grand_total": (
                        grand_total
                    ),
                }
            )

        # ========================================================
        # ISSUED CREDIT NOTES
        # ========================================================

        for bill in filtered_credit_notes:

            (
                cgst_amount,
                sgst_amount,
                igst_amount,
            ) = (
                GSTReportService
                .resolve_gst_components(
                    bill=bill,
                    company_state_code=(
                        company_state_code
                    ),
                )
            )

            taxable_amount = (
                GSTReportService.money(
                    bill.taxable_amount
                )
            )

            tax_amount = (
                GSTReportService.money(
                    bill.tax_amount
                )
            )

            grand_total = (
                GSTReportService.money(
                    bill.grand_total
                )
            )

            credit_taxable_amount += (
                taxable_amount
            )

            credit_cgst_amount += (
                cgst_amount
            )

            credit_sgst_amount += (
                sgst_amount
            )

            credit_igst_amount += (
                igst_amount
            )

            credit_tax_amount += (
                tax_amount
            )

            credit_note_total += (
                grand_total
            )

            parent_bill = (
                parent_map.get(
                    bill.parent_invoice_id
                )
                if bill.parent_invoice_id
                is not None
                else None
            )

            items.append(
                {
                    "document_id": (
                        bill.id
                    ),
                    "document_number": (
                        bill.invoice_number
                    ),
                    "document_date": (
                        bill.invoice_date
                    ),
                    "document_type": (
                        bill.invoice_type
                    ),
                    "reference_invoice_number": (
                        parent_bill.invoice_number
                        if parent_bill
                        else None
                    ),
                    "customer_id": (
                        bill.customer_id
                    ),
                    "company_name": (
                        bill.company_name
                    ),
                    "gst_number": (
                        bill.gst_number
                    ),
                    "taxable_amount": (
                        taxable_amount
                    ),
                    "cgst_amount": (
                        cgst_amount
                    ),
                    "sgst_amount": (
                        sgst_amount
                    ),
                    "igst_amount": (
                        igst_amount
                    ),
                    "tax_amount": (
                        tax_amount
                    ),
                    "grand_total": (
                        grand_total
                    ),
                }
            )

        # ========================================================
        # SORT REPORT DOCUMENTS
        # ========================================================

        items.sort(
            key=lambda item: (
                item["document_date"],
                item["document_number"],
            )
        )

        # ========================================================
        # RESPONSE
        # ========================================================

        return {
            "start_date": start_date,
            "end_date": end_date,

            "invoice_count": (
                len(
                    effective_invoices
                )
            ),

            "credit_note_count": (
                len(
                    filtered_credit_notes
                )
            ),

            "gross_taxable_amount": (
                GSTReportService.money(
                    gross_taxable_amount
                )
            ),

            "credit_taxable_amount": (
                GSTReportService.money(
                    credit_taxable_amount
                )
            ),

            "net_taxable_amount": (
                GSTReportService.money(
                    gross_taxable_amount
                    - credit_taxable_amount
                )
            ),

            "gross_cgst_amount": (
                GSTReportService.money(
                    gross_cgst_amount
                )
            ),

            "credit_cgst_amount": (
                GSTReportService.money(
                    credit_cgst_amount
                )
            ),

            "net_cgst_amount": (
                GSTReportService.money(
                    gross_cgst_amount
                    - credit_cgst_amount
                )
            ),

            "gross_sgst_amount": (
                GSTReportService.money(
                    gross_sgst_amount
                )
            ),

            "credit_sgst_amount": (
                GSTReportService.money(
                    credit_sgst_amount
                )
            ),

            "net_sgst_amount": (
                GSTReportService.money(
                    gross_sgst_amount
                    - credit_sgst_amount
                )
            ),

            "gross_igst_amount": (
                GSTReportService.money(
                    gross_igst_amount
                )
            ),

            "credit_igst_amount": (
                GSTReportService.money(
                    credit_igst_amount
                )
            ),

            "net_igst_amount": (
                GSTReportService.money(
                    gross_igst_amount
                    - credit_igst_amount
                )
            ),

            "gross_tax_amount": (
                GSTReportService.money(
                    gross_tax_amount
                )
            ),

            "credit_tax_amount": (
                GSTReportService.money(
                    credit_tax_amount
                )
            ),

            "net_tax_amount": (
                GSTReportService.money(
                    gross_tax_amount
                    - credit_tax_amount
                )
            ),

            "gross_invoice_total": (
                GSTReportService.money(
                    gross_invoice_total
                )
            ),

            "credit_note_total": (
                GSTReportService.money(
                    credit_note_total
                )
            ),

            "net_sales_total": (
                GSTReportService.money(
                    gross_invoice_total
                    - credit_note_total
                )
            ),

            "items": items,
        }