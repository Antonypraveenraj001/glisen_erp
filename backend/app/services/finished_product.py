from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import (
    Session,
    joinedload,
)

from app.models.final_bill import (
    FinalBill,
)
from app.models.finished_goods_receipt import (
    FinishedGoodsReceipt,
)
from app.models.finished_product import (
    FinishedProduct,
)
from app.models.production_order import (
    ProductionOrder,
)

from app.repositories.customer_repository import (
    CustomerRepository,
)
from app.repositories.enquiry_repository import (
    EnquiryRepository,
)
from app.repositories.finished_goods_receipt import (
    FinishedGoodsReceiptRepository,
)
from app.repositories.finished_product import (
    FinishedProductRepository,
)
from app.repositories.production import (
    ProductionMaterialRepository,
    ProductionOperationRepository,
    ProductionOrderRepository,
)
from app.repositories.proforma_repository import (
    ProformaRepository,
)
from app.repositories.shop_floor_issue import (
    ShopFloorIssueRepository,
)

from app.schemas.finished_product import (
    FinishedProductBillingResponse,
    FinishedProductCostSummaryResponse,
    FinishedProductTraceabilityResponse,
)


class FinishedProductService:

    def __init__(
        self,
        db: Session,
    ):
        self.db = db

        self.repository = (
            FinishedProductRepository(
                db
            )
        )

        self.production_order_repository = (
            ProductionOrderRepository(
                db
            )
        )

        self.production_material_repository = (
            ProductionMaterialRepository(
                db
            )
        )

        self.production_operation_repository = (
            ProductionOperationRepository(
                db
            )
        )

        self.shop_floor_issue_repository = (
            ShopFloorIssueRepository(
                db
            )
        )

        self.finished_goods_receipt_repository = (
            FinishedGoodsReceiptRepository(
                db
            )
        )

        self.proforma_repository = (
            ProformaRepository(
                db
            )
        )

    # ============================================================
    # CREATE
    # ============================================================

    def create_from_receipt(
        self,
        production_order: ProductionOrder,
        finished_goods_receipt: FinishedGoodsReceipt,
        created_by: int,
    ) -> FinishedProduct:

        production_status = (
            production_order.status
            or ""
        ).strip().lower()


        if (
            production_status
            != "completed"
        ):

            raise ValueError(
                "A Finished Product can only be created "
                "from a Completed Production Order."
            )


        if (
            finished_goods_receipt.production_order_id
            != production_order.id
        ):

            raise ValueError(
                "Finished Goods Receipt does not belong "
                "to this Production Order."
            )


        if (
            finished_goods_receipt.product_id
            != production_order.product_id
        ):

            raise ValueError(
                "Finished Goods Receipt legacy Product reference "
                "does not match the Production Order."
            )


        # ========================================================
        # IDEMPOTENT PROTECTION
        # ========================================================

        existing_by_production = (
            self.repository
            .get_by_production_order(
                production_order.id
            )
        )


        if (
            existing_by_production
            is not None
        ):

            return existing_by_production


        existing_by_receipt = (
            self.repository
            .get_by_finished_goods_receipt(
                finished_goods_receipt.id
            )
        )


        if (
            existing_by_receipt
            is not None
        ):

            return existing_by_receipt


        # ========================================================
        # MANUFACTURED PRODUCT
        # ========================================================

        product_name = (
            production_order.product_name
            or ""
        ).strip()


        if not product_name:

            raise ValueError(
                "Manufactured product name is missing "
                "from the Production Order."
            )


        unit = (
            production_order.unit
            or "Nos"
        ).strip()


        if not unit:
            unit = "Nos"


        finished_product_number = (
            self._generate_finished_product_number(
                production_order.id
            )
        )


        finished_product = (
            FinishedProduct(
                finished_product_number=(
                    finished_product_number
                ),

                product_name=(
                    product_name
                ),

                unit=(
                    unit
                ),

                # Legacy only.
                product_master_id=(
                    production_order.product_id
                ),

                production_order_id=(
                    production_order.id
                ),

                finished_goods_receipt_id=(
                    finished_goods_receipt.id
                ),

                created_by=(
                    created_by
                ),
            )
        )


        return (
            self.repository.create(
                finished_product
            )
        )

    # ============================================================
    # BASIC READ
    # ============================================================

    def get_finished_product(
        self,
        finished_product_id: int,
    ) -> FinishedProduct | None:

        return (
            self.repository
            .get_by_id(
                finished_product_id
            )
        )


    def get_finished_product_by_number(
        self,
        finished_product_number: str,
    ) -> FinishedProduct | None:

        return (
            self.repository
            .get_by_number(
                finished_product_number
            )
        )


    def get_by_production_order(
        self,
        production_order_id: int,
    ) -> FinishedProduct | None:

        return (
            self.repository
            .get_by_production_order(
                production_order_id
            )
        )


    def get_by_finished_goods_receipt(
        self,
        finished_goods_receipt_id: int,
    ) -> FinishedProduct | None:

        return (
            self.repository
            .get_by_finished_goods_receipt(
                finished_goods_receipt_id
            )
        )


    def get_by_product_master(
        self,
        product_master_id: int,
    ) -> list[
        FinishedProduct
    ]:

        return (
            self.repository
            .get_by_product_master(
                product_master_id
            )
        )


    def get_all_finished_products(
        self,
    ) -> list[
        FinishedProduct
    ]:

        return (
            self.repository
            .get_all()
        )

    # ============================================================
    # TRACEABILITY
    # ============================================================

    def get_traceability(
        self,
        finished_product_id: int,
    ) -> (
        FinishedProductTraceabilityResponse
        | None
    ):

        finished_product = (
            self.repository
            .get_by_id(
                finished_product_id
            )
        )


        if (
            finished_product
            is None
        ):

            return None


        return (
            self._build_traceability(
                finished_product
            )
        )


    def get_traceability_by_number(
        self,
        finished_product_number: str,
    ) -> (
        FinishedProductTraceabilityResponse
        | None
    ):

        finished_product = (
            self.repository
            .get_by_number(
                finished_product_number
            )
        )


        if (
            finished_product
            is None
        ):

            return None


        return (
            self._build_traceability(
                finished_product
            )
        )

    # ============================================================
    # COMPLETE TRACEABILITY
    # ============================================================

    def _build_traceability(
        self,
        finished_product: FinishedProduct,
    ) -> FinishedProductTraceabilityResponse:

        # --------------------------------------------------------
        # PRODUCTION ORDER
        # --------------------------------------------------------

        production_order = (
            self.production_order_repository
            .get_by_id(
                finished_product
                .production_order_id
            )
        )


        if (
            production_order
            is None
        ):

            raise ValueError(
                "Finished Product Production Order "
                "could not be found."
            )


        # --------------------------------------------------------
        # PRODUCT MASTER
        # --------------------------------------------------------
        #
        # Optional.
        #
        # Legacy Finished Products may have one.
        # New manufactured products normally do not.
        # --------------------------------------------------------

        product_master = (
            finished_product
            .product_master
        )


        if (
            finished_product
            .product_master_id
            is not None
            and
            product_master
            is None
        ):

            raise ValueError(
                "Legacy Product Master could not be found."
            )


        if (
            production_order.product_id
            != finished_product.product_master_id
        ):

            raise ValueError(
                "Finished Product legacy Product reference "
                "does not match its Production Order."
            )


        # --------------------------------------------------------
        # FINISHED GOODS RECEIPT
        # --------------------------------------------------------

        finished_goods_receipt = (
            self.finished_goods_receipt_repository
            .get_by_id(
                finished_product
                .finished_goods_receipt_id
            )
        )


        if (
            finished_goods_receipt
            is None
        ):

            raise ValueError(
                "Finished Goods Receipt could not be found "
                "for this Finished Product."
            )


        if (
            finished_goods_receipt
            .production_order_id
            != production_order.id
        ):

            raise ValueError(
                "Finished Goods Receipt does not match "
                "the Finished Product Production Order."
            )


        if (
            finished_goods_receipt.product_id
            != finished_product.product_master_id
        ):

            raise ValueError(
                "Finished Goods Receipt legacy Product reference "
                "does not match the Finished Product."
            )


        # --------------------------------------------------------
        # PROFORMA
        # --------------------------------------------------------

        proforma = (
            self.proforma_repository
            .get_by_id(
                production_order
                .proforma_id
            )
        )


        if (
            proforma
            is None
        ):

            raise ValueError(
                "Proforma could not be found "
                "for this Finished Product."
            )


        # --------------------------------------------------------
        # ENQUIRY
        # --------------------------------------------------------

        enquiry = (
            EnquiryRepository
            .get_by_id(
                self.db,
                proforma.enquiry_id,
            )
        )


        if (
            enquiry
            is None
        ):

            raise ValueError(
                "Enquiry could not be found "
                "for this Finished Product."
            )


        # --------------------------------------------------------
        # CUSTOMER
        # --------------------------------------------------------
        #
        # Enquiry is now the source of truth for Customer linkage.
        # --------------------------------------------------------

        customer = (
            CustomerRepository
            .get_by_id(
                self.db,
                enquiry.customer_id,
            )
        )


        if (
            customer
            is None
        ):

            raise ValueError(
                "Customer could not be found "
                "for this Finished Product."
            )


        # --------------------------------------------------------
        # MATERIALS
        # --------------------------------------------------------

        production_materials = (
            self.production_material_repository
            .get_by_production_order(
                production_order.id
            )
        )


        # --------------------------------------------------------
        # SHOP FLOOR ISSUES
        # --------------------------------------------------------

        shop_floor_issues = (
            self.shop_floor_issue_repository
            .get_by_production_order(
                production_order.id
            )
        )


        # --------------------------------------------------------
        # OPERATIONS
        # --------------------------------------------------------

        production_operations = (
            self.production_operation_repository
            .get_by_production_order(
                production_order.id
            )
        )


        # --------------------------------------------------------
        # MATERIAL COST
        # --------------------------------------------------------

        actual_material_cost = Decimal(
            "0.00"
        )


        for issue in shop_floor_issues:

            actual_material_cost += Decimal(
                str(
                    issue.total_cost
                    or Decimal("0.00")
                )
            )


        actual_material_cost = (
            actual_material_cost.quantize(
                Decimal("0.01")
            )
        )


        # --------------------------------------------------------
        # OPERATION COST
        # --------------------------------------------------------

        actual_operation_cost = Decimal(
            "0.00"
        )


        for operation in (
            production_operations
        ):

            actual_operation_cost += Decimal(
                str(
                    operation.operation_cost
                    or Decimal("0.00")
                )
            )


        actual_operation_cost = (
            actual_operation_cost.quantize(
                Decimal("0.01")
            )
        )


        # --------------------------------------------------------
        # TOTAL PRODUCTION COST
        # --------------------------------------------------------

        actual_production_cost = (
            actual_material_cost
            +
            actual_operation_cost
        ).quantize(
            Decimal("0.01")
        )


        # --------------------------------------------------------
        # QUANTITY
        # --------------------------------------------------------

        finished_quantity = Decimal(
            str(
                finished_goods_receipt
                .quantity_received
            )
        )


        # --------------------------------------------------------
        # COST PER UNIT
        # --------------------------------------------------------

        if (
            finished_quantity
            > Decimal("0.00")
        ):

            cost_per_unit = (
                actual_production_cost
                /
                finished_quantity
            ).quantize(
                Decimal("0.01")
            )

        else:

            cost_per_unit = Decimal(
                "0.00"
            )


        cost_summary = (
            FinishedProductCostSummaryResponse(
                actual_material_cost=(
                    actual_material_cost
                ),

                actual_operation_cost=(
                    actual_operation_cost
                ),

                actual_production_cost=(
                    actual_production_cost
                ),

                finished_quantity=(
                    finished_quantity
                ),

                cost_per_unit=(
                    cost_per_unit
                ),
            )
        )


        # --------------------------------------------------------
        # BILLING
        # --------------------------------------------------------

        billing = (
            self._build_billing_traceability(
                proforma_id=(
                    proforma.id
                ),

                product_master_id=(
                    finished_product
                    .product_master_id
                ),

                product_name=(
                    finished_product
                    .product_name
                ),
            )
        )


        # --------------------------------------------------------
        # RESPONSE
        # --------------------------------------------------------

        return (
            FinishedProductTraceabilityResponse(
                finished_product=(
                    finished_product
                ),

                product_master=(
                    product_master
                ),

                customer=(
                    customer
                ),

                enquiry=(
                    enquiry
                ),

                proforma=(
                    proforma
                ),

                production_order=(
                    production_order
                ),

                production_materials=(
                    production_materials
                ),

                shop_floor_issues=(
                    shop_floor_issues
                ),

                production_operations=(
                    production_operations
                ),

                finished_goods_receipt=(
                    finished_goods_receipt
                ),

                cost_summary=(
                    cost_summary
                ),

                billing=(
                    billing
                ),
            )
        )

    # ============================================================
    # BILLING TRACEABILITY
    # ============================================================

    def _build_billing_traceability(
        self,
        proforma_id: int,
        product_master_id: int | None,
        product_name: str,
    ) -> FinishedProductBillingResponse:

        documents = (
            self.db.query(
                FinalBill
            )
            .options(
                joinedload(
                    FinalBill.items
                )
            )
            .filter(
                FinalBill.proforma_id
                == proforma_id
            )
            .order_by(
                FinalBill.id.asc()
            )
            .all()
        )


        normalized_product_name = (
            product_name
            or ""
        ).strip().lower()


        relevant_documents = []


        for bill in documents:

            if (
                product_master_id
                is not None
            ):

                contains_product = any(
                    item.product_id
                    == product_master_id
                    for item
                    in bill.items
                )

            else:

                contains_product = any(
                    (
                        item.description
                        or ""
                    ).strip().lower()
                    ==
                    normalized_product_name

                    for item
                    in bill.items
                )


            if contains_product:

                relevant_documents.append(
                    bill
                )


        if (
            not relevant_documents
        ):

            return (
                FinishedProductBillingResponse()
            )


        # --------------------------------------------------------
        # ORIGINAL TAX INVOICE
        # --------------------------------------------------------

        original_candidates = [
            bill

            for bill
            in relevant_documents

            if (
                (
                    bill.invoice_type
                    or ""
                ).strip().lower()
                == "tax invoice"

                and

                bill.parent_invoice_id
                is None
            )
        ]


        original_invoice = (
            min(
                original_candidates,
                key=lambda bill:
                    bill.id,
            )

            if original_candidates

            else None
        )


        if (
            original_invoice
            is None
        ):

            return (
                FinishedProductBillingResponse()
            )


        # --------------------------------------------------------
        # REVISIONS
        # --------------------------------------------------------

        revisions = [
            bill

            for bill
            in relevant_documents

            if (
                (
                    bill.invoice_type
                    or ""
                ).strip().lower()
                == "revised invoice"

                and

                bill.parent_invoice_id
                == original_invoice.id
            )
        ]


        revisions.sort(
            key=lambda bill: (
                bill.revision_number,
                bill.id,
            )
        )


        invoice_chain = [
            original_invoice,
            *revisions,
        ]


        invoice_chain_ids = {
            bill.id

            for bill
            in invoice_chain
        }


        # --------------------------------------------------------
        # CREDIT NOTES
        # --------------------------------------------------------

        credit_notes = [
            bill

            for bill
            in relevant_documents

            if (
                (
                    bill.invoice_type
                    or ""
                ).strip().lower()
                == "credit note"

                and

                bill.parent_invoice_id
                in invoice_chain_ids
            )
        ]


        credit_notes.sort(
            key=lambda bill: (
                bill.invoice_date,
                bill.id,
            )
        )


        # --------------------------------------------------------
        # EFFECTIVE ISSUED INVOICE
        # --------------------------------------------------------

        issued_versions = [
            bill

            for bill
            in invoice_chain

            if (
                (
                    bill.status
                    or ""
                ).strip().lower()
                == "issued"
            )
        ]


        effective_invoice = (
            max(
                issued_versions,

                key=lambda bill: (
                    bill.revision_number,
                    bill.id,
                ),
            )

            if issued_versions

            else None
        )


        return (
            FinishedProductBillingResponse(
                original_invoice=(
                    original_invoice
                ),

                effective_invoice=(
                    effective_invoice
                ),

                revisions=(
                    revisions
                ),

                credit_notes=(
                    credit_notes
                ),
            )
        )

    # ============================================================
    # NUMBER
    # ============================================================

    def _generate_finished_product_number(
        self,
        production_order_id: int,
    ) -> str:

        year = (
            datetime.utcnow()
            .year
        )

        return (
            f"FP-{year}-"
            f"{production_order_id:04d}"
        )