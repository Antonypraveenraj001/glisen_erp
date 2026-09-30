from fastapi import (
    APIRouter,
    Depends,
)

from sqlalchemy.orm import Session

from app.dependencies.database import (
    get_db,
)

from app.dependencies.permissions import (
    require_permission,
)

from app.models.user import User

from app.schemas.dashboard import (
    DashboardSummary,
)

from app.services.dashboard_service import (
    DashboardService,
)


router = APIRouter(
    prefix="/dashboard",
    tags=[
        "Dashboard",
    ],
)


# ================================================================
# DASHBOARD SUMMARY
#
# Dashboard module access:
#
#     dashboard.view
#
# If the role does not have the Dashboard module selected in
# Settings -> Users & Access, this API returns 403.
#
# Boss continues to receive full access through the shared
# permission dependency.
# ================================================================

@router.get(
    "/summary",
    response_model=DashboardSummary,
)
def get_dashboard_summary(
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_permission(
            "dashboard.view"
        )
    ),
):

    role_name = (
        current_user
        .role
        .name
    )

    # ============================================================
    # FINANCIAL VISIBILITY
    #
    # Dashboard access and financial visibility are separate.
    #
    # A role may be allowed to open Dashboard without being allowed
    # to see Boss-only company financial values.
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
        role_name
        ==
        "Boss"
    )

    # ============================================================
    # PURCHASE BILL PAYMENT WATCH
    #
    # Operational supplier-payment monitoring remains unchanged.
    #
    # Boss
    # Accounts
    # Purchase
    #
    # may see this information.
    #
    # Recording supplier payments is controlled separately by the
    # Purchase Bills module/API permissions.
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