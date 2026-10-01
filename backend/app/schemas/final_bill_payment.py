from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


PaymentStatus = Literal[
    "Not Issued",
    "Pending",
    "Partially Paid",
    "Paid",
    "N/A",
]


# ================================================================
# CREATE FINAL BILL PAYMENT
# ================================================================

class FinalBillPaymentCreate(BaseModel):

    payment_date: datetime

    amount: Decimal = Field(
        gt=Decimal("0.00"),
        decimal_places=2,
    )

    # Examples:
    # Part Payment
    # Final Payment
    #
    # "Advance" is retained for backward compatibility,
    # but new pre-invoice advances are now recorded
    # against the Proforma.
    payment_type: str | None = Field(
        default=None,
        max_length=30,
    )

    # Examples:
    # Bank Transfer
    # UPI
    # Cash
    # Cheque
    payment_mode: str | None = Field(
        default=None,
        max_length=50,
    )

    # UTR / cheque number / transaction reference.
    reference_number: str | None = Field(
        default=None,
        max_length=100,
    )

    notes: str | None = None


# ================================================================
# FINAL BILL PAYMENT RESPONSE
# ================================================================

class FinalBillPaymentResponse(BaseModel):

    id: int

    final_bill_id: int

    payment_date: datetime

    amount: Decimal

    payment_type: str | None = None

    payment_mode: str | None = None

    reference_number: str | None = None

    notes: str | None = None

    created_by: int

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


# ================================================================
# FINAL BILL PAYMENT SUMMARY
#
# PAYMENT STRUCTURE
#
# Invoice / Receivable
#       -
# Proforma Advance
#       -
# Final Bill Payments
#       =
# Balance
#
# paid_amount remains the TOTAL money received so existing
# frontend/business logic continues to work.
# ================================================================

class FinalBillPaymentSummaryResponse(BaseModel):

    final_bill_id: int

    invoice_number: str

    effective_invoice_id: int | None = None

    effective_invoice_number: str | None = None

    is_effective_invoice: bool

    # ------------------------------------------------------------
    # DOCUMENT VALUE
    # ------------------------------------------------------------

    grand_total: Decimal

    credit_note_total: Decimal

    receivable_amount: Decimal

    # ------------------------------------------------------------
    # RECEIPT BREAKDOWN
    # ------------------------------------------------------------

    # Money received before Final Billing,
    # against the confirmed Proforma.
    proforma_advance_amount: Decimal

    # Money recorded after the Final Bill was issued.
    invoice_payment_amount: Decimal

    # Total customer money received:
    #
    # proforma_advance_amount
    # +
    # invoice_payment_amount
    #
    # This retains the old "paid_amount" field so existing code
    # does not break.
    paid_amount: Decimal

    balance_amount: Decimal

    payment_status: PaymentStatus

    # These are only FinalBillPayment records.
    # Proforma advance history remains stored against the Proforma.
    payments: list[
        FinalBillPaymentResponse
    ]