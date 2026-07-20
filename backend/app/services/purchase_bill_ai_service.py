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

        ai_result = await PurchaseBillAI.extract_purchase_bill(
            file_bytes=file_bytes,
            filename=filename,
        )

        supplier = ai_result["data"]["supplier"]

        supplier_match = None
        match_type = None

        gst_number = supplier.get(
            "gst_number",
            "",
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

        if supplier_match is None:

            company_name = supplier.get(
                "company_name",
                "",
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

        supplier["existing_supplier"] = (
            supplier_match is not None
        )

        supplier["supplier_id"] = (
            supplier_match.id
            if supplier_match
            else None
        )

        supplier["match_type"] = match_type

        # -----------------------------------
        # Product Matching
        # -----------------------------------

        for product in ai_result["data"]["products"]:

            product_match = None
            product_match_type = None

            hsn_code = str(
                product.get(
                    "hsn_code",
                    "",
                )
            ).strip()

            if hsn_code:

                product_match = (
                    ProductRepository.get_by_hsn_code(
                        db=db,
                        hsn_code=hsn_code,
                    )
                )

                if product_match:
                    product_match_type = "hsn_code"

            if product_match is None:

                product_name = product.get(
                    "product_name",
                    "",
                ).strip()

                if product_name:

                    product_match = (
                        ProductRepository.get_by_name(
                            db=db,
                            product_name=product_name,
                        )
                    )

                    if product_match:
                        product_match_type = "product_name"

            product["existing_product"] = (
                product_match is not None
            )

            product["product_id"] = (
                product_match.id
                if product_match
                else None
            )

            product["match_type"] = (
                product_match_type
            )

        # -----------------------------------
        # AI Validation & Auto Calculation
        # -----------------------------------

        ai_result["data"] = (
            PurchaseBillValidator.validate(
                ai_result["data"]
            )
        )

        return ai_result