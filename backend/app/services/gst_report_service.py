from datetime import date, datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy.orm import Session, joinedload

from app.models.company_settings import CompanySettings
from app.models.final_bill import FinalBill
from app.models.purchase_bill import PurchaseBill


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
    # COMPANY SETTINGS
    # ============================================================

    @staticmethod
    def get_company_settings(
        db: Session,
    ) -> CompanySettings:

        company_settings = (
            db.query(
                CompanySettings
            )
            .first()
        )

        if company_settings is None:
            raise ValueError(
                "Company GST settings have not "
                "been configured."
            )

        return company_settings

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
    # SALES GST COMPONENT RESOLUTION
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

        # --------------------------------------------------------
        # Preserve existing issued invoice GST split when valid.
        # --------------------------------------------------------

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

        # --------------------------------------------------------
        # Historical invoices may contain correct total GST,
        # but zero CGST / SGST / IGST values.
        # --------------------------------------------------------

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

        # --------------------------------------------------------
        # INTRA-STATE
        # --------------------------------------------------------

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

        # --------------------------------------------------------
        # INTER-STATE
        # --------------------------------------------------------

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
    # SALES GST REPORT
    #
    # IMPORTANT:
    #
    # This preserves the existing Sales GST behaviour used by:
    #
    # - GST Report
    # - Dashboard
    # - Financial Analyzer
    #
    # Latest issued invoice revision is the effective sale.
    # Issued credit notes reduce sales.
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
            GSTReportService
            .get_company_settings(
                db
            )
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
            db.query(
                FinalBill
            )
            .filter(
                FinalBill.status
                == "Issued"
            )
            .all()
        )

        # ========================================================
        # EFFECTIVE INVOICE SELECTION
        #
        # Example:
        #
        # Original Tax Invoice
        # R1
        # R2
        #
        # Only latest Issued version counts as the effective sale.
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

            if (
                invoice_type
                == "credit note"
            ):
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

        # ========================================================
        # LATEST EFFECTIVE INVOICES
        # ========================================================

        effective_invoices: list[
            FinalBill
        ] = []

        for chain in (
            invoice_chains.values()
        ):

            latest_bill = max(
                chain,
                key=lambda bill: (
                    bill.revision_number,
                    bill.id,
                ),
            )

            if (
                GSTReportService
                .within_date_range(
                    document_date=(
                        latest_bill.invoice_date
                    ),
                    start_date=(
                        start_date
                    ),
                    end_date=(
                        end_date
                    ),
                )
            ):

                effective_invoices.append(
                    latest_bill
                )

        # ========================================================
        # CREDIT NOTES INSIDE PERIOD
        # ========================================================

        filtered_credit_notes = [
            bill
            for bill
            in issued_credit_notes
            if (
                GSTReportService
                .within_date_range(
                    document_date=(
                        bill.invoice_date
                    ),
                    start_date=(
                        start_date
                    ),
                    end_date=(
                        end_date
                    ),
                )
            )
        ]

        # ========================================================
        # CREDIT NOTE PARENT REFERENCES
        # ========================================================

        parent_ids = {
            bill.parent_invoice_id
            for bill
            in filtered_credit_notes
            if (
                bill.parent_invoice_id
                is not None
            )
        }

        parent_map: dict[
            int,
            FinalBill,
        ] = {}

        if parent_ids:

            parent_bills = (
                db.query(
                    FinalBill
                )
                .filter(
                    FinalBill.id.in_(
                        parent_ids
                    )
                )
                .all()
            )

            parent_map = {
                bill.id:
                    bill
                for bill
                in parent_bills
            }

        # ========================================================
        # SALES TOTALS
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

        # ========================================================
        # CREDIT NOTE TOTALS
        # ========================================================

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

        items: list[
            dict
        ] = []

        # ========================================================
        # EFFECTIVE SALES INVOICES
        # ========================================================

        for bill in effective_invoices:

            (
                cgst_amount,
                sgst_amount,
                igst_amount,
            ) = (
                GSTReportService
                .resolve_gst_components(
                    bill=(
                        bill
                    ),
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
                    "document_id":
                        bill.id,

                    "document_number":
                        bill.invoice_number,

                    "document_date":
                        bill.invoice_date,

                    "document_type":
                        bill.invoice_type,

                    "reference_invoice_number":
                        None,

                    "customer_id":
                        bill.customer_id,

                    "company_name":
                        bill.company_name,

                    "gst_number":
                        bill.gst_number,

                    "taxable_amount":
                        taxable_amount,

                    "cgst_amount":
                        cgst_amount,

                    "sgst_amount":
                        sgst_amount,

                    "igst_amount":
                        igst_amount,

                    "tax_amount":
                        tax_amount,

                    "grand_total":
                        grand_total,
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
                    bill=(
                        bill
                    ),
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
                if (
                    bill.parent_invoice_id
                    is not None
                )
                else None
            )

            items.append(
                {
                    "document_id":
                        bill.id,

                    "document_number":
                        bill.invoice_number,

                    "document_date":
                        bill.invoice_date,

                    "document_type":
                        bill.invoice_type,

                    "reference_invoice_number":
                        (
                            parent_bill
                            .invoice_number
                            if parent_bill
                            else None
                        ),

                    "customer_id":
                        bill.customer_id,

                    "company_name":
                        bill.company_name,

                    "gst_number":
                        bill.gst_number,

                    "taxable_amount":
                        taxable_amount,

                    "cgst_amount":
                        cgst_amount,

                    "sgst_amount":
                        sgst_amount,

                    "igst_amount":
                        igst_amount,

                    "tax_amount":
                        tax_amount,

                    "grand_total":
                        grand_total,
                }
            )

        # ========================================================
        # SORT SALES DOCUMENTS
        # ========================================================

        items.sort(
            key=lambda item: (
                item[
                    "document_date"
                ],
                item[
                    "document_number"
                ],
            )
        )

        # ========================================================
        # SALES GST RESPONSE
        # ========================================================

        return {
            "start_date":
                start_date,

            "end_date":
                end_date,

            "invoice_count":
                len(
                    effective_invoices
                ),

            "credit_note_count":
                len(
                    filtered_credit_notes
                ),

            "gross_taxable_amount":
                GSTReportService.money(
                    gross_taxable_amount
                ),

            "credit_taxable_amount":
                GSTReportService.money(
                    credit_taxable_amount
                ),

            "net_taxable_amount":
                GSTReportService.money(
                    gross_taxable_amount
                    - credit_taxable_amount
                ),

            "gross_cgst_amount":
                GSTReportService.money(
                    gross_cgst_amount
                ),

            "credit_cgst_amount":
                GSTReportService.money(
                    credit_cgst_amount
                ),

            "net_cgst_amount":
                GSTReportService.money(
                    gross_cgst_amount
                    - credit_cgst_amount
                ),

            "gross_sgst_amount":
                GSTReportService.money(
                    gross_sgst_amount
                ),

            "credit_sgst_amount":
                GSTReportService.money(
                    credit_sgst_amount
                ),

            "net_sgst_amount":
                GSTReportService.money(
                    gross_sgst_amount
                    - credit_sgst_amount
                ),

            "gross_igst_amount":
                GSTReportService.money(
                    gross_igst_amount
                ),

            "credit_igst_amount":
                GSTReportService.money(
                    credit_igst_amount
                ),

            "net_igst_amount":
                GSTReportService.money(
                    gross_igst_amount
                    - credit_igst_amount
                ),

            "gross_tax_amount":
                GSTReportService.money(
                    gross_tax_amount
                ),

            "credit_tax_amount":
                GSTReportService.money(
                    credit_tax_amount
                ),

            "net_tax_amount":
                GSTReportService.money(
                    gross_tax_amount
                    - credit_tax_amount
                ),

            "gross_invoice_total":
                GSTReportService.money(
                    gross_invoice_total
                ),

            "credit_note_total":
                GSTReportService.money(
                    credit_note_total
                ),

            "net_sales_total":
                GSTReportService.money(
                    gross_invoice_total
                    - credit_note_total
                ),

            "items":
                items,
        }

    # ============================================================
    # PURCHASE GST STATE RESOLUTION
    # ============================================================

    @staticmethod
    def resolve_purchase_gst_components(
        total_gst: Decimal,
        supplier_gst_number: str | None,
        supplier_state: str | None,
        company_state_code: str,
        company_state_name: str,
    ) -> tuple[
        Decimal,
        Decimal,
        Decimal,
    ]:

        total_gst = (
            GSTReportService.money(
                total_gst
            )
        )

        supplier_gst = (
            supplier_gst_number
            or ""
        ).strip().upper()

        supplier_state_code = None

        # --------------------------------------------------------
        # Try supplier GSTIN first.
        # --------------------------------------------------------

        if (
            len(supplier_gst) == 15
            and supplier_gst[:2].isdigit()
        ):
            supplier_state_code = (
                supplier_gst[:2]
            )

        supplier_state_name = (
            supplier_state
            or ""
        ).strip().casefold()

        normalized_company_state = (
            company_state_name
            or ""
        ).strip().casefold()

        same_state = False

        # --------------------------------------------------------
        # GSTIN state code is preferred.
        # --------------------------------------------------------

        if (
            supplier_state_code
            is not None
        ):

            same_state = (
                supplier_state_code
                == company_state_code
            )

        # --------------------------------------------------------
        # If historical supplier GSTIN is invalid,
        # fall back to supplier state name.
        # --------------------------------------------------------

        elif (
            supplier_state_name
            and normalized_company_state
        ):

            same_state = (
                supplier_state_name
                == normalized_company_state
            )

        # --------------------------------------------------------
        # Intra-state purchase:
        # CGST + SGST
        # --------------------------------------------------------

        if same_state:

            cgst_amount = (
                GSTReportService.money(
                    total_gst
                    / Decimal("2")
                )
            )

            sgst_amount = (
                GSTReportService.money(
                    total_gst
                    - cgst_amount
                )
            )

            igst_amount = Decimal(
                "0.00"
            )

        # --------------------------------------------------------
        # Inter-state purchase:
        # IGST
        # --------------------------------------------------------

        else:

            cgst_amount = Decimal(
                "0.00"
            )

            sgst_amount = Decimal(
                "0.00"
            )

            igst_amount = (
                total_gst
            )

        return (
            cgst_amount,
            sgst_amount,
            igst_amount,
        )

    # ============================================================
    # PURCHASE GST REPORT
    #
    # Purchase GST is calculated from PurchaseBillItem values.
    #
    # line_total = taxable value before GST
    # gst_percentage = applicable GST %
    #
    # We intentionally do NOT trust a historical Purchase Bill
    # header when all of its item values are zero.
    #
    # This prevents corrupt historical header values such as:
    #
    # subtotal   = 0
    # total_gst  = 508.50
    # grand_total = 508.50
    #
    # from appearing as valid input GST.
    # ============================================================

    @staticmethod
    def get_purchase_report(
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

        # ========================================================
        # COMPANY SETTINGS
        # ========================================================

        company_settings = (
            GSTReportService
            .get_company_settings(
                db
            )
        )

        company_state_code = (
            company_settings.state_code
            or ""
        ).strip()

        company_state_name = (
            company_settings.state_name
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
        # PURCHASE BILL QUERY
        # ========================================================

        query = (
            db.query(
                PurchaseBill
            )
            .options(
                joinedload(
                    PurchaseBill.supplier
                ),
                joinedload(
                    PurchaseBill.items
                ),
            )
            .filter(
                PurchaseBill.is_active
                == True
            )
        )

        # ========================================================
        # START DATE
        # ========================================================

        if (
            start_date
            is not None
        ):

            start_datetime = (
                datetime.combine(
                    start_date,
                    time.min,
                )
            )

            query = query.filter(
                PurchaseBill.bill_date
                >= start_datetime
            )

        # ========================================================
        # END DATE
        #
        # Use exclusive midnight of the following day so the
        # complete end date is included.
        # ========================================================

        if (
            end_date
            is not None
        ):

            end_exclusive = (
                datetime.combine(
                    end_date
                    + timedelta(
                        days=1
                    ),
                    time.min,
                )
            )

            query = query.filter(
                PurchaseBill.bill_date
                < end_exclusive
            )

        purchase_bills = (
            query
            .order_by(
                PurchaseBill.bill_date.asc(),
                PurchaseBill.id.asc(),
            )
            .all()
        )

        # ========================================================
        # TOTALS
        # ========================================================

        total_taxable_amount = Decimal(
            "0.00"
        )

        total_cgst_amount = Decimal(
            "0.00"
        )

        total_sgst_amount = Decimal(
            "0.00"
        )

        total_igst_amount = Decimal(
            "0.00"
        )

        total_tax_amount = Decimal(
            "0.00"
        )

        total_bill_amount = Decimal(
            "0.00"
        )

        report_items: list[
            dict
        ] = []

        # ========================================================
        # PROCESS PURCHASE BILLS
        # ========================================================

        for bill in purchase_bills:

            bill_taxable_amount = Decimal(
                "0.00"
            )

            bill_tax_amount = Decimal(
                "0.00"
            )

            # ====================================================
            # ITEM-LEVEL PURCHASE GST
            # ====================================================

            for bill_item in bill.items:

                # PurchaseBillItem.line_total is the
                # pre-GST taxable line value.
                line_total = (
                    GSTReportService.money(
                        bill_item.line_total
                    )
                )

                gst_percentage = (
                    GSTReportService.decimal(
                        bill_item.gst_percentage
                    )
                )

                item_tax_amount = (
                    GSTReportService.money(
                        (
                            line_total
                            * gst_percentage
                        )
                        / Decimal("100")
                    )
                )

                bill_taxable_amount += (
                    line_total
                )

                bill_tax_amount += (
                    item_tax_amount
                )

            bill_taxable_amount = (
                GSTReportService.money(
                    bill_taxable_amount
                )
            )

            bill_tax_amount = (
                GSTReportService.money(
                    bill_tax_amount
                )
            )

            # ====================================================
            # INVALID / EMPTY HISTORICAL BILL
            #
            # If both calculated taxable value and calculated GST
            # from actual purchase items are zero, do not allow an
            # old or incorrect bill-header GST value into the
            # auditor GST report.
            # ====================================================

            if (
                bill_taxable_amount
                == Decimal("0.00")
                and bill_tax_amount
                == Decimal("0.00")
            ):
                continue

            supplier = (
                bill.supplier
            )

            if supplier is None:
                continue

            # ====================================================
            # CGST / SGST / IGST
            # ====================================================

            (
                cgst_amount,
                sgst_amount,
                igst_amount,
            ) = (
                GSTReportService
                .resolve_purchase_gst_components(
                    total_gst=(
                        bill_tax_amount
                    ),
                    supplier_gst_number=(
                        supplier.gst_number
                    ),
                    supplier_state=(
                        supplier.state
                    ),
                    company_state_code=(
                        company_state_code
                    ),
                    company_state_name=(
                        company_state_name
                    ),
                )
            )

            # ====================================================
            # CALCULATED PURCHASE TOTAL
            # ====================================================

            calculated_grand_total = (
                GSTReportService.money(
                    bill_taxable_amount
                    + bill_tax_amount
                )
            )

            # ====================================================
            # NORMALIZE BILL DATE
            # ====================================================

            if isinstance(
                bill.bill_date,
                datetime,
            ):

                bill_date_value = (
                    bill.bill_date.date()
                )

            else:

                bill_date_value = (
                    bill.bill_date
                )

            # ====================================================
            # ACCUMULATE TOTALS
            # ====================================================

            total_taxable_amount += (
                bill_taxable_amount
            )

            total_cgst_amount += (
                cgst_amount
            )

            total_sgst_amount += (
                sgst_amount
            )

            total_igst_amount += (
                igst_amount
            )

            total_tax_amount += (
                bill_tax_amount
            )

            total_bill_amount += (
                calculated_grand_total
            )

            # ====================================================
            # REPORT ROW
            #
            # Includes both canonical purchase field names and
            # generic GST field names for frontend compatibility.
            # ====================================================

            report_items.append(
                {
                    "purchase_bill_id":
                        bill.id,

                    "document_id":
                        bill.id,

                    "bill_number":
                        bill.bill_number,

                    "document_number":
                        bill.bill_number,

                    "bill_date":
                        bill_date_value,

                    "document_date":
                        bill_date_value,

                    "document_type":
                        "Purchase Bill",

                    "supplier_id":
                        bill.supplier_id,

                    "supplier_name":
                        supplier.company_name,

                    "company_name":
                        supplier.company_name,

                    "supplier_gst_number":
                        supplier.gst_number,

                    "gst_number":
                        supplier.gst_number,

                    "taxable_amount":
                        bill_taxable_amount,

                    "subtotal":
                        bill_taxable_amount,

                    "cgst_amount":
                        cgst_amount,

                    "sgst_amount":
                        sgst_amount,

                    "igst_amount":
                        igst_amount,

                    "tax_amount":
                        bill_tax_amount,

                    "total_gst":
                        bill_tax_amount,

                    "grand_total":
                        calculated_grand_total,
                }
            )

        # ========================================================
        # NORMALIZE TOTALS
        # ========================================================

        total_taxable_amount = (
            GSTReportService.money(
                total_taxable_amount
            )
        )

        total_cgst_amount = (
            GSTReportService.money(
                total_cgst_amount
            )
        )

        total_sgst_amount = (
            GSTReportService.money(
                total_sgst_amount
            )
        )

        total_igst_amount = (
            GSTReportService.money(
                total_igst_amount
            )
        )

        total_tax_amount = (
            GSTReportService.money(
                total_tax_amount
            )
        )

        total_bill_amount = (
            GSTReportService.money(
                total_bill_amount
            )
        )

        valid_bill_count = (
            len(
                report_items
            )
        )

        # ========================================================
        # PURCHASE GST RESPONSE
        #
        # Multiple equivalent total names are returned intentionally
        # for compatibility with the frontend and Excel service.
        # ========================================================

        return {
            "start_date":
                start_date,

            "end_date":
                end_date,

            "purchase_bill_count":
                valid_bill_count,

            "bill_count":
                valid_bill_count,

            "document_count":
                valid_bill_count,

            "taxable_amount":
                total_taxable_amount,

            "total_taxable_amount":
                total_taxable_amount,

            "cgst_amount":
                total_cgst_amount,

            "total_cgst_amount":
                total_cgst_amount,

            "sgst_amount":
                total_sgst_amount,

            "total_sgst_amount":
                total_sgst_amount,

            "igst_amount":
                total_igst_amount,

            "total_igst_amount":
                total_igst_amount,

            "tax_amount":
                total_tax_amount,

            "total_tax_amount":
                total_tax_amount,

            "total_gst":
                total_tax_amount,

            "grand_total":
                total_bill_amount,

            "total_bill_amount":
                total_bill_amount,

            "purchase_total":
                total_bill_amount,

            "items":
                report_items,
        }


# ================================================================
# PURCHASE GST SERVICE COMPATIBILITY WRAPPER
#
# The GST API may import PurchaseGSTReportService separately.
# Keep this wrapper so both styles work:
#
# GSTReportService.get_purchase_report(...)
#
# and
#
# PurchaseGSTReportService.get_report(...)
# ================================================================


class PurchaseGSTReportService:

    @staticmethod
    def get_report(
        db: Session,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict:

        return (
            GSTReportService
            .get_purchase_report(
                db=(
                    db
                ),
                start_date=(
                    start_date
                ),
                end_date=(
                    end_date
                ),
            )
        )