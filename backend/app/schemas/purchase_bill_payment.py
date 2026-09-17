from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)


PaymentStatus = Literal[
    "Untracked",
    "Unpaid",
    "Partially Paid",
    "Paid",
]


class PurchaseBillPaymentCreate(BaseModel):
    payment_date: datetime

    amount: Decimal = Field(
        gt=Decimal("0.00"),
        decimal_places=2,
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


class PurchaseBillPaymentResponse(BaseModel):
    id: int
    purchase_bill_id: int
    payment_date: datetime
    amount: Decimal
    payment_mode: str | None
    reference_number: str | None
    notes: str | None
    created_by: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class PurchaseBillPaymentSummaryResponse(
    BaseModel
):
    purchase_bill_id: int
    bill_number: str

    grand_total: Decimal

    paid_amount: Decimal
    balance_amount: Decimal

    payment_status: PaymentStatus

    credit_days: int
    due_date: datetime | None

    payments: list[
        PurchaseBillPaymentResponse
    ]


class PurchaseBillUnpaidAgingResponse(
    BaseModel
):
    purchase_bill_id: int

    bill_number: str

    supplier_id: int
    supplier_name: str

    bill_date: datetime

    grand_total: Decimal

    paid_amount: Decimal
    balance_amount: Decimal

    payment_status: PaymentStatus

    credit_days: int
    due_date: datetime

    days_unpaid: int
    overdue_days: int

    is_overdue: bool