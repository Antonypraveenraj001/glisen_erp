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
        Count enquiries that are still operationally open.

        The Enquiry model currently stores status as a free
        string rather than an enum, so terminal statuses are
        excluded explicitly.

        Unknown / active workflow statuses remain counted.
        """

        terminal_statuses = [
            "Closed",
            "Cancelled",
            "Canceled",
        ]

        count = (
            db.query(
                func.count(
                    Enquiry.id
                )
            )
            .filter(
                func.lower(
                    Enquiry.status
                ).notin_(
                    [
                        status.lower()
                        for status
                        in terminal_statuses
                    ]
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
        Return currently active Production Orders.

        Completed and Cancelled production orders are excluded.

        Current operation is selected from unfinished operations
        using this priority:

            1. In Progress operation
            2. Pending operation
            3. Other non-completed operation

        No artificial percentage, operator or ETA is generated.
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
            .join(
                Product,
                Product.id
                == ProductionOrder.product_id,
            )
            .filter(
                func.lower(
                    ProductionOrder.status
                ).notin_(
                    [
                        "completed",
                        "cancelled",
                        "canceled",
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
            # PRIORITY 3 - ANY NON-COMPLETED OPERATION
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

                    "product_id": (
                        product.id
                    ),

                    "product_code": (
                        product.product_code
                    ),

                    "product_name": (
                        product.product_name
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