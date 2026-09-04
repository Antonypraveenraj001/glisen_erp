from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.shop_floor_issue import ShopFloorIssue
from app.repositories.shop_floor_issue import (
    ShopFloorIssueRepository,
)
from app.schemas.shop_floor_issue import (
    ShopFloorIssueCreate,
    ShopFloorIssueSummaryResponse,
)


class ShopFloorIssueService:
    def __init__(
        self,
        db: Session,
    ):
        self.db = db

        self.repository = ShopFloorIssueRepository(
            db
        )

    # ========================================================
    # CREATE MATERIAL ISSUE
    # ========================================================

    def issue_material(
        self,
        production_order_id: int,
        data: ShopFloorIssueCreate,
        issued_by: int,
    ) -> ShopFloorIssue:
        """
        Issue production material to the shop floor.

        This operation is transactional.

        It will:
        1. Validate the Production Order.
        2. Validate and lock the Production Material.
        3. Validate and lock the Product stock row.
        4. Prevent over-issuing.
        5. Prevent negative stock.
        6. Reduce Product.current_stock.
        7. Increase ProductionMaterial.quantity_issued.
        8. Recalculate ProductionMaterial.material_cost.
        9. Create an immutable ShopFloorIssue history record.
        10. Commit everything together.
        """

        try:
            # ====================================================
            # PRODUCTION ORDER
            # ====================================================

            production_order = (
                self.repository
                .get_production_order_for_update(
                    production_order_id
                )
            )

            if production_order is None:
                raise ValueError(
                    "Production order not found."
                )

            production_status = (
                production_order.status or ""
            ).strip().lower()

            if production_status == "completed":
                raise ValueError(
                    "Materials cannot be issued to a "
                    "completed Production Order."
                )

            # ====================================================
            # PRODUCTION MATERIAL
            # ====================================================

            material = (
                self.repository
                .get_material_for_update(
                    data.production_material_id
                )
            )

            if material is None:
                raise ValueError(
                    "Production material not found."
                )

            if (
                material.production_order_id
                != production_order_id
            ):
                raise ValueError(
                    "The selected material does not belong "
                    "to this Production Order."
                )

            if material.product_id is None:
                raise ValueError(
                    "This production material is not linked "
                    "to a stock product."
                )

            # ====================================================
            # PRODUCT / STOCK
            # ====================================================

            product = (
                self.repository
                .get_product_for_update(
                    material.product_id
                )
            )

            if product is None:
                raise ValueError(
                    f"Product {material.product_id} "
                    "is not found or is inactive."
                )

            # ====================================================
            # DECIMAL VALUES
            # ====================================================

            issue_quantity = Decimal(
                str(data.quantity)
            )

            quantity_required = Decimal(
                str(material.quantity_required)
            )

            quantity_already_issued = Decimal(
                str(material.quantity_issued)
            )

            available_stock = Decimal(
                str(product.current_stock)
            )

            unit_cost = Decimal(
                str(material.unit_cost)
            )

            # ====================================================
            # VALIDATION
            # ====================================================

            if issue_quantity <= Decimal("0.00"):
                raise ValueError(
                    "Issue quantity must be greater than zero."
                )

            remaining_required = (
                quantity_required
                - quantity_already_issued
            )

            if remaining_required <= Decimal("0.00"):
                raise ValueError(
                    "The required quantity for this material "
                    "has already been fully issued."
                )

            if issue_quantity > remaining_required:
                raise ValueError(
                    "Issue quantity cannot exceed the "
                    f"remaining required quantity of "
                    f"{remaining_required:.2f}."
                )

            if issue_quantity > available_stock:
                raise ValueError(
                    "Insufficient stock. "
                    f"Available stock is "
                    f"{available_stock:.2f}."
                )

            # ====================================================
            # STOCK MOVEMENT
            # ====================================================

            stock_before = available_stock

            stock_after = (
                stock_before
                - issue_quantity
            )

            product.current_stock = (
                stock_after
            )

            # ====================================================
            # PRODUCTION MATERIAL UPDATE
            # ====================================================

            new_quantity_issued = (
                quantity_already_issued
                + issue_quantity
            )

            material.quantity_issued = (
                new_quantity_issued
            )

            material.material_cost = (
                new_quantity_issued
                * unit_cost
            ).quantize(
                Decimal("0.01")
            )

            # ====================================================
            # ISSUE HISTORY
            # ====================================================

            issue_number = (
                self._generate_issue_number()
            )

            total_cost = (
                issue_quantity
                * unit_cost
            ).quantize(
                Decimal("0.01")
            )

            remarks = (
                data.remarks.strip()
                if data.remarks
                else None
            )

            issue = ShopFloorIssue(
                issue_number=issue_number,
                production_order_id=(
                    production_order.id
                ),
                production_material_id=(
                    material.id
                ),
                product_id=product.id,
                quantity_issued=issue_quantity,
                unit_cost=unit_cost,
                total_cost=total_cost,
                stock_before=stock_before,
                stock_after=stock_after,
                issued_by=issued_by,
                remarks=remarks,
            )

            created_issue = (
                self.repository.create(
                    issue
                )
            )

            # ====================================================
            # SINGLE TRANSACTION COMMIT
            # ====================================================

            self.db.commit()

            self.db.refresh(
                created_issue
            )

            self.db.refresh(
                material
            )

            self.db.refresh(
                product
            )

            return created_issue

        except Exception:
            self.db.rollback()
            raise

    # ========================================================
    # READ
    # ========================================================

    def get_issue(
        self,
        issue_id: int,
    ) -> ShopFloorIssue | None:
        return self.repository.get_by_id(
            issue_id
        )

    def get_issue_by_number(
        self,
        issue_number: str,
    ) -> ShopFloorIssue | None:
        return self.repository.get_by_number(
            issue_number
        )

    def get_all_issues(
        self,
    ) -> list[ShopFloorIssue]:
        return self.repository.get_all()

    def get_issues_by_production_order(
        self,
        production_order_id: int,
    ) -> list[ShopFloorIssue]:
        return (
            self.repository
            .get_by_production_order(
                production_order_id
            )
        )

    def get_issues_by_material(
        self,
        production_material_id: int,
    ) -> list[ShopFloorIssue]:
        return (
            self.repository
            .get_by_material(
                production_material_id
            )
        )

    # ========================================================
    # SUMMARY
    # ========================================================

    def get_production_order_summary(
        self,
        production_order_id: int,
    ) -> ShopFloorIssueSummaryResponse:
        issues = (
            self.repository
            .get_by_production_order(
                production_order_id
            )
        )

        total_quantity_issued = Decimal(
            "0.00"
        )

        total_issue_cost = Decimal(
            "0.00"
        )

        for issue in issues:
            total_quantity_issued += Decimal(
                str(issue.quantity_issued)
            )

            total_issue_cost += Decimal(
                str(issue.total_cost)
            )

        return ShopFloorIssueSummaryResponse(
            production_order_id=(
                production_order_id
            ),
            total_issues=len(
                issues
            ),
            total_quantity_issued=(
                total_quantity_issued
            ),
            total_issue_cost=(
                total_issue_cost
            ),
        )

    # ========================================================
    # ISSUE NUMBER
    # ========================================================

    def _generate_issue_number(
        self,
    ) -> str:
        """
        Generate numbers such as:

        SFI-2026-0001
        SFI-2026-0002
        """

        year = datetime.utcnow().year

        prefix = (
            f"SFI-{year}-"
        )

        latest_issue = (
            self.repository.get_latest()
        )

        highest_number = 0

        if latest_issue is not None:
            latest_number = (
                latest_issue.issue_number
                or ""
            )

            if latest_number.startswith(
                prefix
            ):
                try:
                    highest_number = int(
                        latest_number.replace(
                            prefix,
                            "",
                        )
                    )

                except ValueError:
                    highest_number = 0

            else:
                all_issues = (
                    self.repository.get_all()
                )

                for issue in all_issues:
                    issue_number = (
                        issue.issue_number
                        or ""
                    )

                    if not issue_number.startswith(
                        prefix
                    ):
                        continue

                    try:
                        number = int(
                            issue_number.replace(
                                prefix,
                                "",
                            )
                        )

                        highest_number = max(
                            highest_number,
                            number,
                        )

                    except ValueError:
                        continue

        return (
            f"{prefix}"
            f"{highest_number + 1:04d}"
        )