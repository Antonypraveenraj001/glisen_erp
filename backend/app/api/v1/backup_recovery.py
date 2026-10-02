from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.dependencies.database import (
    get_db,
)
from app.dependencies.permissions import (
    require_permission,
)
from app.models.user import User
from app.schemas.backup import (
    BackupHistoryResponse,
    BackupLogResponse,
    BackupSettingsResponse,
    BackupSettingsUpdate,
    BackupSystemStatus,
    RestoreBackupRequest,
    RestoreBackupResponse,
    RetentionCleanupResponse,
)
from app.services.backup_service import (
    BackupService,
)


router = APIRouter(
    prefix="/backup-recovery",
    tags=[
        "Backup & Recovery",
    ],
)


@router.get(
    "/settings",
    response_model=BackupSettingsResponse,
)
def get_backup_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "backup.view"
        )
    ),
):
    return (
        BackupService
        .get_or_create_settings(db=db)
    )


@router.put(
    "/settings",
    response_model=BackupSettingsResponse,
)
def update_backup_settings(
    data: BackupSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "backup.manage"
        )
    ),
):
    try:
        return (
            BackupService
            .update_settings(
                db=db,
                data=data,
            )
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        ) from exc


@router.get(
    "/status",
    response_model=BackupSystemStatus,
)
def get_backup_system_status(
    current_user: User = Depends(
        require_permission(
            "backup.view"
        )
    ),
):
    return BackupService.system_status()


@router.get(
    "/history",
    response_model=BackupHistoryResponse,
)
def get_backup_history(
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "backup.view"
        )
    ),
):
    return (
        BackupService
        .history(
            db=db,
            limit=limit,
        )
    )


@router.post(
    "/create",
    response_model=BackupLogResponse,
)
def create_manual_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "backup.manage"
        )
    ),
):
    try:
        return (
            BackupService
            .create_manual_backup(
                db=db,
                created_by=current_user.id,
            )
        )
    except (
        ValueError,
        RuntimeError,
    ) as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        ) from exc


@router.post(
    "/automatic/run-now",
    response_model=BackupLogResponse,
)
def run_automatic_backup_now(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "backup.manage"
        )
    ),
):
    try:
        record = (
            BackupService
            .create_automatic_backup(
                db=db,
                created_by=(
                    current_user.id
                ),
            )
        )

        BackupService.cleanup_automatic_retention(
            db=db
        )

        return record

    except (
        ValueError,
        RuntimeError,
    ) as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        ) from exc


@router.post(
    "/retention/cleanup",
    response_model=(
        RetentionCleanupResponse
    ),
)
def run_retention_cleanup(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "backup.manage"
        )
    ),
):
    return (
        BackupService
        .cleanup_automatic_retention(
            db=db
        )
    )


@router.post(
    "/history/{backup_id}/verify",
    response_model=BackupLogResponse,
)
def verify_backup(
    backup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_permission(
            "backup.manage"
        )
    ),
):
    try:
        return (
            BackupService
            .verify_backup(
                db=db,
                backup_id=backup_id,
            )
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        ) from exc


@router.post(
    "/history/{backup_id}/restore",
    response_model=(
        RestoreBackupResponse
    ),
)
def restore_backup(
    backup_id: int,
    data: RestoreBackupRequest,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "backup.manage"
        )
    ),
):
    try:
        return (
            BackupService
            .restore_backup(
                db=db,
                backup_id=backup_id,
                confirmation=(
                    data.confirmation
                ),
                requested_by=(
                    current_user.id
                ),
            )
        )

    except (
        ValueError,
        RuntimeError,
    ) as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        ) from exc
