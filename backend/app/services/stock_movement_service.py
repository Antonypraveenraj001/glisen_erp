from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.finished_goods_receipt import (
    FinishedGoodsReceipt,
)
from app.models.product import Product
from app.models.purchase_bill import PurchaseBill
from app.models.purchase_bill_item import (
    PurchaseBillItem,
)
from app.models.shop_floor_issue import (
    ShopFloorIssue,
)
from app.schemas.stock_movement import (
    StockMovementItem,
    StockMovementResponse,
)


class StockMovementService:

    @staticmethod
    def get_movements(
        db: Session,
        product_id: int | None = None,
        movement_type: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> StockMovementResponse:

        movements: list[StockMovementItem] = []

        total_quantity_in = Decimal("0.00")
        total_quantity_out = Decimal("0.00")
        total_in_value = Decimal("0.00")
        total_out_value = Decimal("0.00")

        requested_type = None

        if movement_type:
            requested_type = (
                movement_type
                .strip()
                .lower()
            )

        # ========================================================
        # PURCHASE BILL STOCK IN
        # ========================================================

        if (
            requested_type is None
            or requested_type
            == "purchase"
        ):

            query = (
                db.query(
                    PurchaseBillItem,
                    PurchaseBill,
                    Product,
                )
                .join(
                    PurchaseBill,
                    PurchaseBill.id
                    == PurchaseBillItem.purchase_bill_id,
                )
                .join(
                    Product,
                    Product.id
                    == PurchaseBillItem.product_id,
                )
                .filter(
                    PurchaseBill.is_active
                    == True,
                )
            )

            if product_id is not None:
                query = query.filter(
                    Product.id == product_id
                )

            if start_date is not None:
                query = query.filter(
                    PurchaseBill.created_at
                    >= start_date
                )

            if end_date is not None:
                query = query.filter(
                    PurchaseBill.created_at
                    <= end_date
                )

            purchase_rows = query.all()

            for (
                item,
                bill,
                product,
            ) in purchase_rows:

                quantity = Decimal(
                    str(item.quantity)
                )

                unit_cost = Decimal(
                    str(
                        item.purchase_price
                        or Decimal("0.00")
                    )
                )

                movement_value = (
                    quantity
                    * unit_cost
                ).quantize(
                    Decimal("0.01")
                )

                total_quantity_in += quantity
                total_in_value += movement_value

                movements.append(
                    StockMovementItem(
                        movement_type="Purchase",
                        reference_id=bill.id,
                        reference_number=(
                            bill.bill_number
                        ),
                        product_id=product.id,
                        product_code=(
                            product.product_code
                        ),
                        product_name=(
                            product.product_name
                        ),
                        quantity_in=quantity,
                        quantity_out=Decimal(
                            "0.00"
                        ),
                        stock_before=None,
                        stock_after=None,
                        unit_cost=unit_cost,
                        movement_value=(
                            movement_value
                        ),
                        movement_date=(
                            bill.created_at
                        ),
                        remarks=bill.remarks,
                    )
                )

        # ========================================================
        # SHOP FLOOR STOCK OUT
        # ========================================================

        if (
            requested_type is None
            or requested_type
            == "shop floor issue"
        ):

            query = (
                db.query(
                    ShopFloorIssue,
                    Product,
                )
                .join(
                    Product,
                    Product.id
                    == ShopFloorIssue.product_id,
                )
            )

            if product_id is not None:
                query = query.filter(
                    Product.id == product_id
                )

            if start_date is not None:
                query = query.filter(
                    ShopFloorIssue.issued_at
                    >= start_date
                )

            if end_date is not None:
                query = query.filter(
                    ShopFloorIssue.issued_at
                    <= end_date
                )

            issue_rows = query.all()

            for issue, product in issue_rows:

                quantity = Decimal(
                    str(issue.quantity_issued)
                )

                unit_cost = Decimal(
                    str(issue.unit_cost)
                )

                movement_value = Decimal(
                    str(issue.total_cost)
                )

                total_quantity_out += quantity
                total_out_value += movement_value

                movements.append(
                    StockMovementItem(
                        movement_type=(
                            "Shop Floor Issue"
                        ),
                        reference_id=issue.id,
                        reference_number=(
                            issue.issue_number
                        ),
                        product_id=product.id,
                        product_code=(
                            product.product_code
                        ),
                        product_name=(
                            product.product_name
                        ),
                        quantity_in=Decimal(
                            "0.00"
                        ),
                        quantity_out=quantity,
                        stock_before=(
                            Decimal(
                                str(
                                    issue.stock_before
                                )
                            )
                        ),
                        stock_after=(
                            Decimal(
                                str(
                                    issue.stock_after
                                )
                            )
                        ),
                        unit_cost=unit_cost,
                        movement_value=(
                            movement_value
                        ),
                        movement_date=(
                            issue.issued_at
                        ),
                        remarks=issue.remarks,
                    )
                )

        # ========================================================
        # FINISHED GOODS STOCK IN
        # ========================================================

        if (
            requested_type is None
            or requested_type
            == "finished goods receipt"
        ):

            query = (
                db.query(
                    FinishedGoodsReceipt,
                    Product,
                )
                .join(
                    Product,
                    Product.id
                    == FinishedGoodsReceipt.product_id,
                )
            )

            if product_id is not None:
                query = query.filter(
                    Product.id == product_id
                )

            if start_date is not None:
                query = query.filter(
                    FinishedGoodsReceipt.received_at
                    >= start_date
                )

            if end_date is not None:
                query = query.filter(
                    FinishedGoodsReceipt.received_at
                    <= end_date
                )

            receipt_rows = query.all()

            for receipt, product in receipt_rows:

                quantity = Decimal(
                    str(
                        receipt.quantity_received
                    )
                )

                unit_cost = Decimal(
                    str(
                        product.purchase_price
                        or Decimal("0.00")
                    )
                )

                movement_value = (
                    quantity
                    * unit_cost
                ).quantize(
                    Decimal("0.01")
                )

                total_quantity_in += quantity
                total_in_value += movement_value

                movements.append(
                    StockMovementItem(
                        movement_type=(
                            "Finished Goods Receipt"
                        ),
                        reference_id=receipt.id,
                        reference_number=(
                            receipt.receipt_number
                        ),
                        product_id=product.id,
                        product_code=(
                            product.product_code
                        ),
                        product_name=(
                            product.product_name
                        ),
                        quantity_in=quantity,
                        quantity_out=Decimal(
                            "0.00"
                        ),
                        stock_before=(
                            Decimal(
                                str(
                                    receipt.stock_before
                                )
                            )
                        ),
                        stock_after=(
                            Decimal(
                                str(
                                    receipt.stock_after
                                )
                            )
                        ),
                        unit_cost=unit_cost,
                        movement_value=(
                            movement_value
                        ),
                        movement_date=(
                            receipt.received_at
                        ),
                        remarks=receipt.remarks,
                    )
                )

        # ========================================================
        # SORT
        # ========================================================

        movements.sort(
            key=lambda item: (
                item.movement_date,
                item.reference_id,
            ),
            reverse=True,
        )

        return StockMovementResponse(
            total_movements=len(movements),
            total_quantity_in=(
                total_quantity_in
            ),
            total_quantity_out=(
                total_quantity_out
            ),
            total_in_value=(
                total_in_value
            ),
            total_out_value=(
                total_out_value
            ),
            items=movements,
        )