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

from app.dependencies.database import (
    get_db,
)

from app.models.user import User

from app.schemas.customer import (
    CustomerResponse,
    CustomerUpdate,
)

from app.services.customer_service import (
    CustomerService,
)


router = APIRouter(
    prefix="/customers",
    tags=["Customers"],
)


# ============================================================
# CUSTOMER DIRECTORY
#
# Customers are created automatically from Enquiries.
# There is intentionally no manual POST /customers endpoint.
# ============================================================


@router.get(
    "",
    response_model=list[
        CustomerResponse
    ],
)
def get_customers(
    search: str | None = Query(
        default=None,
        description=(
            "Search by customer code, "
            "company, GSTIN, contact or phone"
        ),
    ),
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_current_user
    ),
):

    return (
        CustomerService
        .get_all(
            db,
            search,
        )
    )


# ============================================================
# GET CUSTOMER
# ============================================================


@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
)
def get_customer(
    customer_id: int,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_current_user
    ),
):

    customer = (
        CustomerService
        .get_by_id(
            db,
            customer_id,
        )
    )

    if (
        customer
        is None
    ):

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Customer not found."
            ),
        )

    return customer


# ============================================================
# UPDATE CUSTOMER DIRECTORY DETAILS
#
# This endpoint cannot change:
#
# - customer_code
# - gst_number
# - is_active
#
# Those identity/workflow fields are not part of CustomerUpdate.
# ============================================================


@router.put(
    "/{customer_id}",
    response_model=CustomerResponse,
)
def update_customer(
    customer_id: int,
    customer: CustomerUpdate,
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Admin",
            "Sales",
        )
    ),
):

    try:

        updated_customer = (
            CustomerService
            .update(
                db=db,
                customer_id=(
                    customer_id
                ),
                customer_data=(
                    customer
                ),
            )
        )

        if (
            updated_customer
            is None
        ):

            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail=(
                    "Customer not found."
                ),
            )

        return updated_customer

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        )