from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)

from sqlalchemy.orm import Session

from app.dependencies.auth import (
    get_current_user,
    require_role,
)
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.proforma import (
    ProformaCreate,
    ProformaResponse,
    ProformaUpdate,
)
from app.services.proforma_service import (
    ProformaService,
)


router = APIRouter(
    prefix="/proformas",
    tags=["Proformas"],
)


# ============================================================
# CREATE PROFORMA
# ============================================================

@router.post(
    "",
    response_model=ProformaResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_proforma(
    proforma: ProformaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Admin",
            "Sales",
        )
    ),
):
    service = ProformaService(db)

    try:
        return service.create(proforma)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


# ============================================================
# GET ALL PROFORMAS
# ============================================================

@router.get(
    "",
    response_model=list[ProformaResponse],
)
def get_proformas(
    search: str | None = Query(
        default=None,
        description=(
            "Search by proforma number, "
            "company, contact, phone or email"
        ),
    ),
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description="Filter proformas by status",
    ),
    customer_id: int | None = Query(
        default=None,
        description="Filter by customer ID",
    ),
    enquiry_id: int | None = Query(
        default=None,
        description="Filter by enquiry ID",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = ProformaService(db)

    return service.get_all(
        search=search,
        status=status_filter,
        customer_id=customer_id,
        enquiry_id=enquiry_id,
    )


# ============================================================
# GET PROFORMA BY ID
# ============================================================

@router.get(
    "/{proforma_id}",
    response_model=ProformaResponse,
)
def get_proforma(
    proforma_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = ProformaService(db)

    proforma = service.get_by_id(
        proforma_id
    )

    if proforma is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proforma not found",
        )

    return proforma


# ============================================================
# GET PROFORMA BY NUMBER
# ============================================================

@router.get(
    "/number/{proforma_number}",
    response_model=ProformaResponse,
)
def get_proforma_by_number(
    proforma_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = ProformaService(db)

    proforma = service.get_by_number(
        proforma_number
    )

    if proforma is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proforma not found",
        )

    return proforma


# ============================================================
# GET PROFORMAS BY ENQUIRY
# ============================================================

@router.get(
    "/enquiry/{enquiry_id}",
    response_model=list[ProformaResponse],
)
def get_proformas_by_enquiry(
    enquiry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    service = ProformaService(db)

    proformas = service.get_by_enquiry(
        enquiry_id
    )

    return proformas


# ============================================================
# UPDATE PROFORMA
# ============================================================

@router.put(
    "/{proforma_id}",
    response_model=ProformaResponse,
)
def update_proforma(
    proforma_id: int,
    proforma: ProformaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Admin",
            "Sales",
        )
    ),
):
    service = ProformaService(db)

    try:
        updated_proforma = service.update(
            proforma_id,
            proforma,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )

    if updated_proforma is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proforma not found",
        )

    return updated_proforma


# ============================================================
# UPDATE PROFORMA STATUS
# ============================================================

@router.patch(
    "/{proforma_id}/status",
    response_model=ProformaResponse,
)
def update_proforma_status(
    proforma_id: int,
    status_value: str = Query(
        ...,
        alias="status",
        description="New Proforma status",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Admin",
            "Sales",
        )
    ),
):
    service = ProformaService(db)

    proforma = service.update_status(
        proforma_id,
        status_value,
    )

    if proforma is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proforma not found",
        )

    return proforma


# ============================================================
# DELETE PROFORMA
# ============================================================

@router.delete(
    "/{proforma_id}",
)
def delete_proforma(
    proforma_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Admin",
        )
    ),
):
    service = ProformaService(db)

    deleted = service.delete(
        proforma_id
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proforma not found",
        )

    return {
        "message": "Proforma deleted successfully."
    }