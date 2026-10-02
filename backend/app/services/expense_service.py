from datetime import (
    date,
    timedelta,
)
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.expense_recurring_rate import (
    ExpenseRecurringRate,
)
from app.models.production_order import (
    ProductionOrder,
)
from app.models.recurring_payment import (
    RecurringPayment,
)
from app.repositories.expense_repository import (
    ExpenseRepository,
)
from app.schemas.expense import (
    EXPENSE_CATEGORIES,
    EXPENSE_TYPES,
    ExpenseCreate,
    ExpenseUpdate,
)


class ExpenseService:

    # ============================================================
    # MONTH START
    # ============================================================

    @staticmethod
    def month_start(
        value: date,
    ) -> date:

        return value.replace(
            day=1
        )

    # ============================================================
    # CURRENT OVERHEAD RATE
    # ============================================================

    @staticmethod
    def get_current_overhead_rate(
        db: Session,
        expense_id: int,
    ) -> ExpenseRecurringRate | None:

        return (
            db.query(
                ExpenseRecurringRate
            )
            .filter(
                ExpenseRecurringRate.expense_id
                == expense_id,

                ExpenseRecurringRate.effective_to
                .is_(
                    None
                ),
            )
            .order_by(
                ExpenseRecurringRate
                .effective_from
                .desc(),

                ExpenseRecurringRate
                .id
                .desc(),
            )
            .first()
        )

    # ============================================================
    # NORMALIZE TYPE
    # ============================================================

    @staticmethod
    def normalize_expense_type(
        expense_type: str | None,
    ) -> str:

        normalized = (
            expense_type
            or "GENERAL"
        )


        normalized = (
            normalized
            .strip()
            .upper()
        )


        if (
            normalized
            not in EXPENSE_TYPES
        ):

            allowed = ", ".join(
                sorted(
                    EXPENSE_TYPES
                )
            )


            raise ValueError(
                "Invalid expense type. "
                f"Allowed values: {allowed}"
            )


        return normalized

    # ============================================================
    # VALIDATE CATEGORY
    # ============================================================

    @staticmethod
    def validate_category(
        category: str | None,
    ) -> str:

        normalized = (
            category
            or ""
        ).strip()


        if not normalized:

            raise ValueError(
                "Expense category is required."
            )


        if (
            normalized
            not in EXPENSE_CATEGORIES
        ):

            allowed = ", ".join(
                sorted(
                    EXPENSE_CATEGORIES
                )
            )


            raise ValueError(
                "Invalid expense category. "
                f"Allowed values: {allowed}"
            )


        return normalized

    # ============================================================
    # VALIDATE DESCRIPTION
    # ============================================================

    @staticmethod
    def validate_description(
        description: str | None,
    ) -> str:

        normalized = (
            description
            or ""
        ).strip()


        if not normalized:

            raise ValueError(
                "Expense description is required."
            )


        return normalized

    # ============================================================
    # VALIDATE PRODUCTION LINK
    # ============================================================

    @staticmethod
    def validate_production_link(
        db: Session,
        *,
        expense_type: str,
        production_order_id: int | None,
    ) -> ProductionOrder | None:

        if (
            expense_type
            == "DIRECT_PRODUCTION"
        ):

            if (
                production_order_id
                is None
            ):

                raise ValueError(
                    "Direct Production expense must "
                    "be linked to a Production Order."
                )


            production_order = (
                db.query(
                    ProductionOrder
                )
                .filter(
                    ProductionOrder.id
                    == production_order_id
                )
                .first()
            )


            if (
                production_order
                is None
            ):

                raise ValueError(
                    "Production Order not found."
                )


            production_status = (
                production_order.status
                or ""
            ).strip().lower()


            if (
                production_status
                != "in progress"
            ):

                raise ValueError(
                    "Direct Production expense can only "
                    "be added or changed while the "
                    "Production Order is In Progress."
                )


            return production_order


        if (
            production_order_id
            is not None
        ):

            raise ValueError(
                "General and Overhead expenses cannot "
                "be linked directly to a Production Order."
            )


        return None

    # ============================================================
    # CREATE
    # ============================================================

    @staticmethod
    def create(
        db: Session,
        data: ExpenseCreate,
        created_by: int | None = None,
    ) -> Expense:

        expense_type = (
            ExpenseService
            .normalize_expense_type(
                data.expense_type
            )
        )


        category = (
            ExpenseService
            .validate_category(
                data.category
            )
        )


        description = (
            ExpenseService
            .validate_description(
                data.description
            )
        )


        ExpenseService.validate_production_link(
            db=db,

            expense_type=(
                expense_type
            ),

            production_order_id=(
                data.production_order_id
            ),
        )


        # ========================================================
        # MONTHLY OVERHEAD
        # ========================================================

        if (
            expense_type
            == "OVERHEAD"
        ):

            recurring = True


            effective_from = (
                ExpenseService
                .month_start(
                    data.expense_date
                )
            )

        else:

            recurring = False

            effective_from = None


        expense = Expense(
            expense_date=(
                data.expense_date
            ),

            expense_type=(
                expense_type
            ),

            category=(
                category
            ),

            description=(
                description
            ),

            amount=(
                data.amount
            ),

            is_monthly_recurring=(
                recurring
            ),

            effective_from=(
                effective_from
            ),

            effective_to=None,

            production_order_id=(
                data.production_order_id
            ),

            payment_mode=(
                data.payment_mode
            ),

            reference_number=(
                data.reference_number
            ),

            vendor_name=(
                data.vendor_name
            ),

            notes=(
                data.notes
            ),

            created_by=(
                created_by
            ),
        )


        try:

            db.add(
                expense
            )


            db.flush()


            # ----------------------------------------------------
            # INITIAL MONTHLY OVERHEAD RATE
            # ----------------------------------------------------

            if (
                expense_type
                == "OVERHEAD"
            ):

                db.add(
                    ExpenseRecurringRate(
                        expense_id=(
                            expense.id
                        ),

                        monthly_amount=(
                            data.amount
                        ),

                        effective_from=(
                            effective_from
                        ),

                        effective_to=None,
                    )
                )


            db.commit()


            db.refresh(
                expense
            )


            return expense


        except Exception:

            db.rollback()

            raise

    # ============================================================
    # GET ONE
    # ============================================================

    @staticmethod
    def get_by_id(
        db: Session,
        expense_id: int,
    ) -> Expense:

        expense = (
            ExpenseRepository
            .get_by_id(
                db=db,

                expense_id=(
                    expense_id
                ),
            )
        )


        if (
            expense
            is None
        ):

            raise ValueError(
                "Expense not found."
            )


        return expense

    # ============================================================
    # LIST
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

        if (
            start_date
            is not None
            and
            end_date
            is not None
            and
            start_date
            > end_date
        ):

            raise ValueError(
                "Start date cannot be after end date."
            )


        normalized_type = None


        if (
            expense_type
            is not None
        ):

            normalized_type = (
                ExpenseService
                .normalize_expense_type(
                    expense_type
                )
            )


        normalized_category = None


        if (
            category
            is not None
        ):

            normalized_category = (
                ExpenseService
                .validate_category(
                    category
                )
            )


        return (
            ExpenseRepository
            .get_all(
                db=db,

                start_date=(
                    start_date
                ),

                end_date=(
                    end_date
                ),

                category=(
                    normalized_category
                ),

                expense_type=(
                    normalized_type
                ),

                production_order_id=(
                    production_order_id
                ),

                search=(
                    search
                ),
            )
        )

    # ============================================================
    # UPDATE
    # ============================================================

    @staticmethod
    def update(
        db: Session,
        expense_id: int,
        data: ExpenseUpdate,
    ) -> Expense:

        expense = (
            ExpenseService
            .get_by_id(
                db=db,

                expense_id=(
                    expense_id
                ),
            )
        )


        update_data = (
            data.model_dump(
                exclude_unset=True
            )
        )


        if (
            expense.expense_type
            == "OVERHEAD"
            and
            expense.is_archived
        ):

            raise ValueError(
                "Archived Company Overhead history "
                "cannot be edited."
            )


        # ========================================================
        # COST TYPE MUST NOT CHANGE
        #
        # A regular overhead must not later become a direct
        # production expense, and vice versa.
        # ========================================================

        if (
            "expense_type"
            in update_data
        ):

            requested_type = (
                ExpenseService
                .normalize_expense_type(
                    update_data[
                        "expense_type"
                    ]
                )
            )


            if (
                requested_type
                != expense.expense_type
            ):

                raise ValueError(
                    "Expense type cannot be changed "
                    "after the expense is created."
                )


        final_expense_type = (
            expense.expense_type
        )


        # ========================================================
        # FINAL PRODUCTION LINK
        # ========================================================

        if (
            "production_order_id"
            in update_data
        ):

            final_production_order_id = (
                update_data[
                    "production_order_id"
                ]
            )

        else:

            final_production_order_id = (
                expense.production_order_id
            )


        ExpenseService.validate_production_link(
            db=db,

            expense_type=(
                final_expense_type
            ),

            production_order_id=(
                final_production_order_id
            ),
        )


        # ========================================================
        # CATEGORY
        # ========================================================

        final_category = (
            update_data.get(
                "category",
                expense.category,
            )
        )


        final_category = (
            ExpenseService
            .validate_category(
                final_category
            )
        )


        # ========================================================
        # DESCRIPTION
        # ========================================================

        final_description = (
            update_data.get(
                "description",
                expense.description,
            )
        )


        final_description = (
            ExpenseService
            .validate_description(
                final_description
            )
        )


        # ========================================================
        # MONTHLY OVERHEAD AMOUNT CHANGE
        #
        # Example:
        #
        # Sep-Nov:
        #     Rent ₹20,000
        #
        # December edit:
        #     Rent ₹22,000
        #
        # History becomes:
        #
        # ₹20,000 -> ends 30-Nov
        # ₹22,000 -> starts 01-Dec
        # ========================================================

        if (
            final_expense_type
            == "OVERHEAD"
            and
            "amount"
            in update_data
        ):

            new_amount = Decimal(
                str(
                    update_data[
                        "amount"
                    ]
                )
            )


            old_amount = Decimal(
                str(
                    expense.amount
                )
            )


            if (
                new_amount
                != old_amount
            ):

                change_date = (
                    ExpenseService
                    .month_start(
                        date.today()
                    )
                )


                current_rate = (
                    ExpenseService
                    .get_current_overhead_rate(
                        db=db,

                        expense_id=(
                            expense.id
                        ),
                    )
                )


                if (
                    current_rate
                    is None
                ):

                    db.add(
                        ExpenseRecurringRate(
                            expense_id=(
                                expense.id
                            ),

                            monthly_amount=(
                                new_amount
                            ),

                            effective_from=(
                                change_date
                            ),

                            effective_to=None,
                        )
                    )


                elif (
                    current_rate
                    .effective_from
                    == change_date
                ):

                    # --------------------------------------------
                    # Same-month correction.
                    #
                    # Replace this month's current rate rather
                    # than creating a duplicate period.
                    # --------------------------------------------

                    current_rate.monthly_amount = (
                        new_amount
                    )


                elif (
                    current_rate
                    .effective_from
                    < change_date
                ):

                    current_rate.effective_to = (
                        change_date
                        -
                        timedelta(
                            days=1
                        )
                    )


                    db.add(
                        ExpenseRecurringRate(
                            expense_id=(
                                expense.id
                            ),

                            monthly_amount=(
                                new_amount
                            ),

                            effective_from=(
                                change_date
                            ),

                            effective_to=None,
                        )
                    )


                else:

                    raise ValueError(
                        "This overhead contains a "
                        "future effective rate. "
                        "Review its rate history before "
                        "changing the amount."
                    )


                expense.amount = (
                    new_amount
                )


        # ========================================================
        # NORMAL UPDATE FIELDS
        # ========================================================

        fields_to_apply = {
            "expense_date",
            "category",
            "description",
            "payment_mode",
            "reference_number",
            "vendor_name",
            "notes",
            "production_order_id",
        }


        # GENERAL / DIRECT amount is simply the actual amount.
        if (
            final_expense_type
            != "OVERHEAD"
        ):

            fields_to_apply.add(
                "amount"
            )


        for field in fields_to_apply:

            if (
                field
                in update_data
            ):

                setattr(
                    expense,
                    field,
                    update_data[
                        field
                    ],
                )


        expense.category = (
            final_category
        )


        expense.description = (
            final_description
        )


        expense.production_order_id = (
            final_production_order_id
        )


        # Recurring overhead stays recurring.
        if (
            final_expense_type
            == "OVERHEAD"
        ):

            expense.is_monthly_recurring = (
                True
            )


        try:

            db.commit()


            db.refresh(
                expense
            )


            return expense


        except Exception:

            db.rollback()

            raise


    # ============================================================
    # ARCHIVE RECURRING OVERHEAD
    # ============================================================

    @staticmethod
    def archive_overhead(
        db: Session,
        expense_id: int,
        stop_from_month: date,
    ) -> Expense:

        expense = (
            ExpenseService
            .get_by_id(
                db=db,
                expense_id=expense_id,
            )
        )


        if (
            expense.expense_type
            != "OVERHEAD"
            or
            not expense.is_monthly_recurring
        ):

            raise ValueError(
                "Only recurring Company Overheads "
                "can be removed from the overhead master."
            )


        if expense.is_archived:

            raise ValueError(
                "This Company Overhead has already been removed."
            )


        if stop_from_month.day != 1:

            raise ValueError(
                "Stop From Month must use the first day "
                "of the selected month."
            )


        current_month = (
            ExpenseService
            .month_start(
                date.today()
            )
        )


        if stop_from_month > current_month:

            raise ValueError(
                "A future stop month cannot be scheduled here. "
                "Choose the current month or an earlier month."
            )


        if (
            expense.effective_from
            is not None
            and
            stop_from_month
            <
            expense.effective_from
        ):

            raise ValueError(
                "Stop From Month cannot be before "
                "this overhead originally started."
            )


        latest_payment = (
            db.query(
                RecurringPayment
            )
            .filter(
                RecurringPayment.expense_id
                == expense.id,

                RecurringPayment.payment_kind
                == "OVERHEAD",
            )
            .order_by(
                RecurringPayment.period_start.desc(),
                RecurringPayment.id.desc(),
            )
            .first()
        )


        if (
            latest_payment is not None
            and
            latest_payment.period_start
            >= stop_from_month
        ):

            raise ValueError(
                "A payment already exists for "
                f"{latest_payment.period_start.strftime('%b %Y')} "
                "or a later selected stop period. "
                "Choose a Stop From Month after the latest "
                "recorded overhead payment."
            )


        stop_end = (
            stop_from_month
            -
            timedelta(
                days=1
            )
        )


        rates = (
            db.query(
                ExpenseRecurringRate
            )
            .filter(
                ExpenseRecurringRate.expense_id
                == expense.id
            )
            .order_by(
                ExpenseRecurringRate.effective_from.asc(),
                ExpenseRecurringRate.id.asc(),
            )
            .all()
        )


        try:

            for rate in rates:

                if (
                    rate.effective_from
                    >= stop_from_month
                ):

                    db.delete(
                        rate
                    )

                elif (
                    rate.effective_to is None
                    or
                    rate.effective_to
                    >= stop_from_month
                ):

                    rate.effective_to = stop_end


            expense.is_archived = True
            expense.effective_to = stop_end


            db.commit()
            db.refresh(
                expense
            )

            return expense


        except Exception:

            db.rollback()
            raise

    # ============================================================
    # DELETE
    # ============================================================

    @staticmethod
    def delete(
        db: Session,
        expense_id: int,
    ) -> None:

        expense = (
            ExpenseService
            .get_by_id(
                db=db,

                expense_id=(
                    expense_id
                ),
            )
        )


        # --------------------------------------------------------
        # EXPENSE HISTORY MUST NOT BE DESTROYED
        # --------------------------------------------------------

        if (
            expense.expense_type
            in {
                "GENERAL",
                "DIRECT_PRODUCTION",
            }
        ):

            raise ValueError(
                "Expense history cannot be deleted. "
                "General and Direct Production expense "
                "records must remain available for audit "
                "and costing history."
            )


        # --------------------------------------------------------
        # REGULAR OVERHEAD HISTORY MUST NOT BE DESTROYED
        # --------------------------------------------------------

        if (
            expense.expense_type
            == "OVERHEAD"
            and
            expense.is_monthly_recurring
        ):

            raise ValueError(
                "Regular monthly overhead cannot be deleted "
                "because its historical monthly rates must be "
                "preserved. It should be stopped instead."
            )


        # --------------------------------------------------------
        # COMPLETED PRODUCTION COSTS MUST NOT BE DESTROYED
        # --------------------------------------------------------

        if (
            expense.expense_type
            == "DIRECT_PRODUCTION"
        ):

            ExpenseService.validate_production_link(
                db=db,

                expense_type=(
                    expense.expense_type
                ),

                production_order_id=(
                    expense.production_order_id
                ),
            )


        ExpenseRepository.delete(
            db=db,

            expense=expense,
        )