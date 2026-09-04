from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.dependencies.auth import (
    get_current_user,
    require_role,
)
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.shop_floor_issue import (
    ShopFloorIssueCreate,
    ShopFloorIssueResponse,
    ShopFloorIssueSummaryResponse,
)
from app.services.shop_floor_issue import (
    ShopFloorIssueService,
)


router = APIRouter(
    prefix="/shop-floor-issues",
    tags=["Shop Floor Issue"],
)


SHOP_FLOOR_ISSUE_ROLES = (
    "Boss",
    "Admin",
    "Production",
    "Store",
)


# ============================================================
# CREATE ISSUE
# ============================================================


@router.post(
    "/orders/{production_order_id}",
    response_model=ShopFloorIssueResponse,
    status_code=status.HTTP_201_CREATED,
)
def issue_material_to_shop_floor(
    production_order_id: int,
    issue_data: ShopFloorIssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            *SHOP_FLOOR_ISSUE_ROLES
        )
    ),
):
    service = ShopFloorIssueService(
        db
    )

    try:
        return service.issue_material(
            production_order_id=(
                production_order_id
            ),
            data=issue_data,
            issued_by=current_user.id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(exc),
        )


# ============================================================
# LIST ALL
# ============================================================


@router.get(
    "",
    response_model=list[
        ShopFloorIssueResponse
    ],
)
def get_shop_floor_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = ShopFloorIssueService(
        db
    )

    return service.get_all_issues()


# ============================================================
# STATIC LOOKUPS
# ============================================================


@router.get(
    "/number/{issue_number}",
    response_model=ShopFloorIssueResponse,
)
def get_shop_floor_issue_by_number(
    issue_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = ShopFloorIssueService(
        db
    )

    issue = (
        service.get_issue_by_number(
            issue_number
        )
    )

    if issue is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Shop Floor Issue not found"
            ),
        )

    return issue


@router.get(
    "/orders/{production_order_id}",
    response_model=list[
        ShopFloorIssueResponse
    ],
)
def get_shop_floor_issues_by_order(
    production_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = ShopFloorIssueService(
        db
    )

    return (
        service
        .get_issues_by_production_order(
            production_order_id
        )
    )


@router.get(
    "/orders/{production_order_id}/summary",
    response_model=(
        ShopFloorIssueSummaryResponse
    ),
)
def get_shop_floor_issue_summary(
    production_order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = ShopFloorIssueService(
        db
    )

    return (
        service
        .get_production_order_summary(
            production_order_id
        )
    )


@router.get(
    "/materials/{production_material_id}",
    response_model=list[
        ShopFloorIssueResponse
    ],
)
def get_shop_floor_issues_by_material(
    production_material_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = ShopFloorIssueService(
        db
    )

    return (
        service
        .get_issues_by_material(
            production_material_id
        )
    )


# ============================================================
# DYNAMIC ID LOOKUP
# ============================================================


@router.get(
    "/{issue_id}",
    response_model=ShopFloorIssueResponse,
)
def get_shop_floor_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = ShopFloorIssueService(
        db
    )

    issue = service.get_issue(
        issue_id
    )

    if issue is None:
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Shop Floor Issue not found"
            ),
        )

    return issue