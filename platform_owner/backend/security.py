"""Owner credential, CSRF and session helpers (no shared ERP secrets)."""

from datetime import datetime, timezone
import hashlib
import hmac
import re
import secrets


# Dedicated scrypt password derivation. stdlib, memory-hard, independent of
# the ERP's passlib/bcrypt configuration. Use one fixed, auditable profile.
SCRYPT_N = 32768
SCRYPT_R = 8
SCRYPT_P = 1
SCRYPT_MAXMEM = 64 * 1024 * 1024


def now_utc() -> datetime:
    # MySQL DATETIME uses naive UTC; never interpret it in local timezone.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def strong_password(password: str) -> bool:
    return (
        14 <= len(password)
        and len(password.encode("utf-8")) <= 1024
        and bool(re.search(r"[a-z]", password))
        and bool(re.search(r"[A-Z]", password))
        and bool(re.search(r"[0-9]", password))
        and bool(re.search(r"[^a-zA-Z0-9]", password))
    )


def _derive(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(
        password.encode("utf-8"), salt=salt,
        n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P,
        dklen=32, maxmem=SCRYPT_MAXMEM,
    )


def hash_password(password: str) -> str:
    if not strong_password(password):
        raise ValueError(
            "Password must be 14+ characters with uppercase, lowercase, "
            "number and symbol (1024 UTF-8 bytes maximum)"
        )
    salt = secrets.token_bytes(16)
    return f"scrypt-32768-8-1${salt.hex()}${_derive(password, salt).hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        profile, salt_hex, expected_hex = stored_hash.split("$")
        if profile != "scrypt-32768-8-1" or len(salt_hex) != 32 or len(expected_hex) != 64:
            return False
        if len(password.encode("utf-8")) > 1024:
            return False
        expected = bytes.fromhex(expected_hex)
        return hmac.compare_digest(_derive(password, bytes.fromhex(salt_hex)), expected)
    except (ValueError, TypeError):
        return False


def new_secret() -> str:
    return secrets.token_urlsafe(48)
