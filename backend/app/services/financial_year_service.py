import json
import threading

from datetime import (
    date,
    datetime,
    timedelta,
    timezone,
)
from decimal import (
    Decimal,
    ROUND_HALF_UP,
)

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.session import SessionLocal
from app.models.backup import BackupLog, BackupSettings
from app.models.final_bill import FinalBill
from app.models.financial_year import (
    FinancialYear,
    FinancialYearOpeningStock,
    FinancialYearOpeningWIP,
    FinancialYearTransitionLog,
)
from app.models.product import Product
from app.models.production_order import ProductionOrder
from app.models.stock_movement import StockMovement
from app.models.purchase_bill import PurchaseBill
from app.models.system_state import SystemState
from app.services.backup_service import BackupService
from app.services.production_cost_service import (
    ProductionCostService,
)


class FinancialYearService:
    TRANSITION_IN_PROGRESS = False
    TRANSITION_LOCK = threading.Lock()

    # ============================================================
    # MONEY
    # ============================================================

    @staticmethod
    def money(
        value,
    ) -> Decimal:
        return Decimal(
            str(
                value
                if value is not None
                else 0
            )
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )


    # ============================================================
    # DATE RULE
    # ============================================================

    @staticmethod
    def period_for_date(
        target_date: date,
    ) -> tuple[int, date, date, str]:

        start_year = (
            target_date.year
            if target_date.month >= 4
            else target_date.year - 1
        )

        start_date = date(
            start_year,
            4,
            1,
        )

        end_date = date(
            start_year + 1,
            3,
            31,
        )

        name = (
            f"{start_year}-"
            f"{start_year + 1}"
        )

        return (
            start_year,
            start_date,
            end_date,
            name,
        )


    # ============================================================
    # ACTIVE FY MASTER
    #
    # An existing ACTIVE FY stays authoritative after 31-Mar
    # until the protected transition explicitly closes it.
    # ============================================================

    @staticmethod
    def get_or_create_current(
        db: Session,
        opened_by: int | None,
        today: date | None = None,
    ) -> FinancialYear:

        existing_active = (
            db.query(
                FinancialYear
            )
            .filter(
                FinancialYear.status
                ==
                "ACTIVE"
            )
            .order_by(
                FinancialYear.start_date.asc()
            )
            .first()
        )

        if existing_active is not None:
            return existing_active

        current_date = (
            today
            or date.today()
        )

        (
            _start_year,
            start_date,
            end_date,
            name,
        ) = (
            FinancialYearService
            .period_for_date(
                current_date
            )
        )

        record = (
            db.query(
                FinancialYear
            )
            .filter(
                FinancialYear.start_date
                ==
                start_date
            )
            .first()
        )

        if record is not None:
            if (
                str(
                    record.status
                ).upper()
                !=
                "ACTIVE"
            ):
                record.status = "ACTIVE"
                record.closed_at = None
                record.closed_by = None
                db.commit()
                db.refresh(record)

            return record

        record = FinancialYear(
            name=name,
            start_date=start_date,
            end_date=end_date,
            status="ACTIVE",
            opened_by=opened_by,
            notes=(
                "Financial Year master created "
                "automatically by Glisen ERP."
            ),
        )

        db.add(
            record
        )
        db.commit()
        db.refresh(
            record
        )

        return record


    # ============================================================
    # SYSTEM STATE
    # ============================================================

    @staticmethod
    def get_or_create_system_state(
        db: Session,
    ) -> SystemState:

        state = (
            db.query(
                SystemState
            )
            .first()
        )

        if state is not None:
            return state

        state = SystemState(
            id=1,
        )

        db.add(
            state
        )
        db.commit()
        db.refresh(
            state
        )

        return state


    # ============================================================
    # STALE TRANSITION RECOVERY
    #
    # If Windows/backend was terminated during a protected
    # transition, uncommitted carry-forward data is rolled back by
    # MySQL. This clears the persisted maintenance flag and marks
    # any unfinished transition audit row as FAILED.
    # ============================================================

    @staticmethod
    def recover_stale_transition_state() -> None:

        db = SessionLocal()

        try:
            changed = False

            state = (
                db.query(
                    SystemState
                )
                .first()
            )

            if (
                state is not None
                and
                (
                    state.year_transition_in_progress
                    or
                    (
                        state.maintenance_mode
                        and
                        (
                            state.maintenance_reason
                            or ""
                        ).startswith(
                            "Financial Year transition"
                        )
                    )
                )
            ):
                state.year_transition_in_progress = False
                state.maintenance_mode = False
                state.maintenance_reason = None
                changed = True

            unfinished = (
                db.query(
                    FinancialYearTransitionLog
                )
                .filter(
                    FinancialYearTransitionLog.status
                    .in_([
                        "VALIDATING",
                        "READY",
                        "RUNNING",
                    ])
                )
                .all()
            )

            for record in unfinished:
                record.status = "FAILED"
                record.completed_at = (
                    datetime.now(
                        timezone.utc
                    )
                )
                record.error_message = (
                    "Transition was interrupted before completion. "
                    "Glisen ERP cleared the stale transition lock "
                    "when the backend restarted."
                )
                changed = True

            if changed:
                db.commit()

        except Exception:
            db.rollback()
            raise

        finally:
            db.close()


    # ============================================================
    # WRITE LOCK AFTER FY END
    #
    # Used by HTTP middleware for POST/PUT/PATCH/DELETE business
    # requests. Read-only screens remain accessible so the Boss
    # can review and perform the transition.
    # ============================================================

    @staticmethod
    def transition_required_now() -> bool:

        db = SessionLocal()

        try:
            active = (
                db.query(
                    FinancialYear
                )
                .filter(
                    FinancialYear.status
                    ==
                    "ACTIVE"
                )
                .order_by(
                    FinancialYear.start_date.asc()
                )
                .first()
            )

            if active is None:
                return False

            return (
                date.today()
                >
                active.end_date
            )

        finally:
            db.close()


    # ============================================================
    # STOCK SNAPSHOT SOURCE
    # ============================================================

    @staticmethod
    def stock_snapshot_rows(
        db: Session,
    ) -> list[dict]:

        products = (
            db.query(
                Product
            )
            .filter(
                Product.current_stock
                >
                0
            )
            .order_by(
                Product.id.asc()
            )
            .all()
        )

        rows = []

        for product in products:
            quantity = (
                FinancialYearService
                .money(
                    product.current_stock
                )
            )

            unit_cost = (
                FinancialYearService
                .money(
                    product.purchase_price
                )
            )

            if (
                unit_cost
                <=
                Decimal("0.00")
            ):
                latest_movement = (
                    db.query(
                        StockMovement
                    )
                    .filter(
                        StockMovement.product_id
                        ==
                        product.id
                    )
                    .order_by(
                        StockMovement
                        .movement_date
                        .desc(),
                        StockMovement
                        .id
                        .desc(),
                    )
                    .first()
                )

                if latest_movement is not None:
                    unit_cost = (
                        FinancialYearService
                        .money(
                            latest_movement
                            .unit_cost
                        )
                    )

            opening_value = (
                FinancialYearService
                .money(
                    quantity
                    *
                    unit_cost
                )
            )

            rows.append({
                "product_id":
                    product.id,
                "opening_quantity":
                    quantity,
                "unit_cost":
                    unit_cost,
                "opening_value":
                    opening_value,
            })

        return rows


    # ============================================================
    # WIP SNAPSHOT SOURCE
    # ============================================================

    @staticmethod
    def wip_snapshot_rows(
        db: Session,
        as_of_date: date,
    ) -> list[dict]:

        production_orders = (
            db.query(
                ProductionOrder
            )
            .filter(
                ProductionOrder.actual_start_date
                .isnot(
                    None
                ),

                ProductionOrder.actual_start_date
                <=
                as_of_date,

                ProductionOrder.actual_end_date
                .is_(
                    None
                ),
            )
            .order_by(
                ProductionOrder.id.asc()
            )
            .all()
        )

        rows = []

        for order in production_orders:
            cost = (
                ProductionCostService
                .calculate(
                    db=db,
                    production_order_id=(
                        order.id
                    ),
                    as_of_date=(
                        as_of_date
                    ),
                )
            )

            rows.append({
                "production_order_id":
                    order.id,

                "material_cost":
                    FinancialYearService
                    .money(
                        cost[
                            "material_cost"
                        ]
                    ),

                "operation_cost":
                    FinancialYearService
                    .money(
                        cost[
                            "operation_cost"
                        ]
                    ),

                "direct_expense_cost":
                    FinancialYearService
                    .money(
                        cost[
                            "direct_expense_cost"
                        ]
                    ),

                "allocated_staff_cost":
                    FinancialYearService
                    .money(
                        cost[
                            "allocated_staff_cost"
                        ]
                    ),

                "allocated_overhead_cost":
                    FinancialYearService
                    .money(
                        cost[
                            "allocated_overhead_cost"
                        ]
                    ),

                "total_opening_wip":
                    FinancialYearService
                    .money(
                        cost[
                            "total_production_cost"
                        ]
                    ),
            })

        return rows


    # ============================================================
    # READ-ONLY SNAPSHOT PREVIEW
    # ============================================================

    @staticmethod
    def snapshot_preview(
        db: Session,
        as_of_date: date,
    ) -> dict:

        stock_rows = (
            FinancialYearService
            .stock_snapshot_rows(
                db=db
            )
        )

        wip_rows = (
            FinancialYearService
            .wip_snapshot_rows(
                db=db,
                as_of_date=(
                    as_of_date
                ),
            )
        )

        stock_value = sum(
            (
                row[
                    "opening_value"
                ]
                for row
                in stock_rows
            ),
            Decimal("0.00"),
        )

        wip_value = sum(
            (
                row[
                    "total_opening_wip"
                ]
                for row
                in wip_rows
            ),
            Decimal("0.00"),
        )

        return {
            "stock_items":
                len(
                    stock_rows
                ),
            "stock_value":
                FinancialYearService
                .money(
                    stock_value
                ),
            "wip_orders":
                len(
                    wip_rows
                ),
            "wip_value":
                FinancialYearService
                .money(
                    wip_value
                ),
        }


    # ============================================================
    # OVERVIEW / YEAR-END PREPARATION
    # ============================================================

    @staticmethod
    def overview(
        db: Session,
        current_user_id: int,
    ) -> dict:

        today = date.today()

        current_fy = (
            FinancialYearService
            .get_or_create_current(
                db=db,
                opened_by=(
                    current_user_id
                ),
                today=today,
            )
        )

        transition_available_from = (
            current_fy.end_date
            +
            timedelta(
                days=1
            )
        )

        (
            _next_start_year,
            next_start_date,
            next_end_date,
            next_name,
        ) = (
            FinancialYearService
            .period_for_date(
                transition_available_from
            )
        )

        calendar_ready = (
            today
            >=
            transition_available_from
        )

        backup_settings = (
            db.query(
                BackupSettings
            )
            .first()
        )

        backup_system = (
            BackupService
            .system_status()
        )

        backup_infrastructure_ready = (
            backup_settings
            is not None
            and
            bool(
                backup_settings
                .primary_backup_path
            )
            and
            bool(
                backup_system[
                    "dump_utility_available"
                ]
            )
        )

        latest_verified_backup = (
            db.query(
                BackupLog
            )
            .filter(
                BackupLog.status
                ==
                "VERIFIED"
            )
            .order_by(
                BackupLog.id.desc()
            )
            .first()
        )

        latest_fy_final_backup = (
            db.query(
                BackupLog
            )
            .filter(
                BackupLog.backup_type
                ==
                "FY_FINAL",

                BackupLog.financial_year_id
                ==
                current_fy.id,

                BackupLog.status
                ==
                "VERIFIED",
            )
            .order_by(
                BackupLog.id.desc()
            )
            .first()
        )

        stock_items_to_carry = (
            db.query(
                func.count(
                    Product.id
                )
            )
            .filter(
                Product.current_stock
                >
                0
            )
            .scalar()
            or 0
        )

        total_stock_quantity_raw = (
            db.query(
                func.coalesce(
                    func.sum(
                        Product.current_stock
                    ),
                    0,
                )
            )
            .filter(
                Product.current_stock
                >
                0
            )
            .scalar()
        )

        total_stock_quantity = float(
            Decimal(
                str(
                    total_stock_quantity_raw
                    or 0
                )
            )
        )

        live_production_orders = (
            db.query(
                func.count(
                    ProductionOrder.id
                )
            )
            .filter(
                ProductionOrder.actual_start_date
                .isnot(
                    None
                ),

                ProductionOrder.actual_end_date
                .is_(
                    None
                ),
            )
            .scalar()
            or 0
        )

        current_fy_purchase_bills = (
            db.query(
                func.count(
                    PurchaseBill.id
                )
            )
            .filter(
                PurchaseBill.bill_date
                >=
                current_fy.start_date,

                PurchaseBill.bill_date
                <
                transition_available_from,
            )
            .scalar()
            or 0
        )

        current_fy_issued_invoices = (
            db.query(
                func.count(
                    FinalBill.id
                )
            )
            .filter(
                FinalBill.invoice_date
                >=
                current_fy.start_date,

                FinalBill.invoice_date
                <=
                current_fy.end_date,

                FinalBill.status
                ==
                "Issued",
            )
            .scalar()
            or 0
        )

        conflicting_active_financial_years = (
            db.query(
                func.count(
                    FinancialYear.id
                )
            )
            .filter(
                FinancialYear.status
                ==
                "ACTIVE",

                FinancialYear.id
                !=
                current_fy.id,
            )
            .scalar()
            or 0
        )

        blockers = []

        if not calendar_ready:
            blockers.append(
                (
                    "This Financial Year is still open. "
                    "Transition becomes available on "
                    f"{transition_available_from.strftime('%d %b %Y')}."
                )
            )

        if not backup_infrastructure_ready:
            blockers.append(
                (
                    "Backup infrastructure is not ready. "
                    "A configured Primary Backup Folder and "
                    "working mysqldump are required."
                )
            )

        if (
            conflicting_active_financial_years
            >
            0
        ):
            blockers.append(
                (
                    f"{conflicting_active_financial_years} other "
                    "Financial Year record(s) are also ACTIVE. "
                    "Only one ACTIVE Financial Year is allowed."
                )
            )

        required_confirmation = (
            f"CLOSE {current_fy.name}"
        )

        carry_forward_notes = [
            (
                f"{stock_items_to_carry} stocked product(s) "
                f"with total quantity {total_stock_quantity:.2f} "
                "will be snapshotted as the next FY opening stock."
            ),
            (
                f"{live_production_orders} live Production "
                "Order(s) will be snapshotted as opening WIP "
                "and continue in the next FY."
            ),
            (
                "A fresh verified FY_FINAL database backup will "
                "be created automatically before any year-close "
                "data is changed."
            ),
            (
                "Historical Purchase Bills, invoices, payments, "
                "expenses, GST records and production history "
                "will remain in the database with their original dates."
            ),
            (
                "Outstanding customer and supplier balances are "
                "not deleted at year close; their existing records "
                "continue until payment is completed."
            ),
        ]

        can_start_transition = (
            len(
                blockers
            )
            ==
            0
        )

        history = (
            db.query(
                FinancialYear
            )
            .order_by(
                FinancialYear
                .start_date
                .desc()
            )
            .all()
        )

        transition_rows = (
            db.query(
                FinancialYearTransitionLog
            )
            .order_by(
                FinancialYearTransitionLog
                .id
                .desc()
            )
            .limit(
                50
            )
            .all()
        )

        transition_history = []

        for row in transition_rows:
            from_year = (
                db.query(
                    FinancialYear
                )
                .filter(
                    FinancialYear.id
                    ==
                    row.from_financial_year_id
                )
                .first()
            )

            to_year = None

            if row.to_financial_year_id:
                to_year = (
                    db.query(
                        FinancialYear
                    )
                    .filter(
                        FinancialYear.id
                        ==
                        row.to_financial_year_id
                    )
                    .first()
                )

            backup = None

            if row.backup_log_id:
                backup = (
                    db.query(
                        BackupLog
                    )
                    .filter(
                        BackupLog.id
                        ==
                        row.backup_log_id
                    )
                    .first()
                )

            transition_history.append({
                "id":
                    row.id,
                "from_financial_year":
                    (
                        from_year.name
                        if from_year
                        else
                        f"ID {row.from_financial_year_id}"
                    ),
                "to_financial_year":
                    (
                        to_year.name
                        if to_year
                        else None
                    ),
                "backup_filename":
                    (
                        backup.filename
                        if backup
                        else None
                    ),
                "status":
                    row.status,
                "started_at":
                    row.started_at,
                "completed_at":
                    row.completed_at,
                "error_message":
                    row.error_message,
            })

        return {
            "validation": {
                "current_financial_year":
                    current_fy,

                "today":
                    today,

                "transition_available_from":
                    transition_available_from,

                "next_financial_year_name":
                    next_name,

                "next_financial_year_start_date":
                    next_start_date,

                "next_financial_year_end_date":
                    next_end_date,

                "calendar_ready":
                    calendar_ready,

                "backup_infrastructure_ready":
                    backup_infrastructure_ready,

                "latest_verified_backup_at":
                    (
                        latest_verified_backup
                        .verified_at
                        if latest_verified_backup
                        is not None
                        else None
                    ),

                "fy_final_backup_verified":
                    (
                        latest_fy_final_backup
                        is not None
                    ),

                "fy_final_backup_filename":
                    (
                        latest_fy_final_backup
                        .filename
                        if latest_fy_final_backup
                        is not None
                        else None
                    ),

                "fy_final_backup_verified_at":
                    (
                        latest_fy_final_backup
                        .verified_at
                        if latest_fy_final_backup
                        is not None
                        else None
                    ),

                "stock_items_to_carry":
                    int(
                        stock_items_to_carry
                    ),

                "total_stock_quantity":
                    total_stock_quantity,

                "live_production_orders":
                    int(
                        live_production_orders
                    ),

                "current_fy_purchase_bills":
                    int(
                        current_fy_purchase_bills
                    ),

                "current_fy_issued_invoices":
                    int(
                        current_fy_issued_invoices
                    ),

                "conflicting_active_financial_years":
                    int(
                        conflicting_active_financial_years
                    ),

                "blockers":
                    blockers,

                "carry_forward_notes":
                    carry_forward_notes,

                "required_confirmation":
                    required_confirmation,

                "can_start_transition":
                    can_start_transition,
            },

            "history":
                history,

            "transition_history":
                transition_history,
        }


    # ============================================================
    # CREATE OPENING SNAPSHOTS
    # ============================================================

    @staticmethod
    def create_opening_snapshots(
        db: Session,
        from_fy: FinancialYear,
        to_fy: FinancialYear,
    ) -> dict:

        existing_stock = (
            db.query(
                FinancialYearOpeningStock
            )
            .filter(
                FinancialYearOpeningStock
                .financial_year_id
                ==
                to_fy.id
            )
            .count()
        )

        existing_wip = (
            db.query(
                FinancialYearOpeningWIP
            )
            .filter(
                FinancialYearOpeningWIP
                .financial_year_id
                ==
                to_fy.id
            )
            .count()
        )

        if (
            existing_stock
            or
            existing_wip
        ):
            raise RuntimeError(
                "Opening snapshot records already exist "
                "for the next Financial Year."
            )

        stock_rows = (
            FinancialYearService
            .stock_snapshot_rows(
                db=db
            )
        )

        stock_value = Decimal(
            "0.00"
        )

        for row in stock_rows:
            db.add(
                FinancialYearOpeningStock(
                    financial_year_id=(
                        to_fy.id
                    ),
                    product_id=(
                        row[
                            "product_id"
                        ]
                    ),
                    opening_quantity=(
                        row[
                            "opening_quantity"
                        ]
                    ),
                    unit_cost=(
                        row[
                            "unit_cost"
                        ]
                    ),
                    opening_value=(
                        row[
                            "opening_value"
                        ]
                    ),
                    source_closing_date=(
                        from_fy.end_date
                    ),
                )
            )

            stock_value += (
                row[
                    "opening_value"
                ]
            )

        wip_rows = (
            FinancialYearService
            .wip_snapshot_rows(
                db=db,
                as_of_date=(
                    from_fy.end_date
                ),
            )
        )

        wip_value = Decimal(
            "0.00"
        )

        for row in wip_rows:
            db.add(
                FinancialYearOpeningWIP(
                    financial_year_id=(
                        to_fy.id
                    ),
                    production_order_id=(
                        row[
                            "production_order_id"
                        ]
                    ),
                    material_cost=(
                        row[
                            "material_cost"
                        ]
                    ),
                    operation_cost=(
                        row[
                            "operation_cost"
                        ]
                    ),
                    direct_expense_cost=(
                        row[
                            "direct_expense_cost"
                        ]
                    ),
                    allocated_staff_cost=(
                        row[
                            "allocated_staff_cost"
                        ]
                    ),
                    allocated_overhead_cost=(
                        row[
                            "allocated_overhead_cost"
                        ]
                    ),
                    total_opening_wip=(
                        row[
                            "total_opening_wip"
                        ]
                    ),
                    source_closing_date=(
                        from_fy.end_date
                    ),
                )
            )

            wip_value += (
                row[
                    "total_opening_wip"
                ]
            )

        return {
            "opening_stock_items":
                len(
                    stock_rows
                ),

            "opening_stock_value":
                FinancialYearService
                .money(
                    stock_value
                ),

            "opening_wip_orders":
                len(
                    wip_rows
                ),

            "opening_wip_value":
                FinancialYearService
                .money(
                    wip_value
                ),
        }


    # ============================================================
    # PROTECTED TRANSITION
    # ============================================================

    @staticmethod
    def transition(
        db: Session,
        current_user_id: int,
        confirmation: str,
    ) -> dict:

        if not (
            FinancialYearService
            .TRANSITION_LOCK
            .acquire(
                blocking=False
            )
        ):
            raise RuntimeError(
                "A Financial Year transition is already in progress."
            )

        FinancialYearService.TRANSITION_IN_PROGRESS = True

        transition_log_id = None

        try:
            overview = (
                FinancialYearService
                .overview(
                    db=db,
                    current_user_id=(
                        current_user_id
                    ),
                )
            )

            validation = (
                overview[
                    "validation"
                ]
            )

            current_fy = (
                validation[
                    "current_financial_year"
                ]
            )

            if not validation[
                "calendar_ready"
            ]:
                raise ValueError(
                    (
                        "Financial Year transition is not available "
                        "until "
                        f"{validation['transition_available_from']:%d %b %Y}."
                    )
                )

            if not validation[
                "backup_infrastructure_ready"
            ]:
                raise ValueError(
                    "Backup infrastructure must be ready "
                    "before Financial Year transition."
                )

            if (
                validation[
                    "conflicting_active_financial_years"
                ]
                >
                0
            ):
                raise ValueError(
                    "Financial Year transition is blocked because "
                    "more than one ACTIVE Financial Year exists."
                )

            required_confirmation = (
                validation[
                    "required_confirmation"
                ]
            )

            if (
                str(
                    confirmation
                    or ""
                ).strip()
                !=
                required_confirmation
            ):
                raise ValueError(
                    (
                        "Confirmation text must exactly match: "
                        f"{required_confirmation}"
                    )
                )

            transition_log = (
                FinancialYearTransitionLog(
                    from_financial_year_id=(
                        current_fy.id
                    ),
                    to_financial_year_id=None,
                    backup_log_id=None,
                    status="VALIDATING",
                    validation_summary=(
                        json.dumps({
                            "financial_year":
                                current_fy.name,
                            "closing_date":
                                current_fy
                                .end_date
                                .isoformat(),
                            "stock_items":
                                validation[
                                    "stock_items_to_carry"
                                ],
                            "stock_quantity":
                                validation[
                                    "total_stock_quantity"
                                ],
                            "live_wip_orders":
                                validation[
                                    "live_production_orders"
                                ],
                            "purchase_bills":
                                validation[
                                    "current_fy_purchase_bills"
                                ],
                            "issued_invoices":
                                validation[
                                    "current_fy_issued_invoices"
                                ],
                        })
                    ),
                    carry_forward_summary=None,
                    started_by=(
                        current_user_id
                    ),
                    error_message=None,
                )
            )

            db.add(
                transition_log
            )
            db.commit()
            db.refresh(
                transition_log
            )

            transition_log_id = (
                transition_log.id
            )

            # ----------------------------------------------------
            # FRESH PERMANENT FY_FINAL BACKUP
            #
            # This happens before SystemState maintenance is
            # persisted so restoring this backup returns to a
            # normal pre-transition database state.
            # ----------------------------------------------------

            backup = (
                BackupService
                .create_fy_final_backup(
                    db=db,
                    created_by=(
                        current_user_id
                    ),
                    financial_year_id=(
                        current_fy.id
                    ),
                )
            )

            transition_log.backup_log_id = (
                backup.id
            )
            db.commit()

            if (
                backup.status
                !=
                "VERIFIED"
            ):
                backup = (
                    BackupService
                    .verify_backup(
                        db=db,
                        backup_id=(
                            backup.id
                        ),
                    )
                )

            if (
                backup.status
                !=
                "VERIFIED"
            ):
                raise RuntimeError(
                    "FY_FINAL backup could not be fully verified. "
                    "Financial Year transition was cancelled."
                )

            transition_log = (
                db.query(
                    FinancialYearTransitionLog
                )
                .filter(
                    FinancialYearTransitionLog.id
                    ==
                    transition_log_id
                )
                .first()
            )

            transition_log.status = "READY"
            db.commit()

            # ----------------------------------------------------
            # ENTER PERSISTED MAINTENANCE STATE
            # ----------------------------------------------------

            state = (
                FinancialYearService
                .get_or_create_system_state(
                    db=db
                )
            )

            state.maintenance_mode = True
            state.maintenance_reason = (
                "Financial Year transition in progress."
            )
            state.year_transition_in_progress = True

            transition_log.status = "RUNNING"

            db.commit()

            # ----------------------------------------------------
            # RE-LOCK CURRENT FY
            # ----------------------------------------------------

            current_fy = (
                db.query(
                    FinancialYear
                )
                .filter(
                    FinancialYear.id
                    ==
                    current_fy.id
                )
                .with_for_update()
                .first()
            )

            if (
                current_fy is None
                or
                current_fy.status
                !=
                "ACTIVE"
            ):
                raise RuntimeError(
                    "The source Financial Year is no longer ACTIVE."
                )

            if (
                date.today()
                <=
                current_fy.end_date
            ):
                raise RuntimeError(
                    "The Financial Year has not ended yet."
                )

            next_start_date = (
                current_fy.end_date
                +
                timedelta(
                    days=1
                )
            )

            (
                _next_start_year,
                expected_start,
                expected_end,
                expected_name,
            ) = (
                FinancialYearService
                .period_for_date(
                    next_start_date
                )
            )

            existing_next = (
                db.query(
                    FinancialYear
                )
                .filter(
                    FinancialYear.start_date
                    ==
                    expected_start
                )
                .first()
            )

            if existing_next is not None:
                raise RuntimeError(
                    (
                        "The next Financial Year already exists: "
                        f"{existing_next.name}. "
                        "Transition was stopped to avoid duplicate "
                        "opening balances."
                    )
                )

            next_fy = FinancialYear(
                name=(
                    expected_name
                ),
                start_date=(
                    expected_start
                ),
                end_date=(
                    expected_end
                ),
                status="ACTIVE",
                opened_by=(
                    current_user_id
                ),
                notes=(
                    f"Opened from protected transition "
                    f"of {current_fy.name}."
                ),
            )

            db.add(
                next_fy
            )
            db.flush()

            snapshot = (
                FinancialYearService
                .create_opening_snapshots(
                    db=db,
                    from_fy=(
                        current_fy
                    ),
                    to_fy=(
                        next_fy
                    ),
                )
            )

            completed_at = (
                datetime.now(
                    timezone.utc
                )
            )

            current_fy.status = "CLOSED"
            current_fy.closed_at = (
                completed_at
            )
            current_fy.closed_by = (
                current_user_id
            )

            transition_log = (
                db.query(
                    FinancialYearTransitionLog
                )
                .filter(
                    FinancialYearTransitionLog.id
                    ==
                    transition_log_id
                )
                .first()
            )

            transition_log.to_financial_year_id = (
                next_fy.id
            )
            transition_log.status = "COMPLETED"
            transition_log.completed_at = (
                completed_at
            )
            transition_log.error_message = None
            transition_log.carry_forward_summary = (
                json.dumps({
                    "opening_stock_items":
                        snapshot[
                            "opening_stock_items"
                        ],
                    "opening_stock_value":
                        str(
                            snapshot[
                                "opening_stock_value"
                            ]
                        ),
                    "opening_wip_orders":
                        snapshot[
                            "opening_wip_orders"
                        ],
                    "opening_wip_value":
                        str(
                            snapshot[
                                "opening_wip_value"
                            ]
                        ),
                })
            )

            state = (
                db.query(
                    SystemState
                )
                .first()
            )

            if state is not None:
                state.maintenance_mode = False
                state.maintenance_reason = None
                state.year_transition_in_progress = False

            # ----------------------------------------------------
            # SINGLE ATOMIC COMMIT FOR:
            # - next FY
            # - opening stock
            # - opening WIP
            # - old FY close
            # - transition completion
            # - maintenance exit
            # ----------------------------------------------------

            db.commit()

            db.refresh(
                current_fy
            )
            db.refresh(
                next_fy
            )

            return {
                "success":
                    True,

                "message":
                    (
                        f"{current_fy.name} closed and "
                        f"{next_fy.name} opened successfully."
                    ),

                "transition_log_id":
                    transition_log_id,

                "from_financial_year":
                    current_fy,

                "to_financial_year":
                    next_fy,

                "backup_filename":
                    backup.filename,

                "opening_stock_items":
                    snapshot[
                        "opening_stock_items"
                    ],

                "opening_stock_value":
                    float(
                        snapshot[
                            "opening_stock_value"
                        ]
                    ),

                "opening_wip_orders":
                    snapshot[
                        "opening_wip_orders"
                    ],

                "opening_wip_value":
                    float(
                        snapshot[
                            "opening_wip_value"
                        ]
                    ),
            }

        except Exception as exc:
            db.rollback()

            try:
                state = (
                    db.query(
                        SystemState
                    )
                    .first()
                )

                if state is not None:
                    state.maintenance_mode = False
                    state.maintenance_reason = None
                    state.year_transition_in_progress = False

                if transition_log_id is not None:
                    failed_log = (
                        db.query(
                            FinancialYearTransitionLog
                        )
                        .filter(
                            FinancialYearTransitionLog.id
                            ==
                            transition_log_id
                        )
                        .first()
                    )

                    if failed_log is not None:
                        failed_log.status = "FAILED"
                        failed_log.completed_at = (
                            datetime.now(
                                timezone.utc
                            )
                        )
                        failed_log.error_message = (
                            str(
                                exc
                            )
                        )

                db.commit()

            except Exception:
                db.rollback()

            raise

        finally:
            FinancialYearService.TRANSITION_IN_PROGRESS = False

            FinancialYearService.TRANSITION_LOCK.release()
