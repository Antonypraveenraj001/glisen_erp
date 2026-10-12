"""Offline, filesystem-only tests; never accesses a real disk or MySQL."""
import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backup_storage import BackupStorage


class StorageTests(unittest.TestCase):
    def test_unmounted_hdd_uses_ssd_without_creating_fake_mount(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            mount = root / 'not-mounted'
            hdd = mount / 'erp'
            fallback = root / 'ssd' / 'backup-fallback'
            with patch.object(BackupStorage, 'hdd_is_mounted', return_value=False):
                result = BackupStorage.select_destination(
                    mount_point=mount, expected_uuid='test', hdd_folder=hdd,
                    ssd_fallback_folder=fallback, min_free_bytes=0)
            self.assertTrue(result.using_ssd_fallback)
            self.assertEqual(result.folder, fallback)
            self.assertTrue(fallback.is_dir())
            self.assertFalse(mount.exists())

    def test_no_fallback_inside_hdd_directory(self):
        with tempfile.TemporaryDirectory() as d:
            mount = Path(d) / 'mount'
            with self.assertRaises(ValueError):
                BackupStorage.select_destination(
                    mount_point=mount, expected_uuid='test', hdd_folder=mount/'erp',
                    ssd_fallback_folder=mount/'fallback')

    def test_verified_copy_preserves_source(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            mount = root / 'mounted'
            mount.mkdir()
            original = root / 'on-ssd.zip'
            original.write_bytes(b'a test archive')
            checksum = hashlib.sha256(original.read_bytes()).hexdigest()
            target = mount / 'glisen-erp' / 'sample.zip'
            with patch.object(BackupStorage, 'hdd_is_mounted', return_value=True):
                result = BackupStorage.copy_verified_to_hdd(
                    source=original, target=target, checksum_sha256=checksum,
                    mount_point=mount, expected_uuid='test')
            self.assertEqual(result.read_bytes(), original.read_bytes())
            self.assertTrue(original.exists())

    def test_wrong_checksum_does_not_create_hdd_file(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            mount = root / 'mounted'
            mount.mkdir()
            original = root / 'on-ssd.zip'
            original.write_bytes(b'a test archive')
            target = mount / 'glisen-erp' / 'sample.zip'
            with patch.object(BackupStorage, 'hdd_is_mounted', return_value=True):
                with self.assertRaises(RuntimeError):
                    BackupStorage.copy_verified_to_hdd(
                        source=original, target=target, checksum_sha256='0'*64,
                        mount_point=mount, expected_uuid='test')
            self.assertFalse(target.exists())


if __name__ == '__main__':
    unittest.main()
