from decimal import Decimal


class PurchaseBillValidator:

    @staticmethod
    def validate(ai_data: dict):

        products = ai_data["products"]

        subtotal = Decimal("0.00")

        for product in products:

            quantity = Decimal(
                str(product.get("quantity", 0))
            )

            purchase_price = Decimal(
                str(product.get("purchase_price", 0))
            )

            line_total = Decimal(
                str(product.get("line_total", 0))
            )

            gst_percentage = Decimal(
                str(product.get("gst_percentage", 0))
            )

            if quantity < 0:
                quantity = Decimal("0")

            if purchase_price < 0:
                purchase_price = Decimal("0")

            if line_total < 0:
                line_total = Decimal("0")

            if gst_percentage < 0:
                gst_percentage = Decimal("0")

            # ----------------------------
            # Calculate Purchase Price
            # ----------------------------

            if (
                purchase_price == 0
                and quantity > 0
                and line_total > 0
            ):
                purchase_price = (
                    line_total / quantity
                ).quantize(
                    Decimal("0.01")
                )

            # ----------------------------
            # Calculate Line Total
            # ----------------------------

            if (
                line_total == 0
                and quantity > 0
            ):
                line_total = (
                    quantity
                    * purchase_price
                ).quantize(
                    Decimal("0.01")
                )

            product["quantity"] = float(quantity)
            product["purchase_price"] = float(
                purchase_price
            )
            product["line_total"] = float(
                line_total
            )
            product["gst_percentage"] = float(
                gst_percentage
            )

            subtotal += line_total

        ai_data["purchase_bill"][
            "subtotal"
        ] = float(
            subtotal.quantize(
                Decimal("0.01")
            )
        )

        total_gst = Decimal(
            str(
                ai_data["purchase_bill"].get(
                    "total_gst",
                    0,
                )
            )
        )

        grand_total = subtotal + total_gst

        ai_data["purchase_bill"][
            "grand_total"
        ] = float(
            grand_total.quantize(
                Decimal("0.01")
            )
        )

        return ai_data