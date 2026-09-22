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


class FinalBillPaymentCreate(BaseModel):
    payment_date: datetime

    amount: Decimal = Field(
        gt=Decimal("0.00"),
        decimal_places=2,
    )

    # Examples:
    # Advance
    # Part Payment
    # Final Payment
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


class FinalBillPaymentSummaryResponse(BaseModel):
    final_bill_id: int

    invoice_number: str

    effective_invoice_id: int | None = None

    effective_invoice_number: str | None = None

    is_effective_invoice: bool

    grand_total: Decimal

    credit_note_total: Decimal

    receivable_amount: Decimal

    paid_amount: Decimal

    balance_amount: Decimal

    payment_status: PaymentStatus

    payments: list[
        FinalBillPaymentResponse
    ]