from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class DocumentSettingsBase(
    BaseModel
):
    default_print_mode: Literal[
        "company_header",
        "letterhead",
    ] = "company_header"

    letterhead_top_space_mm: Decimal = (
        Field(
            default=Decimal(
                "40.00"
            ),
            ge=Decimal(
                "0.00"
            ),
            le=Decimal(
                "100.00"
            ),
        )
    )

    show_logo: bool = True
    show_gst_number: bool = True
    show_contact_details: bool = True

    show_bank_details_on_proforma: bool = (
        False
    )

    show_bank_details_on_final_bill: bool = (
        True
    )

    show_authorized_signature: bool = (
        True
    )

    authorized_signatory_name: (
        str | None
    ) = None

    authorized_signatory_designation: (
        str | None
    ) = None

    footer_text: (
        str | None
    ) = None

    proforma_validity_days: int = Field(
        default=30,
        ge=1,
        le=3650,
    )

    proforma_payment_terms: (
        str | None
    ) = None

    proforma_delivery_terms: (
        str | None
    ) = None

    proforma_terms_and_conditions: (
        str | None
    ) = None

    @field_validator(
        "authorized_signatory_name",
        "authorized_signatory_designation",
        "footer_text",
        "proforma_payment_terms",
        "proforma_delivery_terms",
        "proforma_terms_and_conditions",
        mode="before",
    )
    @classmethod
    def normalize_optional_text(
        cls,
        value,
    ):
        if isinstance(
            value,
            str,
        ):
            value = value.strip()

        return value or None


class DocumentSettingsUpdate(
    DocumentSettingsBase
):
    pass


class DocumentSettingsResponse(
    DocumentSettingsBase
):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )