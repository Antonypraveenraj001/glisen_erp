from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class GSTReportItem(BaseModel):
    document_id: int
    document_number: str
    document_date: date
    document_type: str

    reference_invoice_number: str | None = None

    customer_id: int
    company_name: str
    gst_number: str | None = None

    taxable_amount: Decimal

    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal

    tax_amount: Decimal
    grand_total: Decimal


class GSTReportResponse(BaseModel):
    start_date: date | None
    end_date: date | None

    invoice_count: int
    credit_note_count: int

    gross_taxable_amount: Decimal
    credit_taxable_amount: Decimal
    net_taxable_amount: Decimal

    gross_cgst_amount: Decimal
    credit_cgst_amount: Decimal
    net_cgst_amount: Decimal

    gross_sgst_amount: Decimal
    credit_sgst_amount: Decimal
    net_sgst_amount: Decimal

    gross_igst_amount: Decimal
    credit_igst_amount: Decimal
    net_igst_amount: Decimal

    gross_tax_amount: Decimal
    credit_tax_amount: Decimal
    net_tax_amount: Decimal

    gross_invoice_total: Decimal
    credit_note_total: Decimal
    net_sales_total: Decimal

    items: list[GSTReportItem]