from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


# ================================================================
# CREATE ADVANCE PAYMENT
# ================================================================

class ProformaPaymentCreate(
    BaseModel
):

    payment_date: datetime

    amount: Decimal = Field(
        ...,
        gt=0,
    )

    payment_mode: str | None = Field(
        default=None,
        max_length=50,
    )

    reference_number: str | None = Field(
        default=None,
        max_length=100,
    )

    notes: str | None = None


# ================================================================
# ADVANCE PAYMENT RESPONSE
# ================================================================

class ProformaPaymentResponse(
    BaseModel
):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    proforma_id: int

    payment_date: datetime

    amount: Decimal

    payment_type: str

    payment_mode: str | None = None

    reference_number: str | None = None

    notes: str | None = None

    created_by: int

    created_at: datetime


# ================================================================
# CREATE ADVANCE REFUND
# ================================================================

class ProformaPaymentRefundCreate(
    BaseModel
):

    refund_date: datetime

    amount: Decimal = Field(
        ...,
        gt=0,
    )

    refund_mode: str | None = Field(
        default=None,
        max_length=50,
    )

    reference_number: str | None = Field(
        default=None,
        max_length=100,
    )

    notes: str | None = None


# ================================================================
# ADVANCE REFUND RESPONSE
# ================================================================

class ProformaPaymentRefundResponse(
    BaseModel
):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    proforma_id: int

    refund_date: datetime

    amount: Decimal

    refund_mode: str | None = None

    reference_number: str | None = None

    notes: str | None = None

    created_by: int

    created_at: datetime


# ================================================================
# ADVANCE / REFUND SUMMARY
# ================================================================

class ProformaPaymentSummaryResponse(
    BaseModel
):

    proforma_id: int

    proforma_number: str

    proforma_total: Decimal

    # Gross customer advances received.
    advance_received: Decimal

    # Total money returned to customer.
    advance_refunded: Decimal

    # Money still held by company.
    net_advance_held: Decimal

    # Proforma value minus money still held.
    balance_after_advance: Decimal

    payment_count: int

    refund_count: int

    settlement_status: str

    can_record_advance: bool

    advance_recording_message: str | None = None

    can_record_refund: bool

    refund_recording_message: str | None = None

    payments: list[
        ProformaPaymentResponse
    ]

    refunds: list[
        ProformaPaymentRefundResponse
    ]