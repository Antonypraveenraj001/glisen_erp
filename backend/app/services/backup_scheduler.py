import asyncio
import threading
import traceback

from datetime import (
    datetime,
    timedelta,
)

from sqlalchemy.orm import Session

from app.database.session import (
    SessionLocal,
)
from app.models.backup import (
    BackupLog,
)
from app.models.system_state import (
    SystemState,
)
from app.services.backup_service import (
    BackupService,
)


POLL_SECONDS = 60
FAILED_RETRY_SECONDS = 300


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

        return (
            latest.started_at.date()
            ==
            today
        )

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


        now = datetime.now()


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
                f"Server time={now.strftime('%H:%M:%S')}, "
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


            _last_failed_attempt_at = None


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

                _log(
                    (
                        "Retention cleanup failed: "
                        f"{exc}"
                    )
                )


        except Exception as exc:

            _last_failed_attempt_at = (
                datetime.now()
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
