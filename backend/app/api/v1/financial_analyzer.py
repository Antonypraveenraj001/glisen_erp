from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import require_role
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.financial_analyzer import FinancialAnalyzerResponse
from app.services.financial_analyzer_service import (
    FinancialAnalyzerService,
)


router = APIRouter(
    prefix="/financial-analyzer",
    tags=["Financial Analyzer"],
)


@router.get(
    "",
    response_model=FinancialAnalyzerResponse,
)
def get_financial_analysis(
    start_date: date | None = Query(
        None,
        description="Analysis start date",
    ),
    end_date: date | None = Query(
        None,
        description="Analysis end date",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Admin",
            "Accounts",
        )
    ),
):
    try:
        return FinancialAnalyzerService.get_analysis(
            db=db,
            start_date=start_date,
            end_date=end_date,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc