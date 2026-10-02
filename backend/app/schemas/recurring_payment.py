from datetime import (
    date,
    datetime,
)
from decimal import Decimal

from pydantic import (
    BaseModel,
    Field,
    field_validator,
)


class RepeatPaymentBase(
    BaseModel
):

    payment_date: date

    payment_mode: str | None = Field(
        default=None,
        max_length=50,
    )

    reference_number: str | None = Field(
        default=None,
        max_length=100,
    )

    notes: str | None = None


    @field_validator(
        "payment_mode",
        "reference_number",
        "notes",
        mode="before",
    )
    @classmethod
    def clean_optional_text(
        cls,
        value,
    ):

        if isinstance(
            value,
            str,
        ):

            value = (
                value.strip()
            )


            if not value:
                return None


        return value


# ================================================================
# STAFF SALARY BATCH
#=================================================================

class StaffRepeatPaymentCreate(
    RepeatPaymentBase
):

    staff_ids: list[
        int
    ] = Field(
        min_length=1,
    )


# ================================================================
# OVERHEAD BATCH
#================================================================

class OverheadRepeatPaymentCreate(
    RepeatPaymentBase
):

    expense_ids: list[
        int
    ] = Field(
        min_length=1,
    )


# ================================================================
# PREVIEW ITEM
#================================================================= 

class RepeatPaymentPreviewItem(
    BaseModel
):

    source_id: int

    source_name: str

    secondary_text: str | None = None
        

    category: str | None = None
        

    amount: Decimal

    already_paid: bool

    existing_payment_id: int | None = None
        

    existing_payment_date: date | None = None
        


class RepeatPaymentPreview(
    BaseModel
):

    payment_kind: str

    payment_date: date

    period_start: date

    total_items: int

    unpaid_items: int

    already_paid_items: int

    total_unpaid_amount: Decimal

    items: list[
        RepeatPaymentPreviewItem
    ]


# ================================================================
# PAYMENT HISTORY ITEM
#=================================================================

class RecurringPaymentResponse(
    BaseModel
):

    id: int

    payment_kind: str

    staff_id: int | None
        

    expense_id: int | None
        

    source_name: str

    category: str | None
        

    period_start: date

    payment_date: date

    amount: Decimal

    payment_mode: str | None 
       

    reference_number: str | None
        

    notes: str | None
       

    created_by: int

    created_at: datetime


# ================================================================
# BATCH RESULT
#=================================================================

class RepeatPaymentBatchResponse(
    BaseModel
):

    payment_kind: str

    payment_date: date

    period_start: date

    created_count: int

    total_amount: Decimal

    payments: list[
        RecurringPaymentResponse
    ]


# ================================================================
# HISTORY
#=================================================================

class RecurringPaymentListResponse(
    BaseModel
):

    total: int

    items: list[
        RecurringPaymentResponse
    ]