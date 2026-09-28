from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class BusinessSettingsUpdate(
    BaseModel
):
    currency_code: str = "INR"

    timezone: str = (
        "Asia/Kolkata"
    )

    default_gst_percent: Decimal = (
        Field(
            default=Decimal(
                "18.00"
            ),
            ge=Decimal(
                "0.00"
            ),
            le=Decimal(
                "100.00"
            ),
        )
    )

    default_page_size: int = Field(
        default=10,
        ge=5,
        le=100,
    )

    enquiry_prefix: str = "ENQ"
    proforma_prefix: str = "PRO"
    production_prefix: str = "PROD"

    finished_goods_receipt_prefix: (
        str
    ) = "FGR"

    invoice_prefix: str = "INV"
    credit_note_prefix: str = "CN"

    sequence_digits: int = Field(
        default=4,
        ge=3,
        le=6,
    )

    @field_validator(
        "currency_code",
        mode="before",
    )
    @classmethod
    def normalize_currency(
        cls,
        value,
    ) -> str:

        value = (
            str(
                value
                or ""
            )
            .strip()
            .upper()
        )

        if (
            len(value)
            != 3
            or
            not value.isalpha()
        ):
            raise ValueError(
                "Currency code must contain exactly 3 letters."
            )

        return value

    @field_validator(
        "timezone",
        mode="before",
    )
    @classmethod
    def normalize_timezone(
        cls,
        value,
    ) -> str:

        value = (
            str(
                value
                or ""
            )
            .strip()
        )

        if not value:
            raise ValueError(
                "Timezone is required."
            )

        return value

    @field_validator(
        "enquiry_prefix",
        "proforma_prefix",
        "production_prefix",
        "finished_goods_receipt_prefix",
        "invoice_prefix",
        "credit_note_prefix",
        mode="before",
    )
    @classmethod
    def normalize_prefix(
        cls,
        value,
    ) -> str:

        value = (
            str(
                value
                or ""
            )
            .strip()
            .upper()
            .replace(
                " ",
                "",
            )
        )

        if not value:
            raise ValueError(
                "Document prefix cannot be empty."
            )

        if len(value) > 20:
            raise ValueError(
                "Document prefix cannot exceed 20 characters."
            )

        allowed = all(
            character.isalnum()
            or
            character in {
                "-",
                "_",
            }

            for character
            in value
        )

        if not allowed:
            raise ValueError(
                "Document prefix may contain only "
                "letters, numbers, hyphen or underscore."
            )

        return value


class BusinessSettingsResponse(
    BusinessSettingsUpdate
):
    id: int

    # FY remains fixed at 1 April for this ERP.
    # It is returned to the UI but is not editable
    # through normal Business Settings.
    financial_year_start_month: int
    financial_year_start_day: int

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )