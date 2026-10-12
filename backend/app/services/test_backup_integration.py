"""Filesystem-only tests for the Step 176 Glisen ERP destination integration.

No app imports, database connections, dumps, or actual server mounts.
Run from repository root:
    python -m unittest discover -s backend/app/services -p test_backup_integration.py -v
"""

from __future__ import annotations

import ast
import importlib.util
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


HERE = Path(__file__).resolve().parent
SERVICE_PATH = HERE / "backup_service.py"
STORAGE_PATH = HERE / "backup_storage.py"


def _load_storage():
    spec = importlib.util.spec_from_file_location(
        "glisen_backup_storage_test_isolated", STORAGE_PATH
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("Cannot load backup_storage.py")
    # The module is inserted for dataclass resolution and only the independent
    # backup storage helper is imported (not FastAPI, MySQL, or app config).
    import sys
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module.BackupStorage


BackupStorage = _load_storage()


def _load_integration_method(settings_obj, normalize_func):
    """Execute the actual destination method, isolated from app initialization."""
    tree = ast.parse(SERVICE_PATH.read_text(encoding="utf-8-sig"))
    klass = next(
        node for node in tree.body
        if isinstance(node, ast.ClassDef) and node.name == "BackupService"
    )
    method = next(
        node for node in klass.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and node.name == "select_primary_destination"
    )
    # Copy only the method AST; no side effects from importing backup_service.py.
    method.decorator_list = []
    module = ast.Module(body=[method], type_ignores=[])
    ast.fix_missing_locations(module)
    namespace = {
        "Path": Path,
        "settings": settings_obj,
        "BackupStorage": BackupStorage,
        "BackupService": SimpleNamespace(normalize_folder=normalize_func),
    }
    exec(compile(module, str(SERVICE_PATH), "exec"), namespace)
    return namespace["select_primary_destination"]


class BackupIntegrationTests(unittest.TestCase):
    UUID = "27efb529-a6e4-469f-a0f0-1bd9f46dd31c"

    def config(self, mount="", uuid="", fallback="", min_mb=0):
        return SimpleNamespace(
            BACKUP_HDD_MOUNT_POINT=mount,
            BACKUP_HDD_UUID=uuid,
            BACKUP_SSD_FALLBACK_FOLDER=fallback,
            BACKUP_FALLBACK_MIN_FREE_MB=min_mb,
        )

    def test_disabled_feature_preserves_old_destination(self):
        with tempfile.TemporaryDirectory() as tmp:
            old_dest = Path(tmp) / "legacy"
            seen = []

            def normalize(path):
                seen.append(path)
                old_dest.mkdir()
                return old_dest

            select = _load_integration_method(self.config(), normalize)
            folder, using_fallback = select(str(old_dest))
            self.assertEqual(folder, old_dest)
            self.assertFalse(using_fallback)
            self.assertEqual(seen, [str(old_dest)])

    def test_incomplete_configuration_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            select = _load_integration_method(
                self.config(mount=tmp),
                lambda _path: self.fail("must not normalize incomplete config"),
            )
            with self.assertRaisesRegex(RuntimeError, "incomplete"):
                select(str(Path(tmp) / "backup"))

    def test_mounted_hdd_selected(self):
        with tempfile.TemporaryDirectory() as tmp:
            mount = Path(tmp) / "mounted-hdd"
            mount.mkdir()
            hdd_dest = mount / "glisen-erp"
            fallback = Path(tmp) / "ssd-fallback"
            select = _load_integration_method(
                self.config(str(mount), self.UUID, str(fallback)),
                lambda _path: self.fail("opt-in must use storage selector"),
            )
            with patch.object(BackupStorage, "hdd_is_mounted", return_value=True):
                folder, using_fallback = select(str(hdd_dest))
            self.assertEqual(folder, hdd_dest)
            self.assertFalse(using_fallback)
            self.assertTrue(folder.is_dir())
            self.assertFalse(fallback.exists())

    def test_missing_hdd_selects_separate_ssd(self):
        with tempfile.TemporaryDirectory() as tmp:
            mount = Path(tmp) / "unmounted-hdd"
            mount.mkdir()
            hdd_dest = mount / "glisen-erp"
            fallback = Path(tmp) / "ssd-fallback"
            select = _load_integration_method(
                self.config(str(mount), self.UUID, str(fallback)),
                lambda _path: self.fail("opt-in must use storage selector"),
            )
            with patch.object(BackupStorage, "hdd_is_mounted", return_value=False):
                folder, using_fallback = select(str(hdd_dest))
            self.assertEqual(folder, fallback)
            self.assertTrue(using_fallback)
            self.assertTrue(fallback.is_dir())
            self.assertFalse(hdd_dest.exists(), "must not write under missing HDD")

    def test_relative_primary_path_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            mount = Path(tmp) / "hdd"
            mount.mkdir()
            fallback = Path(tmp) / "fallback"
            select = _load_integration_method(
                self.config(str(mount), self.UUID, str(fallback)),
                lambda _path: self.fail("relative path must fail"),
            )
            with self.assertRaisesRegex(ValueError, "absolute path"):
                select("relative/backup")


if __name__ == "__main__":
    unittest.main()
