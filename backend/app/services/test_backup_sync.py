"""Filesystem-only tests for SSD-to-HDD reconciliation; no real database."""

import hashlib
import json
import tempfile
import unittest
import zipfile
from contextlib import ExitStack
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from app.core.config import settings
from app.services.backup_service import BackupService
from app.services.backup_storage import BackupStorage
from app.services.backup_sync import BackupFallbackSync


class FakeQuery:
    def __init__(self, records):
        self.records = records

    def filter(self, *args):
        return self

    def order_by(self, *args):
        return self

    def all(self):
        return self.records


class FakeSession:
    def __init__(self, records):
        self.records = records
        self.commits = 0
        self.rollbacks = 0

    def query(self, _model):
        return FakeQuery(self.records)

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1


class BackupSyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.mount = self.root / "hdd-mount"
        self.hdd = self.mount / "glisen-erp"
        self.ssd = self.root / "ssd-fallback"
        self.hdd.mkdir(parents=True)
        self.ssd.mkdir(parents=True)
        self.uuid = "27efb529-a6e4-469f-a0f0-1bd9f46dd31c"
        self._stack = ExitStack()
        self.addCleanup(self._stack.close)
        for attr, value in (
            ("BACKUP_HDD_MOUNT_POINT", str(self.mount)),
            ("BACKUP_HDD_UUID", self.uuid),
            ("BACKUP_SSD_FALLBACK_FOLDER", str(self.ssd)),
        ):
            self._stack.enter_context(patch.object(settings, attr, value))
        self._stack.enter_context(
            patch.object(
                BackupService,
                "get_or_create_settings",
                return_value=SimpleNamespace(primary_backup_path=str(self.hdd)),
            )
        )

    def _record(self):
        name = "glisen_erp_20261010_120000_AUTOMATIC.zip"
        archive = self.ssd / name
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("database/" + settings.DB_NAME + ".sql", "CREATE TABLE test (id INT);\n")
            z.writestr("manifest.json", json.dumps({"database_name": settings.DB_NAME}))
        checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
        return SimpleNamespace(
            id=1,
            filename=name,
            primary_path=str(archive),
            secondary_path=None,
            checksum_sha256=checksum,
            status="PARTIAL",
            error_message="Backup saved to SSD fallback; HDD sync pending.",
            verified_at=None,
        )

    def test_hdd_missing_leaves_fallback_untouched(self):
        record = self._record()
        db = FakeSession([record])
        with patch.object(BackupStorage, "hdd_is_mounted", return_value=False):
            outcome = BackupFallbackSync.sync_pending(db)
        self.assertEqual(outcome["synced"], 0)
        self.assertEqual(db.commits, 0)
        self.assertEqual(record.primary_path, str(self.ssd / record.filename))

    def test_verified_copy_updates_paths_and_retains_ssd(self):
        record = self._record()
        db = FakeSession([record])
        with patch.object(BackupStorage, "hdd_is_mounted", return_value=True):
            outcome = BackupFallbackSync.sync_pending(db)
        self.assertEqual(outcome["synced"], 1, outcome)
        self.assertEqual(record.status, "VERIFIED")
        self.assertEqual(record.primary_path, str(self.hdd / record.filename))
        self.assertEqual(record.secondary_path, str(self.ssd / record.filename))
        self.assertTrue((self.hdd / record.filename).is_file())
        self.assertTrue((self.ssd / record.filename).is_file())
        self.assertEqual(db.commits, 1)

    def test_corrupt_ssd_is_flagged_failed_and_not_copied(self):
        record = self._record()
        (self.ssd / record.filename).write_bytes(b"broken")
        db = FakeSession([record])
        with patch.object(BackupStorage, "hdd_is_mounted", return_value=True):
            outcome = BackupFallbackSync.sync_pending(db)
        self.assertEqual(outcome["failed"], 1)
        self.assertEqual(record.status, "FAILED")
        self.assertIn("checksum mismatch", record.error_message)
        self.assertFalse((self.hdd / record.filename).exists())

    def test_unrelated_partial_record_is_not_changed(self):
        record = self._record()
        record.error_message = "Secondary backup unavailable"
        db = FakeSession([record])
        with patch.object(BackupStorage, "hdd_is_mounted", return_value=True):
            outcome = BackupFallbackSync.sync_pending(db)
        self.assertEqual(outcome["synced"], 0)
        self.assertEqual(db.commits, 0)

    def test_existing_secondary_retained_and_ssd_cleaned_after_commit(self):
        record = self._record()
        secondary = self.root / "external" / record.filename
        secondary.parent.mkdir()
        secondary.write_bytes(Path(record.primary_path).read_bytes())
        record.secondary_path = str(secondary)
        db = FakeSession([record])
        with patch.object(BackupStorage, "hdd_is_mounted", return_value=True):
            outcome = BackupFallbackSync.sync_pending(db)
        self.assertEqual(outcome["synced"], 1, outcome)
        self.assertEqual(record.secondary_path, str(secondary))
        self.assertEqual(record.primary_path, str(self.hdd / record.filename))
        self.assertFalse((self.ssd / record.filename).exists())
        self.assertTrue(secondary.exists())


if __name__ == "__main__":
    unittest.main()
