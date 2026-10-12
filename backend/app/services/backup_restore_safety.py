"""Guardrails for isolated Glisen ERP backup restoration tests.

This module deliberately does NOT connect to MySQL, create schemas, execute
SQL, or delete anything. The weekly restore worker will call these guards
before every database-creating, importing and cleanup operation.
"""

from __future__ import annotations

import re
import secrets
from dataclasses import dataclass

# A fixed, tightly bounded namespace makes accidental targeting of an
# existing business database considerably harder. It is not a replacement
# for restricted MySQL privileges on the restore-test account.
_TEST_DB_RE = re.compile(r"\Aglisen_verify_[0-9a-f]{12}\Z")
_MYSQL_IDENTIFIER_RE = re.compile(r"\A[a-zA-Z0-9_]{1,64}\Z")


@dataclass(frozen=True)
class RestoreTestTarget:
    production_database: str
    production_user: str
    test_database: str
    test_user: str


def validate_restore_target(
    *,
    production_database: str,
    production_user: str,
    test_database: str,
    test_user: str,
) -> RestoreTestTarget:
    """Reject missing, production, unsafe or non-isolated restore targets.

    This is a configuration precondition, not a privilege check. The test
    MySQL account MUST also be granted rights only on glisen_verify_*.
    """
    values = {
        "production_database": production_database,
        "production_user": production_user,
        "test_database": test_database,
        "test_user": test_user,
    }
    for label, value in values.items():
        if not isinstance(value, str) or not value or value != value.strip():
            raise ValueError(f"{label} must be a nonempty, unpadded string.")

    for label in ("production_database", "test_database"):
        if not _MYSQL_IDENTIFIER_RE.fullmatch(values[label]):
            raise ValueError(f"{label} contains an invalid MySQL identifier.")

    if not _TEST_DB_RE.fullmatch(test_database):
        raise ValueError(
            "Restore tests require a newly generated glisen_verify_<12 hex> database."
        )
    if production_database.casefold() == test_database.casefold():
        raise ValueError("Restore test database must differ from production.")
    if production_user.casefold() == test_user.casefold():
        raise ValueError("Restore test must never use the production MySQL account.")

    return RestoreTestTarget(
        production_database=production_database,
        production_user=production_user,
        test_database=test_database,
        test_user=test_user,
    )


def new_restore_target(
    *,
    production_database: str,
    production_user: str,
    test_user: str,
) -> RestoreTestTarget:
    """Generate a unique, valid test schema name. Performs no database IO."""
    return validate_restore_target(
        production_database=production_database,
        production_user=production_user,
        test_database="glisen_verify_" + secrets.token_hex(6),
        test_user=test_user,
    )


def require_owned_cleanup_target(
    target: RestoreTestTarget,
    *,
    created_database: str,
    database_to_drop: str,
) -> None:
    """Allow cleanup only of the exact test schema created by this run.

    Call this before any DROP DATABASE request. The worker must separately
    confirm creation succeeded and must use a restricted test DB account.
    """
    validate_restore_target(
        production_database=target.production_database,
        production_user=target.production_user,
        test_database=target.test_database,
        test_user=target.test_user,
    )
    if created_database != target.test_database:
        raise ValueError("Cleanup denied: created schema does not match this run.")
    if database_to_drop != created_database:
        raise ValueError("Cleanup denied: only the exact created test schema can be dropped.")
