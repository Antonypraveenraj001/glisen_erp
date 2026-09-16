from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.finished_product import FinishedProduct


class FinishedProductRepository:
    def __init__(
        self,
        db: Session,
    ):
        self.db = db

    # ========================================================
    # CREATE
    # ========================================================

    def create(
        self,
        finished_product: FinishedProduct,
    ) -> FinishedProduct:
        self.db.add(
            finished_product
        )

        self.db.flush()

        return finished_product

    # ========================================================
    # READ
    # ========================================================

    def get_by_id(
        self,
        finished_product_id: int,
    ) -> FinishedProduct | None:
        statement = (
            select(FinishedProduct)
            .where(
                FinishedProduct.id
                == finished_product_id
            )
        )

        return self.db.scalars(
            statement
        ).first()

    def get_by_number(
        self,
        finished_product_number: str,
    ) -> FinishedProduct | None:
        statement = (
            select(FinishedProduct)
            .where(
                FinishedProduct.finished_product_number
                == finished_product_number
            )
        )

        return self.db.scalars(
            statement
        ).first()

    def get_by_production_order(
        self,
        production_order_id: int,
    ) -> FinishedProduct | None:
        statement = (
            select(FinishedProduct)
            .where(
                FinishedProduct.production_order_id
                == production_order_id
            )
        )

        return self.db.scalars(
            statement
        ).first()

    def get_by_finished_goods_receipt(
        self,
        finished_goods_receipt_id: int,
    ) -> FinishedProduct | None:
        statement = (
            select(FinishedProduct)
            .where(
                FinishedProduct.finished_goods_receipt_id
                == finished_goods_receipt_id
            )
        )

        return self.db.scalars(
            statement
        ).first()

    def get_by_product_master(
        self,
        product_master_id: int,
    ) -> list[FinishedProduct]:
        statement = (
            select(FinishedProduct)
            .where(
                FinishedProduct.product_master_id
                == product_master_id
            )
            .order_by(
                FinishedProduct.id.desc()
            )
        )

        return list(
            self.db.scalars(
                statement
            ).all()
        )

    def get_all(
        self,
    ) -> list[FinishedProduct]:
        statement = (
            select(FinishedProduct)
            .order_by(
                FinishedProduct.id.desc()
            )
        )

        return list(
            self.db.scalars(
                statement
            ).all()
        )

    def get_latest(
        self,
    ) -> FinishedProduct | None:
        statement = (
            select(FinishedProduct)
            .order_by(
                FinishedProduct.id.desc()
            )
            .limit(1)
        )

        return self.db.scalars(
            statement
        ).first()