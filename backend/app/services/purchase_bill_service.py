from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.purchase_bill import PurchaseBill
from app.models.purchase_bill_item import PurchaseBillItem
from app.repositories.purchase_bill_repository import (
    PurchaseBillRepository,
)
from app.repositories.supplier_repository import (
    SupplierRepository,
)
from app.schemas.purchase_bill import (
    PurchaseBillCreate,
    PurchaseBillUpdate,
)


class PurchaseBillService:

    # ============================================================
    # CREATE PURCHASE BILL
    # ============================================================

    @staticmethod
    def create(
        db: Session,
        purchase_bill: PurchaseBillCreate,
        created_by: int,
    ):
        """
        Create a manual Purchase Bill and increase stock.

        Purchase Bill, items and stock changes are committed
        together in a single transaction.
        """

        try:
            # ====================================================
            # SUPPLIER
            # ====================================================

            supplier = SupplierRepository.get_by_id(
                db,
                purchase_bill.supplier_id,
            )

            if supplier is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Supplier not found.",
                )

            # ====================================================
            # DUPLICATE BILL
            # ====================================================

            existing_bill = (
                PurchaseBillRepository
                .get_by_bill_number(
                    db=db,
                    supplier_id=(
                        purchase_bill.supplier_id
                    ),
                    bill_number=(
                        purchase_bill.bill_number
                    ),
                )
            )

            if existing_bill:
                raise HTTPException(
                    status_code=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                    detail=(
                        "Purchase Bill already exists "
                        "for this supplier."
                    ),
                )

            # ====================================================
            # ITEMS REQUIRED
            # ====================================================

            if not purchase_bill.items:
                raise HTTPException(
                    status_code=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                    detail=(
                        "Purchase Bill must contain "
                        "at least one item."
                    ),
                )

            # ====================================================
            # CREATE BILL
            # ====================================================

            db_purchase_bill = PurchaseBill(
                bill_number=(
                    purchase_bill.bill_number
                ),
                supplier_id=(
                    purchase_bill.supplier_id
                ),
                bill_date=(
                    purchase_bill.bill_date
                ),
                subtotal=(
                    purchase_bill.subtotal
                ),
                total_gst=(
                    purchase_bill.total_gst
                ),
                grand_total=(
                    purchase_bill.grand_total
                ),
                remarks=(
                    purchase_bill.remarks
                ),
                created_by=created_by,
                is_active=True,
            )

            db.add(
                db_purchase_bill
            )

            db.flush()

            # ====================================================
            # ITEMS + STOCK
            # ====================================================

            for item in purchase_bill.items:

                quantity = Decimal(
                    str(item.quantity)
                )

                purchase_price = Decimal(
                    str(item.purchase_price)
                )

                gst_percentage = Decimal(
                    str(item.gst_percentage)
                )

                line_total = Decimal(
                    str(item.line_total)
                )

                # ================================================
                # VALIDATION
                # ================================================

                if quantity <= Decimal("0.00"):
                    raise HTTPException(
                        status_code=(
                            status.HTTP_400_BAD_REQUEST
                        ),
                        detail=(
                            f"Quantity for Product ID "
                            f"{item.product_id} must be "
                            f"greater than zero."
                        ),
                    )

                if purchase_price < Decimal("0.00"):
                    raise HTTPException(
                        status_code=(
                            status.HTTP_400_BAD_REQUEST
                        ),
                        detail=(
                            "Purchase price cannot "
                            "be negative."
                        ),
                    )

                if gst_percentage < Decimal("0.00"):
                    raise HTTPException(
                        status_code=(
                            status.HTTP_400_BAD_REQUEST
                        ),
                        detail=(
                            "GST percentage cannot "
                            "be negative."
                        ),
                    )

                if line_total < Decimal("0.00"):
                    raise HTTPException(
                        status_code=(
                            status.HTTP_400_BAD_REQUEST
                        ),
                        detail=(
                            "Line total cannot "
                            "be negative."
                        ),
                    )

                # ================================================
                # LOCK PRODUCT
                # ================================================

                product = (
                    db.query(Product)
                    .filter(
                        Product.id
                        == item.product_id,
                        Product.is_active
                        == True,
                    )
                    .with_for_update()
                    .first()
                )

                if product is None:
                    raise HTTPException(
                        status_code=(
                            status.HTTP_404_NOT_FOUND
                        ),
                        detail=(
                            f"Product ID "
                            f"{item.product_id} "
                            f"not found."
                        ),
                    )

                # ================================================
                # PURCHASE BILL ITEM
                # ================================================

                db_item = PurchaseBillItem(
                    purchase_bill_id=(
                        db_purchase_bill.id
                    ),
                    product_id=(
                        item.product_id
                    ),
                    quantity=quantity,
                    purchase_price=(
                        purchase_price
                    ),
                    gst_percentage=(
                        gst_percentage
                    ),
                    line_total=(
                        line_total
                    ),
                    created_by=created_by,
                )

                db.add(
                    db_item
                )

                # ================================================
                # STOCK INCREASE
                # ================================================

                current_stock = Decimal(
                    str(
                        product.current_stock
                        or Decimal("0.00")
                    )
                )

                product.current_stock = (
                    current_stock
                    + quantity
                )

                # Keep latest purchase price
                product.purchase_price = (
                    purchase_price
                )

            # ====================================================
            # SINGLE COMMIT
            # ====================================================

            db.commit()

            db.refresh(
                db_purchase_bill
            )

            return db_purchase_bill

        except Exception:
            db.rollback()
            raise

    # ============================================================
    # UPDATE PURCHASE BILL HEADER
    # ============================================================

    @staticmethod
    def update(
        db: Session,
        purchase_bill_id: int,
        purchase_bill: PurchaseBillUpdate,
    ):

        db_purchase_bill = (
            PurchaseBillRepository
            .get_by_id(
                db,
                purchase_bill_id,
            )
        )

        if db_purchase_bill is None:
            return None

        db_purchase_bill.bill_date = (
            purchase_bill.bill_date
        )

        db_purchase_bill.subtotal = (
            purchase_bill.subtotal
        )

        db_purchase_bill.total_gst = (
            purchase_bill.total_gst
        )

        db_purchase_bill.grand_total = (
            purchase_bill.grand_total
        )

        db_purchase_bill.remarks = (
            purchase_bill.remarks
        )

        return (
            PurchaseBillRepository
            .update(
                db,
                db_purchase_bill,
            )
        )

    # ============================================================
    # CANCEL / DEACTIVATE PURCHASE BILL
    # ============================================================

    @staticmethod
    def deactivate(
        db: Session,
        purchase_bill_id: int,
    ):
        """
        Cancel a Purchase Bill and reverse its stock movement.

        Rules:
        1. Purchase Bill must exist and be active.
        2. Lock Purchase Bill.
        3. Lock all referenced products.
        4. Reverse each purchased quantity.
        5. Cancellation is blocked if reversal would make
           any product stock negative.
        6. Mark Purchase Bill inactive.
        7. Commit everything together.
        """

        try:
            # ====================================================
            # LOCK PURCHASE BILL
            # ====================================================

            purchase_bill = (
                db.query(PurchaseBill)
                .filter(
                    PurchaseBill.id
                    == purchase_bill_id,
                    PurchaseBill.is_active
                    == True,
                )
                .with_for_update()
                .first()
            )

            if purchase_bill is None:
                return None

            # ====================================================
            # LOAD BILL ITEMS
            # ====================================================

            bill_items = (
                db.query(PurchaseBillItem)
                .filter(
                    PurchaseBillItem.purchase_bill_id
                    == purchase_bill.id
                )
                .order_by(
                    PurchaseBillItem.id.asc()
                )
                .all()
            )

            if not bill_items:
                raise HTTPException(
                    status_code=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                    detail=(
                        "Purchase Bill cannot be cancelled "
                        "because it has no purchase items."
                    ),
                )

            # ====================================================
            # AGGREGATE QUANTITIES BY PRODUCT
            # ====================================================

            quantities_by_product: dict[
                int,
                Decimal,
            ] = {}

            for item in bill_items:

                quantity = Decimal(
                    str(item.quantity)
                )

                current_quantity = (
                    quantities_by_product.get(
                        item.product_id,
                        Decimal("0.00"),
                    )
                )

                quantities_by_product[
                    item.product_id
                ] = (
                    current_quantity
                    + quantity
                )

            # ====================================================
            # LOCK PRODUCTS AND VALIDATE REVERSAL
            # ====================================================

            locked_products: dict[
                int,
                Product,
            ] = {}

            for (
                product_id,
                quantity_to_reverse,
            ) in quantities_by_product.items():

                product = (
                    db.query(Product)
                    .filter(
                        Product.id
                        == product_id
                    )
                    .with_for_update()
                    .first()
                )

                if product is None:
                    raise HTTPException(
                        status_code=(
                            status.HTTP_400_BAD_REQUEST
                        ),
                        detail=(
                            f"Purchase Bill cannot be "
                            f"cancelled because Product ID "
                            f"{product_id} no longer exists."
                        ),
                    )

                current_stock = Decimal(
                    str(
                        product.current_stock
                        or Decimal("0.00")
                    )
                )

                if (
                    current_stock
                    < quantity_to_reverse
                ):
                    raise HTTPException(
                        status_code=(
                            status.HTTP_400_BAD_REQUEST
                        ),
                        detail=(
                            "Purchase Bill cannot be "
                            "cancelled because stock reversal "
                            f"would make Product ID "
                            f"{product_id} negative. "
                            f"Current stock: "
                            f"{current_stock:.2f}, "
                            f"required reversal: "
                            f"{quantity_to_reverse:.2f}."
                        ),
                    )

                locked_products[
                    product_id
                ] = product

            # ====================================================
            # REVERSE STOCK
            # ====================================================

            for (
                product_id,
                quantity_to_reverse,
            ) in quantities_by_product.items():

                product = (
                    locked_products[
                        product_id
                    ]
                )

                current_stock = Decimal(
                    str(
                        product.current_stock
                        or Decimal("0.00")
                    )
                )

                product.current_stock = (
                    current_stock
                    - quantity_to_reverse
                )

            # ====================================================
            # DEACTIVATE BILL
            # ====================================================

            purchase_bill.is_active = False

            # ====================================================
            # SINGLE COMMIT
            # ====================================================

            db.commit()

            db.refresh(
                purchase_bill
            )

            return purchase_bill

        except Exception:
            db.rollback()
            raise