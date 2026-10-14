"""Non-blocking persistent Boss alerts for scheduled backup problems.

This component never exposes raw exception details, backup paths, passwords,
or SQL to the Boss. Full technical diagnostics remain in protected server logs.
Alerts use a stable per-business-day key, preventing duplicate rows on retry.
"""

from datetime import date

from app.database.session import SessionLocal
from app.services.system_alert_service import SystemAlertService


class BackupAlertReporter:
    @staticmethod
    def _write(*, category: str, business_date: date, title: str,
               message: str, severity: str = "ERROR") -> None:
        db = None
        try:
            db = SessionLocal()
            SystemAlertService.record_failure(
                db,
                dedupe_key=f"{category}:{business_date.isoformat()}",
                category=category,
                title=title,
                message=message,
                severity=severity,
            )
        except Exception:
            # Never turn a successful database backup into a failed job just
            # because alert persistence is temporarily unavailable.
            print("[Backup Scheduler] WARNING: Unable to save Boss alert.",
                  flush=True)
        finally:
            if db is not None:
                db.close()

    @staticmethod
    def _resolve(*, category: str, business_date: date) -> None:
        db = None
        try:
            db = SessionLocal()
            SystemAlertService.resolve(
                db, dedupe_key=f"{category}:{business_date.isoformat()}"
            )
        except Exception:
            print("[Backup Scheduler] WARNING: Unable to resolve Boss alert.",
                  flush=True)
        finally:
            if db is not None:
                db.close()

    @staticmethod
    def scheduled_failure(*, business_date: date, reason: str) -> None:
        if reason == "CONFIGURATION":
            message = (
                "Automatic backup is enabled, but the primary backup "
                "destination is not configured. Review Backup & Recovery settings."
            )
        elif reason == "PARTIAL":
            message = (
                "A scheduled backup completed only partially. Review its "
                "status and storage copies in Backup & Recovery."
            )
        else:
            message = (
                "The scheduled backup could not be completed. Review "
                "Backup History and contact the server administrator."
            )
        BackupAlertReporter._write(
            category="BACKUP_SCHEDULE_FAILED",
            business_date=business_date,
            title="Automatic backup requires attention",
            message=message,
            severity="CRITICAL" if reason != "PARTIAL" else "ERROR",
        )

    @staticmethod
    def scheduled_recovered(*, business_date: date) -> None:
        BackupAlertReporter._resolve(
            category="BACKUP_SCHEDULE_FAILED", business_date=business_date
        )

    @staticmethod
    def retention_failure(*, business_date: date) -> None:
        BackupAlertReporter._write(
            category="BACKUP_RETENTION_FAILED",
            business_date=business_date,
            title="Backup retention cleanup needs attention",
            message=(
                "Automatic retention cleanup failed or was only partially "
                "completed. Review Backup History and server storage."
            ),
            severity="WARNING",
        )

    @staticmethod
    def retention_recovered(*, business_date: date) -> None:
        BackupAlertReporter._resolve(
            category="BACKUP_RETENTION_FAILED", business_date=business_date
        )
