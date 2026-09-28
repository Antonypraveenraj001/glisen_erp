from sqlalchemy.orm import Session

from app.models.business_settings import (
    BusinessSettings,
)
from app.schemas.business_settings import (
    BusinessSettingsUpdate,
)


class BusinessSettingsService:

    @staticmethod
    def get_or_create(
        db: Session,
    ) -> BusinessSettings:

        settings_record = (
            db.query(
                BusinessSettings
            )
            .first()
        )

        if (
            settings_record
            is not None
        ):
            return settings_record

        settings_record = (
            BusinessSettings(
                financial_year_start_month=4,
                financial_year_start_day=1,
            )
        )

        db.add(
            settings_record
        )

        db.commit()

        db.refresh(
            settings_record
        )

        return settings_record

    @staticmethod
    def update(
        db: Session,
        data: BusinessSettingsUpdate,
    ) -> BusinessSettings:

        settings_record = (
            BusinessSettingsService
            .get_or_create(
                db=db
            )
        )

        update_data = (
            data.model_dump()
        )

        for (
            field_name,
            value,
        ) in update_data.items():

            setattr(
                settings_record,
                field_name,
                value,
            )

        # ========================================================
        # FINANCIAL YEAR RULE
        #
        # Glisen uses the Indian financial year:
        # 01-Apr to 31-Mar.
        #
        # Do not allow ordinary Settings changes to alter this
        # because the transition / GST / reporting logic depends
        # on the same financial-year boundary.
        # ========================================================

        settings_record.financial_year_start_month = (
            4
        )

        settings_record.financial_year_start_day = (
            1
        )

        db.commit()

        db.refresh(
            settings_record
        )

        return settings_record