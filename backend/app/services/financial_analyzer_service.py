from collections import defaultdict
from datetime import (
    date,
    datetime,
    time,
    timedelta,
)
from decimal import (
    Decimal,
    ROUND_HALF_UP,
)

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.expense_recurring_rate import (
    ExpenseRecurringRate,
)
from app.models.finished_goods_receipt import (
    FinishedGoodsReceipt,
)
from app.models.finished_product import (
    FinishedProduct,
)
from app.models.production_operation import (
    ProductionOperation,
)
from app.models.shop_floor_issue import (
    ShopFloorIssue,
)
from app.models.staff_salary_rate import (
    StaffSalaryRate,
)

from app.services.expense_service import (
    ExpenseService,
)
from app.services.gst_report_service import (
    GSTReportService,
)
from app.services.production_cost_service import (
    ProductionCostService,
)


class FinancialAnalyzerService:

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
    # REPORT PERIOD VALIDATION
    # ============================================================

    @staticmethod
    def validate_period(
        start_date: date | None,
        end_date: date | None,
    ) -> None:

        if (
            start_date is not None
            and
            end_date is not None
            and
            start_date > end_date
        ):

            raise ValueError(
                "Start date cannot be after end date."
            )

    # ============================================================
    # RECURRING COST PERIOD
    #
    # Salary and Company Overheads are recurring monthly costs.
    #
    # When the user supplies a reporting period, that exact period
    # is used.
    #
    # For an all-time report, recurring costs begin from the
    # earliest salary / overhead rate and run until today.
    # ============================================================

    @staticmethod
    def get_recurring_period(
        db: Session,
        start_date: date | None,
        end_date: date | None,
    ) -> tuple[
        date | None,
        date | None,
    ]:

        resolved_end = (
            end_date
            or
            date.today()
        )

        if (
            start_date
            is not None
        ):

            return (
                start_date,
                resolved_end,
            )

        earliest_salary_date = (
            db.query(
                func.min(
                    StaffSalaryRate
                    .effective_from
                )
            )
            .scalar()
        )

        earliest_overhead_date = (
            db.query(
                func.min(
                    ExpenseRecurringRate
                    .effective_from
                )
            )
            .scalar()
        )

        start_candidates = [
            value

            for value
            in (
                earliest_salary_date,
                earliest_overhead_date,
            )

            if value is not None
        ]

        if (
            not start_candidates
        ):

            return (
                None,
                None,
            )

        resolved_start = min(
            start_candidates
        )

        if (
            resolved_start
            > resolved_end
        ):

            return (
                None,
                None,
            )

        return (
            resolved_start,
            resolved_end,
        )

    # ============================================================
    # PERIOD RECURRING COSTS
    #
    # IMPORTANT:
    #
    # These are the ACTUAL salary and overhead costs incurred
    # during the reporting period.
    #
    # They are used for Financial Analyzer P&L.
    #
    # Finished Product allocated salary / overhead remains a
    # product-cost allocation and is NOT added again to P&L.
    # ============================================================

    @staticmethod
    def get_period_recurring_costs(
        db: Session,
        start_date: date | None,
        end_date: date | None,
    ) -> dict:

        (
            recurring_start,
            recurring_end,
        ) = (
            FinancialAnalyzerService
            .get_recurring_period(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

        if (
            recurring_start is None
            or
            recurring_end is None
        ):

            return {
                "period_start": None,
                "period_end": None,
                "staff_salary_cost": (
                    Decimal("0.00")
                ),
                "company_overhead_cost": (
                    Decimal("0.00")
                ),
            }

        salary_rates = (
            ProductionCostService
            .get_salary_rates(
                db=db,
                start_date=recurring_start,
                end_date=recurring_end,
            )
        )

        overhead_rates = (
            ProductionCostService
            .get_overhead_rates(
                db=db,
                start_date=recurring_start,
                end_date=recurring_end,
            )
        )

        staff_salary_cost = Decimal(
            "0.00"
        )

        company_overhead_cost = Decimal(
            "0.00"
        )

        for target_date in (
            ProductionCostService
            .iter_dates(
                recurring_start,
                recurring_end,
            )
        ):

            staff_salary_cost += (
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

            company_overhead_cost += (
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

        return {
            "period_start": (
                recurring_start
            ),
            "period_end": (
                recurring_end
            ),
            "staff_salary_cost": (
                FinancialAnalyzerService
                .money(
                    staff_salary_cost
                )
            ),
            "company_overhead_cost": (
                FinancialAnalyzerService
                .money(
                    company_overhead_cost
                )
            ),
        }

    # ============================================================
    # FINISHED PRODUCTS IN REPORT PERIOD
    #
    # Production cost recognition continues to use the
    # Finished Goods Receipt date.
    # ============================================================

    @staticmethod
    def get_finished_products_in_period(
        db: Session,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[
        FinishedProduct
    ]:

        query = (
            db.query(
                FinishedProduct
            )
            .join(
                FinishedGoodsReceipt,
                (
                    FinishedProduct
                    .finished_goods_receipt_id
                    ==
                    FinishedGoodsReceipt.id
                ),
            )
        )

        if (
            start_date is not None
        ):

            start_datetime = (
                datetime.combine(
                    start_date,
                    time.min,
                )
            )

            query = query.filter(
                FinishedGoodsReceipt
                .received_at
                >= start_datetime
            )

        if (
            end_date is not None
        ):

            end_exclusive = (
                datetime.combine(
                    (
                        end_date
                        +
                        timedelta(
                            days=1
                        )
                    ),
                    time.min,
                )
            )

            query = query.filter(
                FinishedGoodsReceipt
                .received_at
                < end_exclusive
            )

        return (
            query
            .order_by(
                FinishedProduct
                .id
                .asc()
            )
            .all()
        )

    # ============================================================
    # LEGACY FINISHED PRODUCT COST
    #
    # Older Finished Products do not have a frozen snapshot.
    #
    # For those records:
    #
    # - Material comes from Shop Floor Issues
    # - Operation comes from Production Operations
    # - Direct cost comes from immutable Direct Production expense
    # - Staff / overhead allocation remains zero because no
    #   historical snapshot was frozen for those old records
    # ============================================================

    @staticmethod
    def get_legacy_production_cost(
        db: Session,
        production_order_ids: list[int],
    ) -> dict:

        if (
            not production_order_ids
        ):

            return {
                "material_cost": (
                    Decimal("0.00")
                ),
                "operation_cost": (
                    Decimal("0.00")
                ),
                "direct_expense_cost": (
                    Decimal("0.00")
                ),
            }

        material_value = (
            db.query(
                func.coalesce(
                    func.sum(
                        ShopFloorIssue
                        .total_cost
                    ),
                    0,
                )
            )
            .filter(
                ShopFloorIssue
                .production_order_id
                .in_(
                    production_order_ids
                )
            )
            .scalar()
        )

        operation_value = (
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
                .in_(
                    production_order_ids
                )
            )
            .scalar()
        )

        direct_expense_value = (
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

                Expense
                .production_order_id
                .in_(
                    production_order_ids
                ),
            )
            .scalar()
        )

        return {
            "material_cost": (
                FinancialAnalyzerService
                .money(
                    material_value
                )
            ),
            "operation_cost": (
                FinancialAnalyzerService
                .money(
                    operation_value
                )
            ),
            "direct_expense_cost": (
                FinancialAnalyzerService
                .money(
                    direct_expense_value
                )
            ),
        }

    # ============================================================
    # FINISHED PRODUCT PRODUCTION COST SUMMARY
    #
    # New Finished Products:
    #     frozen snapshot is the source of truth.
    #
    # Old Finished Products:
    #     legacy fallback is used.
    # ============================================================

    @staticmethod
    def get_production_cost_summary(
        db: Session,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict:

        finished_products = (
            FinancialAnalyzerService
            .get_finished_products_in_period(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

        finished_product_count = len(
            finished_products
        )

        if (
            not finished_products
        ):

            return {
                "finished_product_count": 0,
                "snapshot_finished_product_count": 0,
                "legacy_finished_product_count": 0,
                "actual_material_cost": (
                    Decimal("0.00")
                ),
                "actual_operation_cost": (
                    Decimal("0.00")
                ),
                "direct_production_cost": (
                    Decimal("0.00")
                ),
                "allocated_staff_cost": (
                    Decimal("0.00")
                ),
                "allocated_overhead_cost": (
                    Decimal("0.00")
                ),
                "allocated_indirect_cost": (
                    Decimal("0.00")
                ),
                "production_direct_cost": (
                    Decimal("0.00")
                ),
                "total_production_cost": (
                    Decimal("0.00")
                ),
            }

        snapshot_products = [
            finished_product

            for finished_product
            in finished_products

            if (
                finished_product
                .cost_snapshot_at
                is not None
            )
        ]

        legacy_products = [
            finished_product

            for finished_product
            in finished_products

            if (
                finished_product
                .cost_snapshot_at
                is None
            )
        ]

        actual_material_cost = Decimal(
            "0.00"
        )

        actual_operation_cost = Decimal(
            "0.00"
        )

        direct_production_cost = Decimal(
            "0.00"
        )

        allocated_staff_cost = Decimal(
            "0.00"
        )

        allocated_overhead_cost = Decimal(
            "0.00"
        )

        # --------------------------------------------------------
        # FROZEN SNAPSHOTS
        # --------------------------------------------------------

        for finished_product in (
            snapshot_products
        ):

            actual_material_cost += (
                FinancialAnalyzerService
                .money(
                    finished_product
                    .material_cost
                )
            )

            actual_operation_cost += (
                FinancialAnalyzerService
                .money(
                    finished_product
                    .operation_cost
                )
            )

            direct_production_cost += (
                FinancialAnalyzerService
                .money(
                    finished_product
                    .direct_expense_cost
                )
            )

            allocated_staff_cost += (
                FinancialAnalyzerService
                .money(
                    finished_product
                    .allocated_staff_cost
                )
            )

            allocated_overhead_cost += (
                FinancialAnalyzerService
                .money(
                    finished_product
                    .allocated_overhead_cost
                )
            )

        # --------------------------------------------------------
        # LEGACY FALLBACK
        # --------------------------------------------------------

        legacy_order_ids = [
            finished_product
            .production_order_id

            for finished_product
            in legacy_products
        ]

        legacy_cost = (
            FinancialAnalyzerService
            .get_legacy_production_cost(
                db=db,
                production_order_ids=(
                    legacy_order_ids
                ),
            )
        )

        actual_material_cost += (
            legacy_cost[
                "material_cost"
            ]
        )

        actual_operation_cost += (
            legacy_cost[
                "operation_cost"
            ]
        )

        direct_production_cost += (
            legacy_cost[
                "direct_expense_cost"
            ]
        )

        # --------------------------------------------------------
        # NORMALIZE
        # --------------------------------------------------------

        actual_material_cost = (
            FinancialAnalyzerService
            .money(
                actual_material_cost
            )
        )

        actual_operation_cost = (
            FinancialAnalyzerService
            .money(
                actual_operation_cost
            )
        )

        direct_production_cost = (
            FinancialAnalyzerService
            .money(
                direct_production_cost
            )
        )

        allocated_staff_cost = (
            FinancialAnalyzerService
            .money(
                allocated_staff_cost
            )
        )

        allocated_overhead_cost = (
            FinancialAnalyzerService
            .money(
                allocated_overhead_cost
            )
        )

        # --------------------------------------------------------
        # PRODUCT DIRECT COST
        #
        # This is the portion used in P&L before recurring
        # salary / overhead are added separately.
        # --------------------------------------------------------

        production_direct_cost = (
            FinancialAnalyzerService
            .money(
                actual_material_cost
                +
                actual_operation_cost
                +
                direct_production_cost
            )
        )

        # --------------------------------------------------------
        # ALLOCATED INDIRECT COST
        #
        # Informational product-cost allocation only.
        #
        # DO NOT add this again to Financial Analyzer P&L.
        # --------------------------------------------------------

        allocated_indirect_cost = (
            FinancialAnalyzerService
            .money(
                allocated_staff_cost
                +
                allocated_overhead_cost
            )
        )

        # --------------------------------------------------------
        # FULL FINISHED PRODUCT COST
        #
        # Used for product costing / traceability.
        # --------------------------------------------------------

        total_production_cost = (
            FinancialAnalyzerService
            .money(
                production_direct_cost
                +
                allocated_indirect_cost
            )
        )

        return {
            "finished_product_count": (
                finished_product_count
            ),
            "snapshot_finished_product_count": (
                len(
                    snapshot_products
                )
            ),
            "legacy_finished_product_count": (
                len(
                    legacy_products
                )
            ),
            "actual_material_cost": (
                actual_material_cost
            ),
            "actual_operation_cost": (
                actual_operation_cost
            ),
            "direct_production_cost": (
                direct_production_cost
            ),
            "allocated_staff_cost": (
                allocated_staff_cost
            ),
            "allocated_overhead_cost": (
                allocated_overhead_cost
            ),
            "allocated_indirect_cost": (
                allocated_indirect_cost
            ),
            "production_direct_cost": (
                production_direct_cost
            ),
            "total_production_cost": (
                total_production_cost
            ),
        }

    # ============================================================
    # GENERAL COMPANY EXPENSES
    #
    # GENERAL expenses are period expenses.
    #
    # DIRECT_PRODUCTION is excluded because it is already part of
    # Finished Product production cost.
    #
    # OVERHEAD master rows are excluded because the recurring
    # historical overhead rates are calculated separately.
    # ============================================================

    @staticmethod
    def get_general_expense_summary(
        db: Session,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict:

        general_expenses = (
            ExpenseService
            .get_all(
                db=db,
                start_date=start_date,
                end_date=end_date,
                expense_type="GENERAL",
            )
        )

        total_general_expenses = Decimal(
            "0.00"
        )

        category_totals = defaultdict(
            lambda: {
                "amount": Decimal(
                    "0.00"
                ),
                "count": 0,
            }
        )

        for expense in general_expenses:

            amount = (
                FinancialAnalyzerService
                .money(
                    expense.amount
                )
            )

            total_general_expenses += (
                amount
            )

            category_totals[
                expense.category
            ][
                "amount"
            ] += amount

            category_totals[
                expense.category
            ][
                "count"
            ] += 1

        total_general_expenses = (
            FinancialAnalyzerService
            .money(
                total_general_expenses
            )
        )

        expense_breakdown = []

        for category in sorted(
            category_totals
        ):

            data = (
                category_totals[
                    category
                ]
            )

            expense_breakdown.append(
                {
                    "category": (
                        category
                    ),
                    "amount": (
                        FinancialAnalyzerService
                        .money(
                            data[
                                "amount"
                            ]
                        )
                    ),
                    "count": (
                        data[
                            "count"
                        ]
                    ),
                }
            )

        return {
            "general_expense_count": (
                len(
                    general_expenses
                )
            ),
            "total_general_expenses": (
                total_general_expenses
            ),
            "expense_breakdown": (
                expense_breakdown
            ),
        }

    # ============================================================
    # FINANCIAL ANALYSIS
    # ============================================================

    @staticmethod
    def get_analysis(
        db: Session,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict:

        FinancialAnalyzerService.validate_period(
            start_date=start_date,
            end_date=end_date,
        )

        # ========================================================
        # SALES / GST REPORT
        # ========================================================

        gst_report = (
            GSTReportService
            .get_report(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

        gross_sales = (
            FinancialAnalyzerService
            .money(
                gst_report[
                    "gross_taxable_amount"
                ]
            )
        )

        credit_notes = (
            FinancialAnalyzerService
            .money(
                gst_report[
                    "credit_taxable_amount"
                ]
            )
        )

        net_sales = (
            FinancialAnalyzerService
            .money(
                gst_report[
                    "net_taxable_amount"
                ]
            )
        )

        # ========================================================
        # FINISHED PRODUCT COST
        # ========================================================

        production_cost = (
            FinancialAnalyzerService
            .get_production_cost_summary(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

        # ========================================================
        # PERIOD RECURRING SALARY / OVERHEAD
        # ========================================================

        recurring_cost = (
            FinancialAnalyzerService
            .get_period_recurring_costs(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

        staff_salary_cost = (
            recurring_cost[
                "staff_salary_cost"
            ]
        )

        company_overhead_cost = (
            recurring_cost[
                "company_overhead_cost"
            ]
        )

        # ========================================================
        # GENERAL COMPANY EXPENSES
        # ========================================================

        general_expense = (
            FinancialAnalyzerService
            .get_general_expense_summary(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

        total_general_expenses = (
            general_expense[
                "total_general_expenses"
            ]
        )

        # ========================================================
        # PERIOD COMPANY EXPENSES
        #
        # These are costs actually incurred during the reporting
        # period outside direct manufacturing consumption.
        #
        # Staff + Overhead are included here ONCE.
        # ========================================================

        total_expenses = (
            FinancialAnalyzerService
            .money(
                total_general_expenses
                +
                staff_salary_cost
                +
                company_overhead_cost
            )
        )

        # ========================================================
        # TOTAL BUSINESS COST
        #
        # IMPORTANT — NO DOUBLE COUNTING
        #
        # Product direct cost:
        #     Material
        #     + Operation
        #     + Direct Production Expense
        #
        # Period expenses:
        #     Salary
        #     + Overhead
        #     + General Expense
        #
        # Allocated salary / overhead stored inside Finished
        # Product snapshots are NOT added here again.
        # ========================================================

        total_business_cost = (
            FinancialAnalyzerService
            .money(
                production_cost[
                    "production_direct_cost"
                ]
                +
                total_expenses
            )
        )

        # ========================================================
        # NET PROFIT / LOSS
        # ========================================================

        net_profit = (
            FinancialAnalyzerService
            .money(
                net_sales
                -
                total_business_cost
            )
        )

        # ========================================================
        # RESPONSE
        # ========================================================

        return {
            "start_date": (
                start_date
            ),
            "end_date": (
                end_date
            ),

            # ====================================================
            # COUNTS
            # ====================================================

            "invoice_count": (
                gst_report[
                    "invoice_count"
                ]
            ),

            "credit_note_count": (
                gst_report[
                    "credit_note_count"
                ]
            ),

            # Backward-compatible count for current frontend.
            # Now means GENERAL expense records only.
            "expense_count": (
                general_expense[
                    "general_expense_count"
                ]
            ),

            "general_expense_count": (
                general_expense[
                    "general_expense_count"
                ]
            ),

            "finished_product_count": (
                production_cost[
                    "finished_product_count"
                ]
            ),

            "snapshot_finished_product_count": (
                production_cost[
                    "snapshot_finished_product_count"
                ]
            ),

            "legacy_finished_product_count": (
                production_cost[
                    "legacy_finished_product_count"
                ]
            ),

            # ====================================================
            # SALES
            # ====================================================

            "gross_sales": (
                gross_sales
            ),

            "credit_notes": (
                credit_notes
            ),

            "net_sales": (
                net_sales
            ),

            # ====================================================
            # FINISHED PRODUCT COST BREAKDOWN
            # ====================================================

            "actual_material_cost": (
                production_cost[
                    "actual_material_cost"
                ]
            ),

            "actual_operation_cost": (
                production_cost[
                    "actual_operation_cost"
                ]
            ),

            "direct_production_cost": (
                production_cost[
                    "direct_production_cost"
                ]
            ),

            "allocated_staff_cost": (
                production_cost[
                    "allocated_staff_cost"
                ]
            ),

            "allocated_overhead_cost": (
                production_cost[
                    "allocated_overhead_cost"
                ]
            ),

            "allocated_indirect_cost": (
                production_cost[
                    "allocated_indirect_cost"
                ]
            ),

            "production_direct_cost": (
                production_cost[
                    "production_direct_cost"
                ]
            ),

            # Full Finished Product valuation.
            "total_production_cost": (
                production_cost[
                    "total_production_cost"
                ]
            ),

            # ====================================================
            # PERIOD COMPANY EXPENSES
            # ====================================================

            "staff_salary_cost": (
                staff_salary_cost
            ),

            "company_overhead_cost": (
                company_overhead_cost
            ),

            "total_general_expenses": (
                total_general_expenses
            ),

            "total_expenses": (
                total_expenses
            ),

            # ====================================================
            # BUSINESS COST / PROFIT
            # ====================================================

            "total_business_cost": (
                total_business_cost
            ),

            "net_profit": (
                net_profit
            ),

            # ====================================================
            # PERIOD USED FOR RECURRING COST CALCULATION
            # ====================================================

            "recurring_cost_start_date": (
                recurring_cost[
                    "period_start"
                ]
            ),

            "recurring_cost_end_date": (
                recurring_cost[
                    "period_end"
                ]
            ),

            # ====================================================
            # GENERAL EXPENSE BREAKDOWN
            # ====================================================

            "expense_breakdown": (
                general_expense[
                    "expense_breakdown"
                ]
            ),
        }