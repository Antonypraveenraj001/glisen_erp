from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.proforma import Proforma


class ProformaRepository:
    """
    Database access layer for Proforma records.

    This repository intentionally contains database operations only.
    Business rules and calculations belong in the service layer.
    """

    def __init__(self, db: Session):
        self.db = db

    # ========================================================
    # CREATE
    # ========================================================

    def create(self, proforma: Proforma) -> Proforma:
        self.db.add(proforma)
        self.db.flush()
        self.db.refresh(proforma)

        return proforma

    # ========================================================
    # GET BY ID
    # ========================================================

    def get_by_id(
        self,
        proforma_id: int,
    ) -> Optional[Proforma]:

        statement = (
            select(Proforma)
            .options(
                selectinload(Proforma.items)
            )
            .where(
                Proforma.id == proforma_id
            )
        )

        return (
            self.db.execute(statement)
            .scalar_one_or_none()
        )

    # ========================================================
    # GET BY NUMBER
    # ========================================================

    def get_by_number(
        self,
        proforma_number: str,
    ) -> Optional[Proforma]:

        statement = (
            select(Proforma)
            .options(
                selectinload(Proforma.items)
            )
            .where(
                Proforma.proforma_number
                == proforma_number
            )
        )

        return (
            self.db.execute(statement)
            .scalar_one_or_none()
        )

    # ========================================================
    # GET BY ENQUIRY
    # ========================================================

    def get_by_enquiry(
        self,
        enquiry_id: int,
    ) -> List[Proforma]:

        statement = (
            select(Proforma)
            .options(
                selectinload(Proforma.items)
            )
            .where(
                Proforma.enquiry_id
                == enquiry_id
            )
            .order_by(
                Proforma.id.desc()
            )
        )

        return list(
            self.db.execute(statement)
            .scalars()
            .all()
        )

    # ========================================================
    # GET LIST
    # ========================================================

    def get_all(
        self,
        search: Optional[str] = None,
        status: Optional[str] = None,
        customer_id: Optional[int] = None,
        enquiry_id: Optional[int] = None,
    ) -> List[Proforma]:

        statement = (
            select(Proforma)
            .options(
                selectinload(Proforma.items)
            )
            .order_by(
                Proforma.id.desc()
            )
        )

        if search:
            search_value = (
                f"%{search.strip()}%"
            )

            statement = statement.where(
                (
                    Proforma.proforma_number.like(
                        search_value
                    )
                )
                | (
                    Proforma.company_name.like(
                        search_value
                    )
                )
                | (
                    Proforma.contact_person.like(
                        search_value
                    )
                )
                | (
                    Proforma.phone.like(
                        search_value
                    )
                )
                | (
                    Proforma.email.like(
                        search_value
                    )
                )
            )

        if status:
            statement = statement.where(
                Proforma.status == status
            )

        if customer_id:
            statement = statement.where(
                Proforma.customer_id
                == customer_id
            )

        if enquiry_id:
            statement = statement.where(
                Proforma.enquiry_id
                == enquiry_id
            )

        return list(
            self.db.execute(statement)
            .scalars()
            .all()
        )

    # ========================================================
    # UPDATE
    # ========================================================

    def update(
        self,
        proforma: Proforma,
    ) -> Proforma:

        self.db.add(proforma)
        self.db.flush()
        self.db.refresh(proforma)

        return proforma

    # ========================================================
    # DELETE
    # ========================================================

    def delete(
        self,
        proforma: Proforma,
    ) -> None:

        self.db.delete(proforma)
        self.db.flush()