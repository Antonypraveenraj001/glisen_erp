from sqlalchemy import func, or_
from sqlalchemy.orm import (
    Session,
    joinedload,
)

from app.models.purchase_bill import PurchaseBill
from app.models.purchase_bill_item import PurchaseBillItem
from app.models.purchase_bill_payment import (
    PurchaseBillPayment,
)
from app.models.supplier import Supplier


class PurchaseBillRepository:

    # ============================================================
    # CREATE
    # ============================================================

    @staticmethod
    def create(
        db: Session,
        purchase_bill: PurchaseBill,
    ):
        db.add(
            purchase_bill
        )

        db.commit()

        db.refresh(
            purchase_bill
        )

        return purchase_bill

    # ============================================================
    # UPDATE
    # ============================================================

    @staticmethod
    def update(
        db: Session,
        purchase_bill: PurchaseBill,
    ):
        db.commit()

        db.refresh(
            purchase_bill
        )

        return purchase_bill

    # ============================================================
    # GET ALL ACTIVE PURCHASE BILLS
    # ============================================================

    @staticmethod
    def get_all(
        db: Session,
        search: str | None = None,
    ):

        query = (
            db.query(PurchaseBill)
            .join(Supplier)
            .options(
                joinedload(
                    PurchaseBill.items
                ),
                joinedload(
                    PurchaseBill.supplier
                ),
            )
            .filter(
                PurchaseBill.is_active
                == True,
            )
        )

        if search:
            query = query.filter(
                or_(
                    PurchaseBill.bill_number.ilike(
                        f"%{search}%"
                    ),
                    Supplier.company_name.ilike(
                        f"%{search}%"
                    ),
                )
            )

        return (
            query
            .order_by(
                PurchaseBill.id.desc()
            )
            .all()
        )

    # ============================================================
    # GET BY ID
    # ============================================================

    @staticmethod
    def get_by_id(
        db: Session,
        purchase_bill_id: int,
    ):

        return (
            db.query(PurchaseBill)
            .options(
                joinedload(
                    PurchaseBill.items
                ),
                joinedload(
                    PurchaseBill.supplier
                ),
            )
            .filter(
                PurchaseBill.id
                == purchase_bill_id,
                PurchaseBill.is_active
                == True,
            )
            .first()
        )

    # ============================================================
    # GET BY SUPPLIER + BILL NUMBER
    # ============================================================

    @staticmethod
    def get_by_bill_number(
        db: Session,
        supplier_id: int,
        bill_number: str,
    ):

        return (
            db.query(PurchaseBill)
            .filter(
                PurchaseBill.supplier_id
                == supplier_id,
                PurchaseBill.bill_number
                == bill_number,
                PurchaseBill.is_active
                == True,
            )
            .first()
        )

    # ============================================================
    # DEACTIVATE
    # ============================================================

    @staticmethod
    def deactivate(
        db: Session,
        purchase_bill_id: int,
    ):

        purchase_bill = (
            db.query(PurchaseBill)
            .filter(
                PurchaseBill.id
                == purchase_bill_id,
                PurchaseBill.is_active
                == True,
            )
            .first()
        )

        if purchase_bill is None:
            return None

        purchase_bill.is_active = False

        db.commit()

        db.refresh(
            purchase_bill
        )

        return purchase_bill

    # ============================================================
    # STATISTICS
    # ============================================================

    @staticmethod
    def get_statistics(
        db: Session,
    ):

        total_purchase_bills = (
            db.query(PurchaseBill)
            .filter(
                PurchaseBill.is_active
                == True,
            )
            .count()
        )

        total_purchase_value = (
            db.query(
                func.coalesce(
                    func.sum(
                        PurchaseBill.grand_total
                    ),
                    0,
                )
            )
            .filter(
                PurchaseBill.is_active
                == True,
            )
            .scalar()
        )

        total_quantity_purchased = (
            db.query(
                func.coalesce(
                    func.sum(
                        PurchaseBillItem.quantity
                    ),
                    0,
                )
            )
            .join(PurchaseBill)
            .filter(
                PurchaseBill.is_active
                == True,
            )
            .scalar()
        )

        return {
            "total_purchase_bills": (
                total_purchase_bills
            ),
            "active_purchase_bills": (
                total_purchase_bills
            ),
            "total_purchase_value": (
                total_purchase_value
            ),
            "total_quantity_purchased": (
                total_quantity_purchased
            ),
        }

    # ============================================================
    # UNPAID PURCHASE BILL AGING
    # ============================================================

    @staticmethod
    def get_unpaid_aging(
        db: Session,
    ):
        """
        Return tracked active Purchase Bills that still
        have an outstanding supplier balance.

        Historical Purchase Bills are excluded because
        they have due_date = NULL.

        Payment balance is derived from the immutable
        PurchaseBillPayment ledger:

            paid_amount =
                SUM(purchase_bill_payments.amount)

            balance_amount =
                grand_total - paid_amount

        Fully paid bills are excluded.

        Oldest bill date is returned first, which is
        equivalent to highest days-unpaid first.
        """

        # ========================================================
        # PAYMENT TOTAL SUBQUERY
        # ========================================================

        payment_totals = (
            db.query(
                PurchaseBillPayment.purchase_bill_id.label(
                    "purchase_bill_id"
                ),
                func.sum(
                    PurchaseBillPayment.amount
                ).label(
                    "paid_amount"
                ),
            )
            .group_by(
                PurchaseBillPayment.purchase_bill_id
            )
            .subquery()
        )

        # ========================================================
        # DERIVED VALUES
        # ========================================================

        paid_amount = func.coalesce(
            payment_totals.c.paid_amount,
            0,
        )

        balance_amount = (
            PurchaseBill.grand_total
            - paid_amount
        )

        # ========================================================
        # QUERY
        # ========================================================

        rows = (
            db.query(
                PurchaseBill.id.label(
                    "purchase_bill_id"
                ),
                PurchaseBill.bill_number.label(
                    "bill_number"
                ),
                PurchaseBill.supplier_id.label(
                    "supplier_id"
                ),
                Supplier.company_name.label(
                    "supplier_name"
                ),
                PurchaseBill.bill_date.label(
                    "bill_date"
                ),
                PurchaseBill.grand_total.label(
                    "grand_total"
                ),
                paid_amount.label(
                    "paid_amount"
                ),
                balance_amount.label(
                    "balance_amount"
                ),
                PurchaseBill.credit_days.label(
                    "credit_days"
                ),
                PurchaseBill.due_date.label(
                    "due_date"
                ),
            )
            .join(
                Supplier,
                Supplier.id
                == PurchaseBill.supplier_id,
            )
            .outerjoin(
                payment_totals,
                payment_totals.c.purchase_bill_id
                == PurchaseBill.id,
            )
            .filter(
                PurchaseBill.is_active
                == True,

                # Legacy bills have no known
                # payment-tracking state.
                PurchaseBill.due_date.isnot(
                    None
                ),

                # Only outstanding bills.
                balance_amount > 0,
            )
            .order_by(
                # Oldest bill = highest days unpaid.
                PurchaseBill.bill_date.asc(),
                PurchaseBill.id.asc(),
            )
            .all()
        )

        return rows