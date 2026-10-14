"""Read and acknowledge system alerts. Only active Boss accounts may access.

No endpoint creates, edits or deletes incidents; they come from trusted jobs.
Service-level authorization also checks the role in the database, so granting
regular module permissions cannot expose sensitive infrastructure messages.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.system_alert import (
    SystemAlertCountResponse,
    SystemAlertResponse,
)
from app.services.system_alert_service import SystemAlertService


router = APIRouter(prefix="/system-alerts", tags=["System Alerts"])


def _forbidden(exc: PermissionError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Active Boss access required.",
    )


@router.get("", response_model=list[SystemAlertResponse])
def list_system_alerts(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return SystemAlertService.recent_for_boss(
            db, boss_user_id=current_user.id, limit=limit,
        )
    except PermissionError as exc:
        raise _forbidden(exc) from exc


@router.get("/unacknowledged-count", response_model=SystemAlertCountResponse)
def unacknowledged_system_alert_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        count = SystemAlertService.unacknowledged_count(
            db, boss_user_id=current_user.id,
        )
        return SystemAlertCountResponse(unacknowledged_count=count)
    except PermissionError as exc:
        raise _forbidden(exc) from exc


@router.post("/{alert_id}/acknowledge", response_model=SystemAlertResponse)
def acknowledge_system_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return SystemAlertService.acknowledge(
            db, alert_id=alert_id, boss_user_id=current_user.id,
        )
    except PermissionError as exc:
        raise _forbidden(exc) from exc
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="System alert not found.",
        ) from exc
