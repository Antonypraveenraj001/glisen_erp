from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.production_material import ProductionMaterial
from app.models.production_order import ProductionOrder
from app.models.shop_floor_issue import ShopFloorIssue


class ShopFloorIssueRepository:
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

    def get_material_for_update(
        self,
        production_material_id: int,
    ) -> ProductionMaterial | None:
        statement = (
            select(ProductionMaterial)
            .where(
                ProductionMaterial.id
                == production_material_id
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
    # ISSUE RECORD
    # ========================================================

    def create(
        self,
        issue: ShopFloorIssue,
    ) -> ShopFloorIssue:
        self.db.add(
            issue
        )

        self.db.flush()

        return issue

    def get_by_id(
        self,
        issue_id: int,
    ) -> ShopFloorIssue | None:
        statement = select(
            ShopFloorIssue
        ).where(
            ShopFloorIssue.id == issue_id
        )

        return self.db.scalars(
            statement
        ).first()

    def get_by_number(
        self,
        issue_number: str,
    ) -> ShopFloorIssue | None:
        statement = select(
            ShopFloorIssue
        ).where(
            ShopFloorIssue.issue_number
            == issue_number
        )

        return self.db.scalars(
            statement
        ).first()

    def get_all(
        self,
    ) -> list[ShopFloorIssue]:
        statement = (
            select(ShopFloorIssue)
            .order_by(
                ShopFloorIssue.id.desc()
            )
        )

        return list(
            self.db.scalars(
                statement
            ).all()
        )

    def get_by_production_order(
        self,
        production_order_id: int,
    ) -> list[ShopFloorIssue]:
        statement = (
            select(ShopFloorIssue)
            .where(
                ShopFloorIssue.production_order_id
                == production_order_id
            )
            .order_by(
                ShopFloorIssue.id.asc()
            )
        )

        return list(
            self.db.scalars(
                statement
            ).all()
        )

    def get_by_material(
        self,
        production_material_id: int,
    ) -> list[ShopFloorIssue]:
        statement = (
            select(ShopFloorIssue)
            .where(
                ShopFloorIssue.production_material_id
                == production_material_id
            )
            .order_by(
                ShopFloorIssue.id.asc()
            )
        )

        return list(
            self.db.scalars(
                statement
            ).all()
        )

    def get_latest(
        self,
    ) -> ShopFloorIssue | None:
        statement = (
            select(ShopFloorIssue)
            .order_by(
                ShopFloorIssue.id.desc()
            )
            .limit(1)
        )

        return self.db.scalars(
            statement
        ).first()