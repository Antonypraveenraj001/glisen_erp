import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import threading
import zipfile

from datetime import (
    datetime,
    timedelta,
    timezone,
)
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import (
    SessionLocal,
    engine,
)
from app.models.backup import (
    BackupLog,
    BackupSettings,
)
from app.models.system_state import (
    SystemState,
)
from app.schemas.backup import (
    BackupSettingsUpdate,
)


class BackupService:
    MANIFEST_VERSION = "1"
    ARCHIVE_PREFIX = "glisen_erp_"
    RESTORE_IN_PROGRESS = False
    BACKUP_LOCK = threading.Lock()

    @staticmethod
    def get_or_create_settings(
        db: Session,
    ) -> BackupSettings:
        record = (
            db.query(BackupSettings)
            .first()
        )

        if record is not None:
            return record

        record = BackupSettings(id=1)
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def normalize_folder(
        value: str,
    ) -> Path:
        cleaned = str(value or "").strip()

        if not cleaned:
            raise ValueError(
                "Backup folder cannot be empty."
            )

        folder = Path(
            cleaned
        ).expanduser()

        if not folder.is_absolute():
            raise ValueError(
                "Backup folders must use an absolute path. "
                "Example: D:\\GlisenBackups"
            )

        try:
            folder.mkdir(
                parents=True,
                exist_ok=True,
            )
        except OSError as exc:
            raise ValueError(
                f"Unable to create or access backup folder: "
                f"{folder}"
            ) from exc

        test_file = (
            folder
            / ".glisen_backup_write_test"
        )

        try:
            test_file.write_text(
                "Glisen ERP backup path test",
                encoding="utf-8",
            )
            test_file.unlink(
                missing_ok=True
            )
        except OSError as exc:
            raise ValueError(
                f"Backup folder is not writable: {folder}"
            ) from exc

        return folder.resolve()

    @staticmethod
    def update_settings(
        db: Session,
        data: BackupSettingsUpdate,
    ) -> BackupSettings:
        record = (
            BackupService
            .get_or_create_settings(db=db)
        )

        primary = (
            BackupService
            .normalize_folder(
                data.primary_backup_path
            )
        )

        secondary = None

        if data.secondary_backup_enabled:
            if not data.secondary_backup_path:
                raise ValueError(
                    "Secondary backup folder is required "
                    "when secondary backup is enabled."
                )

            secondary = (
                BackupService
                .normalize_folder(
                    data.secondary_backup_path
                )
            )

            if (
                os.path.normcase(str(primary))
                ==
                os.path.normcase(str(secondary))
            ):
                raise ValueError(
                    "Primary and secondary backup folders "
                    "must be different locations."
                )

        record.primary_backup_path = str(primary)
        record.secondary_backup_enabled = (
            data.secondary_backup_enabled
        )
        record.secondary_backup_path = (
            str(secondary)
            if secondary
            else None
        )
        record.retention_days = data.retention_days

        # Glisen currently has no business-critical uploaded
        # documents to recover. Company logo can be uploaded again,
        # so future backup archives remain database-focused.
        record.include_uploads = False

        record.verify_after_backup = (
            data.verify_after_backup
        )

        record.automatic_backup_enabled = (
            data.automatic_backup_enabled
        )

        record.backup_time = (
            data.backup_time
        )

        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def find_mysqldump() -> str | None:
        discovered = shutil.which(
            "mysqldump"
        )

        if discovered:
            return discovered

        candidates: list[Path] = []

        if os.name == "nt":
            for env_name in (
                "ProgramFiles",
                "ProgramFiles(x86)",
            ):
                root = os.environ.get(
                    env_name
                )

                if not root:
                    continue

                mysql_root = (
                    Path(root)
                    / "MySQL"
                )

                if mysql_root.exists():
                    candidates.extend(
                        mysql_root.glob(
                            "MySQL Server */bin/mysqldump.exe"
                        )
                    )

            candidates.extend([
                Path(
                    r"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
                ),
                Path(
                    r"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe"
                ),
            ])

        for candidate in candidates:
            if candidate.is_file():
                return str(candidate)

        return None

    @staticmethod
    def system_status() -> dict:
        dump_path = (
            BackupService
            .find_mysqldump()
        )

        uploads = Path(
            settings.UPLOAD_FOLDER
        ).expanduser()

        return {
            "database_name":
                settings.DB_NAME,
            "dump_utility_available":
                dump_path is not None,
            "dump_utility_name":
                dump_path
                or
                "mysqldump not found",
            "uploads_folder":
                str(uploads),
            "uploads_folder_exists":
                uploads.exists(),
        }

    @staticmethod
    def sha256_file(
        path: Path,
    ) -> str:
        digest = hashlib.sha256()

        with path.open("rb") as handle:
            while True:
                chunk = handle.read(
                    1024 * 1024
                )
                if not chunk:
                    break
                digest.update(chunk)

        return digest.hexdigest()

    @staticmethod
    def schema_revision(
        db: Session,
    ) -> str | None:
        try:
            return (
                db.execute(
                    text(
                        "SELECT version_num "
                        "FROM alembic_version "
                        "LIMIT 1"
                    )
                )
                .scalar()
            )
        except Exception:
            return None

    @staticmethod
    def create_database_dump(
        destination: Path,
    ) -> None:
        executable = (
            BackupService
            .find_mysqldump()
        )

        if not executable:
            raise RuntimeError(
                "mysqldump was not found. Install MySQL "
                "Server client tools or add the MySQL bin "
                "folder to PATH."
            )

        command = [
            executable,
            "--protocol=tcp",
            f"--host={settings.DB_HOST}",
            f"--port={settings.DB_PORT}",
            f"--user={settings.DB_USER}",
            "--single-transaction",
            "--quick",
            "--routines",
            "--events",
            "--triggers",
            "--hex-blob",
            "--no-tablespaces",
            "--set-gtid-purged=OFF",
            "--default-character-set=utf8mb4",
            settings.DB_NAME,
        ]

        environment = os.environ.copy()
        environment["MYSQL_PWD"] = (
            settings.DB_PASSWORD
        )

        creation_flags = 0

        if os.name == "nt":
            creation_flags = getattr(
                subprocess,
                "CREATE_NO_WINDOW",
                0,
            )

        with destination.open("wb") as output:
            result = subprocess.run(
                command,
                stdout=output,
                stderr=subprocess.PIPE,
                env=environment,
                check=False,
                creationflags=(
                    creation_flags
                ),
            )

        if result.returncode != 0:
            error_text = (
                result.stderr
                .decode(
                    "utf-8",
                    errors="replace",
                )
                .strip()
            )

            destination.unlink(
                missing_ok=True
            )

            raise RuntimeError(
                error_text
                or
                "mysqldump failed."
            )

        if (
            not destination.exists()
            or
            destination.stat().st_size <= 0
        ):
            raise RuntimeError(
                "mysqldump completed but produced "
                "an empty database dump."
            )

    @staticmethod
    def add_uploads_to_archive(
        archive: zipfile.ZipFile,
        uploads_folder: Path,
    ) -> None:
        if not uploads_folder.exists():
            return

        for item in uploads_folder.rglob(
            "*"
        ):
            if not item.is_file():
                continue

            relative = item.relative_to(
                uploads_folder
            )

            archive.write(
                item,
                (
                    Path("uploads")
                    / relative
                ).as_posix(),
            )

    @staticmethod
    def create_standard_backup(
        db: Session,
        backup_type: str,
        created_by: int | None,
    ) -> BackupLog:
        normalized_type = (
            str(backup_type or "")
            .strip()
            .upper()
        )

        if normalized_type not in {
            "MANUAL",
            "AUTOMATIC",
        }:
            raise ValueError(
                "Unsupported standard backup type."
            )

        if not BackupService.BACKUP_LOCK.acquire(
            blocking=False
        ):
            raise RuntimeError(
                "Another backup is already in progress."
            )

        try:
            backup_settings = (
                BackupService
                .get_or_create_settings(db=db)
            )

            if not backup_settings.primary_backup_path:
                raise ValueError(
                    "Configure and save the Primary Backup Folder "
                    "before creating a backup."
                )

            primary_folder = (
                BackupService
                .normalize_folder(
                    backup_settings
                    .primary_backup_path
                )
            )

            secondary_folder = None

            if (
                backup_settings
                .secondary_backup_enabled
            ):
                if (
                    not backup_settings
                    .secondary_backup_path
                ):
                    raise ValueError(
                        "Secondary backup is enabled but "
                        "no secondary folder is configured."
                    )

                secondary_folder = (
                    BackupService
                    .normalize_folder(
                        backup_settings
                        .secondary_backup_path
                    )
                )

            stamp = (
                datetime.now(timezone.utc)
                .strftime("%Y%m%d_%H%M%S")
            )

            filename = (
                f"{BackupService.ARCHIVE_PREFIX}"
                f"{stamp}_{normalized_type}.zip"
            )

            primary_final = (
                primary_folder
                / filename
            )

            secondary_final = (
                (
                    secondary_folder
                    / filename
                )
                if secondary_folder
                else None
            )

            record = BackupLog(
                backup_type=normalized_type,
                filename=filename,
                primary_path=str(
                    primary_final
                ),
                secondary_path=(
                    str(secondary_final)
                    if secondary_final
                    else None
                ),
                status="STARTED",
                created_by=created_by,
                app_version=settings.APP_VERSION,
                schema_revision=(
                    BackupService
                    .schema_revision(db=db)
                ),
                manifest_version=(
                    BackupService
                    .MANIFEST_VERSION
                ),
            )

            db.add(record)
            db.commit()
            db.refresh(record)

            primary_partial = (
                primary_final
                .with_suffix(
                    primary_final.suffix
                    + ".partial"
                )
            )

            secondary_partial = (
                (
                    secondary_final
                    .with_suffix(
                        secondary_final.suffix
                        + ".partial"
                    )
                )
                if secondary_final
                else None
            )

            secondary_error = None

            try:
                with tempfile.TemporaryDirectory(
                    prefix="glisen_erp_backup_"
                ) as temp_folder:
                    temp_path = Path(
                        temp_folder
                    )

                    sql_file = (
                        temp_path
                        / f"{settings.DB_NAME}.sql"
                    )

                    BackupService.create_database_dump(
                        destination=sql_file
                    )

                    manifest = {
                        "manifest_version":
                            BackupService
                            .MANIFEST_VERSION,
                        "backup_type":
                            normalized_type,
                        "database_name":
                            settings.DB_NAME,
                        "created_at_utc":
                            datetime.now(
                                timezone.utc
                            ).isoformat(),
                        "app_version":
                            settings.APP_VERSION,
                        "schema_revision":
                            record.schema_revision,
                        "include_uploads":
                            False,
                    }

                    manifest_file = (
                        temp_path
                        / "manifest.json"
                    )

                    manifest_file.write_text(
                        json.dumps(
                            manifest,
                            indent=2,
                            sort_keys=True,
                        ),
                        encoding="utf-8",
                    )

                    primary_partial.unlink(
                        missing_ok=True
                    )

                    with zipfile.ZipFile(
                        primary_partial,
                        "w",
                        compression=(
                            zipfile.ZIP_DEFLATED
                        ),
                    ) as archive:
                        archive.write(
                            sql_file,
                            (
                                Path("database")
                                / sql_file.name
                            ).as_posix(),
                        )

                        archive.write(
                            manifest_file,
                            "manifest.json",
                        )

                    os.replace(
                        primary_partial,
                        primary_final,
                    )

                checksum = (
                    BackupService
                    .sha256_file(
                        primary_final
                    )
                )

                file_size = (
                    primary_final
                    .stat()
                    .st_size
                )

                if (
                    backup_settings
                    .verify_after_backup
                ):
                    primary_check = (
                        BackupService
                        .sha256_file(
                            primary_final
                        )
                    )

                    if (
                        primary_check
                        != checksum
                    ):
                        raise RuntimeError(
                            "Primary backup checksum verification failed."
                        )

                if secondary_final:
                    try:
                        secondary_partial.unlink(
                            missing_ok=True
                        )

                        shutil.copy2(
                            primary_final,
                            secondary_partial,
                        )

                        os.replace(
                            secondary_partial,
                            secondary_final,
                        )

                        if (
                            backup_settings
                            .verify_after_backup
                        ):
                            secondary_check = (
                                BackupService
                                .sha256_file(
                                    secondary_final
                                )
                            )

                            if (
                                secondary_check
                                != checksum
                            ):
                                raise RuntimeError(
                                    "Secondary backup checksum "
                                    "verification failed."
                                )

                    except Exception as exc:
                        secondary_error = str(exc)

                        if secondary_partial:
                            secondary_partial.unlink(
                                missing_ok=True
                            )

                record.file_size_bytes = (
                    file_size
                )
                record.checksum_sha256 = (
                    checksum
                )
                record.completed_at = (
                    datetime.now(timezone.utc)
                )

                if (
                    backup_settings
                    .verify_after_backup
                ):
                    record.verified_at = (
                        datetime.now(
                            timezone.utc
                        )
                    )

                if secondary_error:
                    record.status = "PARTIAL"
                    record.error_message = (
                        "Primary backup succeeded. "
                        "Secondary copy failed: "
                        f"{secondary_error}"
                    )
                elif (
                    backup_settings
                    .verify_after_backup
                ):
                    record.status = "VERIFIED"
                    record.error_message = None
                else:
                    record.status = "SUCCESS"
                    record.error_message = None

                db.commit()
                db.refresh(record)
                return record

            except Exception as exc:
                primary_partial.unlink(
                    missing_ok=True
                )

                if secondary_partial:
                    secondary_partial.unlink(
                        missing_ok=True
                    )

                record.status = "FAILED"
                record.error_message = str(exc)
                record.completed_at = (
                    datetime.now(timezone.utc)
                )

                db.commit()
                db.refresh(record)

                raise RuntimeError(
                    record.error_message
                ) from exc

        finally:
            BackupService.BACKUP_LOCK.release()


    @staticmethod
    def create_manual_backup(
        db: Session,
        created_by: int,
    ) -> BackupLog:
        return (
            BackupService
            .create_standard_backup(
                db=db,
                backup_type="MANUAL",
                created_by=created_by,
            )
        )


    @staticmethod
    def create_automatic_backup(
        db: Session,
        created_by: int | None = None,
    ) -> BackupLog:
        return (
            BackupService
            .create_standard_backup(
                db=db,
                backup_type="AUTOMATIC",
                created_by=created_by,
            )
        )


    @staticmethod
    def cleanup_automatic_retention(
        db: Session,
    ) -> dict:
        backup_settings = (
            BackupService
            .get_or_create_settings(
                db=db
            )
        )

        retention_days = max(
            1,
            int(
                backup_settings
                .retention_days
            ),
        )

        cutoff = (
            datetime.utcnow()
            -
            timedelta(
                days=retention_days
            )
        )

        records = (
            db.query(
                BackupLog
            )
            .filter(
                BackupLog.backup_type
                ==
                "AUTOMATIC",
                BackupLog.status
                !=
                "PURGED",
                BackupLog.started_at
                <
                cutoff,
            )
            .order_by(
                BackupLog.id.asc()
            )
            .all()
        )

        purged = 0
        partial = 0

        for record in records:
            failures = []

            for field_name in (
                "primary_path",
                "secondary_path",
            ):
                raw_path = getattr(
                    record,
                    field_name,
                )

                if not raw_path:
                    continue

                path = Path(
                    raw_path
                )

                try:
                    if path.exists():
                        path.unlink()

                    setattr(
                        record,
                        field_name,
                        None,
                    )

                except OSError as exc:
                    failures.append(
                        f"{path}: {exc}"
                    )

            if failures:
                record.status = (
                    "RETENTION_PARTIAL"
                )
                record.error_message = (
                    "Retention cleanup could not remove "
                    "all AUTOMATIC backup files. "
                    +
                    " | ".join(
                        failures
                    )
                )
                partial += 1

            else:
                record.status = "PURGED"
                record.error_message = (
                    "AUTOMATIC backup files removed by "
                    f"{retention_days}-day retention policy. "
                    "Audit history was preserved."
                )
                purged += 1

        db.commit()

        return {
            "purged":
                purged,
            "partial":
                partial,
            "retention_days":
                retention_days,
        }


    @staticmethod
    def history(
        db: Session,
        limit: int = 100,
    ) -> dict:
        total = (
            db.query(BackupLog)
            .count()
        )

        items = (
            db.query(BackupLog)
            .order_by(BackupLog.id.desc())
            .limit(limit)
            .all()
        )

        return {
            "total": total,
            "items": items,
        }

    @staticmethod
    def verify_backup(
        db: Session,
        backup_id: int,
    ) -> BackupLog:
        record = (
            db.query(BackupLog)
            .filter(
                BackupLog.id
                ==
                backup_id
            )
            .first()
        )

        if record is None:
            raise ValueError(
                "Backup history record was not found."
            )

        if (
            record.status
            ==
            "PURGED"
        ):
            raise ValueError(
                "This AUTOMATIC backup was cleaned by the "
                "retention policy. Its audit history remains, "
                "but the backup files no longer exist."
            )

        if not record.checksum_sha256:
            raise ValueError(
                "This backup does not contain a stored checksum."
            )

        results = []
        verified_count = 0

        for label, raw_path in (
            (
                "Primary",
                record.primary_path,
            ),
            (
                "Secondary",
                record.secondary_path,
            ),
        ):
            if not raw_path:
                continue

            path = Path(raw_path)

            if not path.is_file():
                results.append(
                    f"{label} copy is missing."
                )
                continue

            checksum = (
                BackupService
                .sha256_file(path)
            )

            if (
                checksum
                ==
                record.checksum_sha256
            ):
                verified_count += 1
                results.append(
                    f"{label} copy verified."
                )
            else:
                results.append(
                    f"{label} checksum mismatch."
                )

        expected_copies = (
            1
            +
            (
                1
                if record.secondary_path
                else 0
            )
        )

        record.verified_at = (
            datetime.now(timezone.utc)
        )

        if (
            verified_count
            ==
            expected_copies
        ):
            record.status = "VERIFIED"
            record.error_message = None
        elif verified_count > 0:
            record.status = "PARTIAL"
            record.error_message = " ".join(
                results
            )
        else:
            record.status = "FAILED"
            record.error_message = " ".join(
                results
            )

        db.commit()
        db.refresh(record)
        return record

    # ============================================================
    # MYSQL RESTORE CLIENT
    # ============================================================

    @staticmethod
    def find_mysql_client() -> str | None:
        discovered = shutil.which(
            "mysql"
        )

        if discovered:
            return discovered

        candidates: list[Path] = []

        dump_path = (
            BackupService
            .find_mysqldump()
        )

        if dump_path:
            parent = Path(dump_path).parent
            candidates.extend([
                parent / "mysql.exe",
                parent / "mysql",
            ])

        if os.name == "nt":
            for env_name in (
                "ProgramFiles",
                "ProgramFiles(x86)",
            ):
                root = os.environ.get(
                    env_name
                )

                if not root:
                    continue

                mysql_root = (
                    Path(root)
                    / "MySQL"
                )

                if mysql_root.exists():
                    candidates.extend(
                        mysql_root.glob(
                            "MySQL Server */bin/mysql.exe"
                        )
                    )

        for candidate in candidates:
            if candidate.is_file():
                return str(candidate)

        return None


    # ============================================================
    # LOCATE / VALIDATE RESTORE SOURCE
    # ============================================================

    @staticmethod
    def locate_verified_archive(
        record: BackupLog,
    ) -> Path:
        if not record.checksum_sha256:
            raise ValueError(
                "The selected backup has no stored checksum."
            )

        checked = []

        for label, raw_path in (
            (
                "Primary",
                record.primary_path,
            ),
            (
                "Secondary",
                record.secondary_path,
            ),
        ):
            if not raw_path:
                continue

            path = Path(raw_path)

            if not path.is_file():
                checked.append(
                    f"{label} copy is missing."
                )
                continue

            if (
                BackupService.sha256_file(
                    path
                )
                ==
                record.checksum_sha256
            ):
                return path

            checked.append(
                f"{label} checksum mismatch."
            )

        raise ValueError(
            "No valid backup copy is available. "
            + " ".join(checked)
        )


    @staticmethod
    def validate_restore_archive(
        archive_path: Path,
    ) -> dict:
        if not zipfile.is_zipfile(
            archive_path
        ):
            raise ValueError(
                "The selected backup is not a valid ZIP archive."
            )

        with zipfile.ZipFile(
            archive_path,
            "r",
        ) as archive:
            names = set(
                archive.namelist()
            )

            if (
                "manifest.json"
                not in names
            ):
                raise ValueError(
                    "Backup manifest.json is missing."
                )

            try:
                manifest = json.loads(
                    archive.read(
                        "manifest.json"
                    ).decode(
                        "utf-8"
                    )
                )

            except Exception as exc:
                raise ValueError(
                    "Backup manifest.json is invalid."
                ) from exc

            if (
                manifest.get(
                    "database_name"
                )
                !=
                settings.DB_NAME
            ):
                raise ValueError(
                    "This backup belongs to a different database."
                )

            sql_member = (
                Path(
                    "database"
                )
                /
                f"{settings.DB_NAME}.sql"
            ).as_posix()

            if (
                sql_member
                not in names
            ):
                raise ValueError(
                    "Database SQL dump is missing from the backup."
                )

            bad_member = (
                archive.testzip()
            )

            if bad_member is not None:
                raise ValueError(
                    "Backup ZIP integrity check failed at "
                    f"{bad_member}."
                )

        return {
            "manifest": manifest,
            "sql_member": sql_member,
        }


    # ============================================================
    # PRE-RESTORE SAFETY BACKUP
    # ============================================================

    @staticmethod
    def create_pre_restore_backup(
        db: Session,
        created_by: int,
    ) -> BackupLog:
        record = (
            BackupService
            .create_manual_backup(
                db=db,
                created_by=created_by,
            )
        )

        record = (
            BackupService
            .verify_backup(
                db=db,
                backup_id=record.id,
            )
        )

        if (
            record.status
            !=
            "VERIFIED"
        ):
            raise RuntimeError(
                "Pre-restore safety backup was not fully verified. "
                "Restore has been cancelled."
            )

        old_filename = (
            record.filename
        )

        new_filename = (
            old_filename.replace(
                "_MANUAL.zip",
                "_PRE_RESTORE.zip",
            )
        )

        if (
            new_filename
            ==
            old_filename
        ):
            new_filename = (
                f"PRE_RESTORE_{old_filename}"
            )

        def rename_copy(
            raw_path: str | None,
        ) -> str | None:
            if not raw_path:
                return None

            old_path = Path(
                raw_path
            )

            if not old_path.is_file():
                raise RuntimeError(
                    "A verified pre-restore backup copy "
                    "disappeared before restore."
                )

            new_path = (
                old_path.parent
                /
                new_filename
            )

            os.replace(
                old_path,
                new_path,
            )

            return str(
                new_path
            )

        record.primary_path = (
            rename_copy(
                record.primary_path
            )
        )

        record.secondary_path = (
            rename_copy(
                record.secondary_path
            )
        )

        record.backup_type = (
            "PRE_RESTORE"
        )

        record.filename = (
            new_filename
        )

        db.commit()
        db.refresh(record)

        return record


    # ============================================================
    # MAINTENANCE STATE
    # ============================================================

    @staticmethod
    def set_restore_state(
        db: Session,
        enabled: bool,
    ) -> None:
        state = (
            db.query(
                SystemState
            )
            .first()
        )

        if state is None:
            state = SystemState(
                id=1,
            )
            db.add(state)

        state.maintenance_mode = (
            enabled
        )
        state.restore_in_progress = (
            enabled
        )
        state.maintenance_reason = (
            "Database restore in progress."
            if enabled
            else None
        )

        db.commit()


    # ============================================================
    # DATABASE IMPORT
    # ============================================================

    @staticmethod
    def restore_database_from_archive(
        archive_path: Path,
    ) -> None:
        validated = (
            BackupService
            .validate_restore_archive(
                archive_path
            )
        )

        mysql_client = (
            BackupService
            .find_mysql_client()
        )

        if not mysql_client:
            raise RuntimeError(
                "MySQL restore client was not found. "
                "Install MySQL client tools or add the "
                "MySQL bin folder to PATH."
            )

        with tempfile.TemporaryDirectory(
            prefix="glisen_erp_restore_"
        ) as temp_folder:
            sql_path = (
                Path(temp_folder)
                /
                f"{settings.DB_NAME}.sql"
            )

            with zipfile.ZipFile(
                archive_path,
                "r",
            ) as archive:
                with archive.open(
                    validated[
                        "sql_member"
                    ],
                    "r",
                ) as source:
                    with sql_path.open(
                        "wb"
                    ) as destination:
                        shutil.copyfileobj(
                            source,
                            destination,
                        )

            if (
                not sql_path.is_file()
                or
                sql_path.stat().st_size
                <= 0
            ):
                raise RuntimeError(
                    "The backup database dump is empty."
                )

            command = [
                mysql_client,
                "--protocol=tcp",
                f"--host={settings.DB_HOST}",
                f"--port={settings.DB_PORT}",
                f"--user={settings.DB_USER}",
                "--binary-mode=1",
                "--default-character-set=utf8mb4",
                settings.DB_NAME,
            ]

            environment = (
                os.environ.copy()
            )

            environment[
                "MYSQL_PWD"
            ] = settings.DB_PASSWORD

            creation_flags = 0

            if os.name == "nt":
                creation_flags = getattr(
                    subprocess,
                    "CREATE_NO_WINDOW",
                    0,
                )

            with sql_path.open(
                "rb"
            ) as sql_input:
                result = subprocess.run(
                    command,
                    stdin=sql_input,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    env=environment,
                    check=False,
                    creationflags=(
                        creation_flags
                    ),
                )

            if (
                result.returncode
                !=
                0
            ):
                error_text = (
                    result.stderr
                    .decode(
                        "utf-8",
                        errors="replace",
                    )
                    .strip()
                )

                raise RuntimeError(
                    error_text
                    or
                    "MySQL database restore failed."
                )


    # ============================================================
    # DATABASE RESTORE
    #
    # Uploaded files are intentionally not modified in this first
    # restore checkpoint.
    # ============================================================

    @staticmethod
    def restore_backup(
        db: Session,
        backup_id: int,
        confirmation: str,
        requested_by: int,
    ) -> dict:
        if (
            BackupService
            .RESTORE_IN_PROGRESS
        ):
            raise RuntimeError(
                "Another restore is already in progress."
            )

        target = (
            db.query(
                BackupLog
            )
            .filter(
                BackupLog.id
                ==
                backup_id
            )
            .first()
        )

        if target is None:
            raise ValueError(
                "Selected backup history record was not found."
            )

        if (
            target.backup_type
            ==
            "RESTORE"
        ):
            raise ValueError(
                "Restore audit rows cannot be used as restore sources."
            )

        expected_confirmation = (
            f"RESTORE {target.filename}"
        )

        if (
            confirmation.strip()
            !=
            expected_confirmation
        ):
            raise ValueError(
                "Restore confirmation text does not match."
            )

        target_archive = (
            BackupService
            .locate_verified_archive(
                target
            )
        )

        BackupService.validate_restore_archive(
            target_archive
        )

        if (
            BackupService
            .find_mysql_client()
            is None
        ):
            raise RuntimeError(
                "MySQL restore client was not found."
            )

        pre_restore = (
            BackupService
            .create_pre_restore_backup(
                db=db,
                created_by=requested_by,
            )
        )

        pre_restore_archive = (
            BackupService
            .locate_verified_archive(
                pre_restore
            )
        )

        pre = {
            "filename":
                pre_restore.filename,
            "primary_path":
                pre_restore.primary_path,
            "secondary_path":
                pre_restore.secondary_path,
            "file_size_bytes":
                pre_restore.file_size_bytes,
            "checksum_sha256":
                pre_restore.checksum_sha256,
            "app_version":
                pre_restore.app_version,
            "schema_revision":
                pre_restore.schema_revision,
            "manifest_version":
                pre_restore.manifest_version,
            "started_at":
                pre_restore.started_at,
            "completed_at":
                pre_restore.completed_at,
            "verified_at":
                pre_restore.verified_at,
        }

        target_data = {
            "filename":
                target.filename,
            "primary_path":
                target.primary_path,
            "secondary_path":
                target.secondary_path,
            "file_size_bytes":
                target.file_size_bytes,
            "checksum_sha256":
                target.checksum_sha256,
            "app_version":
                target.app_version,
            "schema_revision":
                target.schema_revision,
            "manifest_version":
                target.manifest_version,
        }

        BackupService.set_restore_state(
            db=db,
            enabled=True,
        )

        BackupService.RESTORE_IN_PROGRESS = (
            True
        )

        db.close()
        engine.dispose()

        restore_error = None

        try:
            BackupService.restore_database_from_archive(
                target_archive
            )

        except Exception as exc:
            restore_error = exc

            try:
                engine.dispose()

                BackupService.restore_database_from_archive(
                    pre_restore_archive
                )

            except Exception as rollback_exc:
                raise RuntimeError(
                    "CRITICAL: Restore failed and automatic rollback "
                    "also failed. The verified safety backup is: "
                    f"{pre_restore_archive}. Restore error: {exc}. "
                    f"Rollback error: {rollback_exc}."
                ) from rollback_exc

        finally:
            engine.dispose()

        new_db = SessionLocal()

        try:
            BackupService.set_restore_state(
                db=new_db,
                enabled=False,
            )

            # The SQL dump captures its own backup-log row while
            # that row is still STARTED. Normalize it after either
            # a successful target restore or an automatic rollback.
            pre_manual_filename = (
                pre[
                    "filename"
                ]
                .replace(
                    "_PRE_RESTORE.zip",
                    "_MANUAL.zip",
                )
            )

            existing_pre = (
                new_db.query(
                    BackupLog
                )
                .filter(
                    BackupLog.filename
                    .in_([
                        pre[
                            "filename"
                        ],
                        pre_manual_filename,
                    ])
                )
                .order_by(
                    BackupLog.id.desc()
                )
                .first()
            )

            if existing_pre is None:
                existing_pre = BackupLog(
                    backup_type="PRE_RESTORE",
                    filename=(
                        pre["filename"]
                    ),
                    created_by=None,
                    started_at=(
                        pre["started_at"]
                    ),
                )

                new_db.add(
                    existing_pre
                )

            existing_pre.backup_type = (
                "PRE_RESTORE"
            )
            existing_pre.filename = (
                pre["filename"]
            )
            existing_pre.primary_path = (
                pre["primary_path"]
            )
            existing_pre.secondary_path = (
                pre["secondary_path"]
            )
            existing_pre.file_size_bytes = (
                pre[
                    "file_size_bytes"
                ]
            )
            existing_pre.checksum_sha256 = (
                pre[
                    "checksum_sha256"
                ]
            )
            existing_pre.status = (
                "VERIFIED"
            )
            existing_pre.created_by = None
            existing_pre.app_version = (
                pre["app_version"]
            )
            existing_pre.schema_revision = (
                pre[
                    "schema_revision"
                ]
            )
            existing_pre.manifest_version = (
                pre[
                    "manifest_version"
                ]
            )
            existing_pre.completed_at = (
                pre["completed_at"]
            )
            existing_pre.verified_at = (
                pre["verified_at"]
            )
            existing_pre.error_message = None

            new_db.commit()

            if restore_error is not None:
                raise RuntimeError(
                    "Restore failed. The PRE_RESTORE safety backup "
                    "was automatically restored, so the database "
                    "was returned to its pre-restore state. "
                    f"Original error: {restore_error}"
                )

            restored_target = (
                new_db.query(
                    BackupLog
                )
                .filter(
                    BackupLog.filename
                    ==
                    target_data[
                        "filename"
                    ]
                )
                .order_by(
                    BackupLog.id.desc()
                )
                .first()
            )

            if restored_target is not None:
                restored_target.status = (
                    "VERIFIED"
                )
                restored_target.primary_path = (
                    target_data[
                        "primary_path"
                    ]
                )
                restored_target.secondary_path = (
                    target_data[
                        "secondary_path"
                    ]
                )
                restored_target.file_size_bytes = (
                    target_data[
                        "file_size_bytes"
                    ]
                )
                restored_target.checksum_sha256 = (
                    target_data[
                        "checksum_sha256"
                    ]
                )
                restored_target.verified_at = (
                    datetime.now(
                        timezone.utc
                    )
                )
                restored_target.error_message = None

            new_db.add(
                BackupLog(
                    backup_type="RESTORE",
                    filename=(
                        target_data[
                            "filename"
                        ]
                    ),
                    primary_path=(
                        target_data[
                            "primary_path"
                        ]
                    ),
                    secondary_path=(
                        target_data[
                            "secondary_path"
                        ]
                    ),
                    file_size_bytes=(
                        target_data[
                            "file_size_bytes"
                        ]
                    ),
                    checksum_sha256=(
                        target_data[
                            "checksum_sha256"
                        ]
                    ),
                    status="SUCCESS",
                    created_by=None,
                    app_version=(
                        target_data[
                            "app_version"
                        ]
                    ),
                    schema_revision=(
                        target_data[
                            "schema_revision"
                        ]
                    ),
                    manifest_version=(
                        target_data[
                            "manifest_version"
                        ]
                    ),
                    completed_at=(
                        datetime.now(
                            timezone.utc
                        )
                    ),
                    verified_at=(
                        datetime.now(
                            timezone.utc
                        )
                    ),
                    error_message=(
                        "Database restored successfully. "
                        "PRE_RESTORE safety backup: "
                        f"{pre['filename']}"
                    ),
                )
            )

            new_db.commit()

            return {
                "status":
                    "SUCCESS",
                "message":
                    (
                        "Database restore completed successfully. "
                        "A verified PRE_RESTORE safety backup was "
                        "created first. Uploaded files were not "
                        "changed in this checkpoint."
                    ),
                "restored_filename":
                    target_data[
                        "filename"
                    ],
                "pre_restore_filename":
                    pre[
                        "filename"
                    ],
            }

        finally:
            new_db.close()
            BackupService.RESTORE_IN_PROGRESS = (
                False
            )
