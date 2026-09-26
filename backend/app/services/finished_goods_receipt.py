from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.finished_goods_receipt import (
    FinishedGoodsReceipt,
)
from app.repositories.finished_goods_receipt import (
    FinishedGoodsReceiptRepository,
)
from app.schemas.finished_goods_receipt import (
    FinishedGoodsReceiptCreate,
)
from app.services.finished_product import (
    FinishedProductService,
)
from app.services.production_cost_service import (
    ProductionCostService,
)


class FinishedGoodsReceiptService:

    def __init__(
        self,
        db: Session,
    ):
        self.db = db

        self.repository = (
            FinishedGoodsReceiptRepository(
                db
            )
        )

        self.finished_product_service = (
            FinishedProductService(
                db
            )
        )

    # ============================================================
    # MOVE COMPLETED PRODUCTION TO FINISHED PRODUCTS
    # ============================================================

    def receive_finished_goods(
        self,
        production_order_id: int,
        data: FinishedGoodsReceiptCreate,
        received_by: int,
    ) -> FinishedGoodsReceipt:
        """
        Convert a Completed Production Order into a
        Finished Product.

        Manufactured Finished Products are separate from
        purchased Products / Store stock.

        Therefore:

        - product_id may be NULL
        - Product.current_stock is NOT changed
        - no FINISHED_GOODS_IN Stock Movement is created
        - production_order.product_name is the manufactured
          product source of truth

        Production costing:

        - actual material cost
        - actual operation cost
        - direct production expense
        - allocated staff salary
        - allocated company overhead

        are frozen into the Finished Product when the Finished
        Goods Receipt is created.

        Later salary / rent / overhead changes therefore do not
        modify the historical Finished Product cost.
        """

        try:

            # ====================================================
            # PRODUCTION ORDER
            # ====================================================

            production_order = (
                self.repository
                .get_production_order_for_update(
                    production_order_id
                )
            )

            if production_order is None:

                raise ValueError(
                    "Production Order not found."
                )


            production_status = (
                production_order.status
                or ""
            ).strip().lower()


            if (
                production_status
                != "completed"
            ):

                raise ValueError(
                    "Finished Product can only be created "
                    "from a Completed Production Order."
                )


            product_name = (
                production_order.product_name
                or ""
            ).strip()


            if not product_name:

                raise ValueError(
                    "The Production Order does not have "
                    "a manufactured product name."
                )


            unit = (
                production_order.unit
                or "Nos"
            ).strip()


            if not unit:

                unit = "Nos"


            # ====================================================
            # EXISTING RECEIPT / RECOVERY
            # ====================================================
            #
            # This keeps the workflow safe to retry.
            #
            # If a receipt already exists but its Finished Product
            # was never created, recreate the Finished Product and
            # freeze its cost in the same transaction.
            #
            # Existing historical Finished Products are NOT
            # automatically recalculated here.
            # ====================================================

            existing_receipt = (
                self.repository
                .get_by_production_order(
                    production_order_id
                )
            )


            if (
                existing_receipt
                is not None
            ):

                existing_finished_product = (
                    self.finished_product_service
                    .get_by_production_order(
                        production_order_id
                    )
                )


                if (
                    existing_finished_product
                    is None
                ):

                    finished_product = (
                        self.finished_product_service
                        .create_from_receipt(
                            production_order=(
                                production_order
                            ),

                            finished_goods_receipt=(
                                existing_receipt
                            ),

                            created_by=(
                                received_by
                            ),
                        )
                    )


                    self._apply_cost_snapshot(
                        finished_product=(
                            finished_product
                        ),

                        production_order_id=(
                            production_order.id
                        ),
                    )


                    self.db.commit()


                    self.db.refresh(
                        existing_receipt
                    )


                return existing_receipt


            # ====================================================
            # FINISHED QUANTITY
            # ====================================================

            quantity_received = Decimal(
                str(
                    production_order.quantity
                )
            )


            if (
                quantity_received
                <= Decimal("0.00")
            ):

                raise ValueError(
                    "Production quantity must be "
                    "greater than zero."
                )


            # ====================================================
            # STORE STOCK MUST NOT CHANGE
            # ====================================================

            stock_before = Decimal(
                "0.00"
            )

            stock_after = Decimal(
                "0.00"
            )


            # ====================================================
            # RECEIPT NUMBER
            # ====================================================

            receipt_number = (
                self._generate_receipt_number(
                    production_order.id
                )
            )


            # ====================================================
            # REMARKS
            # ====================================================

            user_remarks = (
                data.remarks.strip()
                if data.remarks
                else None
            )


            if user_remarks:

                remarks = (
                    user_remarks
                )

            else:

                remarks = (
                    "Production completed and moved "
                    "to Finished Products."
                )


            # ====================================================
            # FINISHED GOODS RECEIPT
            # ====================================================
            #
            # product_id is intentionally nullable.
            #
            # Legacy Production Orders may still have a
            # purchased Product reference.
            #
            # New custom-manufactured products have NULL here.
            # ====================================================

            receipt = (
                FinishedGoodsReceipt(
                    receipt_number=(
                        receipt_number
                    ),

                    production_order_id=(
                        production_order.id
                    ),

                    product_id=(
                        production_order.product_id
                    ),

                    quantity_received=(
                        quantity_received
                    ),

                    stock_before=(
                        stock_before
                    ),

                    stock_after=(
                        stock_after
                    ),

                    received_by=(
                        received_by
                    ),

                    remarks=(
                        remarks
                    ),
                )
            )


            created_receipt = (
                self.repository.create(
                    receipt
                )
            )


            # ====================================================
            # FINISHED PRODUCT
            # ====================================================

            finished_product = (
                self.finished_product_service
                .create_from_receipt(
                    production_order=(
                        production_order
                    ),

                    finished_goods_receipt=(
                        created_receipt
                    ),

                    created_by=(
                        received_by
                    ),
                )
            )


            # ====================================================
            # FREEZE PRODUCTION COST
            # ====================================================
            #
            # This happens before COMMIT.
            #
            # Therefore:
            #
            # Receipt
            # + Finished Product
            # + Cost Snapshot
            #
            # are committed together.
            # ====================================================

            self._apply_cost_snapshot(
                finished_product=(
                    finished_product
                ),

                production_order_id=(
                    production_order.id
                ),
            )


            # ====================================================
            # SINGLE TRANSACTION
            # ====================================================

            self.db.commit()


            self.db.refresh(
                created_receipt
            )


            return created_receipt


        except Exception:

            self.db.rollback()

            raise

    # ============================================================
    # FREEZE FINISHED PRODUCT COST
    # ============================================================

    def _apply_cost_snapshot(
        self,
        finished_product,
        production_order_id: int,
    ) -> None:

        # --------------------------------------------------------
        # NEVER REWRITE AN EXISTING SNAPSHOT
        # --------------------------------------------------------

        if (
            finished_product.cost_snapshot_at
            is not None
        ):

            return


        # --------------------------------------------------------
        # CALCULATE FINAL PRODUCTION COST
        # --------------------------------------------------------

        cost = (
            ProductionCostService
            .calculate(
                db=self.db,

                production_order_id=(
                    production_order_id
                ),
            )
        )


        # --------------------------------------------------------
        # DIRECT COSTS
        # --------------------------------------------------------

        finished_product.material_cost = (
            cost[
                "material_cost"
            ]
        )


        finished_product.operation_cost = (
            cost[
                "operation_cost"
            ]
        )


        finished_product.direct_expense_cost = (
            cost[
                "direct_expense_cost"
            ]
        )


        # --------------------------------------------------------
        # INDIRECT COSTS
        # --------------------------------------------------------

        finished_product.allocated_staff_cost = (
            cost[
                "allocated_staff_cost"
            ]
        )


        finished_product.allocated_overhead_cost = (
            cost[
                "allocated_overhead_cost"
            ]
        )


        # --------------------------------------------------------
        # FINAL COST
        # --------------------------------------------------------

        finished_product.total_production_cost = (
            cost[
                "total_production_cost"
            ]
        )


        finished_product.unit_cost = (
            cost[
                "unit_cost"
            ]
        )


        # --------------------------------------------------------
        # SNAPSHOT TIMESTAMP
        #
        # Once this timestamp exists, the historical Finished
        # Product cost is considered frozen.
        # --------------------------------------------------------

        finished_product.cost_snapshot_at = (
            datetime.utcnow()
        )


        self.db.flush()

    # ============================================================
    # READ
    # ============================================================

    def get_receipt(
        self,
        receipt_id: int,
    ) -> FinishedGoodsReceipt | None:

        return (
            self.repository
            .get_by_id(
                receipt_id
            )
        )


    def get_receipt_by_number(
        self,
        receipt_number: str,
    ) -> FinishedGoodsReceipt | None:

        return (
            self.repository
            .get_by_number(
                receipt_number
            )
        )


    def get_receipt_by_production_order(
        self,
        production_order_id: int,
    ) -> FinishedGoodsReceipt | None:

        return (
            self.repository
            .get_by_production_order(
                production_order_id
            )
        )


    def get_all_receipts(
        self,
    ) -> list[
        FinishedGoodsReceipt
    ]:

        return (
            self.repository
            .get_all()
        )

    # ============================================================
    # RECEIPT NUMBER
    # ============================================================

    def _generate_receipt_number(
        self,
        production_order_id: int,
    ) -> str:

        year = (
            datetime.utcnow()
            .year
        )

        return (
            f"FGR-{year}-"
            f"{production_order_id:04d}"
        )