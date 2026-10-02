from datetime import (
    datetime,
    time,
)

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class BackupSettingsUpdate(BaseModel):
    automatic_backup_enabled: bool = False
    backup_time: time = time(22, 0)

    primary_backup_path: str = Field(
        min_length=1,
        max_length=1000,
    )
    secondary_backup_enabled: bool = False
    secondary_backup_path: str | None = Field(
        default=None,
        max_length=1000,
    )
    retention_days: int = Field(
        default=30,
        ge=1,
        le=3650,
    )
    include_uploads: bool = False
    verify_after_backup: bool = True

    @field_validator(
        "primary_backup_path",
        mode="before",
    )
    @classmethod
    def clean_primary_path(cls, value) -> str:
        cleaned = str(value or "").strip()
        if not cleaned:
            raise ValueError(
                "Primary backup folder is required."
            )
        return cleaned

    @field_validator(
        "secondary_backup_path",
        mode="before",
    )
    @classmethod
    def clean_secondary_path(
        cls,
        value,
    ) -> str | None:
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None


class BackupSettingsResponse(BaseModel):
    id: int
    automatic_backup_enabled: bool
    backup_time: time
    primary_backup_path: str | None
    secondary_backup_enabled: bool
    secondary_backup_path: str | None
    retention_days: int
    include_uploads: bool
    verify_after_backup: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class BackupLogResponse(BaseModel):
    id: int
    backup_type: str
    filename: str
    primary_path: str | None
    secondary_path: str | None
    file_size_bytes: int | None
    checksum_sha256: str | None
    status: str
    financial_year_id: int | None
    created_by: int | None
    app_version: str | None
    schema_revision: str | None
    manifest_version: str | None
    started_at: datetime
    completed_at: datetime | None
    verified_at: datetime | None
    error_message: str | None

    model_config = ConfigDict(
        from_attributes=True
    )


class BackupSystemStatus(BaseModel):
    database_name: str
    dump_utility_available: bool
    dump_utility_name: str
    uploads_folder: str
    uploads_folder_exists: bool


class BackupHistoryResponse(BaseModel):
    total: int
    items: list[BackupLogResponse]


class RetentionCleanupResponse(
    BaseModel
):
    purged: int
    partial: int
    retention_days: int


class RestoreBackupRequest(
    BaseModel
):
    confirmation: str = Field(
        min_length=1,
        max_length=700,
    )


class RestoreBackupResponse(
    BaseModel
):
    status: str
    message: str
    restored_filename: str
    pre_restore_filename: str
