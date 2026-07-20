from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.supplier import Supplier


class SupplierRepository:

    @staticmethod
    def create(
        db: Session,
        supplier: Supplier,
    ):
        db.add(supplier)
        db.commit()
        db.refresh(supplier)
        return supplier

    @staticmethod
    def get_all(
        db: Session,
        search: str | None = None,
    ):
        query = db.query(Supplier)

        if search:
            keyword = f"%{search}%"

            query = query.filter(
                or_(
                    Supplier.supplier_code.ilike(keyword),
                    Supplier.company_name.ilike(keyword),
                    Supplier.contact_person.ilike(keyword),
                    Supplier.phone.ilike(keyword),
                )
            )

        return (
            query.order_by(Supplier.company_name)
            .all()
        )

    @staticmethod
    def get_by_id(
        db: Session,
        supplier_id: int,
    ):
        return (
            db.query(Supplier)
            .filter(Supplier.id == supplier_id)
            .first()
        )

    @staticmethod
    def get_by_company_name(
        db: Session,
        company_name: str,
    ):
        return (
            db.query(Supplier)
            .filter(
                Supplier.company_name.ilike(company_name),
            )
            .first()
        )

    @staticmethod
    def get_by_gst_number(
        db: Session,
        gst_number: str,
    ):
        return (
            db.query(Supplier)
            .filter(
                Supplier.gst_number == gst_number,
            )
            .first()
        )

    @staticmethod
    def update(
        db: Session,
        supplier: Supplier,
    ):
        db.commit()
        db.refresh(supplier)
        return supplier

    @staticmethod
    def deactivate(
        db: Session,
        supplier: Supplier,
    ):
        supplier.is_active = False

        db.commit()
        db.refresh(supplier)

        return supplier

    @staticmethod
    def generate_supplier_code(
        db: Session,
    ):

        last_supplier = (
            db.query(Supplier)
            .order_by(
                Supplier.id.desc()
            )
            .first()
        )

        if last_supplier is None:
            return "SUP00001"

        return (
            f"SUP{last_supplier.id + 1:05d}"
        )