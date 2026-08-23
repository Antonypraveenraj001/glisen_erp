from sqlalchemy.orm import Session

from app.ai.purchase_bill_ai import PurchaseBillAI
from app.ai.purchase_bill_validator import (
    PurchaseBillValidator,
)
from app.repositories.product_repository import (
    ProductRepository,
)
from app.repositories.supplier_repository import (
    SupplierRepository,
)


class PurchaseBillAIService:

    @staticmethod
    async def extract(
        db: Session,
        file_bytes: bytes,
        filename: str,
    ):

        # ==========================================
        # 1. AI DOCUMENT EXTRACTION
        # ==========================================

        ai_result = (
            await PurchaseBillAI.extract_purchase_bill(
                file_bytes=file_bytes,
                filename=filename,
            )
        )

        data = ai_result["data"]

        supplier = data.get(
            "supplier",
            {},
        )

        products = data.get(
            "products",
            []
        )

        # ==========================================
        # 2. SUPPLIER MATCHING
        # ==========================================

        supplier_match = None
        match_type = None

        gst_number = str(
            supplier.get(
                "gst_number",
                "",
            )
            or ""
        ).strip()

        if gst_number:

            supplier_match = (
                SupplierRepository.get_by_gst_number(
                    db=db,
                    gst_number=gst_number,
                )
            )

            if supplier_match:
                match_type = "gst_number"

        # ------------------------------------------
        # Fallback: company name
        # ------------------------------------------

        if supplier_match is None:

            company_name = str(
                supplier.get(
                    "company_name",
                    "",
                )
                or ""
            ).strip()

            if company_name:

                supplier_match = (
                    SupplierRepository.get_by_company_name(
                        db=db,
                        company_name=company_name,
                    )
                )

                if supplier_match:
                    match_type = "company_name"

        # ------------------------------------------
        # Add matching information
        #
        # IMPORTANT:
        # Do NOT replace the AI-extracted supplier
        # information.
        # ------------------------------------------

        supplier[
            "existing_supplier"
        ] = supplier_match is not None

        supplier[
            "supplier_id"
        ] = (
            supplier_match.id
            if supplier_match
            else None
        )

        supplier[
            "match_type"
        ] = match_type

        # ==========================================
        # 3. PRODUCT MATCHING
        # ==========================================

        for product in products:

            product_match = None
            product_match_type = None

            # --------------------------------------
            # Match by HSN
            # --------------------------------------

            hsn_code = str(
                product.get(
                    "hsn_code",
                    "",
                )
                or ""
            ).strip()

            if hsn_code:

                product_match = (
                    ProductRepository.get_by_hsn_code(
                        db=db,
                        hsn_code=hsn_code,
                    )
                )

                if product_match:
                    product_match_type = (
                        "hsn_code"
                    )

            # --------------------------------------
            # Fallback: product name
            # --------------------------------------

            if product_match is None:

                product_name = str(
                    product.get(
                        "product_name",
                        "",
                    )
                    or ""
                ).strip()

                if product_name:

                    product_match = (
                        ProductRepository.get_by_name(
                            db=db,
                            product_name=product_name,
                        )
                    )

                    if product_match:
                        product_match_type = (
                            "product_name"
                        )

            # --------------------------------------
            # Add matching metadata
            #
            # IMPORTANT:
            # Never replace the AI-extracted
            # product values.
            # --------------------------------------

            product[
                "existing_product"
            ] = product_match is not None

            product[
                "product_id"
            ] = (
                product_match.id
                if product_match
                else None
            )

            product[
                "match_type"
            ] = product_match_type

        # ==========================================
        # 4. VALIDATE + CALCULATE
        # ==========================================
        #
        # This happens AFTER AI extraction and
        # supplier/product matching.
        #
        # The validator is responsible for:
        #
        # quantity
        # purchase_price
        # line_total
        # subtotal
        # GST
        # grand_total
        #
        # ==========================================

        data = PurchaseBillValidator.validate(
            data
        )

        # ==========================================
        # 5. RETURN FINAL REVIEW DATA
        # ==========================================

        ai_result["data"] = data

        return ai_result