from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.stock_report import (
    StockSummaryItem,
    StockSummaryResponse,
)


class StockReportService:

    @staticmethod
    def get_stock_summary(
        db: Session,
        search: str | None = None,
        stock_status: str | None = None,
    ) -> StockSummaryResponse:

        query = (
            db.query(Product)
            .filter(
                Product.is_active == True,
            )
        )

        # ========================================================
        # SEARCH FILTER
        # ========================================================

        if search:
            keyword = f"%{search.strip()}%"

            query = query.filter(
                (
                    Product.product_code.ilike(
                        keyword
                    )
                )
                |
                (
                    Product.product_name.ilike(
                        keyword
                    )
                )
                |
                (
                    Product.category.ilike(
                        keyword
                    )
                )
                |
                (
                    Product.hsn_code.ilike(
                        keyword
                    )
                )
            )

        products = (
            query.order_by(
                Product.product_name.asc()
            )
            .all()
        )

        # ========================================================
        # PREPARE RESULT
        # ========================================================

        items: list[StockSummaryItem] = []

        total_stock_quantity = Decimal(
            "0.00"
        )

        total_stock_value = Decimal(
            "0.00"
        )

        low_stock_products = 0

        out_of_stock_products = 0

        requested_status = None

        if stock_status:
            requested_status = (
                stock_status
                .strip()
                .lower()
            )

        # ========================================================
        # PROCESS PRODUCTS
        # ========================================================

        for product in products:

            current_stock = Decimal(
                str(
                    product.current_stock
                    or Decimal("0.00")
                )
            )

            minimum_stock = Decimal(
                str(
                    product.minimum_stock
                    or Decimal("0.00")
                )
            )

            maximum_stock = Decimal(
                str(
                    product.maximum_stock
                    or Decimal("0.00")
                )
            )

            purchase_price = Decimal(
                str(
                    product.purchase_price
                    or Decimal("0.00")
                )
            )

            stock_value = (
                current_stock
                * purchase_price
            ).quantize(
                Decimal("0.01")
            )

            # ====================================================
            # STOCK STATUS
            # ====================================================

            if current_stock <= Decimal(
                "0.00"
            ):
                calculated_status = (
                    "Out of Stock"
                )

            elif (
                minimum_stock
                > Decimal("0.00")
                and current_stock
                <= minimum_stock
            ):
                calculated_status = (
                    "Low Stock"
                )

            elif (
                maximum_stock
                > Decimal("0.00")
                and current_stock
                > maximum_stock
            ):
                calculated_status = (
                    "Over Stock"
                )

            else:
                calculated_status = (
                    "In Stock"
                )

            # ====================================================
            # STATUS FILTER
            # ====================================================

            if (
                requested_status
                and calculated_status.lower()
                != requested_status
            ):
                continue

            # ====================================================
            # KPIs FOR FILTERED RESULT
            # ====================================================

            if (
                calculated_status
                == "Low Stock"
            ):
                low_stock_products += 1

            if (
                calculated_status
                == "Out of Stock"
            ):
                out_of_stock_products += 1

            total_stock_quantity += (
                current_stock
            )

            total_stock_value += (
                stock_value
            )

            # ====================================================
            # ITEM
            # ====================================================

            items.append(
                StockSummaryItem(
                    product_id=product.id,
                    product_code=(
                        product.product_code
                    ),
                    product_name=(
                        product.product_name
                    ),
                    category=(
                        product.category
                    ),
                    unit=product.unit,
                    current_stock=(
                        current_stock
                    ),
                    minimum_stock=(
                        minimum_stock
                    ),
                    maximum_stock=(
                        maximum_stock
                    ),
                    purchase_price=(
                        purchase_price
                    ),
                    stock_value=(
                        stock_value
                    ),
                    stock_status=(
                        calculated_status
                    ),
                )
            )

        # ========================================================
        # RESPONSE
        # ========================================================

        return StockSummaryResponse(
            total_products=len(items),
            total_stock_quantity=(
                total_stock_quantity
            ),
            total_stock_value=(
                total_stock_value
            ),
            low_stock_products=(
                low_stock_products
            ),
            out_of_stock_products=(
                out_of_stock_products
            ),
            items=items,
        )