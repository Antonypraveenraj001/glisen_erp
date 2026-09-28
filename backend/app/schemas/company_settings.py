from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    field_validator,
)


class CompanySettingsBase(BaseModel):
    company_name: str
    gst_number: str
    state_name: str
    state_code: str

    pan_number: str | None = None

    address: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    website: str | None = None

    bank_account_name: str | None = None
    bank_name: str | None = None
    bank_account_number: str | None = None
    bank_ifsc_code: str | None = None
    bank_branch: str | None = None
    upi_id: str | None = None

    @field_validator(
        "company_name",
        "gst_number",
        "state_name",
        "state_code",
        mode="before",
    )
    @classmethod
    def strip_required_fields(
        cls,
        value,
    ):
        if isinstance(
            value,
            str,
        ):
            value = value.strip()

        if not value:
            raise ValueError(
                "This field cannot be empty."
            )

        return value

    @field_validator(
        "gst_number",
    )
    @classmethod
    def validate_gst_number(
        cls,
        value: str,
    ) -> str:

        value = (
            value
            .strip()
            .upper()
            .replace(
                " ",
                "",
            )
        )

        if len(value) != 15:
            raise ValueError(
                "GST number must contain exactly 15 characters."
            )

        if not value[:2].isdigit():
            raise ValueError(
                "GST number must begin with a valid 2-digit state code."
            )

        if not value.isalnum():
            raise ValueError(
                "GST number must contain only letters and numbers."
            )

        return value

    @field_validator(
        "state_code",
    )
    @classmethod
    def validate_state_code(
        cls,
        value: str,
    ) -> str:

        value = (
            value
            .strip()
            .zfill(2)
        )

        if (
            len(value) != 2
            or
            not value.isdigit()
        ):
            raise ValueError(
                "State code must be a 2-digit number."
            )

        return value

    @field_validator(
        "pan_number",
        mode="before",
    )
    @classmethod
    def normalize_pan_number(
        cls,
        value,
    ):

        if value is None:
            return None

        value = (
            str(value)
            .strip()
            .upper()
            .replace(
                " ",
                "",
            )
        )

        if not value:
            return None

        if len(value) != 10:
            raise ValueError(
                "PAN number must contain exactly 10 characters."
            )

        if not (
            value[:5].isalpha()
            and
            value[5:9].isdigit()
            and
            value[9:].isalpha()
        ):
            raise ValueError(
                "PAN number format is invalid."
            )

        return value

    @field_validator(
        "bank_ifsc_code",
        mode="before",
    )
    @classmethod
    def normalize_ifsc(
        cls,
        value,
    ):

        if value is None:
            return None

        value = (
            str(value)
            .strip()
            .upper()
            .replace(
                " ",
                "",
            )
        )

        return value or None

    @field_validator(
        "address",
        "phone",
        "email",
        "website",
        "bank_account_name",
        "bank_name",
        "bank_account_number",
        "bank_branch",
        "upi_id",
        mode="before",
    )
    @classmethod
    def normalize_optional_strings(
        cls,
        value,
    ):

        if isinstance(
            value,
            str,
        ):
            value = value.strip()

        return value or None


class CompanySettingsCreate(
    CompanySettingsBase
):
    pass


class CompanySettingsUpdate(
    CompanySettingsBase
):
    pass


class CompanySettingsResponse(
    CompanySettingsBase
):
    id: int

    logo_path: str | None = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )