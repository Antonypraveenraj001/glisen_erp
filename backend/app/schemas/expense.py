from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


EXPENSE_CATEGORIES = {
    "Salary",
    "Rent",
    "Electricity",
    "Transport",
    "Maintenance",
    "Office",
    "Purchase-related",
    "Miscellaneous",
}


class ExpenseBase(BaseModel):
    expense_date: date
    category: str
    description: str
    amount: Decimal = Field(gt=0)
    payment_mode: str | None = None
    reference_number: str | None = None
    vendor_name: str | None = None
    notes: str | None = None

    @field_validator(
        "category",
        "description",
        "payment_mode",
        "reference_number",
        "vendor_name",
        "notes",
        mode="before",
    )
    @classmethod
    def strip_strings(cls, value):
        if isinstance(value, str):
            value = value.strip()

            if value == "":
                return None

        return value

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        if value not in EXPENSE_CATEGORIES:
            allowed = ", ".join(sorted(EXPENSE_CATEGORIES))

            raise ValueError(
                f"Invalid expense category. Allowed values: {allowed}"
            )

        return value

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        if value is None:
            raise ValueError("Description is required.")

        return value


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    expense_date: date | None = None
    category: str | None = None
    description: str | None = None
    amount: Decimal | None = Field(default=None, gt=0)
    payment_mode: str | None = None
    reference_number: str | None = None
    vendor_name: str | None = None
    notes: str | None = None

    @field_validator(
        "category",
        "description",
        "payment_mode",
        "reference_number",
        "vendor_name",
        "notes",
        mode="before",
    )
    @classmethod
    def strip_strings(cls, value):
        if isinstance(value, str):
            value = value.strip()

            if value == "":
                return None

        return value

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str | None) -> str | None:
        if value is None:
            return value

        if value not in EXPENSE_CATEGORIES:
            allowed = ", ".join(sorted(EXPENSE_CATEGORIES))

            raise ValueError(
                f"Invalid expense category. Allowed values: {allowed}"
            )

        return value


class ExpenseResponse(ExpenseBase):
    id: int
    created_by: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class ExpenseListResponse(BaseModel):
    total: int
    items: list[ExpenseResponse]