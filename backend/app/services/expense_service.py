from datetime import date

from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.repositories.expense_repository import ExpenseRepository
from app.schemas.expense import (
    EXPENSE_CATEGORIES,
    ExpenseCreate,
    ExpenseUpdate,
)


class ExpenseService:

    @staticmethod
    def create(
        db: Session,
        data: ExpenseCreate,
        created_by: int | None = None,
    ) -> Expense:

        expense = Expense(
            expense_date=data.expense_date,
            category=data.category,
            description=data.description,
            amount=data.amount,
            payment_mode=data.payment_mode,
            reference_number=data.reference_number,
            vendor_name=data.vendor_name,
            notes=data.notes,
            created_by=created_by,
        )

        return ExpenseRepository.create(
            db=db,
            expense=expense,
        )

    @staticmethod
    def get_by_id(
        db: Session,
        expense_id: int,
    ) -> Expense:

        expense = ExpenseRepository.get_by_id(
            db=db,
            expense_id=expense_id,
        )

        if expense is None:
            raise ValueError(
                "Expense not found."
            )

        return expense

    @staticmethod
    def get_all(
        db: Session,
        start_date: date | None = None,
        end_date: date | None = None,
        category: str | None = None,
        search: str | None = None,
    ) -> list[Expense]:

        if (
            start_date is not None
            and end_date is not None
            and start_date > end_date
        ):
            raise ValueError(
                "Start date cannot be after end date."
            )

        if (
            category is not None
            and category not in EXPENSE_CATEGORIES
        ):
            allowed = ", ".join(
                sorted(EXPENSE_CATEGORIES)
            )

            raise ValueError(
                "Invalid expense category. "
                f"Allowed values: {allowed}"
            )

        return ExpenseRepository.get_all(
            db=db,
            start_date=start_date,
            end_date=end_date,
            category=category,
            search=search,
        )

    @staticmethod
    def update(
        db: Session,
        expense_id: int,
        data: ExpenseUpdate,
    ) -> Expense:

        expense = ExpenseService.get_by_id(
            db=db,
            expense_id=expense_id,
        )

        update_data = data.model_dump(
            exclude_unset=True
        )

        for field, value in update_data.items():
            setattr(
                expense,
                field,
                value,
            )

        return ExpenseRepository.update(
            db=db,
            expense=expense,
        )

    @staticmethod
    def delete(
        db: Session,
        expense_id: int,
    ) -> None:

        expense = ExpenseService.get_by_id(
            db=db,
            expense_id=expense_id,
        )

        ExpenseRepository.delete(
            db=db,
            expense=expense,
        )