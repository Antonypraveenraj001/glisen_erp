"""Independent manual international billing (Boss-only Business Settings)."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies.database import get_db
from app.dependencies.permissions import require_permission
from app.models.user import User
from app.schemas.international_bill import (
    InternationalBillCreate,
    InternationalBillPage,
    InternationalBillResponse,
    InternationalFinishedProductOption,
)
from app.services.international_bill_service import InternationalBillService


router = APIRouter(prefix="/international-bills", tags=["International Bills"])


@router.get("/finished-products", response_model=list[InternationalFinishedProductOption])
def finished_products_for_international_bill(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.business.manage")),
):
    return InternationalBillService.list_finished_products(db)


@router.get("", response_model=InternationalBillPage)
def list_international_bills(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=5, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.business.manage")),
):
    return InternationalBillService.list(db, page, page_size)


@router.post("", response_model=InternationalBillResponse, status_code=201)
def create_international_bill(
    payload: InternationalBillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.business.manage")),
):
    try:
        return InternationalBillService.create(db, payload, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{bill_id}", response_model=InternationalBillResponse)
def get_international_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("settings.business.manage")),
):
    bill = InternationalBillService.get(db, bill_id)
    if bill is None:
        raise HTTPException(status_code=404, detail="International bill not found.")
    return bill
