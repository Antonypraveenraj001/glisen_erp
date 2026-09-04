from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.finished_goods_receipt import FinishedGoodsReceipt
from app.models.product import Product
from app.models.production_order import ProductionOrder


class FinishedGoodsReceiptRepository:
    def __init__(
        self,
        db: Session,
    ):
        self.db = db

    # ========================================================
    # LOCKED SOURCE RECORDS
    # ========================================================

    def get_production_order_for_update(
        self,
        production_order_id: int,
    ) -> ProductionOrder | None:
        statement = (
            select(ProductionOrder)
            .where(
                ProductionOrder.id
                == production_order_id
            )
            .with_for_update()
        )

        return self.db.scalars(
            statement
        ).first()

    def get_product_for_update(
        self,
        product_id: int,
    ) -> Product | None:
        statement = (
            select(Product)
            .where(
                Product.id == product_id,
                Product.is_active == True,
            )
            .with_for_update()
        )

        return self.db.scalars(
            statement
        ).first()

    # ========================================================
    # RECEIPT RECORD
    # ========================================================

    def create(
        self,
        receipt: FinishedGoodsReceipt,
    ) -> FinishedGoodsReceipt:
        self.db.add(
            receipt
        )

        self.db.flush()

        return receipt

    def get_by_id(
        self,
        receipt_id: int,
    ) -> FinishedGoodsReceipt | None:
        statement = select(
            FinishedGoodsReceipt
        ).where(
            FinishedGoodsReceipt.id
            == receipt_id
        )

        return self.db.scalars(
            statement
        ).first()

    def get_by_number(
        self,
        receipt_number: str,
    ) -> FinishedGoodsReceipt | None:
        statement = select(
            FinishedGoodsReceipt
        ).where(
            FinishedGoodsReceipt.receipt_number
            == receipt_number
        )

        return self.db.scalars(
            statement
        ).first()

    def get_by_production_order(
        self,
        production_order_id: int,
    ) -> FinishedGoodsReceipt | None:
        statement = select(
            FinishedGoodsReceipt
        ).where(
            FinishedGoodsReceipt.production_order_id
            == production_order_id
        )

        return self.db.scalars(
            statement
        ).first()

    def get_all(
        self,
    ) -> list[FinishedGoodsReceipt]:
        statement = (
            select(FinishedGoodsReceipt)
            .order_by(
                FinishedGoodsReceipt.id.desc()
            )
        )

        return list(
            self.db.scalars(
                statement
            ).all()
        )

    def get_latest(
        self,
    ) -> FinishedGoodsReceipt | None:
        statement = (
            select(FinishedGoodsReceipt)
            .order_by(
                FinishedGoodsReceipt.id.desc()
            )
            .limit(1)
        )

        return self.db.scalars(
            statement
        ).first()