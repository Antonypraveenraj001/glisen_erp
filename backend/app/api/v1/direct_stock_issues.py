from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import (
    require_role,
)
from app.dependencies.database import (
    get_db,
)
from app.models.user import User
from app.schemas.direct_stock_issue import (
    DirectStockIssueCreate,
)
from app.schemas.shop_floor_issue import (
    ShopFloorIssueResponse,
)
from app.services.direct_stock_issue import (
    DirectStockIssueService,
)


router = APIRouter(
    prefix="/stock-issues",
    tags=[
        "Stock Material Issue"
    ],
)


STOCK_ISSUE_ROLES = (
    "Boss",
    "Admin",
    "Production",
    "Store",
)


# ============================================================
# ISSUE STOCK DIRECTLY TO PRODUCTION ORDER
# ============================================================

@router.post(
    "/production-orders/{production_order_id}",
    response_model=ShopFloorIssueResponse,
    status_code=status.HTTP_201_CREATED,
)
def issue_stock_to_production_order(
    production_order_id: int,
    issue_data: DirectStockIssueCreate,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_role(
            *STOCK_ISSUE_ROLES
        )
    ),
):
    """
    Issue an existing Store product directly
    to an In Progress Production Order.

    No Production Material requirement needs
    to exist beforehand.
    """

    service = (
        DirectStockIssueService(
            db
        )
    )

    try:

        return service.issue_material(
            production_order_id=(
                production_order_id
            ),
            data=(
                issue_data
            ),
            issued_by=(
                current_user.id
            ),
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        )