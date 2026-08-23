from datetime import datetime
from decimal import Decimal, InvalidOperation

from sqlalchemy.orm import Session

from app.models.supplier import Supplier
from app.models.product import Product
from app.models.purchase_bill import PurchaseBill
from app.models.purchase_bill_item import PurchaseBillItem


class PurchaseBillAIConfirmService:

    # ============================================================
    # DATE PARSER
    # ============================================================

    @staticmethod
    def parse_bill_date(date_value: str):
        """
        Convert a purchase bill date into a Python date object.

        Supported formats:
        DD-MM-YYYY
        DD-MMM-YYYY
        DD-Month-YYYY
        YYYY-MM-DD
        """

        if date_value is None:
            raise ValueError(
                "Purchase bill date is required."
            )

        date_value = str(date_value).strip()

        if not date_value:
            raise ValueError(
                "Purchase bill date is required."
            )

        supported_formats = [
            "%d-%m-%Y",
            "%d-%b-%Y",
            "%d-%B-%Y",
            "%Y-%m-%d",
        ]

        for date_format in supported_formats:
            try:
                return datetime.strptime(
                    date_value,
                    date_format,
                ).date()
            except ValueError:
                continue

        raise ValueError(
            f"Invalid purchase bill date: "
            f"'{date_value}'. "
            f"Supported formats are "
            f"DD-MM-YYYY, DD-MMM-YYYY, "
            f"DD-Month-YYYY, or YYYY-MM-DD."
        )

    # ============================================================
    # DECIMAL HELPER
    # ============================================================

    @staticmethod
    def decimal(value):
        """
        Safely convert a value into Decimal.

        Invalid or empty values become 0.00.
        """

        if value is None:
            return Decimal("0.00")

        if isinstance(value, Decimal):
            return value

        try:
            text_value = str(value).strip()

            if not text_value:
                return Decimal("0.00")

            return Decimal(text_value)

        except (
            InvalidOperation,
            ValueError,
            TypeError,
        ):
            return Decimal("0.00")

    # ============================================================
    # MONEY ROUNDING
    # ============================================================

    @staticmethod
    def money(value):
        """
        Round monetary values to two decimal places.
        """

        return (
            PurchaseBillAIConfirmService
            .decimal(value)
            .quantize(Decimal("0.01"))
        )

    # ============================================================
    # PRODUCT CODE GENERATOR
    # ============================================================

    @staticmethod
    def generate_product_code(db: Session):
        """
        Generate the next product code.

        Example:
        PROD00001
        PROD00002
        PROD00003
        """

        latest_product = (
            db.query(Product)
            .order_by(Product.id.desc())
            .first()
        )

        if latest_product:
            next_number = latest_product.id + 1
        else:
            next_number = 1

        product_code = f"PROD{next_number:05d}"

        # Safety check in case a code already exists.
        while (
            db.query(Product)
            .filter(
                Product.product_code == product_code
            )
            .first()
            is not None
        ):
            next_number += 1
            product_code = f"PROD{next_number:05d}"

        return product_code

    # ============================================================
    # MAIN CONFIRMATION
    # ============================================================

    @staticmethod
    def confirm(
        db: Session,
        data,
        current_user_id: int,
    ):
        """
        Confirm an AI/manual purchase bill.

        Process:
        1. Parse and validate bill date
        2. Find existing supplier
        3. Create supplier if necessary
        4. Check duplicate purchase bill
        5. Create purchase bill
        6. Find existing products
        7. Create products when necessary
        8. Generate product code for new products
        9. Calculate missing product values
        10. Create purchase bill items
        11. Commit complete transaction
        """

        try:

            # ====================================================
            # INPUT DATA
            # ====================================================

            supplier_data = data.supplier
            purchase_bill_data = data.purchase_bill
            products_data = data.products

            # ====================================================
            # DATE
            # ====================================================

            bill_date = (
                PurchaseBillAIConfirmService.parse_bill_date(
                    purchase_bill_data.bill_date
                )
            )

            # ====================================================
            # SUPPLIER
            # ====================================================

            supplier = None

            # ----------------------------------------------------
            # 1. Search by supplier ID
            # ----------------------------------------------------

            if supplier_data.supplier_id:
                supplier = (
                    db.query(Supplier)
                    .filter(
                        Supplier.id
                        == supplier_data.supplier_id
                    )
                    .first()
                )

            # ----------------------------------------------------
            # 2. Search by GST number
            # ----------------------------------------------------

            if (
                supplier is None
                and supplier_data.gst_number
            ):
                supplier = (
                    db.query(Supplier)
                    .filter(
                        Supplier.gst_number
                        == supplier_data.gst_number
                    )
                    .first()
                )

            # ----------------------------------------------------
            # 3. Search by company name
            # ----------------------------------------------------

            if (
                supplier is None
                and supplier_data.company_name
            ):
                supplier = (
                    db.query(Supplier)
                    .filter(
                        Supplier.company_name
                        == supplier_data.company_name
                    )
                    .first()
                )

            # ====================================================
            # CREATE SUPPLIER
            # ====================================================

            if supplier is None:

                latest_supplier = (
                    db.query(Supplier)
                    .order_by(
                        Supplier.id.desc()
                    )
                    .first()
                )

                if latest_supplier:
                    next_number = (
                        latest_supplier.id + 1
                    )
                else:
                    next_number = 1

                supplier_code = (
                    f"SUP{next_number:05d}"
                )

                supplier = Supplier(
                    supplier_code=supplier_code,
                    company_name=(
                        supplier_data.company_name
                        or ""
                    ),
                    contact_person=(
                        supplier_data.contact_person
                        or ""
                    ),
                    email=(
                        supplier_data.email
                        or ""
                    ),
                    phone=(
                        supplier_data.phone
                        or ""
                    ),
                    gst_number=(
                        supplier_data.gst_number
                        or ""
                    ),
                    address=(
                        supplier_data.address
                        or ""
                    ),
                    city=(
                        supplier_data.city
                        or ""
                    ),
                    state=(
                        supplier_data.state
                        or ""
                    ),
                    pincode=(
                        supplier_data.pincode
                        or ""
                    ),
                    is_active=True,
                    created_by=current_user_id,
                )

                db.add(supplier)
                db.flush()

            # ====================================================
            # DUPLICATE PURCHASE BILL CHECK
            # ====================================================

            existing_bill = (
                db.query(PurchaseBill)
                .filter(
                    PurchaseBill.supplier_id
                    == supplier.id,
                    PurchaseBill.bill_number
                    == purchase_bill_data.bill_number,
                    PurchaseBill.is_active
                    == True,
                )
                .first()
            )

            if existing_bill:
                raise ValueError(
                    "A purchase bill with this "
                    "bill number already exists "
                    "for this supplier."
                )

            # ====================================================
            # PURCHASE BILL TOTALS
            # ====================================================

            subtotal = (
                PurchaseBillAIConfirmService.money(
                    purchase_bill_data.subtotal
                )
            )

            total_gst = (
                PurchaseBillAIConfirmService.money(
                    purchase_bill_data.total_gst
                )
            )

            grand_total = (
                PurchaseBillAIConfirmService.money(
                    purchase_bill_data.grand_total
                )
            )

            # ====================================================
            # CREATE PURCHASE BILL
            # ====================================================

            purchase_bill = PurchaseBill(
                bill_number=(
                    purchase_bill_data.bill_number
                    or ""
                ),
                supplier_id=supplier.id,
                bill_date=bill_date,
                subtotal=subtotal,
                total_gst=total_gst,
                grand_total=grand_total,
                remarks=(
                    purchase_bill_data.remarks
                    or ""
                ),
                is_active=True,
                created_by=current_user_id,
            )

            db.add(purchase_bill)
            db.flush()

            # ====================================================
            # PRODUCTS
            # ====================================================

            for product_data in products_data:

                # ------------------------------------------------
                # Ignore completely empty product rows
                # ------------------------------------------------

                if not (
                    product_data.product_name
                    or product_data.description
                    or product_data.hsn_code
                ):
                    continue

                product = None

                # ------------------------------------------------
                # 1. Existing product by ID
                # ------------------------------------------------

                if product_data.product_id:
                    product = (
                        db.query(Product)
                        .filter(
                            Product.id
                            == product_data.product_id
                        )
                        .first()
                    )

                # ------------------------------------------------
                # 2. Existing product by exact name
                # ------------------------------------------------

                if (
                    product is None
                    and product_data.product_name
                ):
                    product = (
                        db.query(Product)
                        .filter(
                            Product.product_name
                            == product_data.product_name
                        )
                        .first()
                    )

                # =================================================
                # CREATE NEW PRODUCT
                # =================================================

                if product is None:

                    product_code = (
                        PurchaseBillAIConfirmService
                        .generate_product_code(db)
                    )

                    product = Product(
                        product_code=product_code,
                        product_name=(
                            product_data.product_name
                            or ""
                        ),
                        description=(
                            product_data.description
                            or ""
                        ),
                        category="",
                        unit=(
                            product_data.unit
                            or ""
                        ),
                        hsn_code=(
                            product_data.hsn_code
                            or ""
                        ),
                        gst_percentage=(
                            PurchaseBillAIConfirmService.money(
                                product_data.gst_percentage
                            )
                        ),
                        purchase_price=(
                            PurchaseBillAIConfirmService.money(
                                product_data.purchase_price
                            )
                        ),
                        selling_price=Decimal("0.00"),
                        minimum_stock=0,
                        maximum_stock=0,
                        current_stock=0,
                        is_active=True,
                        created_by=current_user_id,
                    )

                    db.add(product)
                    db.flush()

                # =================================================
                # PRODUCT VALUES
                # =================================================

                quantity = (
                    PurchaseBillAIConfirmService.decimal(
                        product_data.quantity
                    )
                )

                purchase_price = (
                    PurchaseBillAIConfirmService.decimal(
                        product_data.purchase_price
                    )
                )

                gst_percentage = (
                    PurchaseBillAIConfirmService.decimal(
                        product_data.gst_percentage
                    )
                )

                line_total = (
                    PurchaseBillAIConfirmService.decimal(
                        product_data.line_total
                    )
                )

                # ------------------------------------------------
                # Prevent negative values
                # ------------------------------------------------

                if quantity < Decimal("0"):
                    quantity = Decimal("0.00")

                if purchase_price < Decimal("0"):
                    purchase_price = Decimal("0.00")

                if gst_percentage < Decimal("0"):
                    gst_percentage = Decimal("0.00")

                if line_total < Decimal("0"):
                    line_total = Decimal("0.00")

                # =================================================
                # CALCULATE PURCHASE PRICE
                # =================================================

                if (
                    purchase_price == Decimal("0")
                    and quantity > Decimal("0")
                    and line_total > Decimal("0")
                ):
                    purchase_price = (
                        line_total / quantity
                    ).quantize(
                        Decimal("0.01")
                    )

                # =================================================
                # CALCULATE LINE TOTAL
                # =================================================

                if (
                    line_total == Decimal("0")
                    and quantity > Decimal("0")
                ):
                    line_total = (
                        quantity * purchase_price
                    ).quantize(
                        Decimal("0.01")
                    )

                # =================================================
                # CREATE PURCHASE BILL ITEM
                # =================================================

                purchase_bill_item = PurchaseBillItem(
                    purchase_bill_id=purchase_bill.id,
                    product_id=product.id,
                    quantity=quantity,
                    purchase_price=purchase_price,
                    gst_percentage=gst_percentage,
                    line_total=line_total,
                    created_by=current_user_id,
                )

                db.add(purchase_bill_item)

            # ====================================================
            # COMMIT
            # ====================================================

            db.commit()

            # ====================================================
            # REFRESH
            # ====================================================

            db.refresh(supplier)
            db.refresh(purchase_bill)

            # ====================================================
            # RETURN RESULT
            # ====================================================

            return {
                "success": True,
                "supplier_id": supplier.id,
                "purchase_bill_id": purchase_bill.id,
                "bill_number": purchase_bill.bill_number,
                "bill_date": purchase_bill.bill_date.isoformat(),
                "subtotal": float(
                    purchase_bill.subtotal
                ),
                "total_gst": float(
                    purchase_bill.total_gst
                ),
                "grand_total": float(
                    purchase_bill.grand_total
                ),
            }

        except Exception:
            # ====================================================
            # ROLLBACK
            # ====================================================

            db.rollback()
            raise