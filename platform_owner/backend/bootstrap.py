"""Explicit, interactive first-owner setup. Never create users on app startup."""

from platform_owner.backend.models import OwnerAccount
from platform_owner.backend.security import hash_password, now_utc


def bootstrap_first_owner(db, email: str, password: str) -> None:
    # This MUST run only against the separately validated owner database.
    if db.query(OwnerAccount).first() is not None:
        raise RuntimeError("Owner already exists; bootstrap disabled")
    db.add(
        OwnerAccount(
            email=email.strip().lower(),
            password_hash=hash_password(password),
            created_at=now_utc(),
        )
    )
    db.commit()
