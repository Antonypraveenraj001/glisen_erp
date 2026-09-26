from datetime import date, datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class StaffBase(BaseModel):

    staff_name: str = Field(
        min_length=1,
        max_length=200,
    )

    designation: str | None = Field(
        default=None,
        max_length=150,
    )

    monthly_salary: Decimal = Field(
        ge=0,
        max_digits=14,
        decimal_places=2,
    )

    joining_date: date | None = None

    relieving_date: date | None = None

    notes: str | None = None

    # ============================================================
    # CLEAN TEXT
    # ============================================================

    @field_validator(
        "staff_name",
        "designation",
        "notes",
        mode="before",
    )
    @classmethod
    def strip_strings(
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

    # ============================================================
    # STAFF NAME
    # ============================================================

    @field_validator(
        "staff_name"
    )
    @classmethod
    def validate_staff_name(
        cls,
        value: str | None,
    ) -> str:

        if not value:
            raise ValueError(
                "Staff name is required."
            )

        return value

    # ============================================================
    # EMPLOYMENT DATES
    # ============================================================

    @model_validator(
        mode="after"
    )
    def validate_dates(
        self,
    ):

        if (
            self.joining_date
            is not None
            and
            self.relieving_date
            is not None
            and
            self.relieving_date
            < self.joining_date
        ):

            raise ValueError(
                "Relieving date cannot be "
                "before joining date."
            )

        return self


class StaffCreate(
    StaffBase
):
    pass


class StaffUpdate(BaseModel):

    staff_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    designation: str | None = Field(
        default=None,
        max_length=150,
    )

    monthly_salary: Decimal | None = Field(
        default=None,
        ge=0,
        max_digits=14,
        decimal_places=2,
    )

    joining_date: date | None = None

    relieving_date: date | None = None

    is_active: bool | None = None

    notes: str | None = None

    @field_validator(
        "staff_name",
        "designation",
        "notes",
        mode="before",
    )
    @classmethod
    def strip_strings(
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


class StaffResponse(
    StaffBase
):

    id: int

    is_active: bool

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class StaffListResponse(
    BaseModel
):

    total: int

    items: list[
        StaffResponse
    ]