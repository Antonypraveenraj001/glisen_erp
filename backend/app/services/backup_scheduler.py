import asyncio
import threading
import traceback

from datetime import (
    datetime,
    timedelta,
    timezone,
)
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy.orm import Session

from app.database.session import (
    SessionLocal,
)
from app.models.backup import (
    BackupLog,
)
from app.models.business_settings import BusinessSettings
from app.models.system_state import (
    SystemState,
)
from app.services.backup_service import (
    BackupService,
)
from app.services.backup_sync import (
    BackupFallbackSync,
)
from app.services.backup_alert_reporter import BackupAlertReporter


POLL_SECONDS = 60
FAILED_RETRY_SECONDS = 300

# MySQL stores backup DATETIME values in UTC, without an offset on retrieval.
# Scheduled clock times are interpreted in the company-configured timezone.
DEFAULT_BACKUP_ZONE = ZoneInfo("Asia/Kolkata")


def _business_backup_zone(db: Session) -> ZoneInfo:
    row = db.query(BusinessSettings.timezone).first()
    name = str(row[0]).strip() if row and row[0] else "Asia/Kolkata"
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError, TypeError):
        _log("Invalid business timezone; using Asia/Kolkata for scheduled backups.")
        return DEFAULT_BACKUP_ZONE


def _backup_started_on_local_date(started_at: datetime, zone: ZoneInfo):
    # MySQL DATETIME gives naive UTC values; aware values preserve their offset.
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    return started_at.astimezone(zone).date()


_scheduler_thread: (
    threading.Thread | None
) = None

_stop_event = threading.Event()

_last_failed_attempt_at: (
    datetime | None
) = None


# ================================================================
# TERMINAL LOG
# ================================================================

def _log(
    message: str,
) -> None:

    print(
        (
            "[Backup Scheduler] "
            +
            message
        ),
        flush=True,
    )


# ================================================================
# COMPLETED SCHEDULED BACKUP FOR TODAY
#
# UI "Run Automatic Test Now" has created_by=<Boss id>.
# Real scheduled backups use created_by=None.
#
# Only a usable scheduled result counts as today's backup.
# ================================================================

def _already_completed_today(
    db: Session,
    today,
    zone: ZoneInfo = DEFAULT_BACKUP_ZONE,
) -> bool:

    latest = (
        db.query(
            BackupLog
        )
        .filter(
            BackupLog.backup_type
            ==
            "AUTOMATIC",

            BackupLog.created_by
            .is_(
                None
            ),

            BackupLog.status.in_([
                "VERIFIED",
                "SUCCESS",
                "PARTIAL",
            ]),
        )
        .order_by(
            BackupLog.id.desc()
        )
        .first()
    )


    if (
        latest is None
        or
        latest.started_at
        is None
    ):

        return False


    try:

        return _backup_started_on_local_date(latest.started_at, zone) == today

    except AttributeError:

        return False


# ================================================================
# ONE SCHEDULER CHECK
# ================================================================

def run_due_automatic_backup_once() -> None:

    global _last_failed_attempt_at


    db = SessionLocal()


    try:

        backup_settings = (
            BackupService
            .get_or_create_settings(
                db=db
            )
        )


        if (
            not backup_settings
            .automatic_backup_enabled
        ):

            return


        if (
            not backup_settings
            .primary_backup_path
        ):

            BackupAlertReporter.scheduled_failure(
                business_date=datetime.now(_business_backup_zone(db)).date(),
                reason="CONFIGURATION",
            )
            return


        if (
            BackupService
            .RESTORE_IN_PROGRESS
        ):

            return


        state = (
            db.query(
                SystemState
            )
            .first()
        )


        if (
            state is not None
            and (
                state.restore_in_progress
                or
                state.year_transition_in_progress
            )
        ):

            return


        backup_zone = _business_backup_zone(db)
        now = datetime.now(backup_zone)


        scheduled_time = (
            backup_settings
            .backup_time
        )


        if (
            scheduled_time
            is None
        ):

            return


        if (
            now.time()
            <
            scheduled_time
        ):

            return


        if (
            _already_completed_today(
                db=db,
                today=now.date(),
                zone=backup_zone,
            )
        ):

            return


        if (
            _last_failed_attempt_at
            is not None
            and
            now
            <
            (
                _last_failed_attempt_at
                +
                timedelta(
                    seconds=(
                        FAILED_RETRY_SECONDS
                    )
                )
            )
        ):

            return


        _log(
            (
                "Backup is due. "
                f"Business time={now.strftime('%H:%M:%S')} ({backup_zone.key}), "
                f"scheduled={scheduled_time.strftime('%H:%M:%S')}."
            )
        )


        try:

            record = (
                BackupService
                .create_automatic_backup(
                    db=db,
                    created_by=None,
                )
            )


            # A PARTIAL result is usable for recovery but still requires
            # the Boss's attention; do not mark it as a clean backup.
            if record.status in ("VERIFIED", "SUCCESS"):
                _last_failed_attempt_at = None
                BackupAlertReporter.scheduled_recovered(
                    business_date=now.date(),
                )
            elif record.status == "PARTIAL":
                _last_failed_attempt_at = None
                BackupAlertReporter.scheduled_failure(
                    business_date=now.date(),
                    reason="PARTIAL",
                )
            else:
                _last_failed_attempt_at = datetime.now(backup_zone)
                BackupAlertReporter.scheduled_failure(
                    business_date=now.date(),
                    reason="FAILED",
                )


            _log(
                (
                    "Automatic backup completed: "
                    f"{record.filename} "
                    f"status={record.status}."
                )
            )


            try:

                result = (
                    BackupService
                    .cleanup_automatic_retention(
                        db=db
                    )
                )


                if result.get("partial", 0):
                    BackupAlertReporter.retention_failure(
                        business_date=now.date(),
                    )
                else:
                    BackupAlertReporter.retention_recovered(
                        business_date=now.date(),
                    )

                if (
                    result["purged"]
                    or
                    result["partial"]
                ):

                    _log(
                        (
                            "Retention cleanup: "
                            f"{result['purged']} purged, "
                            f"{result['partial']} partial."
                        )
                    )


            except Exception as exc:

                BackupAlertReporter.retention_failure(
                    business_date=now.date(),
                )
                _log(
                    (
                        "Retention cleanup failed: "
                        f"{exc}"
                    )
                )


        except Exception as exc:

            _last_failed_attempt_at = (
                datetime.now(backup_zone)
            )
            BackupAlertReporter.scheduled_failure(
                business_date=now.date(),
                reason="FAILED",
            )


            _log(
                (
                    "Automatic backup FAILED: "
                    f"{exc}. "
                    f"Retrying after {FAILED_RETRY_SECONDS} seconds."
                )
            )


            traceback.print_exc()


    finally:

        db.close()


