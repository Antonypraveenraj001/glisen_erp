from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.production_material import ProductionMaterial
from app.models.production_operation import ProductionOperation
from app.models.production_order import ProductionOrder


# ============================================================
# PRODUCTION ORDER REPOSITORY
# ============================================================


class ProductionOrderRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, production_order: ProductionOrder) -> ProductionOrder:
        self.db.add(production_order)
        self.db.commit()
        self.db.refresh(production_order)

        return production_order

    def get_all(self) -> list[ProductionOrder]:
        statement = select(ProductionOrder).order_by(
            ProductionOrder.id.desc()
        )

        return list(self.db.scalars(statement).all())

    def get_by_id(self, production_order_id: int) -> ProductionOrder | None:
        statement = select(ProductionOrder).where(
            ProductionOrder.id == production_order_id
        )

        return self.db.scalars(statement).first()

    def get_by_number(
        self,
        production_number: str,
    ) -> ProductionOrder | None:
        statement = select(ProductionOrder).where(
            ProductionOrder.production_number == production_number
        )

        return self.db.scalars(statement).first()

    def get_by_proforma(
        self,
        proforma_id: int,
    ) -> list[ProductionOrder]:
        statement = (
            select(ProductionOrder)
            .where(ProductionOrder.proforma_id == proforma_id)
            .order_by(ProductionOrder.id.desc())
        )

        return list(self.db.scalars(statement).all())

    def update(
        self,
        production_order: ProductionOrder,
    ) -> ProductionOrder:
        self.db.commit()
        self.db.refresh(production_order)

        return production_order

    def delete(
        self,
        production_order: ProductionOrder,
    ) -> None:
        self.db.delete(production_order)
        self.db.commit()


# ============================================================
# PRODUCTION MATERIAL REPOSITORY
# ============================================================


class ProductionMaterialRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        material: ProductionMaterial,
    ) -> ProductionMaterial:
        self.db.add(material)
        self.db.commit()
        self.db.refresh(material)

        return material

    def get_by_id(
        self,
        material_id: int,
    ) -> ProductionMaterial | None:
        statement = select(ProductionMaterial).where(
            ProductionMaterial.id == material_id
        )

        return self.db.scalars(statement).first()

    def get_by_production_order(
        self,
        production_order_id: int,
    ) -> list[ProductionMaterial]:
        statement = (
            select(ProductionMaterial)
            .where(
                ProductionMaterial.production_order_id
                == production_order_id
            )
            .order_by(ProductionMaterial.id.asc())
        )

        return list(self.db.scalars(statement).all())

    def update(
        self,
        material: ProductionMaterial,
    ) -> ProductionMaterial:
        self.db.commit()
        self.db.refresh(material)

        return material

    def delete(
        self,
        material: ProductionMaterial,
    ) -> None:
        self.db.delete(material)
        self.db.commit()


# ============================================================
# PRODUCTION OPERATION REPOSITORY
# ============================================================


class ProductionOperationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        operation: ProductionOperation,
    ) -> ProductionOperation:
        self.db.add(operation)
        self.db.commit()
        self.db.refresh(operation)

        return operation

    def get_by_id(
        self,
        operation_id: int,
    ) -> ProductionOperation | None:
        statement = select(ProductionOperation).where(
            ProductionOperation.id == operation_id
        )

        return self.db.scalars(statement).first()

    def get_by_production_order(
        self,
        production_order_id: int,
    ) -> list[ProductionOperation]:
        statement = (
            select(ProductionOperation)
            .where(
                ProductionOperation.production_order_id
                == production_order_id
            )
            .order_by(ProductionOperation.id.asc())
        )

        return list(self.db.scalars(statement).all())

    def update(
        self,
        operation: ProductionOperation,
    ) -> ProductionOperation:
        self.db.commit()
        self.db.refresh(operation)

        return operation

    def delete(
        self,
        operation: ProductionOperation,
    ) -> None:
        self.db.delete(operation)
        self.db.commit()