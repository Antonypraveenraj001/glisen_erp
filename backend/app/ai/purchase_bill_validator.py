from decimal import Decimal, InvalidOperation


class PurchaseBillValidator:

    @staticmethod
    def _decimal(value) -> Decimal:
        """
        Safely convert a value to Decimal.

        Handles:
        - None
        - integers
        - floats
        - numeric strings
        - empty strings
        - invalid values
        """

        if value is None:
            return Decimal("0")

        if isinstance(value, Decimal):
            return value

        try:
            text = str(value).strip()

            if not text:
                return Decimal("0")

            # Remove common currency formatting.
            text = (
                text
                .replace(",", "")
                .replace("₹", "")
                .replace("$", "")
                .replace("€", "")
                .replace("£", "")
            )

            return Decimal(text)

        except (InvalidOperation, ValueError, TypeError):
            return Decimal("0")

    @staticmethod
    def _money(value: Decimal) -> Decimal:
        """
        Round monetary values to two decimal places.
        """
        return value.quantize(Decimal("0.01"))

    @staticmethod
    def _percentage(value: Decimal) -> Decimal:
        """
        Normalize GST percentage.

        GST percentages cannot be negative.

        Example:
            -5  -> 0
            18  -> 18
        """

        if value < 0:
            return Decimal("0")

        return value

    @staticmethod
    def validate(ai_data: dict):
        """
        Validate and calculate Purchase Bill values.

        Responsibilities:

        1. Validate product quantities.
        2. Validate purchase prices.
        3. Calculate missing line totals.
        4. Recalculate line totals when quantity and price exist.
        5. Calculate subtotal from product line totals.
        6. Preserve AI-extracted GST.
        7. Calculate grand total = subtotal + total GST.
        8. Prevent negative monetary values.
        9. Return clean JSON-compatible numeric values.

        IMPORTANT:
        The validator is the final calculation layer before
        the data reaches the Purchase Bill Review page.
        """

        if not isinstance(ai_data, dict):
            return ai_data

        # --------------------------------------------------
        # Ensure required structures exist
        # --------------------------------------------------

        if not isinstance(
            ai_data.get("products"),
            list,
        ):
            ai_data["products"] = []

        if not isinstance(
            ai_data.get("purchase_bill"),
            dict,
        ):
            ai_data["purchase_bill"] = {}

        products = ai_data["products"]

        purchase_bill = ai_data["purchase_bill"]

        # --------------------------------------------------
        # PRODUCT CALCULATION
        # --------------------------------------------------

        subtotal = Decimal("0.00")

        for product in products:

            if not isinstance(product, dict):
                continue

            # ----------------------------------------------
            # Read values
            # ----------------------------------------------

            quantity = PurchaseBillValidator._decimal(
                product.get(
                    "quantity",
                    0,
                )
            )

            purchase_price = PurchaseBillValidator._decimal(
                product.get(
                    "purchase_price",
                    0,
                )
            )

            line_total = PurchaseBillValidator._decimal(
                product.get(
                    "line_total",
                    0,
                )
            )

            gst_percentage = PurchaseBillValidator._decimal(
                product.get(
                    "gst_percentage",
                    0,
                )
            )

            # ----------------------------------------------
            # Prevent negative values
            # ----------------------------------------------

            if quantity < 0:
                quantity = Decimal("0")

            if purchase_price < 0:
                purchase_price = Decimal("0")

            if line_total < 0:
                line_total = Decimal("0")

            gst_percentage = (
                PurchaseBillValidator._percentage(
                    gst_percentage
                )
            )

            # ----------------------------------------------
            # Calculate line total
            #
            # Quantity × Purchase Price
            #
            # Example:
            #
            # 10 × 850 = 8500
            # ----------------------------------------------

            calculated_line_total = (
                quantity * purchase_price
            )

            calculated_line_total = (
                PurchaseBillValidator._money(
                    calculated_line_total
                )
            )

            # ------------------------------------------------
            # IMPORTANT CALCULATION RULE
            # ------------------------------------------------
            #
            # If quantity and purchase price are available,
            # they are the authoritative values.
            #
            # This prevents an incorrect AI line_total from
            # causing the Review page to show inconsistent
            # calculations.
            #
            # Example:
            #
            # quantity = 10
            # price = 850
            # AI line_total = 9000
            #
            # Final line_total = 8500
            # ------------------------------------------------

            if (
                quantity > 0
                and purchase_price > 0
            ):
                line_total = (
                    calculated_line_total
                )

            # ------------------------------------------------
            # If price is missing but quantity and line total
            # exist, calculate price.
            #
            # Example:
            #
            # quantity = 10
            # line_total = 8500
            #
            # price = 850
            # ------------------------------------------------

            elif (
                purchase_price <= 0
                and quantity > 0
                and line_total > 0
            ):

                purchase_price = (
                    line_total / quantity
                )

                purchase_price = (
                    PurchaseBillValidator._money(
                        purchase_price
                    )
                )

                # Recalculate once price has been derived.

                line_total = (
                    quantity * purchase_price
                )

                line_total = (
                    PurchaseBillValidator._money(
                        line_total
                    )
                )

            # ------------------------------------------------
            # If line total is missing but price exists,
            # calculate it.
            # ------------------------------------------------

            elif (
                line_total <= 0
                and quantity > 0
                and purchase_price > 0
            ):

                line_total = (
                    quantity * purchase_price
                )

                line_total = (
                    PurchaseBillValidator._money(
                        line_total
                    )
                )

            # ------------------------------------------------
            # Normalize all numeric values
            # ------------------------------------------------

            quantity = quantity.quantize(
                Decimal("0.001")
            )

            purchase_price = (
                PurchaseBillValidator._money(
                    purchase_price
                )
            )

            line_total = (
                PurchaseBillValidator._money(
                    line_total
                )
            )

            gst_percentage = (
                gst_percentage.quantize(
                    Decimal("0.01")
                )
            )

            # ------------------------------------------------
            # Write clean values back to product
            # ------------------------------------------------

            product["quantity"] = float(
                quantity
            )

            product["purchase_price"] = float(
                purchase_price
            )

            product["gst_percentage"] = float(
                gst_percentage
            )

            product["line_total"] = float(
                line_total
            )

            # ------------------------------------------------
            # Add to subtotal
            # ------------------------------------------------

            subtotal += line_total

        # --------------------------------------------------
        # FINAL SUBTOTAL
        # --------------------------------------------------

        subtotal = (
            PurchaseBillValidator._money(
                subtotal
            )
        )

        purchase_bill["subtotal"] = float(
            subtotal
        )

        # --------------------------------------------------
        # GST
        # --------------------------------------------------

        total_gst = PurchaseBillValidator._decimal(
            purchase_bill.get(
                "total_gst",
                0,
            )
        )

        if total_gst < 0:
            total_gst = Decimal("0")

        total_gst = (
            PurchaseBillValidator._money(
                total_gst
            )
        )

        purchase_bill["total_gst"] = float(
            total_gst
        )

        # --------------------------------------------------
        # GRAND TOTAL
        #
        # Grand Total = Subtotal + GST
        # --------------------------------------------------

        grand_total = (
            subtotal + total_gst
        )

        grand_total = (
            PurchaseBillValidator._money(
                grand_total
            )
        )

        purchase_bill["grand_total"] = float(
            grand_total
        )

        # --------------------------------------------------
        # RETURN VALIDATED DATA
        # --------------------------------------------------

        return ai_data