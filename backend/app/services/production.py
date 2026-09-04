from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.production_material import ProductionMaterial
from app.models.production_operation import ProductionOperation
from app.models.production_order import ProductionOrder
from app.repositories.product_repository import ProductRepository
from app.repositories.production import (
    ProductionMaterialRepository,
    ProductionOperationRepository,
    ProductionOrderRepository,
)
from app.repositories.proforma_repository import ProformaRepository
from app.schemas.production import (
    ProductionMaterialCreate,
    ProductionMaterialSummaryResponse,
    ProductionMaterialUpdate,
    ProductionOperationCreate,
    ProductionOperationUpdate,
    ProductionOrderCreate,
    ProductionOrderDetailResponse,
    ProductionOrderUpdate,
)


class ProductionService:
    def __init__(self, db: Session):
        self.db = db

        self.production_order_repository = ProductionOrderRepository(db)
        self.material_repository = ProductionMaterialRepository(db)
        self.operation_repository = ProductionOperationRepository(db)

        self.proforma_repository = ProformaRepository(db)

    # ========================================================
    # PRODUCTION ORDER
    # ========================================================

    def create_production_order(
        self,
        data: ProductionOrderCreate,
    ) -> ProductionOrder:
        production_number = self._generate_production_number()

        production_order = ProductionOrder(
            production_number=production_number,
            proforma_id=data.proforma_id,
            product_id=data.product_id,
            quantity=data.quantity,
            status=data.status,
            planned_start_date=data.planned_start_date,
            actual_start_date=data.actual_start_date,
            actual_end_date=data.actual_end_date,
            notes=data.notes,
        )

        return self.production_order_repository.create(
            production_order
        )

    def get_all_production_orders(
        self,
    ) -> list[ProductionOrder]:
        return self.production_order_repository.get_all()

    def get_production_order(
        self,
        production_order_id: int,
    ) -> ProductionOrder | None:
        return self.production_order_repository.get_by_id(
            production_order_id
        )

    def get_production_order_by_number(
        self,
        production_number: str,
    ) -> ProductionOrder | None:
        return self.production_order_repository.get_by_number(
            production_number
        )

    def get_production_orders_by_proforma(
        self,
        proforma_id: int,
    ) -> list[ProductionOrder]:
        return self.production_order_repository.get_by_proforma(
            proforma_id
        )

    def update_production_order(
        self,
        production_order: ProductionOrder,
        data: ProductionOrderUpdate,
    ) -> ProductionOrder:
        update_data = data.model_dump(
            exclude_unset=True
        )

        for field, value in update_data.items():
            setattr(
                production_order,
                field,
                value,
            )

        return self.production_order_repository.update(
            production_order
        )

    def delete_production_order(
        self,
        production_order: ProductionOrder,
    ) -> None:
        self.production_order_repository.delete(
            production_order
        )

    def update_production_status(
        self,
        production_order: ProductionOrder,
        status: str,
    ) -> ProductionOrder:
        production_order.status = status

        if (
            status == "In Progress"
            and production_order.actual_start_date is None
        ):
            production_order.actual_start_date = (
                datetime.utcnow().date()
            )

        if (
            status == "Completed"
            and production_order.actual_end_date is None
        ):
            production_order.actual_end_date = (
                datetime.utcnow().date()
            )

        return self.production_order_repository.update(
            production_order
        )

    # ========================================================
    # PROFORMA -> PRODUCTION INTEGRATION
    # ========================================================

    def create_production_orders_from_proforma(
        self,
        proforma_id: int,
    ) -> list[ProductionOrder]:
        """
        Create Production Orders from a confirmed Proforma.

        One Production Order is created for each valid
        Proforma item.
        """

        proforma = self.proforma_repository.get_by_id(
            proforma_id
        )

        if proforma is None:
            raise ValueError(
                "Proforma not found."
            )

        proforma_status = (
            (proforma.status or "")
            .strip()
            .lower()
        )

        if proforma_status != "order confirmed":
            raise ValueError(
                "Production can only be created from a Proforma "
                "with status 'Order Confirmed'."
            )

        existing_orders = (
            self.production_order_repository.get_by_proforma(
                proforma_id
            )
        )

        if existing_orders:
            raise ValueError(
                "Production orders already exist for this Proforma."
            )

        if not proforma.items:
            raise ValueError(
                "Proforma has no items."
            )

        validated_items: list[tuple[object, Product]] = []

        for item in proforma.items:
            if item.product_id is None:
                raise ValueError(
                    f"Proforma item {item.id} does not have a product."
                )

            product = ProductRepository.get_by_id(
                self.db,
                item.product_id,
            )

            if product is None:
                raise ValueError(
                    f"Product {item.product_id} is not found "
                    "or is inactive."
                )

            quantity = Decimal(
                str(item.quantity)
            )

            if quantity <= 0:
                raise ValueError(
                    f"Quantity for Proforma item {item.id} "
                    "must be greater than zero."
                )

            if quantity != quantity.to_integral_value():
                raise ValueError(
                    f"Quantity for Proforma item {item.id} "
                    "must be a whole number because production "
                    "quantity is currently stored as an integer."
                )

            validated_items.append(
                (item, product)
            )

        production_orders: list[ProductionOrder] = []

        for item, product in validated_items:
            production_number = (
                self._generate_production_number()
            )

            production_order = ProductionOrder(
                production_number=production_number,
                proforma_id=proforma.id,
                product_id=product.id,
                quantity=int(item.quantity),
                status="Pending",
                notes=(
                    f"Created from Proforma "
                    f"{proforma.proforma_number}"
                ),
            )

            created_order = (
                self.production_order_repository.create(
                    production_order
                )
            )

            production_orders.append(
                created_order
            )

        proforma.status = "Production Started"

        self.db.commit()
        self.db.refresh(proforma)

        return production_orders

    # ========================================================
    # PRODUCTION ORDER DETAIL
    # ========================================================

    def get_production_order_detail(
        self,
        production_order_id: int,
    ) -> ProductionOrderDetailResponse | None:
        production_order = (
            self.production_order_repository.get_by_id(
                production_order_id
            )
        )

        if production_order is None:
            return None

        materials = (
            self.material_repository.get_by_production_order(
                production_order_id
            )
        )

        operations = (
            self.operation_repository.get_by_production_order(
                production_order_id
            )
        )

        return ProductionOrderDetailResponse(
            id=production_order.id,
            production_number=(
                production_order.production_number
            ),
            proforma_id=production_order.proforma_id,
            product_id=production_order.product_id,
            quantity=production_order.quantity,
            status=production_order.status,
            planned_start_date=(
                production_order.planned_start_date
            ),
            actual_start_date=(
                production_order.actual_start_date
            ),
            actual_end_date=(
                production_order.actual_end_date
            ),
            notes=production_order.notes,
            created_at=production_order.created_at,
            updated_at=production_order.updated_at,
            materials=materials,
            operations=operations,
        )

    # ========================================================
    # PRODUCTION MATERIALS
    # ========================================================

    def create_material(
        self,
        production_order_id: int,
        data: ProductionMaterialCreate,
    ) -> ProductionMaterial:
        """
        Add a planned material requirement.

        No stock is deducted here.

        quantity_issued starts at zero and will later be
        controlled by Shop Floor Issue.
        """

        material_name = data.material_name.strip()

        if not material_name:
            raise ValueError(
                "Material name is required."
            )

        product = None

        if data.product_id is not None:
            product = ProductRepository.get_by_id(
                self.db,
                data.product_id,
            )

            if product is None:
                raise ValueError(
                    f"Product {data.product_id} is not found "
                    "or is inactive."
                )

        unit = (
            data.unit.strip()
            if data.unit
            else None
        )

        if product is not None:
            if not unit:
                unit = product.unit

            if (
                material_name.lower()
                != product.product_name.strip().lower()
            ):
                material_name = product.product_name.strip()

        material = ProductionMaterial(
            production_order_id=production_order_id,
            product_id=data.product_id,
            material_name=material_name,
            unit=unit,
            quantity_required=data.quantity_required,
            quantity_issued=Decimal("0.00"),
            unit_cost=data.unit_cost,
            material_cost=Decimal("0.00"),
        )

        return self.material_repository.create(
            material
        )

    def get_material(
        self,
        material_id: int,
    ) -> ProductionMaterial | None:
        return self.material_repository.get_by_id(
            material_id
        )

    def get_materials(
        self,
        production_order_id: int,
    ) -> list[ProductionMaterial]:
        return self.material_repository.get_by_production_order(
            production_order_id
        )

    def get_material_summary(
        self,
        production_order_id: int,
    ) -> ProductionMaterialSummaryResponse:
        materials = self.get_materials(
            production_order_id
        )

        total_quantity_required = Decimal("0.00")
        total_quantity_issued = Decimal("0.00")
        total_material_cost = Decimal("0.00")

        for material in materials:
            total_quantity_required += Decimal(
                str(material.quantity_required)
            )

            total_quantity_issued += Decimal(
                str(material.quantity_issued)
            )

            total_material_cost += Decimal(
                str(material.material_cost)
            )

        total_quantity_remaining = (
            total_quantity_required
            - total_quantity_issued
        )

        if total_quantity_remaining < Decimal("0.00"):
            total_quantity_remaining = Decimal("0.00")

        return ProductionMaterialSummaryResponse(
            production_order_id=production_order_id,
            total_materials=len(materials),
            total_quantity_required=total_quantity_required,
            total_quantity_issued=total_quantity_issued,
            total_quantity_remaining=total_quantity_remaining,
            total_material_cost=total_material_cost,
        )

    def update_material(
        self,
        material: ProductionMaterial,
        data: ProductionMaterialUpdate,
    ) -> ProductionMaterial:
        """
        Update material planning information only.

        quantity_issued and material_cost are deliberately
        not editable here.
        """

        update_data = data.model_dump(
            exclude_unset=True
        )

        if "product_id" in update_data:
            product_id = update_data["product_id"]

            if product_id is not None:
                product = ProductRepository.get_by_id(
                    self.db,
                    product_id,
                )

                if product is None:
                    raise ValueError(
                        f"Product {product_id} is not found "
                        "or is inactive."
                    )

                material.product_id = product.id
                material.material_name = (
                    product.product_name.strip()
                )

                if not material.unit:
                    material.unit = product.unit

            else:
                material.product_id = None

            update_data.pop(
                "product_id",
                None,
            )

        if "material_name" in update_data:
            material_name = (
                update_data["material_name"] or ""
            ).strip()

            if not material_name:
                raise ValueError(
                    "Material name is required."
                )

            material.material_name = material_name

            update_data.pop(
                "material_name",
                None,
            )

        if "unit" in update_data:
            unit = update_data["unit"]

            material.unit = (
                unit.strip()
                if unit
                else None
            )

            update_data.pop(
                "unit",
                None,
            )

        for field, value in update_data.items():
            setattr(
                material,
                field,
                value,
            )

        return self.material_repository.update(
            material
        )

    def delete_material(
        self,
        material: ProductionMaterial,
    ) -> None:
        """
        Material requirements can only be deleted before any
        quantity has been issued.

        This protects future Shop Floor Issue traceability.
        """

        quantity_issued = Decimal(
            str(material.quantity_issued)
        )

        if quantity_issued > Decimal("0.00"):
            raise ValueError(
                "This material cannot be deleted because "
                "a quantity has already been issued."
            )

        self.material_repository.delete(
            material
        )

    # ========================================================
    # PRODUCTION OPERATIONS
    # ========================================================

    def create_operation(
        self,
        production_order_id: int,
        data: ProductionOperationCreate,
    ) -> ProductionOperation:
        operation_cost = (
            data.actual_hours
            * data.hourly_rate
        )

        operation = ProductionOperation(
            production_order_id=production_order_id,
            operation_name=data.operation_name,
            machine_name=data.machine_name,
            hourly_rate=data.hourly_rate,
            planned_hours=data.planned_hours,
            actual_hours=data.actual_hours,
            operation_cost=operation_cost,
            status=data.status,
            started_at=data.started_at,
            completed_at=data.completed_at,
        )

        return self.operation_repository.create(
            operation
        )

    def get_operation(
        self,
        operation_id: int,
    ) -> ProductionOperation | None:
        return self.operation_repository.get_by_id(
            operation_id
        )

    def get_operations(
        self,
        production_order_id: int,
    ) -> list[ProductionOperation]:
        return self.operation_repository.get_by_production_order(
            production_order_id
        )

    def update_operation(
        self,
        operation: ProductionOperation,
        data: ProductionOperationUpdate,
    ) -> ProductionOperation:
        update_data = data.model_dump(
            exclude_unset=True
        )

        for field, value in update_data.items():
            setattr(
                operation,
                field,
                value,
            )

        operation.operation_cost = (
            operation.actual_hours
            * operation.hourly_rate
        )

        return self.operation_repository.update(
            operation
        )

    def delete_operation(
        self,
        operation: ProductionOperation,
    ) -> None:
        self.operation_repository.delete(
            operation
        )

    # ========================================================
    # PRODUCTION NUMBER
    # ========================================================

    def _generate_production_number(
        self,
    ) -> str:
        year = datetime.utcnow().year

        prefix = f"PROD-{year}-"

        existing_orders = (
            self.production_order_repository.get_all()
        )

        highest_number = 0

        for order in existing_orders:
            production_number = (
                order.production_number
            )

            if production_number.startswith(prefix):
                try:
                    number = int(
                        production_number.replace(
                            prefix,
                            "",
                        )
                    )

                    highest_number = max(
                        highest_number,
                        number,
                    )

                except ValueError:
                    continue

        return (
            f"{prefix}"
            f"{highest_number + 1:04d}"
        )