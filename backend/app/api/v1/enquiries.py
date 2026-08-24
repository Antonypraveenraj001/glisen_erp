from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user, require_role
from app.dependencies.database import get_db
from app.models.user import User
from app.schemas.enquiry import (
    EnquiryCreate,
    EnquiryResponse,
    EnquiryUpdate,
)
from app.services.enquiry_service import EnquiryService


router = APIRouter(
    prefix="/enquiries",
    tags=["Enquiries"],
)


@router.post(
    "",
    response_model=EnquiryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_enquiry(
    enquiry: EnquiryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Admin",
            "Sales",
        )
    ),
):
    created_enquiry, error = EnquiryService.create(
        db,
        enquiry,
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error,
        )

    return created_enquiry


@router.get(
    "",
    response_model=list[EnquiryResponse],
)
def get_enquiries(
    search: str | None = Query(
        default=None,
        description=(
            "Search by enquiry number, "
            "company, contact, phone or machine"
        ),
    ),
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description="Filter enquiries by status",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return EnquiryService.get_all(
        db,
        search,
        status_filter,
    )


@router.get(
    "/{enquiry_id}",
    response_model=EnquiryResponse,
)
def get_enquiry(
    enquiry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    enquiry = EnquiryService.get_by_id(
        db,
        enquiry_id,
    )

    if enquiry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enquiry not found",
        )

    return enquiry


@router.put(
    "/{enquiry_id}",
    response_model=EnquiryResponse,
)
def update_enquiry(
    enquiry_id: int,
    enquiry: EnquiryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Admin",
            "Sales",
        )
    ),
):
    updated_enquiry, error = EnquiryService.update(
        db=db,
        enquiry_id=enquiry_id,
        enquiry_data=enquiry,
    )

    if error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND
            if error == "Enquiry not found"
            else status.HTTP_400_BAD_REQUEST,
            detail=error,
        )

    return updated_enquiry


@router.delete(
    "/{enquiry_id}",
)
def delete_enquiry(
    enquiry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Admin",
        )
    ),
):
    enquiry = EnquiryService.delete(
        db,
        enquiry_id,
    )

    if enquiry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enquiry not found",
        )

    return {
        "message": "Enquiry deleted successfully."
    }