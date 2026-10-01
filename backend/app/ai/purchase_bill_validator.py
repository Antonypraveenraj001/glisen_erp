from decimal import (
    Decimal,
    InvalidOperation,
)


class PurchaseBillValidator:

    GST_TOLERANCE = Decimal(
        "0.05"
    )

    # ============================================================
    # DECIMAL
    # ============================================================

    @staticmethod
    def _decimal(
        value,
    ) -> Decimal:
        """
        Safely convert a value to Decimal.

        Handles:

        - None
        - integers
        - floats
        - numeric strings
        - empty strings
        - invalid values
        - common currency symbols
        """

        if value is None:

            return Decimal(
                "0"
            )

        if isinstance(
            value,
            Decimal,
        ):

            return value

        try:

            text = str(
                value
            ).strip()

            if not text:

                return Decimal(
                    "0"
                )

            text = (
                text
                .replace(
                    ",",
                    "",
                )
                .replace(
                    "₹",
                    "",
                )
                .replace(
                    "$",
                    "",
                )
                .replace(
                    "€",
                    "",
                )
                .replace(
                    "£",
                    "",
                )
                .replace(
                    "%",
                    "",
                )
            )

            return Decimal(
                text
            )

        except (
            InvalidOperation,
            ValueError,
            TypeError,
        ):

            return Decimal(
                "0"
            )

    # ============================================================
    # MONEY
    # ============================================================

    @staticmethod
    def _money(
        value: Decimal,
    ) -> Decimal:
        """
        Round monetary values to two decimal places.
        """

        return value.quantize(
            Decimal(
                "0.01"
            )
        )

    # ============================================================
    # PERCENTAGE
    # ============================================================

    @staticmethod
    def _percentage(
        value: Decimal,
    ) -> Decimal:
        """
        Normalize GST percentage.

        GST percentages cannot be negative.
        """

        if (
            value
            <
            Decimal(
                "0"
            )
        ):

            return Decimal(
                "0"
            )

        return value

    # ============================================================
    # GST FOR ONE LINE
    # ============================================================

    @staticmethod
    def _line_gst(
        line_total: Decimal,
        gst_percentage: Decimal,
    ) -> Decimal:

        if (
            line_total
            <=
            Decimal(
                "0"
            )
        ):

            return Decimal(
                "0.00"
            )

        if (
            gst_percentage
            <=
            Decimal(
                "0"
            )
        ):

            return Decimal(
                "0.00"
            )

        return (
            PurchaseBillValidator
            ._money(
                (
                    line_total
                    *
                    gst_percentage
                )
                /
                Decimal(
                    "100"
                )
            )
        )

    # ============================================================
    # GST DIFFERENCE
    # ============================================================

    @staticmethod
    def _gst_matches(
        first: Decimal,
        second: Decimal,
    ) -> bool:

        difference = abs(
            first
            -
            second
        )

        return (
            difference
            <=
            PurchaseBillValidator
            .GST_TOLERANCE
        )

    # ============================================================
    # MAIN VALIDATION
    # ============================================================

    @staticmethod
    def validate(
        ai_data: dict,
    ):
        """
        Validate and calculate Purchase Bill values.

        Responsibilities:

        1. Validate product quantities.
        2. Validate purchase prices.
        3. Calculate missing line totals.
        4. Recalculate line totals when quantity
           and price exist.
        5. Calculate subtotal from product lines.
        6. Validate item GST against bill GST.
        7. Correct the common CGST/SGST half-rate
           extraction problem.

           Example:

               CGST 9%
               SGST 9%

           AI incorrectly returns:

               gst_percentage = 9

           Bill arithmetic proves:

               total GST = 18%

           Validator corrects item rate to:

               gst_percentage = 18

        8. Calculate missing header GST from item
           GST when possible.
        9. Calculate grand total.
        10. Prevent negative monetary values.
        11. Return clean JSON-compatible values.

        IMPORTANT:

        The validator is the final calculation
        layer before data reaches the Purchase
        Bill Review page.
        """

        if not isinstance(
            ai_data,
            dict,
        ):

            return ai_data

        # ========================================================
        # REQUIRED STRUCTURES
        # ========================================================

        if not isinstance(
            ai_data.get(
                "products"
            ),
            list,
        ):

            ai_data[
                "products"
            ] = []

        if not isinstance(
            ai_data.get(
                "purchase_bill"
            ),
            dict,
        ):

            ai_data[
                "purchase_bill"
            ] = {}

        products = (
            ai_data[
                "products"
            ]
        )

        purchase_bill = (
            ai_data[
                "purchase_bill"
            ]
        )

        # ========================================================
        # PRESERVE EXTRACTED HEADER VALUES
        #
        # We use the original Grand Total as one
        # additional cross-check before changing an
        # extracted GST rate.
        # ========================================================

        extracted_grand_total = (
            PurchaseBillValidator
            ._decimal(
                purchase_bill.get(
                    "grand_total",
                    0,
                )
            )
        )

        if (
            extracted_grand_total
            <
            Decimal(
                "0"
            )
        ):

            extracted_grand_total = (
                Decimal(
                    "0"
                )
            )

        # ========================================================
        # PRODUCT CALCULATION
        # ========================================================

        subtotal = Decimal(
            "0.00"
        )

        for product in products:

            if not isinstance(
                product,
                dict,
            ):

                continue

            # ----------------------------------------------------
            # READ VALUES
            # ----------------------------------------------------

            quantity = (
                PurchaseBillValidator
                ._decimal(
                    product.get(
                        "quantity",
                        0,
                    )
                )
            )

            purchase_price = (
                PurchaseBillValidator
                ._decimal(
                    product.get(
                        "purchase_price",
                        0,
                    )
                )
            )

            line_total = (
                PurchaseBillValidator
                ._decimal(
                    product.get(
                        "line_total",
                        0,
                    )
                )
            )

            gst_percentage = (
                PurchaseBillValidator
                ._decimal(
                    product.get(
                        "gst_percentage",
                        0,
                    )
                )
            )

            # ----------------------------------------------------
            # PREVENT NEGATIVE VALUES
            # ----------------------------------------------------

            if (
                quantity
                <
                Decimal(
                    "0"
                )
            ):

                quantity = Decimal(
                    "0"
                )

            if (
                purchase_price
                <
                Decimal(
                    "0"
                )
            ):

                purchase_price = (
                    Decimal(
                        "0"
                    )
                )

            if (
                line_total
                <
                Decimal(
                    "0"
                )
            ):

                line_total = Decimal(
                    "0"
                )

            gst_percentage = (
                PurchaseBillValidator
                ._percentage(
                    gst_percentage
                )
            )

            # ----------------------------------------------------
            # CALCULATED LINE TOTAL
            # ----------------------------------------------------

            calculated_line_total = (
                quantity
                *
                purchase_price
            )

            calculated_line_total = (
                PurchaseBillValidator
                ._money(
                    calculated_line_total
                )
            )

            # ----------------------------------------------------
            # QUANTITY + PRICE ARE AUTHORITATIVE
            #
            # Example:
            #
            # quantity = 10
            # price = 850
            # AI line total = 9000
            #
            # Final line total = 8500
            # ----------------------------------------------------

            if (
                quantity
                >
                Decimal(
                    "0"
                )
                and
                purchase_price
                >
                Decimal(
                    "0"
                )
            ):

                line_total = (
                    calculated_line_total
                )

            # ----------------------------------------------------
            # DERIVE PRICE FROM LINE TOTAL
            # ----------------------------------------------------

            elif (
                purchase_price
                <=
                Decimal(
                    "0"
                )
                and
                quantity
                >
                Decimal(
                    "0"
                )
                and
                line_total
                >
                Decimal(
                    "0"
                )
            ):

                purchase_price = (
                    line_total
                    /
                    quantity
                )

                purchase_price = (
                    PurchaseBillValidator
                    ._money(
                        purchase_price
                    )
                )

                line_total = (
                    quantity
                    *
                    purchase_price
                )

                line_total = (
                    PurchaseBillValidator
                    ._money(
                        line_total
                    )
                )

            # ----------------------------------------------------
            # DERIVE LINE TOTAL
            # ----------------------------------------------------

            elif (
                line_total
                <=
                Decimal(
                    "0"
                )
                and
                quantity
                >
                Decimal(
                    "0"
                )
                and
                purchase_price
                >
                Decimal(
                    "0"
                )
            ):

                line_total = (
                    quantity
                    *
                    purchase_price
                )

                line_total = (
                    PurchaseBillValidator
                    ._money(
                        line_total
                    )
                )

            # ----------------------------------------------------
            # NORMALIZE
            # ----------------------------------------------------

            quantity = (
                quantity.quantize(
                    Decimal(
                        "0.001"
                    )
                )
            )

            purchase_price = (
                PurchaseBillValidator
                ._money(
                    purchase_price
                )
            )

            line_total = (
                PurchaseBillValidator
                ._money(
                    line_total
                )
            )

            gst_percentage = (
                gst_percentage
                .quantize(
                    Decimal(
                        "0.01"
                    )
                )
            )

            # ----------------------------------------------------
            # WRITE CLEAN VALUES
            # ----------------------------------------------------

            product[
                "quantity"
            ] = float(
                quantity
            )

            product[
                "purchase_price"
            ] = float(
                purchase_price
            )

            product[
                "gst_percentage"
            ] = float(
                gst_percentage
            )

            product[
                "line_total"
            ] = float(
                line_total
            )

            subtotal += (
                line_total
            )

        # ========================================================
        # SUBTOTAL
        # ========================================================

        subtotal = (
            PurchaseBillValidator
            ._money(
                subtotal
            )
        )

        purchase_bill[
            "subtotal"
        ] = float(
            subtotal
        )

        # ========================================================
        # EXTRACTED HEADER GST
        # ========================================================

        total_gst = (
            PurchaseBillValidator
            ._decimal(
                purchase_bill.get(
                    "total_gst",
                    0,
                )
            )
        )

        if (
            total_gst
            <
            Decimal(
                "0"
            )
        ):

            total_gst = Decimal(
                "0"
            )

        total_gst = (
            PurchaseBillValidator
            ._money(
                total_gst
            )
        )

        # ========================================================
        # ITEM GST TOTAL
        # ========================================================

        item_gst_total = Decimal(
            "0.00"
        )

        taxable_products = []

        extracted_rates = []

        for product in products:

            if not isinstance(
                product,
                dict,
            ):

                continue

            line_total = (
                PurchaseBillValidator
                ._money(
                    PurchaseBillValidator
                    ._decimal(
                        product.get(
                            "line_total",
                            0,
                        )
                    )
                )
            )

            gst_percentage = (
                PurchaseBillValidator
                ._percentage(
                    PurchaseBillValidator
                    ._decimal(
                        product.get(
                            "gst_percentage",
                            0,
                        )
                    )
                )
                .quantize(
                    Decimal(
                        "0.01"
                    )
                )
            )

            if (
                line_total
                >
                Decimal(
                    "0"
                )
            ):

                taxable_products.append(
                    product
                )

                extracted_rates.append(
                    gst_percentage
                )

            item_gst_total += (
                PurchaseBillValidator
                ._line_gst(
                    line_total=(
                        line_total
                    ),
                    gst_percentage=(
                        gst_percentage
                    ),
                )
            )

        item_gst_total = (
            PurchaseBillValidator
            ._money(
                item_gst_total
            )
        )

        # ========================================================
        # MISSING HEADER GST
        #
        # If header GST was not extracted but item
        # GST rates are available, use calculated
        # item GST.
        # ========================================================

        if (
            total_gst
            ==
            Decimal(
                "0.00"
            )
            and
            item_gst_total
            >
            Decimal(
                "0.00"
            )
        ):

            total_gst = (
                item_gst_total
            )

        # ========================================================
        # GST CONSISTENCY CORRECTION
        #
        # Example bill:
        #
        # Subtotal = 6300
        # CGST @ 9% = 567
        # SGST @ 9% = 567
        # Total GST = 1134
        # Grand Total = 7434
        #
        # AI may extract item GST as 9%.
        #
        # Item tax at 9%:
        #
        # 6300 × 9% = 567
        #
        # But bill header clearly proves total tax
        # is 1134 = 18%.
        #
        # We correct the rate only when:
        #
        # 1. All taxable lines currently use the
        #    same extracted GST rate.
        #
        # 2. Bill subtotal + bill total GST agrees
        #    with the extracted Grand Total, when
        #    Grand Total is available.
        #
        # 3. The implied total GST rate reproduces
        #    the bill GST amount.
        #
        # 4. The implied rate is exactly the common
        #    CGST + SGST doubling pattern:
        #
        #       9 -> 18
        #       6 -> 12
        #       2.5 -> 5
        #       etc.
        #
        # This avoids blindly changing legitimate
        # mixed-rate Purchase Bills.
        # ========================================================

        gst_is_inconsistent = (
            total_gst
            >
            Decimal(
                "0.00"
            )
            and
            subtotal
            >
            Decimal(
                "0.00"
            )
            and
            not PurchaseBillValidator
            ._gst_matches(
                item_gst_total,
                total_gst,
            )
        )

        if (
            gst_is_inconsistent
            and
            taxable_products
            and
            extracted_rates
        ):

            unique_rates = set(
                extracted_rates
            )

            # ----------------------------------------------------
            # Only infer one common rate when every
            # taxable line currently has one common
            # extracted GST percentage.
            # ----------------------------------------------------

            if (
                len(
                    unique_rates
                )
                ==
                1
            ):

                current_rate = (
                    next(
                        iter(
                            unique_rates
                        )
                    )
                )

                implied_rate = (
                    (
                        total_gst
                        /
                        subtotal
                    )
                    *
                    Decimal(
                        "100"
                    )
                ).quantize(
                    Decimal(
                        "0.01"
                    )
                )

                # ------------------------------------------------
                # HEADER ARITHMETIC CHECK
                # ------------------------------------------------

                expected_header_total = (
                    PurchaseBillValidator
                    ._money(
                        subtotal
                        +
                        total_gst
                    )
                )

                if (
                    extracted_grand_total
                    >
                    Decimal(
                        "0"
                    )
                ):

                    header_math_is_consistent = (
                        PurchaseBillValidator
                        ._gst_matches(
                            expected_header_total,
                            PurchaseBillValidator
                            ._money(
                                extracted_grand_total
                            ),
                        )
                    )

                else:

                    # Grand Total was not extracted,
                    # therefore it cannot contradict
                    # subtotal + total GST.
                    header_math_is_consistent = (
                        True
                    )

                # ------------------------------------------------
                # VERIFY IMPLIED RATE AGAINST EVERY
                # TAXABLE LINE
                # ------------------------------------------------

                implied_item_gst_total = Decimal(
                    "0.00"
                )

                for product in taxable_products:

                    product_line_total = (
                        PurchaseBillValidator
                        ._money(
                            PurchaseBillValidator
                            ._decimal(
                                product.get(
                                    "line_total",
                                    0,
                                )
                            )
                        )
                    )

                    implied_item_gst_total += (
                        PurchaseBillValidator
                        ._line_gst(
                            line_total=(
                                product_line_total
                            ),
                            gst_percentage=(
                                implied_rate
                            ),
                        )
                    )

                implied_item_gst_total = (
                    PurchaseBillValidator
                    ._money(
                        implied_item_gst_total
                    )
                )

                implied_rate_matches_bill = (
                    PurchaseBillValidator
                    ._gst_matches(
                        implied_item_gst_total,
                        total_gst,
                    )
                )

                # ------------------------------------------------
                # CGST + SGST HALF-RATE PATTERN
                # ------------------------------------------------

                doubled_current_rate = (
                    current_rate
                    *
                    Decimal(
                        "2"
                    )
                ).quantize(
                    Decimal(
                        "0.01"
                    )
                )

                half_rate_pattern = (
                    current_rate
                    >
                    Decimal(
                        "0"
                    )
                    and
                    PurchaseBillValidator
                    ._gst_matches(
                        implied_rate,
                        doubled_current_rate,
                    )
                )

                # ------------------------------------------------
                # MISSING RATE PATTERN
                #
                # If AI returned zero rate but the
                # bill header clearly proves a common
                # GST rate, use the implied rate.
                # ------------------------------------------------

                missing_rate_pattern = (
                    current_rate
                    ==
                    Decimal(
                        "0.00"
                    )
                    and
                    implied_rate
                    >
                    Decimal(
                        "0.00"
                    )
                    and
                    implied_rate
                    <=
                    Decimal(
                        "100.00"
                    )
                )

                # ------------------------------------------------
                # APPLY SAFE CORRECTION
                # ------------------------------------------------

                if (
                    header_math_is_consistent
                    and
                    implied_rate_matches_bill
                    and
                    (
                        half_rate_pattern
                        or
                        missing_rate_pattern
                    )
                ):

                    for product in taxable_products:

                        product[
                            "gst_percentage"
                        ] = float(
                            implied_rate
                        )

                    item_gst_total = (
                        implied_item_gst_total
                    )

        # ========================================================
        # HEADER TOTAL GST
        # ========================================================

        purchase_bill[
            "total_gst"
        ] = float(
            total_gst
        )

        # ========================================================
        # GRAND TOTAL
        #
        # Grand Total = Subtotal + Total GST
        # ========================================================

        grand_total = (
            subtotal
            +
            total_gst
        )

        grand_total = (
            PurchaseBillValidator
            ._money(
                grand_total
            )
        )

        purchase_bill[
            "grand_total"
        ] = float(
            grand_total
        )

        # ========================================================
        # RETURN
        # ========================================================

        return ai_data