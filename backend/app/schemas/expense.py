from datetime import date, datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


# ================================================================
# EXPENSE TYPES
# ================================================================

EXPENSE_TYPES = {
    "GENERAL",
    "OVERHEAD",
    "DIRECT_PRODUCTION",
}


# ================================================================
# EXPENSE CATEGORIES
#
# Salary is retained for historical compatibility.
# New staff salary costing will come from Staff Master.
# ================================================================

EXPENSE_CATEGORIES = {
    "Salary",
    "Rent",
    "Electricity",
    "Cleaning",
    "Maintenance",
    "Office",
    "Internet / Telephone",
    "Security",
    "Transport",
    "Outside Machining",
    "Special Labour",
    "Crane / Loading",
    "Painting",
    "Installation",
    "Job Travel",
    "Testing",
    "Packing",
    "Purchase-related",
    "Other Overhead",
    "Other Direct",
    "Miscellaneous",
}


# ================================================================
# BASE
# ================================================================

class ExpenseBase(BaseModel):

    expense_date: date

    expense_type: str = Field(
        default="GENERAL",
        max_length=30,
    )

    category: str

    description: str

    amount: Decimal = Field(
        gt=0,
        max_digits=14,
        decimal_places=2,
    )

    # ------------------------------------------------------------
    # DIRECT PRODUCTION LINK
    #
    # Internal database ID.
    # Frontend will later show:
    #
    # PROD-2026-XXXX
    # Product / Machine Name
    # Customer
    #
    # rather than asking the user to deal with the ID.
    # ------------------------------------------------------------

    production_order_id: int | None = Field(
        default=None,
        gt=0,
    )

    payment_mode: str | None = None

    reference_number: str | None = None

    vendor_name: str | None = None

    notes: str | None = None

    # ============================================================
    # CLEAN STRINGS
    # ============================================================

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
    def strip_strings(
        cls,
        value,
    ):

        if isinstance(
            value,
            str,
        ):

            value = value.strip()

            if not value:
                return None

        return value

    # ============================================================
    # EXPENSE TYPE
    # ============================================================

    @field_validator(
        "expense_type",
        mode="before",
    )
    @classmethod
    def normalize_expense_type(
        cls,
        value,
    ):

        normalized = (
            value
            or "GENERAL"
        )

        if isinstance(
            normalized,
            str,
        ):

            normalized = (
                normalized
                .strip()
                .upper()
            )

        if (
            normalized
            not in EXPENSE_TYPES
        ):

            allowed = ", ".join(
                sorted(
                    EXPENSE_TYPES
                )
            )

            raise ValueError(
                "Invalid expense type. "
                f"Allowed values: {allowed}"
            )

        return normalized

    # ============================================================
    # CATEGORY
    # ============================================================

    @field_validator(
        "category"
    )
    @classmethod
    def validate_category(
        cls,
        value: str | None,
    ) -> str:

        if not value:

            raise ValueError(
                "Expense category is required."
            )

        if (
            value
            not in EXPENSE_CATEGORIES
        ):

            allowed = ", ".join(
                sorted(
                    EXPENSE_CATEGORIES
                )
            )

            raise ValueError(
                "Invalid expense category. "
                f"Allowed values: {allowed}"
            )

        return value

    # ============================================================
    # DESCRIPTION
    # ============================================================

    @field_validator(
        "description"
    )
    @classmethod
    def validate_description(
        cls,
        value: str | None,
    ) -> str:

        if not value:

            raise ValueError(
                "Description is required."
            )

        return value


# ================================================================
# CREATE
# ================================================================

class ExpenseCreate(
    ExpenseBase
):
    pass


# ================================================================
# UPDATE
# ================================================================

class ExpenseUpdate(BaseModel):

    expense_date: date | None = None

    expense_type: str | None = Field(
        default=None,
        max_length=30,
    )

    category: str | None = None

    description: str | None = None

    amount: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=14,
        decimal_places=2,
    )

    production_order_id: int | None = Field(
        default=None,
        gt=0,
    )

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
    def strip_strings(
        cls,
        value,
    ):

        if isinstance(
            value,
            str,
        ):

            value = value.strip()

            if not value:
                return None

        return value

    @field_validator(
        "expense_type",
        mode="before",
    )
    @classmethod
    def normalize_expense_type(
        cls,
        value,
    ):

        if value is None:
            return None

        normalized = (
            str(
                value
            )
            .strip()
            .upper()
        )

        if (
            normalized
            not in EXPENSE_TYPES
        ):

            allowed = ", ".join(
                sorted(
                    EXPENSE_TYPES
                )
            )

            raise ValueError(
                "Invalid expense type. "
                f"Allowed values: {allowed}"
            )

        return normalized

    @field_validator(
        "category"
    )
    @classmethod
    def validate_category(
        cls,
        value: str | None,
    ) -> str | None:

        if value is None:
            return None

        if (
            value
            not in EXPENSE_CATEGORIES
        ):

            allowed = ", ".join(
                sorted(
                    EXPENSE_CATEGORIES
                )
            )

            raise ValueError(
                "Invalid expense category. "
                f"Allowed values: {allowed}"
            )

        return value


# ================================================================
# RESPONSE
# ================================================================

class ExpenseResponse(
    ExpenseBase
):

    id: int

    is_archived: bool

    created_by: int | None

    created_at: datetime

    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ================================================================
# LIST
# ================================================================

class ExpenseListResponse(
    BaseModel
):

    total: int

    items: list[
        ExpenseResponse
    ]