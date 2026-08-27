from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.proforma import Proforma
from app.models.proforma_item import ProformaItem
from app.repositories.proforma_repository import ProformaRepository
from app.schemas.proforma import (
    ProformaCreate,
    ProformaItemCreate,
    ProformaUpdate,
)


TWOPLACES = Decimal("0.01")


class ProformaService:
    """
    Business logic layer for Proforma operations.
    """

    def __init__(self, db: Session):
        self.db = db
        self.repository = ProformaRepository(db)

    # ========================================================
    # DECIMAL HELPERS
    # ========================================================

    @staticmethod
    def money(value: Decimal) -> Decimal:
        return value.quantize(
            TWOPLACES,
            rounding=ROUND_HALF_UP,
        )

    # ========================================================
    # PROFORMA NUMBER
    # ========================================================

    def generate_proforma_number(self) -> str:
        """
        Generate the next Proforma number for the current year.

        Example:
        PRO-2026-0001
        PRO-2026-0002
        """

        year = date.today().year
        prefix = f"PRO-{year}-"

        existing = self.repository.get_all()

        highest_number = 0

        for proforma in existing:
            number = proforma.proforma_number

            if not number.startswith(prefix):
                continue

            try:
                sequence = int(
                    number.replace(prefix, "")
                )

                if sequence > highest_number:
                    highest_number = sequence

            except ValueError:
                continue

        next_number = highest_number + 1

        return f"{prefix}{next_number:04d}"

    # ========================================================
    # ITEM CALCULATION
    # ========================================================

    def calculate_item(
        self,
        item: ProformaItemCreate,
    ) -> dict:
        """
        Calculate financial values for one Proforma item.
        """

        quantity = Decimal(item.quantity)
        unit_price = Decimal(item.unit_price)

        discount_percent = Decimal(
            item.discount_percent or 0
        )

        tax_percent = Decimal(
            item.tax_percent or 0
        )

        gross_amount = quantity * unit_price

        discount_amount = (
            gross_amount
            * discount_percent
            / Decimal("100")
        )

        taxable_amount = (
            gross_amount
            - discount_amount
        )

        tax_amount = (
            taxable_amount
            * tax_percent
            / Decimal("100")
        )

        line_total = (
            taxable_amount
            + tax_amount
        )

        return {
            "gross_amount": self.money(
                gross_amount
            ),
            "discount_amount": self.money(
                discount_amount
            ),
            "taxable_amount": self.money(
                taxable_amount
            ),
            "tax_amount": self.money(
                tax_amount
            ),
            "line_total": self.money(
                line_total
            ),
        }

    # ========================================================
    # PROFORMA TOTALS
    # ========================================================

    def calculate_totals(
        self,
        items: List[ProformaItemCreate],
    ) -> dict:
        """
        Calculate Proforma-level financial totals.
        """

        subtotal = Decimal("0")
        discount_amount = Decimal("0")
        taxable_amount = Decimal("0")
        tax_amount = Decimal("0")

        for item in items:

            calculated = self.calculate_item(item)

            subtotal += calculated[
                "gross_amount"
            ]

            discount_amount += calculated[
                "discount_amount"
            ]

            taxable_amount += calculated[
                "taxable_amount"
            ]

            tax_amount += calculated[
                "tax_amount"
            ]

        grand_total = (
            taxable_amount
            + tax_amount
        )

        return {
            "subtotal": self.money(subtotal),
            "discount_amount": self.money(
                discount_amount
            ),
            "taxable_amount": self.money(
                taxable_amount
            ),
            "tax_amount": self.money(
                tax_amount
            ),
            "grand_total": self.money(
                grand_total
            ),
        }

    # ========================================================
    # CREATE PROFORMA
    # ========================================================

    def create(
        self,
        data: ProformaCreate,
    ) -> Proforma:

        if not data.items:
            raise ValueError(
                "At least one Proforma item is required."
            )

        proforma_number = (
            self.generate_proforma_number()
        )

        totals = self.calculate_totals(
            data.items
        )

        proforma = Proforma(
            proforma_number=proforma_number,
            proforma_date=data.proforma_date,
            enquiry_id=data.enquiry_id,
            customer_id=data.customer_id,
            company_name=data.company_name,
            contact_person=data.contact_person,
            phone=data.phone,
            email=data.email,
            billing_address=data.billing_address,
            shipping_address=data.shipping_address,
            payment_terms=data.payment_terms,
            delivery_terms=data.delivery_terms,
            validity_days=data.validity_days,
            notes=data.notes,
            terms_and_conditions=(
                data.terms_and_conditions
            ),
            status=data.status,
            subtotal=totals["subtotal"],
            discount_amount=totals[
                "discount_amount"
            ],
            taxable_amount=totals[
                "taxable_amount"
            ],
            tax_amount=totals["tax_amount"],
            grand_total=totals[
                "grand_total"
            ],
        )

        for item_data in data.items:

            calculated = self.calculate_item(
                item_data
            )

            item = ProformaItem(
                product_id=item_data.product_id,
                description=item_data.description,
                quantity=item_data.quantity,
                unit=item_data.unit,
                unit_price=item_data.unit_price,
                discount_percent=(
                    item_data.discount_percent
                ),
                tax_percent=(
                    item_data.tax_percent
                ),
                discount_amount=calculated[
                    "discount_amount"
                ],
                taxable_amount=calculated[
                    "taxable_amount"
                ],
                tax_amount=calculated[
                    "tax_amount"
                ],
                line_total=calculated[
                    "line_total"
                ],
            )

            proforma.items.append(item)

        return self.repository.create(
            proforma
        )

    # ========================================================
    # GET ONE
    # ========================================================

    def get_by_id(
        self,
        proforma_id: int,
    ) -> Optional[Proforma]:

        return self.repository.get_by_id(
            proforma_id
        )

    # ========================================================
    # GET BY NUMBER
    # ========================================================

    def get_by_number(
        self,
        proforma_number: str,
    ) -> Optional[Proforma]:

        return self.repository.get_by_number(
            proforma_number
        )

    # ========================================================
    # GET BY ENQUIRY
    # ========================================================

    def get_by_enquiry(
        self,
        enquiry_id: int,
    ) -> List[Proforma]:

        return self.repository.get_by_enquiry(
            enquiry_id
        )

    # ========================================================
    # LIST
    # ========================================================

    def get_all(
        self,
        search: Optional[str] = None,
        status: Optional[str] = None,
        customer_id: Optional[int] = None,
        enquiry_id: Optional[int] = None,
    ) -> List[Proforma]:

        return self.repository.get_all(
            search=search,
            status=status,
            customer_id=customer_id,
            enquiry_id=enquiry_id,
        )

    # ========================================================
    # UPDATE
    # ========================================================

    def update(
        self,
        proforma_id: int,
        data: ProformaUpdate,
    ) -> Optional[Proforma]:

        proforma = self.repository.get_by_id(
            proforma_id
        )

        if not proforma:
            return None

        update_data = data.model_dump(
            exclude_unset=True,
            exclude={"items"},
        )

        for field, value in update_data.items():
            setattr(
                proforma,
                field,
                value,
            )

        # ----------------------------------------------------
        # Replace items if items were supplied
        # ----------------------------------------------------

        if data.items is not None:

            if not data.items:
                raise ValueError(
                    "At least one Proforma item is required."
                )

            totals = self.calculate_totals(
                data.items
            )

            proforma.subtotal = totals[
                "subtotal"
            ]

            proforma.discount_amount = totals[
                "discount_amount"
            ]

            proforma.taxable_amount = totals[
                "taxable_amount"
            ]

            proforma.tax_amount = totals[
                "tax_amount"
            ]

            proforma.grand_total = totals[
                "grand_total"
            ]

            proforma.items.clear()

            for item_data in data.items:

                calculated = self.calculate_item(
                    item_data
                )

                item = ProformaItem(
                    product_id=item_data.product_id,
                    description=item_data.description,
                    quantity=item_data.quantity,
                    unit=item_data.unit,
                    unit_price=item_data.unit_price,
                    discount_percent=(
                        item_data.discount_percent
                    ),
                    tax_percent=(
                        item_data.tax_percent
                    ),
                    discount_amount=(
                        calculated[
                            "discount_amount"
                        ]
                    ),
                    taxable_amount=(
                        calculated[
                            "taxable_amount"
                        ]
                    ),
                    tax_amount=(
                        calculated[
                            "tax_amount"
                        ]
                    ),
                    line_total=(
                        calculated[
                            "line_total"
                        ]
                    ),
                )

                proforma.items.append(item)

        self.db.flush()
        self.db.refresh(proforma)

        return proforma

    # ========================================================
    # UPDATE STATUS
    # ========================================================

    def update_status(
        self,
        proforma_id: int,
        status: str,
    ) -> Optional[Proforma]:

        proforma = self.repository.get_by_id(
            proforma_id
        )

        if not proforma:
            return None

        proforma.status = status

        self.db.flush()
        self.db.refresh(proforma)

        return proforma

    # ========================================================
    # DELETE
    # ========================================================

    def delete(
        self,
        proforma_id: int,
    ) -> bool:

        proforma = self.repository.get_by_id(
            proforma_id
        )

        if not proforma:
            return False

        self.repository.delete(
            proforma
        )

        return True