from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application
    APP_NAME: str
    APP_VERSION: str
    ENVIRONMENT: str
    DEBUG: bool

    # Server
    HOST: str
    PORT: int

    # Database
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Storage
    UPLOAD_FOLDER: str
    EXPORT_FOLDER: str

    # Frontend
    FRONTEND_URL: str

    # ==================================================
    # BACKUP STORAGE CONFIGURATION
    # ==================================================
    # Optional settings.
    #
    # Empty values preserve the existing backup system.
    #
    # These will be configured on Ubuntu only after
    # the HDD/SSD integration has been tested.
    # ==================================================

    BACKUP_HDD_MOUNT_POINT: str = ""

    BACKUP_HDD_UUID: str = ""

    BACKUP_SSD_FALLBACK_FOLDER: str = ""

    BACKUP_FALLBACK_MIN_FREE_MB: int = 2048

    # Isolated weekly backup-restore test. Disabled until DB migration,
    # strictly restricted test account and operational checks are completed.
    # Never default test credentials from the production DB account.
    BACKUP_WEEKLY_RESTORE_ENABLED: bool = False
    BACKUP_WEEKLY_RESTORE_TEST_USER: str = ""
    BACKUP_WEEKLY_RESTORE_TEST_PASSWORD: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


@lru_cache
def get_settings():
    return Settings()


settings = get_settings()