from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class CompanySettingsBase(BaseModel):
    company_name: str
    gst_number: str
    state_name: str
    state_code: str

    address: str | None = None
    phone: str | None = None
    email: EmailStr | None = None

    @field_validator(
        "company_name",
        "gst_number",
        "state_name",
        "state_code",
        mode="before",
    )
    @classmethod
    def strip_required_fields(cls, value):
        if isinstance(value, str):
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

        value = value.upper()

        if len(value) != 15:
            raise ValueError(
                "GST number must contain exactly 15 characters."
            )

        if not value[:2].isdigit():
            raise ValueError(
                "GST number must begin with a valid 2-digit state code."
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

        value = value.zfill(2)

        if (
            len(value) != 2
            or not value.isdigit()
        ):
            raise ValueError(
                "State code must be a 2-digit number."
            )

        return value

    @field_validator(
        "address",
        "phone",
        mode="before",
    )
    @classmethod
    def normalize_optional_strings(
        cls,
        value,
    ):
        if isinstance(value, str):
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
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )