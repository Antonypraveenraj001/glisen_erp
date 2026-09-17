from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import (
    get_current_user,
)
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.dashboard import (
    DashboardSummary,
)
from app.services.dashboard_service import (
    DashboardService,
)


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get(
    "/summary",
    response_model=DashboardSummary,
)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):

    role_name = (
        current_user.role.name
    )

    # ============================================================
    # FINANCIAL VISIBILITY
    #
    # ONLY Boss can see:
    #
    # - Financial Analyzer information
    # - FY Profit / Loss
    # - Sales revenue
    # - Production cost totals
    # - Company expense totals
    # - Quarter financial comparison
    # - FY monthly sales
    # ============================================================

    can_view_financials = (
        role_name == "Boss"
    )

    # ============================================================
    # PURCHASE BILL PAYMENT WATCH
    #
    # This is operational payment monitoring,
    # not the Financial Analyzer.
    #
    # Boss     -> full access
    # Accounts -> can monitor supplier payments
    # Purchase -> can monitor supplier bills
    #
    # Recording payments is still separately restricted.
    # ============================================================

    can_view_purchase_payments = (
        role_name
        in {
            "Boss",
            "Accounts",
            "Purchase",
        }
    )

    return (
        DashboardService
        .get_dashboard_summary(
            db=db,
            can_view_financials=(
                can_view_financials
            ),
            can_view_purchase_payments=(
                can_view_purchase_payments
            ),
        )
    )