# ================================================================
# RECONCILE SSD FALLBACK AFTER HDD RETURNS (OPT-IN)
#
# This runs independently of whether today's scheduled backup is due.
# All non-opted-in installations remain unchanged. Never sync during
# restore or financial-year transition. The synchronization service
# acquires BackupService.BACKUP_LOCK and verifies each copied archive.
# ================================================================

def _sync_fallback_backups_once() -> None:
    from app.core.config import settings

    configured = (
        settings.BACKUP_HDD_MOUNT_POINT.strip(),
        settings.BACKUP_HDD_UUID.strip(),
        settings.BACKUP_SSD_FALLBACK_FOLDER.strip(),
    )
    if not any(configured):
        return
    if not all(configured):
        _log("HDD/SSD backup configuration is incomplete; sync skipped.")
        return
    if BackupService.RESTORE_IN_PROGRESS:
        return

    db = SessionLocal()
    try:
        state = db.query(SystemState).first()
        if state is not None and (
            state.restore_in_progress
            or state.year_transition_in_progress
        ):
            return

        result = BackupFallbackSync.sync_pending(db=db, max_records=10)
        if result["synced"] or result["failed"] or result["errors"]:
            _log(
                "SSD fallback reconciliation: "
                f"{result['synced']} synced, "
                f"{result['failed']} failed, "
                f"{result['skipped']} skipped."
            )
            for detail in result["errors"][:5]:
                _log(f"SSD fallback reconciliation detail: {detail}")
    finally:
        db.close()


# ================================================================
# ONE WEEKLY ISOLATED RESTORE VERIFICATION — OPT-IN ONLY
#
# Default is disabled. The worker itself checks both restore/financial-
# year interlocks and acquires the common backup lock. It never calls
# the production restore path; history is written separately.
# ================================================================

def _run_weekly_restore_verification_once() -> None:
    from app.core.config import settings

    if not settings.BACKUP_WEEKLY_RESTORE_ENABLED:
        return
    if BackupService.RESTORE_IN_PROGRESS:
        return

    # Import only when enabled: non-opted-in installations keep their
    # existing scheduling behavior, including before the DB migration.
    from app.services.backup_restore_schedule import WeeklyRestorePolicy
    from app.services.backup_restore_worker import (
        run_weekly_restore_verification_once,
    )

    db = SessionLocal()
    try:
        outcome = run_weekly_restore_verification_once(
            db,
            now_utc=datetime.now(timezone.utc),
            policy=WeeklyRestorePolicy(enabled=True),
            test_user=settings.BACKUP_WEEKLY_RESTORE_TEST_USER,
            test_password=settings.BACKUP_WEEKLY_RESTORE_TEST_PASSWORD,
        )
        # Intentionally do not print account names, passwords, SQL or errors.
        if outcome in ("PASSED", "FAILED"):
            _log(f"Weekly isolated backup restore verification: {outcome}.")
    finally:
        db.close()


# ================================================================
# THREAD LOOP
# ================================================================

def _scheduler_loop() -> None:

    # Give FastAPI / reload startup a moment to settle.
    if _stop_event.wait(
        3
    ):

        return


    _log(
        (
            "Scheduler thread is running. "
            f"Server local time="
            f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}. "
            f"Polling every {POLL_SECONDS} seconds."
        )
    )


    # Check immediately after startup delay.
    while (
        not _stop_event.is_set()
    ):

        try:

            run_due_automatic_backup_once()
            _sync_fallback_backups_once()
            _run_weekly_restore_verification_once()


        except Exception as exc:

            _log(
                (
                    "Scheduler loop error: "
                    f"{exc}"
                )
            )

            traceback.print_exc()


        _stop_event.wait(
            POLL_SECONDS
        )


# ================================================================
# START / STOP
# ================================================================

def start_backup_scheduler() -> None:

    global _scheduler_thread


    if (
        _scheduler_thread
        is not None
        and
        _scheduler_thread.is_alive()
    ):

        return


    _stop_event.clear()


    _scheduler_thread = (
        threading.Thread(
            target=(
                _scheduler_loop
            ),
            name=(
                "glisen-backup-scheduler"
            ),
            daemon=True,
        )
    )


    _scheduler_thread.start()


    _log(
        "Scheduler thread started."
    )


async def stop_backup_scheduler() -> None:

    global _scheduler_thread


    _stop_event.set()


    thread = (
        _scheduler_thread
    )


    if (
        thread is not None
        and
        thread.is_alive()
    ):

        await asyncio.to_thread(
            thread.join,
            5,
        )


    _scheduler_thread = None


    _log(
        "Scheduler thread stopped."
    )
