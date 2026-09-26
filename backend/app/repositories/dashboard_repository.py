from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.enquiry import Enquiry
from app.models.product import Product
from app.models.production_operation import (
    ProductionOperation,
)
from app.models.production_order import (
    ProductionOrder,
)
from app.models.proforma import Proforma


class DashboardRepository:

    # ============================================================
    # OPEN ENQUIRIES
    # ============================================================

    @staticmethod
    def get_open_enquiry_count(
        db: Session,
    ) -> int:
        """
        Count only enquiries that are still waiting for
        customer/order confirmation.

        In the Glisen workflow an enquiry is OPEN only while it is:

            New
            Contacted
            Quotation

        Once the order is confirmed, cancelled, production starts,
        billing starts, payment is received, etc., the enquiry is
        no longer considered an open sales enquiry.
        """

        open_statuses = [
            "new",
            "contacted",
            "quotation",
        ]

        count = (
            db.query(
                func.count(
                    Enquiry.id
                )
            )
            .filter(
                func.lower(
                    func.trim(
                        Enquiry.status
                    )
                ).in_(
                    open_statuses
                )
            )
            .scalar()
        )

        return int(
            count
            or 0
        )

    # ============================================================
    # LIVE PRODUCTION
    # ============================================================

    @staticmethod
    def get_live_production(
        db: Session,
    ):
        """
        Return production that is actually running now.

        Only In Progress / Started production orders are shown.

        IMPORTANT:

        Manufactured output is NOT required to exist in the
        purchased Product / Stock master.

        ProductionOrder.product_name is the manufacturing
        source of truth.

        product_id remains an optional legacy relationship only.
        """

        production_orders = (
            db.query(
                ProductionOrder,
                Proforma,
                Product,
            )
            .join(
                Proforma,
                Proforma.id
                == ProductionOrder.proforma_id,
            )

            # ----------------------------------------------------
            # IMPORTANT
            #
            # New manufactured production orders normally have
            # product_id = NULL.
            #
            # Therefore Product must be OUTER joined.
            # An inner join would silently remove those jobs from
            # the Dashboard.
            # ----------------------------------------------------

            .outerjoin(
                Product,
                Product.id
                == ProductionOrder.product_id,
            )

            # ----------------------------------------------------
            # LIVE means production has actually started.
            #
            # Pending Production Orders are intentionally excluded.
            # ----------------------------------------------------

            .filter(
                func.lower(
                    func.trim(
                        ProductionOrder.status
                    )
                ).in_(
                    [
                        "in progress",
                        "started",
                    ]
                )
            )

            .order_by(
                ProductionOrder.id.desc()
            )
            .all()
        )

        result = []

        for (
            production_order,
            proforma,
            product,
        ) in production_orders:

            operations = (
                db.query(
                    ProductionOperation
                )
                .filter(
                    ProductionOperation
                    .production_order_id
                    == production_order.id
                )
                .order_by(
                    ProductionOperation.id.asc()
                )
                .all()
            )

            current_operation = None

            # ----------------------------------------------------
            # PRIORITY 1 - IN PROGRESS
            # ----------------------------------------------------

            for operation in operations:

                operation_status = (
                    operation.status
                    or ""
                ).strip().lower()

                if operation_status in {
                    "in progress",
                    "in-progress",
                    "in_progress",
                    "started",
                }:

                    current_operation = (
                        operation
                    )

                    break

            # ----------------------------------------------------
            # PRIORITY 2 - PENDING
            #
            # If production itself is running but the next
            # operation has not started yet, show the first pending
            # operation as the current manufacturing step.
            # ----------------------------------------------------

            if current_operation is None:

                for operation in operations:

                    operation_status = (
                        operation.status
                        or ""
                    ).strip().lower()

                    if operation_status in {
                        "pending",
                        "not started",
                        "not_started",
                    }:

                        current_operation = (
                            operation
                        )

                        break

            # ----------------------------------------------------
            # PRIORITY 3 - ANY OTHER NON-COMPLETED OPERATION
            # ----------------------------------------------------

            if current_operation is None:

                for operation in operations:

                    operation_status = (
                        operation.status
                        or ""
                    ).strip().lower()

                    if operation_status not in {
                        "completed",
                        "cancelled",
                        "canceled",
                    }:

                        current_operation = (
                            operation
                        )

                        break

            result.append(
                {
                    "production_order_id": (
                        production_order.id
                    ),

                    "production_number": (
                        production_order
                        .production_number
                    ),

                    "proforma_id": (
                        proforma.id
                    ),

                    "proforma_number": (
                        proforma.proforma_number
                    ),

                    "company_name": (
                        proforma.company_name
                    ),

                    # --------------------------------------------
                    # LEGACY PRODUCT MASTER LINK
                    #
                    # NULL for normal manufactured products.
                    # --------------------------------------------

                    "product_id": (
                        production_order
                        .product_id
                    ),

                    "product_code": (
                        product.product_code
                        if product is not None
                        else None
                    ),

                    # --------------------------------------------
                    # MANUFACTURED PRODUCT SOURCE OF TRUTH
                    # --------------------------------------------

                    "product_name": (
                        production_order
                        .product_name
                    ),

                    "quantity": (
                        production_order.quantity
                    ),

                    "status": (
                        production_order.status
                    ),

                    "planned_start_date": (
                        production_order
                        .planned_start_date
                    ),

                    "actual_start_date": (
                        production_order
                        .actual_start_date
                    ),

                    "actual_end_date": (
                        production_order
                        .actual_end_date
                    ),

                    "current_operation": (
                        current_operation
                        .operation_name
                        if current_operation
                        else None
                    ),

                    "machine_name": (
                        current_operation
                        .machine_name
                        if current_operation
                        else None
                    ),

                    "operation_status": (
                        current_operation
                        .status
                        if current_operation
                        else None
                    ),
                }
            )

        return result