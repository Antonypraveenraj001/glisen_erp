"""Isolated restoration-executor tests. No real MySQL connection is made."""

import hashlib
import tempfile
import unittest
import zipfile
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from app.services.backup_restore_trial import (
    require_restricted_test_grants,
    restore_archive_to_disposable_database,
)


SAFE_GRANTS = [
    "GRANT USAGE ON *.* TO `glisen_verify_user`@`localhost`",
    r"GRANT ALL PRIVILEGES ON `glisen\_verify\_%`.* TO `glisen_verify_user`@`localhost`",
]


class FakeConnection:
    def __init__(self, *, imports_fail=False, empty_schema=False):
        self.statements = []
        self.last = ""
        self.created_db = None
        self.closed = False
        self.empty_schema = empty_schema

    def cursor(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def execute(self, sql, params=None):
        self.last = sql
        self.statements.append((sql, params))
        if sql.startswith("CREATE DATABASE "):
            self.created_db = sql.split("`", 2)[1]

    def fetchone(self):
        if self.last == "SELECT CURRENT_USER()":
            return ("glisen_verify_user@localhost",)
        if "information_schema.tables" in self.last:
            return (0 if self.empty_schema else 12,)
        if "alembic_version" in self.last:
            return ("r4n5q9j0h842",)
        raise AssertionError(f"Unexpected fetchone: {self.last}")

    def fetchall(self):
        if self.last == "SHOW GRANTS FOR CURRENT_USER()":
            return [(value,) for value in SAFE_GRANTS]
        raise AssertionError(f"Unexpected fetchall: {self.last}")

    def close(self):
        self.closed = True


class RestoreTrialTests(unittest.TestCase):
    def test_restricted_mysql_grants_accepted(self):
        require_restricted_test_grants(SAFE_GRANTS)

    def test_global_other_schema_and_grant_option_rejected(self):
        bad_grants = [
            ["GRANT ALL PRIVILEGES ON *.* TO `glisen_verify_user`@`localhost`"],
            SAFE_GRANTS[:1] + ["GRANT SELECT ON `glisen_erp`.* TO `glisen_verify_user`@`localhost`"],
            SAFE_GRANTS[:1] + [
                r"GRANT ALL PRIVILEGES ON `glisen\_verify\_%`.* TO `glisen_verify_user`@`localhost` WITH GRANT OPTION"
            ],
        ]
        for grants in bad_grants:
            with self.subTest(grants=grants), self.assertRaises(RuntimeError):
                require_restricted_test_grants(grants)

    def _invoke(self, *, runner=None, conn=None):
        connection = conn or FakeConnection()
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "archive.zip"
            with zipfile.ZipFile(path, "w") as z:
                z.writestr("database/glisen_erp.sql", "CREATE TABLE example (id INT);\n")
                z.writestr("manifest.json", '{"database_name":"glisen_erp","schema_revision":"r4n5q9j0h842"}')
            checksum = hashlib.sha256(path.read_bytes()).hexdigest()
            result_or_error = None
            try:
                from app.services.backup_service import BackupService
                with mock.patch.object(BackupService, "sha256_file", return_value=checksum), \
                     mock.patch.object(BackupService, "validate_restore_archive", return_value={
                         "manifest": {"database_name": "glisen_erp", "schema_revision": "r4n5q9j0h842"},
                         "sql_member": "database/glisen_erp.sql",
                     }):
                    result_or_error = restore_archive_to_disposable_database(
                        archive_path=path,
                        expected_sha256=checksum,
                        mysql_host="127.0.0.1",
                        mysql_port=3306,
                        production_database="glisen_erp",
                        production_user="glisen_app",
                        test_user="glisen_verify_user",
                        test_password="placeholder-for-mock-only",
                        mysql_client="mysql",
                        connect_factory=lambda **kwargs: connection,
                        process_runner=runner or (lambda *a, **kw: SimpleNamespace(returncode=0, stderr=b"")),
                    )
            except Exception as exc:
                result_or_error = exc
        return connection, result_or_error

    def test_success_creates_only_temp_schema_and_drops_it(self):
        conn, result = self._invoke()
        self.assertFalse(isinstance(result, Exception), result)
        self.assertTrue(result.test_database.startswith("glisen_verify_"))
        self.assertTrue(result.cleanup_completed)
        self.assertEqual(result.table_count, 12)
        self.assertTrue(conn.closed)
        self.assertIn(f"DROP DATABASE `{result.test_database}`", [sql for sql, _ in conn.statements])
        self.assertTrue(all("`glisen_erp`" not in sql for sql, _ in conn.statements))

    def test_failed_import_still_drops_temporary_schema(self):
        conn, error = self._invoke(runner=lambda *a, **kw: SimpleNamespace(returncode=1, stderr=b"Import blocked"))
        self.assertIsInstance(error, RuntimeError)
        self.assertIn("Import blocked", str(error))
        self.assertTrue(any(sql.startswith("DROP DATABASE `glisen_verify_") for sql, _ in conn.statements))
        self.assertTrue(conn.closed)

    def test_empty_restore_fails_and_cleans_up(self):
        conn, error = self._invoke(conn=FakeConnection(empty_schema=True))
        self.assertIsInstance(error, RuntimeError)
        self.assertIn("no database tables", str(error))
        self.assertTrue(any(sql.startswith("DROP DATABASE `glisen_verify_") for sql, _ in conn.statements))


if __name__ == "__main__":
    unittest.main()
