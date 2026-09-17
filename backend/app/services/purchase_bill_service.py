from datetime import timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.purchase_bill import PurchaseBill
from app.models.purchase_bill_item import PurchaseBillItem
from app.models.purchase_bill_payment import PurchaseBillPayment
from app.models.stock_movement import StockMovement
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

        Purchase Bill, items, stock changes and stock ledger
        movements are committed together in one transaction.

        Due date is calculated automatically from:
        bill_date + credit_days.
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
            # CREDIT TERMS
            # ====================================================

            credit_days = int(
                purchase_bill.credit_days
                or 0
            )

            due_date = (
                purchase_bill.bill_date
                + timedelta(
                    days=credit_days
                )
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
                credit_days=(
                    credit_days
                ),
                due_date=(
                    due_date
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
            # ITEMS + STOCK + LEDGER
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
                # STOCK VALUES
                # ================================================

                stock_before = Decimal(
                    str(
                        product.current_stock
                        or Decimal("0.00")
                    )
                )

                stock_after = (
                    stock_before
                    + quantity
                )

                movement_value = (
                    quantity
                    * purchase_price
                ).quantize(
                    Decimal("0.01")
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
                    quantity=(
                        quantity
                    ),
                    purchase_price=(
                        purchase_price
                    ),
                    gst_percentage=(
                        gst_percentage
                    ),
                    line_total=(
                        line_total
                    ),
                    created_by=(
                        created_by
                    ),
                )

                db.add(
                    db_item
                )

                # Required so db_item.id exists for
                # the immutable ledger source_id.
                db.flush()

                # ================================================
                # STOCK INCREASE
                # ================================================

                product.current_stock = (
                    stock_after
                )

                # Keep latest purchase price.
                product.purchase_price = (
                    purchase_price
                )

                # ================================================
                # STOCK MOVEMENT LEDGER
                # ================================================

                stock_movement = StockMovement(
                    product_id=(
                        product.id
                    ),
                    movement_type=(
                        "PURCHASE_IN"
                    ),
                    source_type=(
                        "PURCHASE_BILL_ITEM"
                    ),
                    source_id=(
                        db_item.id
                    ),
                    source_number=(
                        db_purchase_bill.bill_number
                    ),
                    quantity_in=(
                        quantity
                    ),
                    quantity_out=Decimal(
                        "0.00"
                    ),
                    stock_before=(
                        stock_before
                    ),
                    stock_after=(
                        stock_after
                    ),
                    unit_cost=(
                        purchase_price
                    ),
                    movement_value=(
                        movement_value
                    ),
                    performed_by=(
                        created_by
                    ),
                    remarks=(
                        db_purchase_bill.remarks
                    ),
                )

                db.add(
                    stock_movement
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

        # ========================================================
        # VALIDATE AGAINST RECORDED PAYMENTS
        # ========================================================

        paid_amount = (
            db.query(
                func.coalesce(
                    func.sum(
                        PurchaseBillPayment.amount
                    ),
                    0,
                )
            )
            .filter(
                PurchaseBillPayment.purchase_bill_id
                == db_purchase_bill.id
            )
            .scalar()
        )

        paid_amount = Decimal(
            str(
                paid_amount
                or Decimal("0.00")
            )
        ).quantize(
            Decimal("0.01")
        )

        new_grand_total = Decimal(
            str(
                purchase_bill.grand_total
            )
        ).quantize(
            Decimal("0.01")
        )

        if (
            new_grand_total
            < paid_amount
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    "Purchase Bill grand total cannot "
                    "be lower than the amount already paid. "
                    f"Paid amount: {paid_amount:.2f}."
                ),
            )

        # ========================================================
        # EXISTING CREDIT INFORMATION
        # ========================================================

        old_bill_date = (
            db_purchase_bill.bill_date
        )

        old_credit_days = int(
            db_purchase_bill.credit_days
            or 0
        )

        old_due_date = (
            db_purchase_bill.due_date
        )

        # ========================================================
        # NEW VALUES
        # ========================================================

        new_bill_date = (
            purchase_bill.bill_date
        )

        if (
            purchase_bill.credit_days
            is not None
        ):
            new_credit_days = int(
                purchase_bill.credit_days
            )

            new_due_date = (
                new_bill_date
                + timedelta(
                    days=new_credit_days
                )
            )

        elif (
            new_bill_date
            != old_bill_date
        ):
            new_credit_days = (
                old_credit_days
            )

            new_due_date = (
                new_bill_date
                + timedelta(
                    days=new_credit_days
                )
            )

        else:
            new_credit_days = (
                old_credit_days
            )

            # Preserve NULL due_date for
            # historical Purchase Bills.
            new_due_date = (
                old_due_date
            )

        # ========================================================
        # UPDATE BILL HEADER
        # ========================================================

        db_purchase_bill.bill_date = (
            new_bill_date
        )

        db_purchase_bill.credit_days = (
            new_credit_days
        )

        db_purchase_bill.due_date = (
            new_due_date
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
        cancelled_by: int,
    ):
        """
        Cancel a Purchase Bill and reverse its stock.

        Purchase reversal ledger rows are generated per
        PurchaseBillItem so duplicate product lines remain
        independently auditable.

        Purchase Bills with supplier payments cannot be
        cancelled until a payment reversal workflow exists.

        Everything is committed in one transaction.
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
            # BLOCK CANCELLATION WHEN PAYMENTS EXIST
            # ====================================================

            payment_count = (
                db.query(
                    func.count(
                        PurchaseBillPayment.id
                    )
                )
                .filter(
                    PurchaseBillPayment.purchase_bill_id
                    == purchase_bill.id
                )
                .scalar()
            )

            if (
                int(payment_count or 0)
                > 0
            ):
                raise HTTPException(
                    status_code=(
                        status.HTTP_400_BAD_REQUEST
                    ),
                    detail=(
                        "Purchase Bill cannot be cancelled "
                        "because supplier payments have already "
                        "been recorded against it."
                    ),
                )

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
            # LOCK PRODUCTS + VALIDATE COMPLETE REVERSAL
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
            # REVERSE EACH ITEM + CREATE LEDGER
            # ====================================================

            for item in bill_items:

                product = (
                    locked_products[
                        item.product_id
                    ]
                )

                quantity = Decimal(
                    str(item.quantity)
                )

                unit_cost = Decimal(
                    str(
                        item.purchase_price
                        or Decimal("0.00")
                    )
                )

                stock_before = Decimal(
                    str(
                        product.current_stock
                        or Decimal("0.00")
                    )
                )

                stock_after = (
                    stock_before
                    - quantity
                )

                movement_value = (
                    quantity
                    * unit_cost
                ).quantize(
                    Decimal("0.01")
                )

                product.current_stock = (
                    stock_after
                )

                reversal_movement = StockMovement(
                    product_id=(
                        item.product_id
                    ),
                    movement_type=(
                        "PURCHASE_REVERSAL_OUT"
                    ),
                    source_type=(
                        "PURCHASE_BILL_ITEM"
                    ),
                    source_id=(
                        item.id
                    ),
                    source_number=(
                        purchase_bill.bill_number
                    ),
                    quantity_in=Decimal(
                        "0.00"
                    ),
                    quantity_out=(
                        quantity
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
                        movement_value
                    ),
                    performed_by=(
                        cancelled_by
                    ),
                    remarks=(
                        "Purchase Bill cancellation"
                    ),
                )

                db.add(
                    reversal_movement
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