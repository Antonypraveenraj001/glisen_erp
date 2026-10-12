"""Isolated, one-shot MySQL restore trial for Glisen ERP backup archives.

IMPORTANT:
- This module does nothing when imported; it is NOT scheduled or enabled.
- Use an independently provisioned MySQL account whose grants cover ONLY the
  escaped `glisen\\_verify\\_%` database namespace. Never give global grants.
- NEVER call the production restore function for an automated test.
- No changes to BackupLog or the production ERP database are made here.

The worker/scheduler and verification audit history will be added separately.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path

from app.services.backup_restore_safety import (
    new_restore_target,
    require_owned_cleanup_target,
)


# This is an escaped MySQL database-pattern grant, NOT a Python glob.
# It must match ONLY databases beginning with literal "glisen_verify_".
_ALLOWED_GRANT_PATTERN = r"glisen\_verify\_%"
_GRANT_OBJECT = re.compile(r"\bON\s+(`(?:``|[^`])+`|\*)\.\*\s+TO\b", re.I)


@dataclass(frozen=True)
class RestoreTrialResult:
    test_database: str
    table_count: int
    schema_revision: str | None
    cleanup_completed: bool


def require_restricted_test_grants(grants: list[str]) -> None:
    """Reject global or non-test-schema privileges, roles and proxy grants.

    This is defense in depth. The DBA must still create the test account with
    grants restricted on the database server itself.
    """
    if not grants:
        raise RuntimeError("Could not inspect restore-test MySQL privileges.")

    scoped = False
    for line in grants:
        statement = line.strip()
        match = _GRANT_OBJECT.search(statement)
        if not statement.upper().startswith("GRANT ") or match is None:
            raise RuntimeError("Unexpected restore-test MySQL grant; refused.")
        obj = match.group(1)
        if obj == "*":
            if not re.match(r"^GRANT\s+USAGE\s+ON\s+\*\.\*\s+TO\b", statement, re.I):
                raise RuntimeError("Restore-test account has global privileges; refused.")
            continue
        # SHOW GRANTS representations can double backslashes.
        pattern = obj[1:-1].replace("\\\\", "\\")
        if pattern != _ALLOWED_GRANT_PATTERN:
            raise RuntimeError("Restore-test account can access a non-test schema; refused.")
        if "WITH GRANT OPTION" in statement.upper():
            raise RuntimeError("Restore-test account must not have GRANT OPTION.")
        scoped = True

    if not scoped:
        raise RuntimeError("Restore-test account has no permitted test-schema grant.")


def restore_archive_to_disposable_database(
    *,
    archive_path: Path,
    expected_sha256: str,
    mysql_host: str,
    mysql_port: int,
    production_database: str,
    production_user: str,
    test_user: str,
    test_password: str,
    mysql_client: str | None = None,
    connect_factory=None,
    process_runner=None,
) -> RestoreTrialResult:
    """Restore a verified ZIP into a new test schema and always try to drop it.

    No privileged MySQL account is accepted; the test user must have only
    appropriately scoped database-level grants. This function is opt-in and
    deliberately has no scheduler entry point.
    """
    # Validate before connecting or creating files or schemas.
    target = new_restore_target(
        production_database=production_database,
        production_user=production_user,
        test_user=test_user,
    )
    if not test_password:
        raise ValueError("Dedicated restore-test database password is required.")
    if not isinstance(mysql_port, int) or not (1 <= mysql_port <= 65535):
        raise ValueError("Invalid restore-test MySQL port.")
    if not mysql_host or mysql_host.strip() != mysql_host:
        raise ValueError("Invalid restore-test MySQL host.")
    if not re.fullmatch(r"[0-9a-f]{64}", expected_sha256 or ""):
        raise ValueError("Expected backup SHA-256 must be a lowercase hex digest.")

    # Reuse existing archive inspection (manifest, required SQL and ZIP CRC).
    from app.services.backup_service import BackupService

    archive_path = Path(archive_path)
    if not archive_path.is_file():
        raise ValueError("Backup ZIP is missing.")
    if BackupService.sha256_file(archive_path) != expected_sha256:
        raise ValueError("Backup ZIP checksum does not match its recorded value.")
    validated = BackupService.validate_restore_archive(archive_path)
    manifest = validated["manifest"]
    member_name = validated["sql_member"]
    if manifest.get("database_name") != production_database:
        raise ValueError("Backup manifest does not match the production database.")

    client = mysql_client or BackupService.find_mysql_client()
    if not client:
        raise RuntimeError("MySQL client executable not found.")
    if connect_factory is None:
        import pymysql
        connect_factory = pymysql.connect
    if process_runner is None:
        process_runner = subprocess.run

    # The only credentials used for the entire restoration are the isolated
    # test user's; never use settings.DB_PASSWORD in this module.
    conn = connect_factory(
        host=mysql_host,
        port=mysql_port,
        user=test_user,
        password=test_password,
        autocommit=True,
        connect_timeout=10,
    )
    created = False
    failure: Exception | None = None
    cleanup_error: Exception | None = None
    result: RestoreTrialResult | None = None
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT CURRENT_USER()")
            authenticated = str(cursor.fetchone()[0]).split("@", 1)[0]
            if authenticated.casefold() != test_user.casefold():
                raise RuntimeError("Authenticated MySQL user differs from restore-test user.")
            cursor.execute("SHOW GRANTS FOR CURRENT_USER()")
            grants = [str(row[0]) for row in cursor.fetchall()]
            require_restricted_test_grants(grants)

            cursor.execute(
                f"CREATE DATABASE `{target.test_database}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
            created = True

        # Avoid ZIP-extraction path traversal: extract only the fixed SQL member.
        with tempfile.TemporaryDirectory(prefix="glisen_verify_restore_") as temp:
            sql_file = Path(temp) / "restore.sql"
            with zipfile.ZipFile(archive_path) as archive:
                with archive.open(member_name) as source, sql_file.open("wb") as out:
                    shutil.copyfileobj(source, out)
            if sql_file.stat().st_size == 0:
                raise RuntimeError("Restore-test SQL file is empty.")

            command = [
                client,
                "--no-defaults",  # Do not inherit an administrator's MySQL defaults.
                "--protocol=tcp",
                f"--host={mysql_host}",
                f"--port={mysql_port}",
                f"--user={test_user}",
                "--binary-mode=1",
                "--default-character-set=utf8mb4",
                f"--database={target.test_database}",
            ]
            env = os.environ.copy()
            env["MYSQL_PWD"] = test_password
            with sql_file.open("rb") as source:
                completed = process_runner(
                    command,
                    stdin=source,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    env=env,
                    check=False,
                    timeout=3600,
                )
            if completed.returncode:
                raise RuntimeError(
                    "Test database import failed: "
                    + completed.stderr.decode("utf-8", errors="replace")[:1000]
                )

        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM information_schema.tables "
                "WHERE table_schema=%s AND table_type='BASE TABLE'",
                (target.test_database,),
            )
            table_count = int(cursor.fetchone()[0])
            if table_count == 0:
                raise RuntimeError("Restore test created no database tables.")

            revision = None
            if manifest.get("schema_revision"):
                cursor.execute(
                    f"SELECT version_num FROM `{target.test_database}`.alembic_version LIMIT 1"
                )
                row = cursor.fetchone()
                revision = str(row[0]) if row else None
                if revision != str(manifest["schema_revision"]):
                    raise RuntimeError("Restored Alembic revision differs from backup manifest.")

        result = RestoreTrialResult(
            test_database=target.test_database,
            table_count=table_count,
            schema_revision=revision,
            cleanup_completed=True,
        )
    except Exception as exc:
        failure = exc
    finally:
        if created:
            try:
                require_owned_cleanup_target(
                    target,
                    created_database=target.test_database,
                    database_to_drop=target.test_database,
                )
                with conn.cursor() as cursor:
                    cursor.execute(f"DROP DATABASE `{target.test_database}`")
            except Exception as exc:
                cleanup_error = exc
        conn.close()

    if cleanup_error:
        raise RuntimeError(
            "Restore-test cleanup failed for temporary schema "
            f"{target.test_database}; operator must investigate. "
            f"Original failure: {failure!s}" if failure else
            "Restore-test cleanup failed for temporary schema "
            f"{target.test_database}; operator must investigate."
        ) from cleanup_error
    if failure:
        raise RuntimeError(f"Isolated restore test failed: {failure}") from failure
    assert result is not None
    return result
