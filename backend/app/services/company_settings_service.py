from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import (
    settings as app_settings,
)
from app.models.company_settings import (
    CompanySettings,
)
from app.schemas.company_settings import (
    CompanySettingsCreate,
    CompanySettingsUpdate,
)


class CompanySettingsService:

    ALLOWED_LOGO_EXTENSIONS = {
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
    }

    MAX_LOGO_SIZE_BYTES = (
        5
        * 1024
        * 1024
    )

    @staticmethod
    def validate_gst_state_match(
        gst_number: str,
        state_code: str,
    ) -> None:

        gst_state_code = (
            gst_number[:2]
        )

        if (
            gst_state_code
            != state_code
        ):
            raise ValueError(
                "GST number state code does not match "
                "the selected company state code."
            )

    @staticmethod
    def get_upload_root() -> Path:

        configured_path = Path(
            app_settings.UPLOAD_FOLDER
        ).expanduser()

        if not configured_path.is_absolute():
            configured_path = (
                Path.cwd()
                / configured_path
            )

        configured_path.mkdir(
            parents=True,
            exist_ok=True,
        )

        return configured_path.resolve()

    @staticmethod
    def get_logo_directory() -> Path:

        logo_directory = (
            CompanySettingsService
            .get_upload_root()
            / "company"
        )

        logo_directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        return logo_directory

    @staticmethod
    def validate_logo_content(
        extension: str,
        content: bytes,
    ) -> None:

        if not content:
            raise ValueError(
                "Logo file is empty."
            )

        if (
            len(content)
            >
            CompanySettingsService
            .MAX_LOGO_SIZE_BYTES
        ):
            raise ValueError(
                "Company logo must be 5 MB or smaller."
            )

        extension = (
            extension
            .strip()
            .lower()
        )

        if (
            extension
            not in
            CompanySettingsService
            .ALLOWED_LOGO_EXTENSIONS
        ):
            raise ValueError(
                "Company logo must be PNG, JPG, JPEG or WEBP."
            )

        valid_signature = False

        if extension == ".png":
            valid_signature = (
                content.startswith(
                    b"\x89PNG\r\n\x1a\n"
                )
            )

        elif (
            extension
            in {
                ".jpg",
                ".jpeg",
            }
        ):
            valid_signature = (
                content.startswith(
                    b"\xff\xd8\xff"
                )
            )

        elif extension == ".webp":
            valid_signature = (
                len(content) >= 12
                and
                content[:4] == b"RIFF"
                and
                content[8:12] == b"WEBP"
            )

        if not valid_signature:
            raise ValueError(
                "Uploaded company logo is not a valid image file."
            )

    @staticmethod
    def create(
        db: Session,
        data: CompanySettingsCreate,
    ) -> CompanySettings:

        existing = (
            db.query(
                CompanySettings
            )
            .first()
        )

        if existing:
            raise ValueError(
                "Company settings already exist. "
                "Please update the existing record."
            )

        (
            CompanySettingsService
            .validate_gst_state_match(
                gst_number=(
                    data.gst_number
                ),
                state_code=(
                    data.state_code
                ),
            )
        )

        company_settings = (
            CompanySettings(
                company_name=(
                    data.company_name
                ),
                gst_number=(
                    data.gst_number
                ),
                pan_number=(
                    data.pan_number
                ),
                state_name=(
                    data.state_name
                ),
                state_code=(
                    data.state_code
                ),
                address=(
                    data.address
                ),
                phone=(
                    data.phone
                ),
                email=(
                    str(data.email)
                    if data.email
                    else None
                ),
                website=(
                    data.website
                ),
                bank_account_name=(
                    data.bank_account_name
                ),
                bank_name=(
                    data.bank_name
                ),
                bank_account_number=(
                    data.bank_account_number
                ),
                bank_ifsc_code=(
                    data.bank_ifsc_code
                ),
                bank_branch=(
                    data.bank_branch
                ),
                upi_id=(
                    data.upi_id
                ),
            )
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
            db.query(
                CompanySettings
            )
            .first()
        )

    @staticmethod
    def update(
        db: Session,
        data: CompanySettingsUpdate,
    ) -> CompanySettings:

        company_settings = (
            CompanySettingsService
            .get(
                db=db
            )
        )

        if company_settings is None:
            raise ValueError(
                "Company settings have not been created yet."
            )

        (
            CompanySettingsService
            .validate_gst_state_match(
                gst_number=(
                    data.gst_number
                ),
                state_code=(
                    data.state_code
                ),
            )
        )

        company_settings.company_name = (
            data.company_name
        )

        company_settings.gst_number = (
            data.gst_number
        )

        company_settings.pan_number = (
            data.pan_number
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
            if data.email
            else None
        )

        company_settings.website = (
            data.website
        )

        company_settings.bank_account_name = (
            data.bank_account_name
        )

        company_settings.bank_name = (
            data.bank_name
        )

        company_settings.bank_account_number = (
            data.bank_account_number
        )

        company_settings.bank_ifsc_code = (
            data.bank_ifsc_code
        )

        company_settings.bank_branch = (
            data.bank_branch
        )

        company_settings.upi_id = (
            data.upi_id
        )

        db.commit()

        db.refresh(
            company_settings
        )

        return company_settings

    @staticmethod
    def save_logo(
        db: Session,
        original_filename: str,
        content: bytes,
    ) -> CompanySettings:

        company_settings = (
            CompanySettingsService
            .get(
                db=db
            )
        )

        if company_settings is None:
            raise ValueError(
                "Create Company Settings before uploading a logo."
            )

        extension = (
            Path(
                original_filename
                or ""
            )
            .suffix
            .lower()
        )

        (
            CompanySettingsService
            .validate_logo_content(
                extension=extension,
                content=content,
            )
        )

        logo_directory = (
            CompanySettingsService
            .get_logo_directory()
        )

        for existing_file in (
            logo_directory.glob(
                "company_logo.*"
            )
        ):
            if existing_file.is_file():
                existing_file.unlink()

        filename = (
            f"company_logo"
            f"{extension}"
        )

        target_path = (
            logo_directory
            / filename
        )

        target_path.write_bytes(
            content
        )

        company_settings.logo_path = (
            f"company/{filename}"
        )

        db.commit()

        db.refresh(
            company_settings
        )

        return company_settings

    @staticmethod
    def resolve_logo_path(
        company_settings: CompanySettings,
    ) -> Path | None:

        relative_path = (
            company_settings.logo_path
            or ""
        ).strip()

        if not relative_path:
            return None

        upload_root = (
            CompanySettingsService
            .get_upload_root()
        )

        candidate = (
            upload_root
            / relative_path
        ).resolve()

        try:
            candidate.relative_to(
                upload_root
            )
        except ValueError:
            return None

        if not candidate.is_file():
            return None

        return candidate

    @staticmethod
    def delete_logo(
        db: Session,
    ) -> CompanySettings:

        company_settings = (
            CompanySettingsService
            .get(
                db=db
            )
        )

        if company_settings is None:
            raise ValueError(
                "Company settings have not been created yet."
            )

        current_logo = (
            CompanySettingsService
            .resolve_logo_path(
                company_settings
            )
        )

        if (
            current_logo
            is not None
            and
            current_logo.exists()
        ):
            current_logo.unlink()

        company_settings.logo_path = (
            None
        )

        db.commit()

        db.refresh(
            company_settings
        )

        return company_settings