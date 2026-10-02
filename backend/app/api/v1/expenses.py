from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlalchemy.orm import Session

from app.dependencies.database import (
    get_db,
)
from app.dependencies.permissions import (
    require_permission,
)
from app.models.user import User
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseListResponse,
    ExpenseResponse,
    ExpenseUpdate,
)
from app.services.expense_service import (
    ExpenseService,
)


router = APIRouter(
    prefix="/expenses",
    tags=[
        "Expenses"
    ],
)


# ================================================================
# CREATE EXPENSE
#
# Permission:
#     expenses.create
# ================================================================

@router.post(
    "",
    response_model=ExpenseResponse,
    status_code=(
        status.HTTP_201_CREATED
    ),
)
def create_expense(
    data: ExpenseCreate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "expenses.create"
        )
    ),
):

    try:

        return (
            ExpenseService
            .create(
                db=db,
                data=data,
                created_by=(
                    current_user.id
                ),
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc


# ================================================================
# LIST EXPENSES
#
# Permission:
#     expenses.view
# ================================================================

@router.get(
    "",
    response_model=ExpenseListResponse,
)
def get_expenses(

    start_date: date | None = Query(
        None,
        description=(
            "Expense start date"
        ),
    ),

    end_date: date | None = Query(
        None,
        description=(
            "Expense end date"
        ),
    ),

    category: str | None = Query(
        None,
        description=(
            "Expense category"
        ),
    ),

    expense_type: str | None = Query(
        None,
        description=(
            "GENERAL, OVERHEAD or "
            "DIRECT_PRODUCTION"
        ),
    ),

    production_order_id: int | None = Query(
        None,
        gt=0,
        description=(
            "Filter by Production Order"
        ),
    ),

    search: str | None = Query(
        None,
        description=(
            "Search description, vendor, "
            "reference number or notes"
        ),
    ),

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "expenses.view"
        )
    ),
):

    try:

        expenses = (
            ExpenseService
            .get_all(
                db=db,
                start_date=(
                    start_date
                ),
                end_date=(
                    end_date
                ),
                category=(
                    category
                ),
                expense_type=(
                    expense_type
                ),
                production_order_id=(
                    production_order_id
                ),
                search=(
                    search
                ),
            )
        )

        return {
            "total":
                len(
                    expenses
                ),

            "items":
                expenses,
        }

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc


# ================================================================
# GET EXPENSE
#
# Permission:
#     expenses.view
# ================================================================

@router.get(
    "/{expense_id}",
    response_model=ExpenseResponse,
)
def get_expense(
    expense_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "expenses.view"
        )
    ),
):

    try:

        return (
            ExpenseService
            .get_by_id(
                db=db,
                expense_id=(
                    expense_id
                ),
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=str(
                exc
            ),
        ) from exc


# ================================================================
# UPDATE EXPENSE
#
# Permission:
#     expenses.edit
# ================================================================

@router.put(
    "/{expense_id}",
    response_model=ExpenseResponse,
)
def update_expense(
    expense_id: int,
    data: ExpenseUpdate,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "expenses.edit"
        )
    ),
):

    try:

        return (
            ExpenseService
            .update(
                db=db,
                expense_id=(
                    expense_id
                ),
                data=data,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc




# ================================================================
# ARCHIVE COMPANY OVERHEAD
# ================================================================

@router.post(
    "/{expense_id}/archive",
    response_model=ExpenseResponse,
)
def archive_company_overhead(
    expense_id: int,

    stop_from_month: date = Query(
        ...,
        description=(
            "First day of the month from which this "
            "overhead should stop recurring."
        ),
    ),

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "expenses.delete"
        )
    ),
):

    try:

        return (
            ExpenseService
            .archive_overhead(
                db=db,
                expense_id=expense_id,
                stop_from_month=stop_from_month,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=str(
                exc
            ),
        ) from exc

# ================================================================
# DELETE EXPENSE
#
# Permission:
#     expenses.delete
# ================================================================

@router.delete(
    "/{expense_id}",
    status_code=(
        status.HTTP_204_NO_CONTENT
    ),
)
def delete_expense(
    expense_id: int,

    db: Session = Depends(
        get_db
    ),

    current_user: User = Depends(
        require_permission(
            "expenses.delete"
        )
    ),
):

    try:

        ExpenseService.delete(
            db=db,
            expense_id=(
                expense_id
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
        ) from exc