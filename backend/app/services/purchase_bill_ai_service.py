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
                SupplierRepository
                .get_by_gst_number(
                    db=db,
                    gst_number=gst_number,
                )
            )

            if supplier_match:
                match_type = (
                    "gst_number"
                )

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
                    SupplierRepository
                    .get_by_company_name(
                        db=db,
                        company_name=(
                            company_name
                        ),
                    )
                )

                if supplier_match:
                    match_type = (
                        "company_name"
                    )

        # ------------------------------------------
        # Add matching information
        #
        # IMPORTANT:
        # Do NOT replace the AI-extracted supplier
        # information.
        # ------------------------------------------

        supplier[
            "existing_supplier"
        ] = (
            supplier_match
            is not None
        )

        supplier[
            "supplier_id"
        ] = (
            supplier_match.id
            if supplier_match
            else None
        )

        supplier[
            "match_type"
        ] = (
            match_type
        )

        # ==========================================
        # 3. PRODUCT MATCHING
        # ==========================================
        #
        # IMPORTANT:
        #
        # HSN is a classification code.
        #
        # It is NOT a unique Product identifier.
        #
        # Different products can legally share the
        # same HSN.
        #
        # Example:
        #
        # Welding Rod E6013 3.15 mm
        # Welding Rod E7018 3.15 mm
        # Welding Rod E6013 2.50 mm
        #
        # can all use HSN:
        #
        # 83111000
        #
        # Therefore:
        #
        # 1. Product name is the primary match.
        # 2. HSN is used only when the AI could not
        #    extract a product name.
        #
        # If a named Product cannot be matched,
        # product_id remains None and the normal
        # Purchase Bill confirmation workflow will
        # create a new Product instead of corrupting
        # another Product's stock.
        # ==========================================

        for product in products:

            product_match = None
            product_match_type = None

            # --------------------------------------
            # PRODUCT NAME
            # --------------------------------------

            product_name = str(
                product.get(
                    "product_name",
                    "",
                )
                or ""
            ).strip()

            # --------------------------------------
            # HSN
            # --------------------------------------

            hsn_code = str(
                product.get(
                    "hsn_code",
                    "",
                )
                or ""
            ).strip()

            # --------------------------------------
            # PRIMARY:
            # Exact/case-insensitive product name
            # --------------------------------------

            if product_name:

                product_match = (
                    ProductRepository
                    .get_by_name(
                        db=db,
                        product_name=(
                            product_name
                        ),
                    )
                )

                if product_match:

                    product_match_type = (
                        "product_name"
                    )

            # --------------------------------------
            # HSN FALLBACK
            #
            # Only when product name is missing.
            #
            # Never use HSN to override a named
            # product because multiple products can
            # share one HSN.
            # --------------------------------------

            if (
                product_match is None
                and not product_name
                and hsn_code
            ):

                product_match = (
                    ProductRepository
                    .get_by_hsn_code(
                        db=db,
                        hsn_code=(
                            hsn_code
                        ),
                    )
                )

                if product_match:

                    product_match_type = (
                        "hsn_code_fallback"
                    )

            # --------------------------------------
            # Add matching metadata
            #
            # IMPORTANT:
            # Never replace AI-extracted values.
            # --------------------------------------

            product[
                "existing_product"
            ] = (
                product_match
                is not None
            )

            product[
                "product_id"
            ] = (
                product_match.id
                if product_match
                else None
            )

            product[
                "match_type"
            ] = (
                product_match_type
            )

        # ==========================================
        # 4. VALIDATE + CALCULATE
        # ==========================================
        #
        # This happens AFTER AI extraction and
        # supplier/product matching.
        #
        # Validator responsibilities:
        #
        # - quantity
        # - purchase price
        # - line total
        # - subtotal
        # - GST consistency
        # - CGST + SGST half-rate correction
        # - grand total
        #
        # ==========================================

        data = (
            PurchaseBillValidator
            .validate(
                data
            )
        )

        # ==========================================
        # 5. RETURN FINAL REVIEW DATA
        # ==========================================

        ai_result[
            "data"
        ] = (
            data
        )

        return ai_result