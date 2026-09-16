from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session, joinedload

from app.models.final_bill import FinalBill
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

        self.repository = FinishedProductRepository(
            db
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

    # ========================================================
    # CREATE FROM FINISHED GOODS RECEIPT
    # ========================================================

    def create_from_receipt(
        self,
        production_order: ProductionOrder,
        finished_goods_receipt: FinishedGoodsReceipt,
        created_by: int,
    ) -> FinishedProduct:
        """
        Create the Finished Product traceability record.

        This method deliberately does NOT commit.

        The Finished Goods Receipt workflow owns the transaction,
        allowing receipt, stock movement and Finished Product
        creation to succeed or fail together.
        """

        production_status = (
            production_order.status
            or ""
        ).strip().lower()

        if production_status != "completed":
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
                "Finished Goods Receipt product does not match "
                "the Production Order product."
            )

        existing_by_production = (
            self.repository
            .get_by_production_order(
                production_order.id
            )
        )

        if existing_by_production is not None:
            raise ValueError(
                "A Finished Product already exists "
                "for this Production Order."
            )

        existing_by_receipt = (
            self.repository
            .get_by_finished_goods_receipt(
                finished_goods_receipt.id
            )
        )

        if existing_by_receipt is not None:
            raise ValueError(
                "A Finished Product already exists "
                "for this Finished Goods Receipt."
            )

        finished_product_number = (
            self._generate_finished_product_number(
                production_order.id
            )
        )

        finished_product = FinishedProduct(
            finished_product_number=(
                finished_product_number
            ),
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

        return self.repository.create(
            finished_product
        )

    # ========================================================
    # BASIC READ
    # ========================================================

    def get_finished_product(
        self,
        finished_product_id: int,
    ) -> FinishedProduct | None:
        return self.repository.get_by_id(
            finished_product_id
        )

    def get_finished_product_by_number(
        self,
        finished_product_number: str,
    ) -> FinishedProduct | None:
        return self.repository.get_by_number(
            finished_product_number
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
    ) -> list[FinishedProduct]:
        return (
            self.repository
            .get_by_product_master(
                product_master_id
            )
        )

    def get_all_finished_products(
        self,
    ) -> list[FinishedProduct]:
        return self.repository.get_all()

    # ========================================================
    # TRACEABILITY
    # ========================================================

    def get_traceability(
        self,
        finished_product_id: int,
    ) -> FinishedProductTraceabilityResponse | None:
        finished_product = (
            self.repository.get_by_id(
                finished_product_id
            )
        )

        if finished_product is None:
            return None

        return self._build_traceability(
            finished_product
        )

    def get_traceability_by_number(
        self,
        finished_product_number: str,
    ) -> FinishedProductTraceabilityResponse | None:
        finished_product = (
            self.repository.get_by_number(
                finished_product_number
            )
        )

        if finished_product is None:
            return None

        return self._build_traceability(
            finished_product
        )

    # ========================================================
    # BUILD COMPLETE TRACEABILITY
    # ========================================================

    def _build_traceability(
        self,
        finished_product: FinishedProduct,
    ) -> FinishedProductTraceabilityResponse:

        # ----------------------------------------------------
        # PRODUCT MASTER
        # ----------------------------------------------------

        product_master = (
            finished_product.product_master
        )

        if product_master is None:
            raise ValueError(
                "Finished Product product master "
                "could not be found."
            )

        # ----------------------------------------------------
        # PRODUCTION ORDER
        # ----------------------------------------------------

        production_order = (
            self.production_order_repository
            .get_by_id(
                finished_product.production_order_id
            )
        )

        if production_order is None:
            raise ValueError(
                "Finished Product Production Order "
                "could not be found."
            )

        if (
            production_order.product_id
            != finished_product.product_master_id
        ):
            raise ValueError(
                "Finished Product product master does not "
                "match its Production Order."
            )

        # ----------------------------------------------------
        # FINISHED GOODS RECEIPT
        # ----------------------------------------------------

        finished_goods_receipt = (
            self.finished_goods_receipt_repository
            .get_by_id(
                finished_product.finished_goods_receipt_id
            )
        )

        if finished_goods_receipt is None:
            raise ValueError(
                "Finished Goods Receipt could not be found "
                "for this Finished Product."
            )

        if (
            finished_goods_receipt.production_order_id
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
                "Finished Goods Receipt product does not match "
                "the Finished Product product master."
            )

        # ----------------------------------------------------
        # PROFORMA
        # ----------------------------------------------------

        proforma = (
            self.proforma_repository.get_by_id(
                production_order.proforma_id
            )
        )

        if proforma is None:
            raise ValueError(
                "Proforma could not be found "
                "for this Finished Product."
            )

        # ----------------------------------------------------
        # ENQUIRY
        # ----------------------------------------------------

        enquiry = EnquiryRepository.get_by_id(
            self.db,
            proforma.enquiry_id,
        )

        if enquiry is None:
            raise ValueError(
                "Enquiry could not be found "
                "for this Finished Product."
            )

        # ----------------------------------------------------
        # CUSTOMER
        # ----------------------------------------------------

        customer = CustomerRepository.get_by_id(
            self.db,
            proforma.customer_id,
        )

        if customer is None:
            raise ValueError(
                "Customer could not be found "
                "for this Finished Product."
            )

        # ----------------------------------------------------
        # PRODUCTION MATERIALS
        # ----------------------------------------------------

        production_materials = (
            self.production_material_repository
            .get_by_production_order(
                production_order.id
            )
        )

        # ----------------------------------------------------
        # SHOP FLOOR ISSUES
        # ----------------------------------------------------

        shop_floor_issues = (
            self.shop_floor_issue_repository
            .get_by_production_order(
                production_order.id
            )
        )

        # ----------------------------------------------------
        # PRODUCTION OPERATIONS
        # ----------------------------------------------------

        production_operations = (
            self.production_operation_repository
            .get_by_production_order(
                production_order.id
            )
        )

        # ----------------------------------------------------
        # ACTUAL MATERIAL COST
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # ACTUAL OPERATION COST
        # ----------------------------------------------------

        actual_operation_cost = Decimal(
            "0.00"
        )

        for operation in production_operations:
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

        # ----------------------------------------------------
        # ACTUAL PRODUCTION COST
        # ----------------------------------------------------

        actual_production_cost = (
            actual_material_cost
            + actual_operation_cost
        ).quantize(
            Decimal("0.01")
        )

        # ----------------------------------------------------
        # FINISHED QUANTITY
        # ----------------------------------------------------

        finished_quantity = Decimal(
            str(
                finished_goods_receipt.quantity_received
            )
        )

        # ----------------------------------------------------
        # COST PER UNIT
        # ----------------------------------------------------

        if finished_quantity > Decimal("0.00"):
            cost_per_unit = (
                actual_production_cost
                / finished_quantity
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

        # ----------------------------------------------------
        # FINAL BILLING TRACEABILITY
        # ----------------------------------------------------

        billing = (
            self._build_billing_traceability(
                proforma_id=proforma.id,
                product_master_id=(
                    finished_product.product_master_id
                ),
            )
        )

        # ----------------------------------------------------
        # COMPLETE RESPONSE
        # ----------------------------------------------------

        return FinishedProductTraceabilityResponse(
            finished_product=finished_product,
            product_master=product_master,
            customer=customer,
            enquiry=enquiry,
            proforma=proforma,
            production_order=production_order,
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

    # ========================================================
    # BILLING TRACEABILITY
    # ========================================================

    def _build_billing_traceability(
        self,
        proforma_id: int,
        product_master_id: int,
    ) -> FinishedProductBillingResponse:
        """
        Resolve the billing chain for this Finished Product.

        Current linkage available in the ERP:

        Finished Product
            -> Production Order
            -> Proforma
            -> Final Bills

        Final Bill Items are then matched by product_id.

        This is intentionally read-only and does not create a
        new FinishedProduct-to-FinalBill foreign key.
        """

        documents = (
            self.db.query(FinalBill)
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

        # ----------------------------------------------------
        # KEEP ONLY DOCUMENTS CONTAINING THIS PRODUCT
        # ----------------------------------------------------

        relevant_documents = []

        for bill in documents:
            contains_product = any(
                item.product_id
                == product_master_id
                for item in bill.items
            )

            if contains_product:
                relevant_documents.append(
                    bill
                )

        if not relevant_documents:
            return FinishedProductBillingResponse()

        # ----------------------------------------------------
        # ORIGINAL TAX INVOICE
        # ----------------------------------------------------

        original_candidates = [
            bill
            for bill in relevant_documents
            if (
                (
                    bill.invoice_type
                    or ""
                ).strip().lower()
                == "tax invoice"
                and bill.parent_invoice_id
                is None
            )
        ]

        original_invoice = (
            min(
                original_candidates,
                key=lambda bill: bill.id,
            )
            if original_candidates
            else None
        )

        if original_invoice is None:
            return FinishedProductBillingResponse()

        # ----------------------------------------------------
        # REVISIONS
        #
        # Existing Final Billing architecture stores revisions
        # against the root/original invoice.
        # ----------------------------------------------------

        revisions = [
            bill
            for bill in relevant_documents
            if (
                (
                    bill.invoice_type
                    or ""
                ).strip().lower()
                == "revised invoice"
                and bill.parent_invoice_id
                == original_invoice.id
            )
        ]

        revisions.sort(
            key=lambda bill: (
                bill.revision_number,
                bill.id,
            )
        )

        # ----------------------------------------------------
        # COMPLETE NON-CREDIT INVOICE CHAIN
        # ----------------------------------------------------

        invoice_chain = [
            original_invoice,
            *revisions,
        ]

        invoice_chain_ids = {
            bill.id
            for bill in invoice_chain
        }

        # ----------------------------------------------------
        # CREDIT NOTES
        #
        # A Credit Note may reference the original invoice
        # or one of its revisions.
        # ----------------------------------------------------

        credit_notes = [
            bill
            for bill in relevant_documents
            if (
                (
                    bill.invoice_type
                    or ""
                ).strip().lower()
                == "credit note"
                and bill.parent_invoice_id
                in invoice_chain_ids
            )
        ]

        credit_notes.sort(
            key=lambda bill: (
                bill.invoice_date,
                bill.id,
            )
        )

        # ----------------------------------------------------
        # EFFECTIVE INVOICE
        #
        # Same rule already used by GST reporting:
        #
        # Latest Issued Tax/Revised Invoice wins.
        # Draft revisions do not replace the issued invoice.
        # ----------------------------------------------------

        issued_versions = [
            bill
            for bill in invoice_chain
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

        return FinishedProductBillingResponse(
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

    # ========================================================
    # NUMBER GENERATION
    # ========================================================

    def _generate_finished_product_number(
        self,
        production_order_id: int,
    ) -> str:
        """
        Generate an audit-safe Finished Product number.

        Example:
            FP-2026-0001
        """

        year = datetime.utcnow().year

        return (
            f"FP-{year}-"
            f"{production_order_id:04d}"
        )