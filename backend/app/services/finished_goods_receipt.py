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

    # ========================================================
    # MOVE COMPLETED PRODUCTION TO FINISHED PRODUCTS
    # ========================================================

    def receive_finished_goods(
        self,
        production_order_id: int,
        data: FinishedGoodsReceiptCreate,
        received_by: int,
    ) -> FinishedGoodsReceipt:
        """
        Convert a Completed Production Order into a
        Finished Product.

        IMPORTANT:

        Manufactured Finished Products are deliberately
        kept separate from purchased Store stock.

        Therefore this workflow DOES NOT:

        - increase Product.current_stock
        - create a purchased-stock quantity
        - create FINISHED_GOODS_IN in the Store ledger

        The Product table is only used as the product master
        reference.

        The FinishedGoodsReceipt record remains as the
        manufacturing completion / receipt audit record.

        The FinishedProduct record is then created from it.
        """

        try:

            # ====================================================
            # LOCK PRODUCTION ORDER
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


            # ====================================================
            # DUPLICATE PROTECTION
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
                raise ValueError(
                    "This Production Order has already "
                    "been moved to Finished Products."
                )


            # ====================================================
            # PRODUCT MASTER
            # ====================================================
            #
            # We verify that the linked Product Master exists.
            #
            # We DO NOT change Product.current_stock.
            #
            # ====================================================

            product = (
                self.repository
                .get_product_for_update(
                    production_order.product_id
                )
            )

            if product is None:
                raise ValueError(
                    f"Product {production_order.product_id} "
                    "was not found or is inactive."
                )


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
            # IMPORTANT:
            # DO NOT ALTER PURCHASED STOCK
            # ====================================================
            #
            # These fields remain because they already exist in
            # the FinishedGoodsReceipt table.
            #
            # They are intentionally kept at zero so this
            # manufacturing workflow cannot affect Store stock.
            #
            # Finished quantity is represented by:
            #
            #     quantity_received
            #
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
            # FINISHED GOODS RECEIPT / AUDIT RECORD
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
                        product.id
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
            # CREATE FINISHED PRODUCT
            # ====================================================

            self.finished_product_service.create_from_receipt(
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


    # ========================================================
    # READ
    # ========================================================

    def get_receipt(
        self,
        receipt_id: int,
    ) -> FinishedGoodsReceipt | None:

        return (
            self.repository.get_by_id(
                receipt_id
            )
        )


    def get_receipt_by_number(
        self,
        receipt_number: str,
    ) -> FinishedGoodsReceipt | None:

        return (
            self.repository.get_by_number(
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
    ) -> list[FinishedGoodsReceipt]:

        return (
            self.repository.get_all()
        )


    # ========================================================
    # RECEIPT NUMBER
    # ========================================================

    def _generate_receipt_number(
        self,
        production_order_id: int,
    ) -> str:

        year = (
            datetime.utcnow().year
        )


        return (
            f"FGR-{year}-"
            f"{production_order_id:04d}"
        )