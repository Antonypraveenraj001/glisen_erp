from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    Query,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import (
    get_current_user,
)
from app.dependencies.database import (
    get_db,
)
from app.models.user import User
from app.schemas.stock_movement import (
    StockMovementResponse,
)
from app.schemas.stock_report import (
    StockSummaryResponse,
)
from app.services.stock_movement_service import (
    StockMovementService,
)
from app.services.stock_report_service import (
    StockReportService,
)


router = APIRouter(
    prefix="/stock-report",
    tags=["Stock Report"],
)


# ============================================================
# STOCK SUMMARY
# ============================================================

@router.get(
    "/summary",
    response_model=StockSummaryResponse,
)
def get_stock_summary(
    search: str | None = Query(
        default=None,
        description=(
            "Search by product code, "
            "product name, category or HSN code"
        ),
    ),
    stock_status: str | None = Query(
        default=None,
        description=(
            "Filter by In Stock, Low Stock, "
            "Out of Stock or Over Stock"
        ),
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    return (
        StockReportService
        .get_stock_summary(
            db=db,
            search=search,
            stock_status=stock_status,
        )
    )


# ============================================================
# STOCK MOVEMENT HISTORY
# ============================================================

@router.get(
    "/movements",
    response_model=StockMovementResponse,
)
def get_stock_movements(
    product_id: int | None = Query(
        default=None,
        ge=1,
        description=(
            "Filter movements by Product ID"
        ),
    ),
    movement_type: str | None = Query(
        default=None,
        description=(
            "Filter by Purchase, "
            "Shop Floor Issue, or "
            "Finished Goods Receipt"
        ),
    ),
    start_date: datetime | None = Query(
        default=None,
        description=(
            "Include movements from this date/time"
        ),
    ),
    end_date: datetime | None = Query(
        default=None,
        description=(
            "Include movements up to this date/time"
        ),
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    return (
        StockMovementService
        .get_movements(
            db=db,
            product_id=product_id,
            movement_type=movement_type,
            start_date=start_date,
            end_date=end_date,
        )
    )