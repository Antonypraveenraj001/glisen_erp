from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.permissions import require_permission
from app.models.user import User
from app.schemas.financial_year import (
    FinancialYearOverviewResponse,
    FinancialYearTransitionRequest,
    FinancialYearTransitionResponse,
)
from app.services.financial_year_service import (
    FinancialYearService,
)


router = APIRouter(
    prefix="/financial-years",
    tags=[
        "Financial Year",
    ],
)


@router.get(
    "/overview",
    response_model=(
        FinancialYearOverviewResponse
    ),
)
def get_financial_year_overview(
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "financial_year.view"
        )
    ),
):
    return (
        FinancialYearService
        .overview(
            db=db,
            current_user_id=(
                current_user.id
            ),
        )
    )


@router.post(
    "/transition",
    response_model=(
        FinancialYearTransitionResponse
    ),
)
def transition_financial_year(
    data: FinancialYearTransitionRequest,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "financial_year.manage"
        )
    ),
):
    try:
        return (
            FinancialYearService
            .transition(
                db=db,
                current_user_id=(
                    current_user.id
                ),
                confirmation=(
                    data.confirmation
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
            detail=str(
                exc
            ),
        ) from exc
