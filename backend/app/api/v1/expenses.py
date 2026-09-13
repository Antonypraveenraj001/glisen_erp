from datetime import date

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
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseListResponse,
    ExpenseResponse,
    ExpenseUpdate,
)
from app.services.expense_service import ExpenseService


router = APIRouter(
    prefix="/expenses",
    tags=["Expenses"],
)


EXPENSE_WRITE_ROLES = (
    "Boss",
    "Admin",
    "Accounts",
)


@router.post(
    "",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            *EXPENSE_WRITE_ROLES
        )
    ),
):
    return ExpenseService.create(
        db=db,
        data=data,
        created_by=current_user.id,
    )


@router.get(
    "",
    response_model=ExpenseListResponse,
)
def get_expenses(
    start_date: date | None = Query(
        None,
        description="Expense start date",
    ),
    end_date: date | None = Query(
        None,
        description="Expense end date",
    ),
    category: str | None = Query(
        None,
        description="Expense category",
    ),
    search: str | None = Query(
        None,
        description=(
            "Search description, vendor, "
            "reference number, or notes"
        ),
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Admin",
            "Accounts",
        )
    ),
):
    try:
        expenses = ExpenseService.get_all(
            db=db,
            start_date=start_date,
            end_date=end_date,
            category=category,
            search=search,
        )

        return {
            "total": len(expenses),
            "items": expenses,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.get(
    "/{expense_id}",
    response_model=ExpenseResponse,
)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            "Boss",
            "Admin",
            "Accounts",
        )
    ),
):
    try:
        return ExpenseService.get_by_id(
            db=db,
            expense_id=expense_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.put(
    "/{expense_id}",
    response_model=ExpenseResponse,
)
def update_expense(
    expense_id: int,
    data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            *EXPENSE_WRITE_ROLES
        )
    ),
):
    try:
        return ExpenseService.update(
            db=db,
            expense_id=expense_id,
            data=data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.delete(
    "/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(
            *EXPENSE_WRITE_ROLES
        )
    ),
):
    try:
        ExpenseService.delete(
            db=db,
            expense_id=expense_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc