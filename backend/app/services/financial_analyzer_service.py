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

from app.services.expense_service import (
    ExpenseService,
)
from app.services.gst_report_service import (
    GSTReportService,
)


class FinancialAnalyzerService:

    # ========================================================
    # MONEY
    # ========================================================

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

    # ========================================================
    # FINISHED PRODUCT PRODUCTION COST
    # ========================================================

    @staticmethod
    def get_production_cost_summary(
        db: Session,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict:
        """
        Calculate actual production cost for Finished Products.

        Production cost is recognized based on the
        Finished Goods Receipt date.

        Material cost source:
            ShopFloorIssue.total_cost

        Operation cost source:
            ProductionOperation.operation_cost
        """

        # ----------------------------------------------------
        # FINISHED PRODUCTS IN PERIOD
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # START DATE
        # ----------------------------------------------------

        if start_date is not None:
            start_datetime = (
                datetime.combine(
                    start_date,
                    time.min,
                )
            )

            query = query.filter(
                FinishedGoodsReceipt.received_at
                >= start_datetime
            )

        # ----------------------------------------------------
        # END DATE
        #
        # Exclusive next-day boundary ensures the complete
        # end date is included.
        # ----------------------------------------------------

        if end_date is not None:
            end_exclusive = (
                datetime.combine(
                    (
                        end_date
                        + timedelta(
                            days=1
                        )
                    ),
                    time.min,
                )
            )

            query = query.filter(
                FinishedGoodsReceipt.received_at
                < end_exclusive
            )

        finished_products = (
            query
            .order_by(
                FinishedProduct.id.asc()
            )
            .all()
        )

        finished_product_count = (
            len(
                finished_products
            )
        )

        # ----------------------------------------------------
        # NO FINISHED PRODUCTS
        # ----------------------------------------------------

        if not finished_products:
            return {
                "finished_product_count": 0,
                "actual_material_cost": (
                    Decimal("0.00")
                ),
                "actual_operation_cost": (
                    Decimal("0.00")
                ),
                "total_production_cost": (
                    Decimal("0.00")
                ),
            }

        # ----------------------------------------------------
        # PRODUCTION ORDER IDS
        # ----------------------------------------------------

        production_order_ids = [
            finished_product
            .production_order_id
            for finished_product
            in finished_products
        ]

        # ----------------------------------------------------
        # ACTUAL MATERIAL COST
        #
        # Immutable Shop Floor Issue records are the source
        # of truth for material consumption cost.
        # ----------------------------------------------------

        material_cost_value = (
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

        actual_material_cost = (
            FinancialAnalyzerService
            .money(
                material_cost_value
            )
        )

        # ----------------------------------------------------
        # ACTUAL OPERATION COST
        # ----------------------------------------------------

        operation_cost_value = (
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

        actual_operation_cost = (
            FinancialAnalyzerService
            .money(
                operation_cost_value
            )
        )

        # ----------------------------------------------------
        # TOTAL PRODUCTION COST
        # ----------------------------------------------------

        total_production_cost = (
            FinancialAnalyzerService
            .money(
                actual_material_cost
                + actual_operation_cost
            )
        )

        return {
            "finished_product_count": (
                finished_product_count
            ),
            "actual_material_cost": (
                actual_material_cost
            ),
            "actual_operation_cost": (
                actual_operation_cost
            ),
            "total_production_cost": (
                total_production_cost
            ),
        }

    # ========================================================
    # FINANCIAL ANALYSIS
    # ========================================================

    @staticmethod
    def get_analysis(
        db: Session,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict:

        # ----------------------------------------------------
        # DATE VALIDATION
        # ----------------------------------------------------

        if (
            start_date is not None
            and end_date is not None
            and start_date > end_date
        ):
            raise ValueError(
                "Start date cannot be after end date."
            )

        # ----------------------------------------------------
        # GST / SALES REPORT
        # ----------------------------------------------------

        gst_report = (
            GSTReportService
            .get_report(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

        # ----------------------------------------------------
        # COMPANY EXPENSES
        # ----------------------------------------------------

        expenses = (
            ExpenseService
            .get_all(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

        total_expenses = Decimal(
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

        for expense in expenses:
            amount = (
                FinancialAnalyzerService
                .money(
                    expense.amount
                )
            )

            total_expenses += amount

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

        total_expenses = (
            FinancialAnalyzerService
            .money(
                total_expenses
            )
        )

        # ----------------------------------------------------
        # PRODUCTION COST
        # ----------------------------------------------------

        production_cost_summary = (
            FinancialAnalyzerService
            .get_production_cost_summary(
                db=db,
                start_date=start_date,
                end_date=end_date,
            )
        )

        finished_product_count = (
            production_cost_summary[
                "finished_product_count"
            ]
        )

        actual_material_cost = (
            production_cost_summary[
                "actual_material_cost"
            ]
        )

        actual_operation_cost = (
            production_cost_summary[
                "actual_operation_cost"
            ]
        )

        total_production_cost = (
            production_cost_summary[
                "total_production_cost"
            ]
        )

        # ----------------------------------------------------
        # SALES REVENUE
        #
        # Revenue excludes GST.
        #
        # GST collected from customers is a tax liability,
        # not company revenue.
        #
        # Therefore:
        #
        # Gross Sales
        #     = Gross Taxable Amount
        #
        # Credit Notes
        #     = Credit Taxable Amount
        #
        # Net Sales
        #     = Net Taxable Amount
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # TOTAL BUSINESS COST
        #
        # Production Cost
        #     = Material Cost
        #       + Operation Cost
        #
        # Total Business Cost
        #     = Production Cost
        #       + Company Expenses
        # ----------------------------------------------------

        total_business_cost = (
            FinancialAnalyzerService
            .money(
                total_production_cost
                + total_expenses
            )
        )

        # ----------------------------------------------------
        # NET PROFIT / LOSS
        #
        # Net Profit
        #     = Net Sales Revenue
        #       - Total Business Cost
        # ----------------------------------------------------

        net_profit = (
            FinancialAnalyzerService
            .money(
                net_sales
                - total_business_cost
            )
        )

        # ----------------------------------------------------
        # EXPENSE BREAKDOWN
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return {
            "start_date": (
                start_date
            ),
            "end_date": (
                end_date
            ),

            # =================================================
            # COUNTS
            # =================================================

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

            "expense_count": (
                len(
                    expenses
                )
            ),

            "finished_product_count": (
                finished_product_count
            ),

            # =================================================
            # SALES
            # =================================================

            "gross_sales": (
                gross_sales
            ),

            "credit_notes": (
                credit_notes
            ),

            "net_sales": (
                net_sales
            ),

            # =================================================
            # PRODUCTION COST
            # =================================================

            "actual_material_cost": (
                actual_material_cost
            ),

            "actual_operation_cost": (
                actual_operation_cost
            ),

            "total_production_cost": (
                total_production_cost
            ),

            # =================================================
            # COMPANY EXPENSES
            # =================================================

            "total_expenses": (
                total_expenses
            ),

            # =================================================
            # BUSINESS COST / PROFIT
            # =================================================

            "total_business_cost": (
                total_business_cost
            ),

            "net_profit": (
                net_profit
            ),

            # =================================================
            # BREAKDOWN
            # =================================================

            "expense_breakdown": (
                expense_breakdown
            ),
        }