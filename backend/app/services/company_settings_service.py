from sqlalchemy.orm import Session

from app.models.company_settings import CompanySettings
from app.schemas.company_settings import (
    CompanySettingsCreate,
    CompanySettingsUpdate,
)


class CompanySettingsService:

    @staticmethod
    def validate_gst_state_match(
        gst_number: str,
        state_code: str,
    ) -> None:

        gst_state_code = gst_number[:2]

        if gst_state_code != state_code:
            raise ValueError(
                "GST number state code does not match "
                "the selected company state code."
            )

    @staticmethod
    def create(
        db: Session,
        data: CompanySettingsCreate,
    ) -> CompanySettings:

        existing = (
            db.query(CompanySettings)
            .first()
        )

        if existing:
            raise ValueError(
                "Company settings already exist. "
                "Please update the existing record."
            )

        CompanySettingsService.validate_gst_state_match(
            gst_number=data.gst_number,
            state_code=data.state_code,
        )

        company_settings = CompanySettings(
            company_name=data.company_name,
            gst_number=data.gst_number,
            state_name=data.state_name,
            state_code=data.state_code,
            address=data.address,
            phone=data.phone,
            email=(
                str(data.email)
                if data.email is not None
                else None
            ),
        )

        db.add(
            company_settings
        )

        db.commit()

        db.refresh(
            company_settings
        )

        return company_settings

    @staticmethod
    def get(
        db: Session,
    ) -> CompanySettings | None:

        return (
            db.query(CompanySettings)
            .first()
        )

    @staticmethod
    def update(
        db: Session,
        data: CompanySettingsUpdate,
    ) -> CompanySettings:

        company_settings = (
            db.query(CompanySettings)
            .first()
        )

        if company_settings is None:
            raise ValueError(
                "Company settings have not been created yet."
            )

        CompanySettingsService.validate_gst_state_match(
            gst_number=data.gst_number,
            state_code=data.state_code,
        )

        company_settings.company_name = (
            data.company_name
        )

        company_settings.gst_number = (
            data.gst_number
        )

        company_settings.state_name = (
            data.state_name
        )

        company_settings.state_code = (
            data.state_code
        )

        company_settings.address = (
            data.address
        )

        company_settings.phone = (
            data.phone
        )

        company_settings.email = (
            str(data.email)
            if data.email is not None
            else None
        )

        db.commit()

        db.refresh(
            company_settings
        )

        return company_settings