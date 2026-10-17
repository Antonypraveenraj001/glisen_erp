"""Owner-only configuration. Never imports company ERP settings or .env."""

from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import dotenv_values


OWNER_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


@dataclass(frozen=True)
class OwnerSettings:
    environment: str
    origin: str
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
    owner_email: str
    session_minutes: int = 30

    @property
    def secure_cookies(self) -> bool:
        return self.environment == "production"

    @property
    def session_cookie(self) -> str:
        return (
            "__Host-castle_owner_session" if self.secure_cookies
            else "castle_owner_dev_session"
        )

    @property
    def csrf_cookie(self) -> str:
        return (
            "__Host-castle_owner_csrf" if self.secure_cookies
            else "castle_owner_dev_csrf"
        )

    @property
    def allowed_host(self) -> str:
        return urlparse(self.origin).hostname or ""

    def validate(self) -> None:
        if self.environment not in {"development", "production"}:
            raise ValueError("Owner environment must be development or production")
        parsed = urlparse(self.origin)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname or not parsed.netloc
            or parsed.path not in {"", "/"} or parsed.params
            or parsed.query or parsed.fragment or parsed.username
            or parsed.password
            or self.origin.rstrip("/") != self.origin
        ):
            raise ValueError("Owner origin must be a plain absolute HTTP(S) origin")
        if self.environment == "production" and parsed.scheme != "https":
            raise ValueError("Production owner origin must use HTTPS")
        if self.environment == "development" and (
            parsed.scheme != "http" or parsed.hostname not in
            {"localhost", "127.0.0.1", "[::1]", "::1"}
        ):
            raise ValueError("Development owner access must be loopback-only")
        if not self.db_name.startswith("castle_owner_"):
            raise ValueError("Owner database must have a castle_owner_ prefix")
        if self.db_user.strip().lower() in {"root", "glisen_app", ""}:
            raise ValueError("Use a unique non-root, owner-only MySQL account")
        if not self.db_password or len(self.db_password) < 12:
            raise ValueError("Owner database password must be independently strong")
        if not (1 <= self.db_port <= 65535):
            raise ValueError("Invalid owner database port")
        if not (15 <= self.session_minutes <= 120):
            raise ValueError("Session duration must be between 15 and 120 minutes")
        if "@" not in self.owner_email or len(self.owner_email) > 254:
            raise ValueError("Owner email is required")


def load_settings() -> OwnerSettings:
    if not OWNER_ENV_FILE.is_file():
        raise RuntimeError(
            "Missing platform_owner/.env; copy .env.example and configure locally"
        )
    raw = dict(dotenv_values(OWNER_ENV_FILE))

    def value(key: str) -> str:
        result = os.environ.get(key, raw.get(key) or "").strip()
        if not result:
            raise ValueError(f"Missing owner configuration key: {key}")
        return result

    result = OwnerSettings(
        environment=value("CASTLE_OWNER_ENV"),
        origin=value("CASTLE_OWNER_ORIGIN"),
        db_host=value("CASTLE_OWNER_DB_HOST"),
        db_port=int(value("CASTLE_OWNER_DB_PORT")),
        db_name=value("CASTLE_OWNER_DB_NAME"),
        db_user=value("CASTLE_OWNER_DB_USER"),
        db_password=value("CASTLE_OWNER_DB_PASSWORD"),
        owner_email=value("CASTLE_OWNER_EMAIL").lower(),
        session_minutes=int(value("CASTLE_OWNER_SESSION_MINUTES")),
    )
    result.validate()
    return result
