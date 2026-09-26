from datetime import date

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.expense import Expense


class ExpenseRepository:

    # ============================================================
    # CREATE
    # ============================================================

    @staticmethod
    def create(
        db: Session,
        expense: Expense,
    ) -> Expense:

        db.add(
            expense
        )

        db.commit()

        db.refresh(
            expense
        )

        return expense

    # ============================================================
    # GET ONE
    # ============================================================

    @staticmethod
    def get_by_id(
        db: Session,
        expense_id: int,
    ) -> Expense | None:

        return (
            db.query(
                Expense
            )
            .filter(
                Expense.id
                == expense_id
            )
            .first()
        )

    # ============================================================
    # LIST / FILTER
    # ============================================================

    @staticmethod
    def get_all(
        db: Session,
        start_date: date | None = None,
        end_date: date | None = None,
        category: str | None = None,
        expense_type: str | None = None,
        production_order_id: int | None = None,
        search: str | None = None,
    ) -> list[Expense]:

        query = (
            db.query(
                Expense
            )
        )

        if (
            start_date
            is not None
        ):

            query = query.filter(
                Expense.expense_date
                >= start_date
            )

        if (
            end_date
            is not None
        ):

            query = query.filter(
                Expense.expense_date
                <= end_date
            )

        if (
            category
            is not None
        ):

            query = query.filter(
                Expense.category
                == category
            )

        if (
            expense_type
            is not None
        ):

            query = query.filter(
                Expense.expense_type
                == expense_type
            )

        if (
            production_order_id
            is not None
        ):

            query = query.filter(
                Expense.production_order_id
                == production_order_id
            )

        if search:

            keyword = (
                f"%{search.strip()}%"
            )

            query = query.filter(
                or_(
                    Expense.description
                    .ilike(
                        keyword
                    ),

                    Expense.vendor_name
                    .ilike(
                        keyword
                    ),

                    Expense.reference_number
                    .ilike(
                        keyword
                    ),

                    Expense.notes
                    .ilike(
                        keyword
                    ),
                )
            )

        return (
            query
            .order_by(
                Expense.expense_date.desc(),
                Expense.id.desc(),
            )
            .all()
        )

    # ============================================================
    # UPDATE
    # ============================================================

    @staticmethod
    def update(
        db: Session,
        expense: Expense,
    ) -> Expense:

        db.commit()

        db.refresh(
            expense
        )

        return expense

    # ============================================================
    # DELETE
    # ============================================================

    @staticmethod
    def delete(
        db: Session,
        expense: Expense,
    ) -> None:

        db.delete(
            expense
        )

        db.commit()