from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.production_material import (
    ProductionMaterial,
)
from app.models.production_order import (
    ProductionOrder,
)
from app.models.shop_floor_issue import (
    ShopFloorIssue,
)
from app.models.stock_movement import (
    StockMovement,
)
from app.schemas.direct_stock_issue import (
    DirectStockIssueCreate,
)


class DirectStockIssueService:
    """
    One-way Store -> Production material issue.

    Workflow:

    Store Product
        ->
    Select quantity
        ->
    Select In Progress Production Order
        ->
    Issue Material
        ->
    Product stock decreases
        ->
    Shop Floor Issue created
        ->
    Stock Movement created
        ->
    Production Material created/updated automatically
        ->
    Production Order can display issued material.
    """

    def __init__(
        self,
        db: Session,
    ):
        self.db = db


    # ========================================================
    # DIRECT ISSUE
    # ========================================================

    def issue_material(
        self,
        production_order_id: int,
        data: DirectStockIssueCreate,
        issued_by: int,
    ) -> ShopFloorIssue:

        try:

            # ====================================================
            # LOCK PRODUCTION ORDER
            # ====================================================

            production_statement = (
                select(
                    ProductionOrder
                )
                .where(
                    ProductionOrder.id
                    == production_order_id
                )
                .with_for_update()
            )

            production_order = (
                self.db.scalars(
                    production_statement
                )
                .first()
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
                != "in progress"
            ):
                raise ValueError(
                    "Material can only be issued "
                    "to an In Progress Production Order."
                )


            # ====================================================
            # LOCK STORE PRODUCT
            # ====================================================

            product_statement = (
                select(
                    Product
                )
                .where(
                    Product.id
                    == data.product_id,
                    Product.is_active
                    == True,
                )
                .with_for_update()
            )

            product = (
                self.db.scalars(
                    product_statement
                )
                .first()
            )

            if product is None:
                raise ValueError(
                    "Selected stock product "
                    "was not found or is inactive."
                )


            # ====================================================
            # VALUES
            # ====================================================

            issue_quantity = Decimal(
                str(
                    data.quantity
                )
            )

            if (
                issue_quantity
                <= Decimal("0.00")
            ):
                raise ValueError(
                    "Issue quantity must be "
                    "greater than zero."
                )


            available_stock = Decimal(
                str(
                    product.current_stock
                    or Decimal("0.00")
                )
            )


            if (
                issue_quantity
                > available_stock
            ):
                raise ValueError(
                    "Insufficient stock. "
                    f"Available stock is "
                    f"{available_stock:.2f} "
                    f"{product.unit}."
                )


            unit_cost = Decimal(
                str(
                    product.purchase_price
                    or Decimal("0.00")
                )
            )


            issue_cost = (
                issue_quantity
                * unit_cost
            ).quantize(
                Decimal("0.01")
            )


            # ====================================================
            # FIND EXISTING MATERIAL RECORD
            # ====================================================
            #
            # Production does NOT create material requirements.
            #
            # This internal record exists only so:
            #
            # - issued materials can be displayed in Production
            # - material cost remains connected to the job
            # - finished-product costing can use it later
            #
            # ====================================================

            material_statement = (
                select(
                    ProductionMaterial
                )
                .where(
                    ProductionMaterial
                    .production_order_id
                    == production_order.id,

                    ProductionMaterial
                    .product_id
                    == product.id,
                )
                .with_for_update()
            )

            production_material = (
                self.db.scalars(
                    material_statement
                )
                .first()
            )


            # ====================================================
            # CREATE INTERNAL MATERIAL RECORD
            # ====================================================

            if (
                production_material
                is None
            ):

                production_material = (
                    ProductionMaterial(
                        production_order_id=(
                            production_order.id
                        ),
                        product_id=(
                            product.id
                        ),
                        material_name=(
                            product
                            .product_name
                            .strip()
                        ),
                        unit=(
                            product.unit
                        ),
                        quantity_required=(
                            issue_quantity
                        ),
                        quantity_issued=(
                            issue_quantity
                        ),
                        unit_cost=(
                            unit_cost
                        ),
                        material_cost=(
                            issue_cost
                        ),
                    )
                )

                self.db.add(
                    production_material
                )

                self.db.flush()


            # ====================================================
            # UPDATE EXISTING MATERIAL RECORD
            # ====================================================

            else:

                old_issued_quantity = Decimal(
                    str(
                        production_material
                        .quantity_issued
                        or Decimal("0.00")
                    )
                )

                old_material_cost = Decimal(
                    str(
                        production_material
                        .material_cost
                        or Decimal("0.00")
                    )
                )

                old_required_quantity = Decimal(
                    str(
                        production_material
                        .quantity_required
                        or Decimal("0.00")
                    )
                )


                new_issued_quantity = (
                    old_issued_quantity
                    + issue_quantity
                )

                new_material_cost = (
                    old_material_cost
                    + issue_cost
                ).quantize(
                    Decimal("0.01")
                )


                # The new workflow has no separate
                # "required stock" entry.
                #
                # Keep quantity_required at least equal
                # to the amount actually issued so old
                # completion validation remains compatible.

                production_material.quantity_required = (
                    max(
                        old_required_quantity,
                        new_issued_quantity,
                    )
                )

                production_material.quantity_issued = (
                    new_issued_quantity
                )

                production_material.material_cost = (
                    new_material_cost
                )


                # Weighted average unit cost when the same
                # material is issued multiple times.

                if (
                    new_issued_quantity
                    > Decimal("0.00")
                ):
                    production_material.unit_cost = (
                        new_material_cost
                        / new_issued_quantity
                    ).quantize(
                        Decimal("0.01")
                    )


                production_material.material_name = (
                    product
                    .product_name
                    .strip()
                )

                production_material.unit = (
                    product.unit
                )


            # ====================================================
            # REDUCE STORE STOCK
            # ====================================================

            stock_before = (
                available_stock
            )

            stock_after = (
                stock_before
                - issue_quantity
            )

            product.current_stock = (
                stock_after
            )


            # ====================================================
            # ISSUE NUMBER
            # ====================================================

            issue_number = (
                self._generate_issue_number()
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
                issue_remarks = (
                    f"{user_remarks} | "
                    f"Issued to "
                    f"{production_order.production_number}"
                )
            else:
                issue_remarks = (
                    "Issued from Store to "
                    f"{production_order.production_number}"
                )


            # ====================================================
            # SHOP FLOOR ISSUE
            # ====================================================

            issue = ShopFloorIssue(
                issue_number=(
                    issue_number
                ),
                production_order_id=(
                    production_order.id
                ),
                production_material_id=(
                    production_material.id
                ),
                product_id=(
                    product.id
                ),
                quantity_issued=(
                    issue_quantity
                ),
                unit_cost=(
                    unit_cost
                ),
                total_cost=(
                    issue_cost
                ),
                stock_before=(
                    stock_before
                ),
                stock_after=(
                    stock_after
                ),
                issued_by=(
                    issued_by
                ),
                remarks=(
                    issue_remarks
                ),
            )

            self.db.add(
                issue
            )

            self.db.flush()


            # ====================================================
            # STOCK MOVEMENT
            # ====================================================

            stock_movement = StockMovement(
                product_id=(
                    product.id
                ),
                movement_type=(
                    "SHOP_FLOOR_OUT"
                ),
                source_type=(
                    "SHOP_FLOOR_ISSUE"
                ),
                source_id=(
                    issue.id
                ),
                source_number=(
                    issue.issue_number
                ),
                quantity_in=Decimal(
                    "0.00"
                ),
                quantity_out=(
                    issue_quantity
                ),
                stock_before=(
                    stock_before
                ),
                stock_after=(
                    stock_after
                ),
                unit_cost=(
                    unit_cost
                ),
                movement_value=(
                    issue_cost
                ),
                performed_by=(
                    issued_by
                ),
                remarks=(
                    issue_remarks
                ),
            )

            self.db.add(
                stock_movement
            )


            # ====================================================
            # COMMIT AS ONE TRANSACTION
            # ====================================================

            self.db.commit()


            self.db.refresh(
                issue
            )

            self.db.refresh(
                product
            )

            self.db.refresh(
                production_material
            )


            return issue


        except Exception:

            self.db.rollback()

            raise


    # ========================================================
    # ISSUE NUMBER
    # ========================================================

    def _generate_issue_number(
        self,
    ) -> str:

        year = (
            datetime.utcnow().year
        )

        prefix = (
            f"SFI-{year}-"
        )


        statement = (
            select(
                ShopFloorIssue
            )
            .where(
                ShopFloorIssue
                .issue_number
                .like(
                    f"{prefix}%"
                )
            )
            .order_by(
                ShopFloorIssue
                .id
                .desc()
            )
        )


        issues = list(
            self.db.scalars(
                statement
            ).all()
        )


        highest_number = 0


        for issue in issues:

            issue_number = (
                issue.issue_number
                or ""
            )

            if (
                not issue_number.startswith(
                    prefix
                )
            ):
                continue

            try:

                numeric_part = int(
                    issue_number.replace(
                        prefix,
                        "",
                    )
                )

                highest_number = max(
                    highest_number,
                    numeric_part,
                )

            except ValueError:
                continue


        return (
            f"{prefix}"
            f"{highest_number + 1:04d}"
        )