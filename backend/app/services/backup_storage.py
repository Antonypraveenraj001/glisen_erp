"""Safe HDD-first storage selection for Glisen ERP backups.

This module is intentionally independent of the database, web API and scheduler.
The caller must opt into a policy with a configured mount, UUID and fallback.
"""

from __future__ import annotations

import hashlib
import os
import re
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class BackupDestination:
    folder: Path
    using_ssd_fallback: bool


class BackupStorage:
    """Determine where a backup goes, and safely repatriate verified copies."""

    DEFAULT_MIN_FREE_BYTES = 2 * 1024 * 1024 * 1024

    @staticmethod
    def hdd_is_mounted(mount_point: Path, expected_uuid: str) -> bool:
        """Require the exact UUID-backed Linux block device at the mount point."""
        if os.name != "posix" or not re.fullmatch(
            r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
            r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", expected_uuid
        ):
            return False

        mount_point = Path(mount_point)
        if not mount_point.is_mount():
            return False

        by_uuid = Path("/dev/disk/by-uuid") / expected_uuid
        try:
            return os.stat(mount_point).st_dev == os.stat(by_uuid).st_rdev
        except OSError:
            return False

    @staticmethod
    def _within(child: Path, parent: Path) -> bool:
        try:
            child.relative_to(parent)
            return True
        except ValueError:
            return False

    @staticmethod
    def select_destination(
        *,
        mount_point: Path,
        expected_uuid: str,
        hdd_folder: Path,
        ssd_fallback_folder: Path,
        min_free_bytes: int = DEFAULT_MIN_FREE_BYTES,
    ) -> BackupDestination:
        """Choose mounted HDD or a *separate* SSD directory, never a fake mount.

        Does not alter mount state or write any backup archive. The returned
        folder is created with private permissions if it does not exist.
        """
        mount_point = Path(mount_point).absolute()
        hdd_folder = Path(hdd_folder).absolute()
        ssd_fallback_folder = Path(ssd_fallback_folder).absolute()

        if not BackupStorage._within(hdd_folder, mount_point) or hdd_folder == mount_point:
            raise ValueError("HDD backup folder must be inside the HDD mount point.")
        if BackupStorage._within(ssd_fallback_folder, mount_point):
            raise ValueError("SSD fallback must be outside the HDD mount point.")
        if min_free_bytes < 0:
            raise ValueError("Minimum free space cannot be negative.")

        on_hdd = BackupStorage.hdd_is_mounted(mount_point, expected_uuid)
        folder = hdd_folder if on_hdd else ssd_fallback_folder

        # Never create a directory beneath the supposed HDD if it isn't mounted.
        if on_hdd and not BackupStorage.hdd_is_mounted(mount_point, expected_uuid):
            raise RuntimeError("HDD mount changed during destination selection.")

        folder.mkdir(parents=True, exist_ok=True, mode=0o700)
        if folder.is_symlink():
            raise RuntimeError("Backup directory must not be a symbolic link.")
        if on_hdd:
            if not BackupStorage.hdd_is_mounted(mount_point, expected_uuid):
                raise RuntimeError("HDD mount disappeared during destination selection.")
            if not BackupStorage._within(folder.resolve(), mount_point.resolve()):
                raise RuntimeError("HDD destination resolves outside the mounted HDD.")
        else:
            if BackupStorage._within(folder.resolve(), mount_point.resolve()):
                raise RuntimeError("SSD fallback resolves inside the HDD mount point.")
            if shutil.disk_usage(folder).free < min_free_bytes:
                raise RuntimeError("SSD fallback has insufficient free space.")

        if not os.access(folder, os.W_OK | os.X_OK):
            raise RuntimeError(f"Backup folder is not writable: {folder}")

        return BackupDestination(folder=folder, using_ssd_fallback=not on_hdd)

    @staticmethod
    def sha256_file(path: Path) -> str:
        digest = hashlib.sha256()
        with Path(path).open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    @staticmethod
    def copy_verified_to_hdd(
        *,
        source: Path,
        target: Path,
        checksum_sha256: str,
        mount_point: Path,
        expected_uuid: str,
    ) -> Path:
        """Atomically copy an SSD backup to the HDD and verify its checksum.

        Callers update the BackupLog path only *after* this method succeeds.
        The SSD original remains in place; retention/removal is a separate step.
        """
        source = Path(source)
        target = Path(target)
        mount_point = Path(mount_point)
        if not BackupStorage.hdd_is_mounted(mount_point, expected_uuid):
            raise RuntimeError("Verified backup HDD is not mounted.")
        if not BackupStorage._within(target.absolute(), mount_point.absolute()):
            raise ValueError("Copy destination is not on the configured HDD.")
        if not re.fullmatch(r"[0-9a-fA-F]{64}", checksum_sha256):
            raise ValueError("Invalid expected SHA-256 checksum.")
        if not source.is_file() or BackupStorage.sha256_file(source) != checksum_sha256.lower():
            raise RuntimeError("SSD source backup is missing or its checksum differs.")

        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        if not BackupStorage.hdd_is_mounted(mount_point, expected_uuid):
            raise RuntimeError("Backup HDD disappeared before copying.")
        if not BackupStorage._within(target.parent.resolve(), mount_point.resolve()):
            raise RuntimeError("HDD target directory resolves outside the HDD.")

        if target.exists():
            if BackupStorage.sha256_file(target) == checksum_sha256.lower():
                return target
            raise RuntimeError("HDD destination exists with a different checksum.")

        temp_name: str | None = None
        try:
            with tempfile.NamedTemporaryFile(
                dir=target.parent, prefix=f".{target.name}.", suffix=".partial", delete=False
            ) as temp:
                temp_name = temp.name
                with source.open("rb") as input_stream:
                    shutil.copyfileobj(input_stream, temp)
                temp.flush()
                os.fsync(temp.fileno())

            candidate = Path(temp_name)
            if BackupStorage.sha256_file(candidate) != checksum_sha256.lower():
                raise RuntimeError("HDD copy failed SHA-256 validation.")
            if not BackupStorage.hdd_is_mounted(mount_point, expected_uuid):
                raise RuntimeError("Backup HDD disappeared while copying.")
            if target.exists():
                raise RuntimeError("HDD backup filename was taken during copying.")
            os.replace(candidate, target)
            temp_name = None
            return target
        finally:
            if temp_name:
                Path(temp_name).unlink(missing_ok=True)
