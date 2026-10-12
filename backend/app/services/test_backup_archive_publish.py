"""Isolated tests for Glisen's no-overwrite archive publication helper."""

import ast
import errno
from unittest.mock import patch
import tempfile
import unittest
from pathlib import Path

from app.services.backup_archive_publish import (
    build_archive_filename,
    publish_archive_no_overwrite,
)


class ArchivePublicationTests(unittest.TestCase):
    def test_multiple_backups_in_same_second_get_unique_names(self):
        names = {build_archive_filename("glisen_erp_", "MANUAL") for _ in range(100)}
        self.assertEqual(100, len(names))
        self.assertTrue(all(n.startswith("glisen_erp_") and n.endswith("_MANUAL.zip") for n in names))

    def test_preserves_suffix_expected_by_pre_restore_rename(self):
        for kind in ("MANUAL", "AUTOMATIC", "FY_FINAL"):
            self.assertTrue(build_archive_filename("glisen_erp_", kind).endswith("_" + kind + ".zip"))

    def test_successfully_publishes_full_file_then_removes_partial(self):
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder)
            partial = directory / "archive.zip.partial"
            final = directory / "archive.zip"
            partial.write_bytes(b"complete backup bytes")
            publish_archive_no_overwrite(partial, final)
            self.assertEqual(b"complete backup bytes", final.read_bytes())
            self.assertFalse(partial.exists())

    def test_existing_archive_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder)
            partial = directory / "archive.zip.partial"
            final = directory / "archive.zip"
            partial.write_bytes(b"new archive")
            final.write_bytes(b"old valid backup")
            with self.assertRaises(FileExistsError):
                publish_archive_no_overwrite(partial, final)
            self.assertEqual(b"old valid backup", final.read_bytes())
            self.assertEqual(b"new archive", partial.read_bytes())

    def test_unsupported_hardlinks_use_exclusive_copy(self):
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder)
            partial = directory / "archive.zip.partial"
            final = directory / "archive.zip"
            partial.write_bytes(b"complete backup bytes")
            with patch("app.services.backup_archive_publish.os.link", side_effect=OSError(errno.EOPNOTSUPP, "no hardlinks")):
                publish_archive_no_overwrite(partial, final)
            self.assertEqual(b"complete backup bytes", final.read_bytes())
            self.assertFalse(partial.exists())

    def test_exclusive_copy_fallback_also_refuses_existing_archive(self):
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder)
            partial = directory / "archive.zip.partial"
            final = directory / "archive.zip"
            partial.write_bytes(b"replacement")
            final.write_bytes(b"original")
            with patch("app.services.backup_archive_publish.os.link", side_effect=OSError(errno.EOPNOTSUPP, "no hardlinks")):
                with self.assertRaises(FileExistsError):
                    publish_archive_no_overwrite(partial, final)
            self.assertEqual(b"original", final.read_bytes())
            self.assertEqual(b"replacement", partial.read_bytes())

    def test_different_directory_fails_closed(self):
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder)
            (directory / "a").mkdir()
            (directory / "b").mkdir()
            partial = directory / "a" / "archive.partial"
            partial.write_bytes(b"test")
            with self.assertRaises(ValueError):
                publish_archive_no_overwrite(partial, directory / "b" / "archive.zip")
            self.assertTrue(partial.exists())

    def test_integrated_backup_service_uses_exclusive_publishing(self):
        root = Path(__file__).resolve().parents[3]  # repo root
        service = root / "backend" / "app" / "services" / "backup_service.py"
        source = service.read_text(encoding="utf-8-sig")
        tree = ast.parse(source)
        klass = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == "BackupService")
        method = next(n for n in klass.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == "create_standard_backup")
        calls = [n.func.id for n in ast.walk(method) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)]
        self.assertIn("build_archive_filename", calls)
        self.assertEqual(2, calls.count("publish_archive_no_overwrite"))


if __name__ == "__main__":
    unittest.main()
