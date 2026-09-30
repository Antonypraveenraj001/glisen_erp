from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy.orm import Session

from app.dependencies.database import (
    get_db,
)
from app.dependencies.permissions import (
    require_permission,
)

from app.models.user import (
    User,
)

from app.schemas.production import (
    ProductionOrderResponse,
)

from app.services.production_reopen import (
    ProductionReopenService,
)


router = APIRouter(
    prefix="/production",
    tags=[
        "Production",
    ],
)


# ================================================================
# REOPEN COMPLETED PRODUCTION
#
# Permission:
#     production.reopen
#
# production.reopen is Boss-only.
#
# This is a recovery action, not a normal Production workflow.
# ================================================================

@router.patch(
    "/orders/{production_order_id}/reopen",
    response_model=ProductionOrderResponse,
)
def reopen_production_order(
    production_order_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "production.reopen"
        )
    ),
):

    try:

        return (
            ProductionReopenService
            .reopen(
                db=db,
                production_order_id=(
                    production_order_id
                ),
            )
        )


    except LookupError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(
                exc
            ),
        ) from exc


    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc