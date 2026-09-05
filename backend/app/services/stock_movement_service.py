from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.schemas.stock_movement import (
    StockMovementItem,
    StockMovementResponse,
)


class StockMovementService:

    # ============================================================
    # DISPLAY LABELS
    # ============================================================

    MOVEMENT_LABELS = {
        "PURCHASE_IN": "Purchase",
        "PURCHASE_REVERSAL_OUT": "Purchase Reversal",
        "SHOP_FLOOR_OUT": "Shop Floor Issue",
        "FINISHED_GOODS_IN": "Finished Goods Receipt",
    }

    # ============================================================
    # GET STOCK MOVEMENTS
    # ============================================================

    @staticmethod
    def get_movements(
        db: Session,
        product_id: int | None = None,
        movement_type: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> StockMovementResponse:

        query = (
            db.query(
                StockMovement,
                Product,
            )
            .join(
                Product,
                Product.id
                == StockMovement.product_id,
            )
        )

        # ========================================================
        # PRODUCT FILTER
        # ========================================================

        if product_id is not None:
            query = query.filter(
                StockMovement.product_id
                == product_id
            )

        # ========================================================
        # MOVEMENT TYPE FILTER
        # ========================================================

        if movement_type:

            requested_type = (
                movement_type
                .strip()
                .lower()
            )

            matching_codes = []

            for (
                code,
                label,
            ) in (
                StockMovementService
                .MOVEMENT_LABELS
                .items()
            ):

                if (
                    requested_type
                    == code.lower()
                    or requested_type
                    == label.lower()
                ):
                    matching_codes.append(
                        code
                    )

            if matching_codes:
                query = query.filter(
                    StockMovement
                    .movement_type
                    .in_(
                        matching_codes
                    )
                )

            else:
                query = query.filter(
                    StockMovement.movement_type
                    == movement_type
                )

        # ========================================================
        # DATE FILTERS
        # ========================================================

        if start_date is not None:
            query = query.filter(
                StockMovement.movement_date
                >= start_date
            )

        if end_date is not None:
            query = query.filter(
                StockMovement.movement_date
                <= end_date
            )

        # ========================================================
        # ORDER
        # ========================================================

        rows = (
            query
            .order_by(
                StockMovement
                .movement_date
                .desc(),
                StockMovement.id.desc(),
            )
            .all()
        )

        # ========================================================
        # TOTALS
        # ========================================================

        total_quantity_in = Decimal(
            "0.00"
        )

        total_quantity_out = Decimal(
            "0.00"
        )

        total_in_value = Decimal(
            "0.00"
        )

        total_out_value = Decimal(
            "0.00"
        )

        movements: list[
            StockMovementItem
        ] = []

        # ========================================================
        # BUILD RESPONSE
        # ========================================================

        for (
            movement,
            product,
        ) in rows:

            quantity_in = Decimal(
                str(
                    movement.quantity_in
                    or Decimal("0.00")
                )
            )

            quantity_out = Decimal(
                str(
                    movement.quantity_out
                    or Decimal("0.00")
                )
            )

            movement_value = Decimal(
                str(
                    movement.movement_value
                    or Decimal("0.00")
                )
            )

            unit_cost = Decimal(
                str(
                    movement.unit_cost
                    or Decimal("0.00")
                )
            )

            # ====================================================
            # TOTAL IN
            # ====================================================

            if quantity_in > Decimal(
                "0.00"
            ):
                total_quantity_in += (
                    quantity_in
                )

                total_in_value += (
                    movement_value
                )

            # ====================================================
            # TOTAL OUT
            # ====================================================

            if quantity_out > Decimal(
                "0.00"
            ):
                total_quantity_out += (
                    quantity_out
                )

                total_out_value += (
                    movement_value
                )

            movement_label = (
                StockMovementService
                .MOVEMENT_LABELS
                .get(
                    movement.movement_type,
                    movement.movement_type,
                )
            )

            movements.append(
                StockMovementItem(
                    movement_type=(
                        movement_label
                    ),
                    reference_id=(
                        movement.source_id
                    ),
                    reference_number=(
                        movement.source_number
                    ),
                    product_id=(
                        movement.product_id
                    ),
                    product_code=(
                        product.product_code
                    ),
                    product_name=(
                        product.product_name
                    ),
                    quantity_in=(
                        quantity_in
                    ),
                    quantity_out=(
                        quantity_out
                    ),
                    stock_before=(
                        Decimal(
                            str(
                                movement
                                .stock_before
                            )
                        )
                    ),
                    stock_after=(
                        Decimal(
                            str(
                                movement
                                .stock_after
                            )
                        )
                    ),
                    unit_cost=(
                        unit_cost
                    ),
                    movement_value=(
                        movement_value
                    ),
                    movement_date=(
                        movement.movement_date
                    ),
                    remarks=(
                        movement.remarks
                    ),
                )
            )

        # ========================================================
        # RESPONSE
        # ========================================================

        return StockMovementResponse(
            total_movements=(
                len(movements)
            ),
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