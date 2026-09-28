from sqlalchemy.orm import Session

from app.models.document_settings import (
    DocumentSettings,
)
from app.schemas.document_settings import (
    DocumentSettingsUpdate,
)


class DocumentSettingsService:

    @staticmethod
    def get_or_create(
        db: Session,
    ) -> DocumentSettings:

        settings_record = (
            db.query(
                DocumentSettings
            )
            .first()
        )

        if (
            settings_record
            is not None
        ):
            return settings_record

        settings_record = (
            DocumentSettings()
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
        data: DocumentSettingsUpdate,
    ) -> DocumentSettings:

        settings_record = (
            DocumentSettingsService
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

        db.commit()

        db.refresh(
            settings_record
        )

        return settings_record