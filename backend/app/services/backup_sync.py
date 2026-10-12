"""Reconcile verified Glisen ERP SSD-fallback archives onto the backup HDD.

Nothing runs automatically from importing this module. The existing scheduler
will call sync_pending() only after its own safety checks in a later step.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings
from app.models.backup import BackupLog
from app.services.backup_storage import BackupStorage


class InvalidFallbackArchive(RuntimeError):
    """A fallback archive cannot be trusted or used for restoration."""


class BackupFallbackSync:
    PENDING_MARKER = "HDD sync pending."

    @staticmethod
    def sync_pending(db, *, max_records: int = 10) -> dict:
        """Copy due fallback archives, verify them, then update backup history.

        The production DB is not restored or modified beyond backup history.
        No source SSD archive is deleted until its HDD copy is verified and
        the history update has been committed. SSD copies are retained as the
        secondary backup when there was no configured secondary destination.
        """
        # Delayed import avoids a circular dependency if the service later
        # exposes this operation through its existing API.
        from app.services.backup_service import BackupService

        mount_value = settings.BACKUP_HDD_MOUNT_POINT.strip()
        uuid_value = settings.BACKUP_HDD_UUID.strip()
        fallback_value = settings.BACKUP_SSD_FALLBACK_FOLDER.strip()
        result = {"synced": 0, "failed": 0, "skipped": 0, "errors": []}

        if not any((mount_value, uuid_value, fallback_value)):
            return result  # Old installations stay completely unchanged.
        if not all((mount_value, uuid_value, fallback_value)):
            raise RuntimeError("Incomplete HDD/SSD backup configuration.")
        if max_records < 1:
            raise ValueError("max_records must be at least 1.")
        if BackupService.RESTORE_IN_PROGRESS:
            return result

        backup_settings = BackupService.get_or_create_settings(db=db)
        if not backup_settings.primary_backup_path:
            return result

        mount = Path(mount_value).absolute()
        hdd_folder = Path(backup_settings.primary_backup_path).expanduser().absolute()
        fallback = Path(fallback_value).expanduser().absolute()
        if (
            hdd_folder == mount
            or not BackupStorage._within(hdd_folder, mount)
            or BackupStorage._within(fallback, mount)
        ):
            raise RuntimeError("Unsafe backup storage paths; cannot synchronize.")

        if not BackupStorage.hdd_is_mounted(mount, uuid_value):
            return result
        if not BackupService.BACKUP_LOCK.acquire(blocking=False):
            return result

        try:
            records = (
                db.query(BackupLog)
                .filter(BackupLog.status == "PARTIAL")
                .order_by(BackupLog.id.asc())
                .all()
            )
            processed = 0
            for record in records:
                if processed >= max_records:
                    break
                if BackupFallbackSync.PENDING_MARKER not in (record.error_message or ""):
                    continue
                source = Path(record.primary_path or "").absolute()
                if (
                    source.parent != fallback
                    or source.name != record.filename
                    or not record.filename.startswith("glisen_erp_")
                    or not record.filename.endswith(".zip")
                    or source.is_symlink()
                ):
                    result["skipped"] += 1
                    result["errors"].append(
                        f"Backup {record.id}: unsafe or unexpected fallback path."
                    )
                    continue

                processed += 1
                target = hdd_folder / record.filename
                try:
                    if not source.is_file():
                        raise InvalidFallbackArchive("SSD fallback archive is missing.")
                    if not record.checksum_sha256 or (
                        BackupStorage.sha256_file(source)
                        != record.checksum_sha256.lower()
                    ):
                        raise InvalidFallbackArchive("SSD archive checksum mismatch.")
                    try:
                        BackupService.validate_restore_archive(source)
                    except (ValueError, OSError, RuntimeError) as exc:
                        raise InvalidFallbackArchive(f"Invalid SSD ZIP archive: {exc}") from exc

                    target_preexisted = target.exists()
                    BackupStorage.copy_verified_to_hdd(
                        source=source,
                        target=target,
                        checksum_sha256=record.checksum_sha256,
                        mount_point=mount,
                        expected_uuid=uuid_value,
                    )
                    try:
                        BackupService.validate_restore_archive(target)
                        if not BackupStorage.hdd_is_mounted(mount, uuid_value):
                            raise RuntimeError("Backup HDD was unmounted during sync.")
                    except Exception:
                        # Never delete a pre-existing file, even if it failed validation.
                        if not target_preexisted and BackupStorage.hdd_is_mounted(mount, uuid_value):
                            target.unlink(missing_ok=True)
                        raise

                    existing_secondary = record.secondary_path
                    secondary_is_valid = True
                    if existing_secondary:
                        other = Path(existing_secondary)
                        secondary_is_valid = (
                            other.is_file()
                            and BackupStorage.sha256_file(other)
                            == record.checksum_sha256.lower()
                        )

                    record.primary_path = str(target)
                    if not existing_secondary:
                        # Preserve the SSD source as a tracked secondary copy.
                        record.secondary_path = str(source)
                    record.verified_at = datetime.now(timezone.utc)
                    if secondary_is_valid:
                        record.status = "VERIFIED"
                        record.error_message = None
                    else:
                        record.status = "PARTIAL"
                        record.error_message = (
                            "HDD backup verified, but the separately configured "
                            "secondary backup is missing or damaged."
                        )
                    db.commit()
                    result["synced"] += 1

                    # Only when there was already a different secondary backup:
                    # remove now-untracked SSD source *after* the DB commit.
                    # Otherwise it remains a recorded secondary backup and
                    # retention can clean it up later.
                    if existing_secondary:
                        try:
                            source.unlink(missing_ok=True)
                        except OSError as exc:
                            result["errors"].append(
                                f"Backup {record.id}: SSD cleanup deferred: {exc}"
                            )

                except InvalidFallbackArchive as exc:
                    db.rollback()
                    record.status = "FAILED"
                    record.error_message = f"SSD fallback verification failed: {exc}"
                    db.commit()
                    result["failed"] += 1
                    result["errors"].append(f"Backup {record.id}: {exc}")
                    # Preserve corrupt files for investigation; never restore.
                except Exception as exc:
                    db.rollback()
                    result["failed"] += 1
                    result["errors"].append(f"Backup {record.id}: {exc}")
                    # Do not rewrite history or delete the SSD original on
                    # transient HDD or I/O failures; next poll can retry.

        finally:
            BackupService.BACKUP_LOCK.release()

        return result
