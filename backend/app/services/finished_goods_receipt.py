from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.finished_goods_receipt import FinishedGoodsReceipt
from app.repositories.finished_goods_receipt import (
    FinishedGoodsReceiptRepository,
)
from app.schemas.finished_goods_receipt import (
    FinishedGoodsReceiptCreate,
)


class FinishedGoodsReceiptService:
    def __init__(
        self,
        db: Session,
    ):
        self.db = db

        self.repository = FinishedGoodsReceiptRepository(
            db
        )

    # ========================================================
    # RECEIVE FINISHED GOODS
    # ========================================================

    def receive_finished_goods(
        self,
        production_order_id: int,
        data: FinishedGoodsReceiptCreate,
        received_by: int,
    ) -> FinishedGoodsReceipt:
        """
        Receive completed production into finished-goods stock.

        Transaction rules:

        1. Lock Production Order.
        2. Production Order must be Completed.
        3. The Production Order must not already have a receipt.
        4. Lock the finished Product.
        5. Increase Product.current_stock.
        6. Record stock_before and stock_after.
        7. Create immutable FinishedGoodsReceipt history.
        8. Commit everything together.

        One Production Order may only be received once.
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
                    "Production order not found."
                )

            production_status = (
                production_order.status
                or ""
            ).strip().lower()

            if production_status != "completed":
                raise ValueError(
                    "Finished goods can only be received "
                    "from a Completed Production Order."
                )

            # ====================================================
            # DUPLICATE RECEIPT PROTECTION
            # ====================================================

            existing_receipt = (
                self.repository
                .get_by_production_order(
                    production_order_id
                )
            )

            if existing_receipt is not None:
                raise ValueError(
                    "Finished goods for this Production Order "
                    "have already been received into stock."
                )

            # ====================================================
            # FINISHED PRODUCT
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
                    "is not found or is inactive."
                )

            # ====================================================
            # QUANTITY
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
            # STOCK MOVEMENT
            # ====================================================

            stock_before = Decimal(
                str(
                    product.current_stock
                )
            )

            stock_after = (
                stock_before
                + quantity_received
            )

            product.current_stock = (
                stock_after
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

            remarks = (
                data.remarks.strip()
                if data.remarks
                else None
            )

            # ====================================================
            # RECEIPT HISTORY
            # ====================================================

            receipt = FinishedGoodsReceipt(
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

            created_receipt = (
                self.repository.create(
                    receipt
                )
            )

            # ====================================================
            # SINGLE TRANSACTION COMMIT
            # ====================================================

            self.db.commit()

            self.db.refresh(
                created_receipt
            )

            self.db.refresh(
                product
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
        """
        Generate an audit-safe receipt number.

        Example:
            FGR-2026-0001

        Production Order ID is used as the numeric portion so
        separate concurrent receipts cannot generate the same
        receipt number.
        """

        year = (
            datetime.utcnow().year
        )

        return (
            f"FGR-{year}-"
            f"{production_order_id:04d}"
        )