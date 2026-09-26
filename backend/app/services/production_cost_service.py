import calendar

from datetime import (
    date,
    timedelta,
)
from decimal import (
    Decimal,
    ROUND_HALF_UP,
)

from sqlalchemy import (
    func,
    or_,
)
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.expense_recurring_rate import (
    ExpenseRecurringRate,
)
from app.models.production_operation import (
    ProductionOperation,
)
from app.models.production_order import (
    ProductionOrder,
)
from app.models.shop_floor_issue import (
    ShopFloorIssue,
)
from app.models.staff_salary_rate import (
    StaffSalaryRate,
)


class ProductionCostService:

    # ============================================================
    # MONEY
    # ============================================================

    @staticmethod
    def money(
        value,
    ) -> Decimal:

        return Decimal(
            str(
                value
                if value is not None
                else 0
            )
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

    # ============================================================
    # DECIMAL
    #
    # Used internally so daily allocations are not rounded too
    # early.
    # ============================================================

    @staticmethod
    def decimal(
        value,
    ) -> Decimal:

        return Decimal(
            str(
                value
                if value is not None
                else 0
            )
        )

    # ============================================================
    # DAYS IN MONTH
    # ============================================================

    @staticmethod
    def days_in_month(
        value: date,
    ) -> Decimal:

        days = calendar.monthrange(
            value.year,
            value.month,
        )[1]

        return Decimal(
            str(
                days
            )
        )

    # ============================================================
    # DATE RANGE
    # ============================================================

    @staticmethod
    def iter_dates(
        start_date: date,
        end_date: date,
    ):

        current_date = start_date

        while (
            current_date
            <= end_date
        ):

            yield current_date

            current_date += timedelta(
                days=1
            )

    # ============================================================
    # PRODUCTION PERIOD
    # ============================================================

    @staticmethod
    def get_production_period(
        production_order: ProductionOrder,
        as_of_date: date | None = None,
    ) -> tuple[
        date,
        date,
    ]:

        start_date = (
            production_order
            .actual_start_date
        )

        if (
            start_date
            is None
        ):

            raise ValueError(
                "Production costing requires an "
                "Actual Start Date."
            )

        # --------------------------------------------------------
        # COMPLETED PRODUCTION
        #
        # Historical cost always ends on the actual completion
        # date.
        # --------------------------------------------------------

        if (
            production_order
            .actual_end_date
            is not None
        ):

            end_date = (
                production_order
                .actual_end_date
            )

        else:

            # ----------------------------------------------------
            # ACTIVE PRODUCTION PREVIEW
            #
            # Allows us to calculate the cost accumulated up to
            # today without freezing anything.
            # ----------------------------------------------------

            end_date = (
                as_of_date
                or date.today()
            )

        if (
            end_date
            < start_date
        ):

            raise ValueError(
                "Production end date cannot be "
                "before its start date."
            )

        return (
            start_date,
            end_date,
        )

    # ============================================================
    # MATERIAL COST
    # ============================================================

    @staticmethod
    def get_material_cost(
        db: Session,
        production_order_id: int,
    ) -> Decimal:

        value = (
            db.query(
                func.coalesce(
                    func.sum(
                        ShopFloorIssue.total_cost
                    ),
                    0,
                )
            )
            .filter(
                ShopFloorIssue
                .production_order_id
                == production_order_id
            )
            .scalar()
        )

        return (
            ProductionCostService
            .money(
                value
            )
        )

    # ============================================================
    # OPERATION COST
    # ============================================================

    @staticmethod
    def get_operation_cost(
        db: Session,
        production_order_id: int,
    ) -> Decimal:

        value = (
            db.query(
                func.coalesce(
                    func.sum(
                        ProductionOperation
                        .operation_cost
                    ),
                    0,
                )
            )
            .filter(
                ProductionOperation
                .production_order_id
                == production_order_id
            )
            .scalar()
        )

        return (
            ProductionCostService
            .money(
                value
            )
        )

    # ============================================================
    # DIRECT PRODUCTION EXPENSE
    # ============================================================

    @staticmethod
    def get_direct_expense_cost(
        db: Session,
        production_order_id: int,
    ) -> Decimal:

        value = (
            db.query(
                func.coalesce(
                    func.sum(
                        Expense.amount
                    ),
                    0,
                )
            )
            .filter(
                Expense.expense_type
                == "DIRECT_PRODUCTION",

                Expense.production_order_id
                == production_order_id,
            )
            .scalar()
        )

        return (
            ProductionCostService
            .money(
                value
            )
        )

    # ============================================================
    # OVERLAPPING PRODUCTION ORDERS
    #
    # These are required to divide each day's indirect cost
    # fairly when several jobs are active at the same time.
    # ============================================================

    @staticmethod
    def get_overlapping_production_orders(
        db: Session,
        start_date: date,
        end_date: date,
    ) -> list[
        ProductionOrder
    ]:

        return (
            db.query(
                ProductionOrder
            )
            .filter(
                ProductionOrder
                .actual_start_date
                .isnot(
                    None
                ),

                ProductionOrder
                .actual_start_date
                <= end_date,

                or_(
                    ProductionOrder
                    .actual_end_date
                    .is_(
                        None
                    ),

                    ProductionOrder
                    .actual_end_date
                    >= start_date,
                ),
            )
            .all()
        )

    # ============================================================
    # ACTIVE JOB COUNT FOR DATE
    # ============================================================

    @staticmethod
    def active_job_count(
        production_orders:
            list[ProductionOrder],
        target_date: date,
    ) -> int:

        count = 0

        for order in production_orders:

            order_start = (
                order.actual_start_date
            )

            if (
                order_start
                is None
            ):

                continue

            order_end = (
                order.actual_end_date
            )

            if (
                order_start
                <= target_date
                and
                (
                    order_end
                    is None
                    or
                    order_end
                    >= target_date
                )
            ):

                count += 1

        return count

    # ============================================================
    # STAFF SALARY RATES FOR PERIOD
    # ============================================================

    @staticmethod
    def get_salary_rates(
        db: Session,
        start_date: date,
        end_date: date,
    ) -> list[
        StaffSalaryRate
    ]:

        return (
            db.query(
                StaffSalaryRate
            )
            .filter(
                StaffSalaryRate
                .effective_from
                <= end_date,

                or_(
                    StaffSalaryRate
                    .effective_to
                    .is_(
                        None
                    ),

                    StaffSalaryRate
                    .effective_to
                    >= start_date,
                ),
            )
            .all()
        )

    # ============================================================
    # OVERHEAD RATES FOR PERIOD
    # ============================================================

    @staticmethod
    def get_overhead_rates(
        db: Session,
        start_date: date,
        end_date: date,
    ) -> list[
        ExpenseRecurringRate
    ]:

        return (
            db.query(
                ExpenseRecurringRate
            )
            .join(
                Expense,
                (
                    Expense.id
                    ==
                    ExpenseRecurringRate
                    .expense_id
                ),
            )
            .filter(
                Expense.expense_type
                == "OVERHEAD",

                Expense.is_monthly_recurring
                .is_(
                    True
                ),

                ExpenseRecurringRate
                .effective_from
                <= end_date,

                or_(
                    ExpenseRecurringRate
                    .effective_to
                    .is_(
                        None
                    ),

                    ExpenseRecurringRate
                    .effective_to
                    >= start_date,
                ),
            )
            .all()
        )

    # ============================================================
    # DAILY STAFF POOL
    # ============================================================

    @staticmethod
    def get_daily_staff_pool(
        salary_rates:
            list[StaffSalaryRate],
        target_date: date,
    ) -> Decimal:

        daily_pool = Decimal(
            "0"
        )

        month_days = (
            ProductionCostService
            .days_in_month(
                target_date
            )
        )

        for rate in salary_rates:

            if (
                rate.effective_from
                <= target_date
                and
                (
                    rate.effective_to
                    is None
                    or
                    rate.effective_to
                    >= target_date
                )
            ):

                monthly_salary = (
                    ProductionCostService
                    .decimal(
                        rate.monthly_salary
                    )
                )

                daily_pool += (
                    monthly_salary
                    /
                    month_days
                )

        return daily_pool

    # ============================================================
    # DAILY COMPANY OVERHEAD POOL
    # ============================================================

    @staticmethod
    def get_daily_overhead_pool(
        overhead_rates:
            list[ExpenseRecurringRate],
        target_date: date,
    ) -> Decimal:

        daily_pool = Decimal(
            "0"
        )

        month_days = (
            ProductionCostService
            .days_in_month(
                target_date
            )
        )

        for rate in overhead_rates:

            if (
                rate.effective_from
                <= target_date
                and
                (
                    rate.effective_to
                    is None
                    or
                    rate.effective_to
                    >= target_date
                )
            ):

                monthly_amount = (
                    ProductionCostService
                    .decimal(
                        rate.monthly_amount
                    )
                )

                daily_pool += (
                    monthly_amount
                    /
                    month_days
                )

        return daily_pool

    # ============================================================
    # INDIRECT COST ALLOCATION
    # ============================================================

    @staticmethod
    def get_indirect_cost_allocation(
        db: Session,
        start_date: date,
        end_date: date,
    ) -> tuple[
        Decimal,
        Decimal,
    ]:

        overlapping_orders = (
            ProductionCostService
            .get_overlapping_production_orders(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

        salary_rates = (
            ProductionCostService
            .get_salary_rates(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

        overhead_rates = (
            ProductionCostService
            .get_overhead_rates(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

        allocated_staff_cost = Decimal(
            "0"
        )

        allocated_overhead_cost = Decimal(
            "0"
        )

        for target_date in (
            ProductionCostService
            .iter_dates(
                start_date,
                end_date,
            )
        ):

            active_jobs = (
                ProductionCostService
                .active_job_count(
                    production_orders=(
                        overlapping_orders
                    ),
                    target_date=(
                        target_date
                    ),
                )
            )

            if (
                active_jobs
                <= 0
            ):

                continue

            active_jobs_decimal = Decimal(
                str(
                    active_jobs
                )
            )

            daily_staff_pool = (
                ProductionCostService
                .get_daily_staff_pool(
                    salary_rates=(
                        salary_rates
                    ),
                    target_date=(
                        target_date
                    ),
                )
            )

            daily_overhead_pool = (
                ProductionCostService
                .get_daily_overhead_pool(
                    overhead_rates=(
                        overhead_rates
                    ),
                    target_date=(
                        target_date
                    ),
                )
            )

            allocated_staff_cost += (
                daily_staff_pool
                /
                active_jobs_decimal
            )

            allocated_overhead_cost += (
                daily_overhead_pool
                /
                active_jobs_decimal
            )

        return (
            ProductionCostService
            .money(
                allocated_staff_cost
            ),

            ProductionCostService
            .money(
                allocated_overhead_cost
            ),
        )

    # ============================================================
    # COMPLETE PRODUCTION COST
    # ============================================================

    @staticmethod
    def calculate(
        db: Session,
        production_order_id: int,
        as_of_date: date | None = None,
    ) -> dict:

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

        (
            start_date,
            end_date,
        ) = (
            ProductionCostService
            .get_production_period(
                production_order=(
                    production_order
                ),
                as_of_date=(
                    as_of_date
                ),
            )
        )

        # --------------------------------------------------------
        # DIRECT COST COMPONENTS
        # --------------------------------------------------------

        material_cost = (
            ProductionCostService
            .get_material_cost(
                db=db,
                production_order_id=(
                    production_order.id
                ),
            )
        )

        operation_cost = (
            ProductionCostService
            .get_operation_cost(
                db=db,
                production_order_id=(
                    production_order.id
                ),
            )
        )

        direct_expense_cost = (
            ProductionCostService
            .get_direct_expense_cost(
                db=db,
                production_order_id=(
                    production_order.id
                ),
            )
        )

        # --------------------------------------------------------
        # INDIRECT COST COMPONENTS
        # --------------------------------------------------------

        (
            allocated_staff_cost,
            allocated_overhead_cost,
        ) = (
            ProductionCostService
            .get_indirect_cost_allocation(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

        # --------------------------------------------------------
        # TOTAL
        # --------------------------------------------------------

        total_production_cost = (
            ProductionCostService
            .money(
                material_cost
                +
                operation_cost
                +
                direct_expense_cost
                +
                allocated_staff_cost
                +
                allocated_overhead_cost
            )
        )

        # --------------------------------------------------------
        # QUANTITY / UNIT COST
        # --------------------------------------------------------

        finished_quantity = (
            ProductionCostService
            .decimal(
                production_order.quantity
            )
        )

        if (
            finished_quantity
            <= Decimal("0")
        ):

            raise ValueError(
                "Production quantity must be "
                "greater than zero."
            )

        unit_cost = (
            ProductionCostService
            .money(
                total_production_cost
                /
                finished_quantity
            )
        )

        production_days = (
            (
                end_date
                - start_date
            ).days
            + 1
        )

        return {
            "production_order_id": (
                production_order.id
            ),

            "production_number": (
                production_order
                .production_number
            ),

            "product_name": (
                production_order
                .product_name
            ),

            "start_date": (
                start_date
            ),

            "end_date": (
                end_date
            ),

            "production_days": (
                production_days
            ),

            "material_cost": (
                material_cost
            ),

            "operation_cost": (
                operation_cost
            ),

            "direct_expense_cost": (
                direct_expense_cost
            ),

            "allocated_staff_cost": (
                allocated_staff_cost
            ),

            "allocated_overhead_cost": (
                allocated_overhead_cost
            ),

            "total_production_cost": (
                total_production_cost
            ),

            "finished_quantity": (
                finished_quantity
            ),

            "unit_cost": (
                unit_cost
            ),
        }