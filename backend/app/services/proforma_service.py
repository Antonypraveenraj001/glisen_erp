from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.proforma import Proforma
from app.models.proforma_item import ProformaItem

from app.repositories.customer_repository import (
    CustomerRepository,
)
from app.repositories.enquiry_repository import (
    EnquiryRepository,
)
from app.repositories.proforma_repository import (
    ProformaRepository,
)

from app.schemas.proforma import (
    ProformaCreate,
    ProformaItemCreate,
    ProformaUpdate,
)


TWOPLACES = Decimal("0.01")


class ProformaService:
    """
    Business logic layer for Proforma operations.

    Customer and Enquiry identity are controlled by the
    selected Enquiry. The user never manually chooses
    Customer ID or Enquiry ID.
    """

    ELIGIBLE_ENQUIRY_STATUSES = {
        "new",
        "contacted",
        "quotation",
    }

    BLOCKED_ENQUIRY_STATUSES = {
        "order confirmed",
        "production started",
        "production completed",
        "final bill generated",
        "payment pending",
        "payment received",
        "completed",
        "cancelled",
    }

    def __init__(
        self,
        db: Session,
    ):
        self.db = db

        self.repository = (
            ProformaRepository(
                db
            )
        )

    # ========================================================
    # DECIMAL HELPERS
    # ========================================================

    @staticmethod
    def money(
        value: Decimal,
    ) -> Decimal:

        return value.quantize(
            TWOPLACES,
            rounding=ROUND_HALF_UP,
        )

    # ========================================================
    # PROFORMA NUMBER
    # ========================================================

    def generate_proforma_number(
        self,
    ) -> str:

        year = date.today().year

        prefix = (
            f"PRO-{year}-"
        )

        existing = (
            self.repository
            .get_all()
        )

        highest_number = 0

        for proforma in existing:

            number = (
                proforma.proforma_number
            )

            if not number.startswith(
                prefix
            ):
                continue

            try:

                sequence = int(
                    number.replace(
                        prefix,
                        "",
                    )
                )

                highest_number = max(
                    highest_number,
                    sequence,
                )

            except ValueError:

                continue

        next_number = (
            highest_number
            + 1
        )

        return (
            f"{prefix}"
            f"{next_number:04d}"
        )

    # ========================================================
    # ENQUIRY VALIDATION
    # ========================================================

    def _get_valid_enquiry(
        self,
        enquiry_id: int,
    ):

        enquiry = (
            EnquiryRepository
            .get_by_id(
                self.db,
                enquiry_id,
            )
        )

        if enquiry is None:

            raise ValueError(
                "Selected Enquiry was not found."
            )

        status_value = (
            enquiry.status
            or ""
        ).strip().lower()

        if (
            status_value
            not in
            self.ELIGIBLE_ENQUIRY_STATUSES
        ):

            raise ValueError(
                f"{enquiry.enquiry_number} "
                "is no longer eligible for a new Proforma "
                f"because its status is '{enquiry.status}'."
            )

        customer = (
            CustomerRepository
            .get_by_id(
                self.db,
                enquiry.customer_id,
            )
        )

        if customer is None:

            raise ValueError(
                "The Customer linked to this Enquiry "
                "was not found."
            )

        return (
            enquiry,
            customer,
        )

    # ========================================================
    # ITEM CALCULATION
    # ========================================================

    def calculate_item(
        self,
        item: ProformaItemCreate,
    ) -> dict:

        quantity = Decimal(
            str(
                item.quantity
            )
        )

        unit_price = Decimal(
            str(
                item.unit_price
            )
        )

        discount_percent = Decimal(
            str(
                item.discount_percent
                or 0
            )
        )

        tax_percent = Decimal(
            str(
                item.tax_percent
                or 0
            )
        )

        gross_amount = (
            quantity
            * unit_price
        )

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
            "gross_amount":
                self.money(
                    gross_amount
                ),

            "discount_amount":
                self.money(
                    discount_amount
                ),

            "taxable_amount":
                self.money(
                    taxable_amount
                ),

            "tax_amount":
                self.money(
                    tax_amount
                ),

            "line_total":
                self.money(
                    line_total
                ),
        }

    # ========================================================
    # PROFORMA TOTALS
    # ========================================================

    def calculate_totals(
        self,
        items: List[
            ProformaItemCreate
        ],
    ) -> dict:

        subtotal = Decimal(
            "0"
        )

        discount_amount = Decimal(
            "0"
        )

        taxable_amount = Decimal(
            "0"
        )

        tax_amount = Decimal(
            "0"
        )

        for item in items:

            calculated = (
                self.calculate_item(
                    item
                )
            )

            subtotal += (
                calculated[
                    "gross_amount"
                ]
            )

            discount_amount += (
                calculated[
                    "discount_amount"
                ]
            )

            taxable_amount += (
                calculated[
                    "taxable_amount"
                ]
            )

            tax_amount += (
                calculated[
                    "tax_amount"
                ]
            )

        grand_total = (
            taxable_amount
            + tax_amount
        )

        return {
            "subtotal":
                self.money(
                    subtotal
                ),

            "discount_amount":
                self.money(
                    discount_amount
                ),

            "taxable_amount":
                self.money(
                    taxable_amount
                ),

            "tax_amount":
                self.money(
                    tax_amount
                ),

            "grand_total":
                self.money(
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
                "At least one Proforma item "
                "is required."
            )

        # ----------------------------------------------------
        # ENQUIRY IS SOURCE OF TRUTH
        # ----------------------------------------------------

        enquiry, customer = (
            self._get_valid_enquiry(
                data.enquiry_id
            )
        )

        # ----------------------------------------------------
        # NUMBER + TOTALS
        # ----------------------------------------------------

        proforma_number = (
            self.generate_proforma_number()
        )

        totals = (
            self.calculate_totals(
                data.items
            )
        )

        # ----------------------------------------------------
        # CUSTOMER DETAILS COME FROM ENQUIRY
        # ----------------------------------------------------

        default_address = (
            enquiry.address
            or customer.address
            or None
        )

        proforma = Proforma(
            proforma_number=(
                proforma_number
            ),

            proforma_date=(
                data.proforma_date
            ),

            # Internal links.
            enquiry_id=(
                enquiry.id
            ),

            customer_id=(
                enquiry.customer_id
            ),

            # Customer snapshot comes from Enquiry.
            company_name=(
                enquiry.company_name
            ),

            contact_person=(
                enquiry.contact_person
            ),

            phone=(
                enquiry.phone
            ),

            email=(
                enquiry.email
            ),

            billing_address=(
                data.billing_address
                or default_address
            ),

            shipping_address=(
                data.shipping_address
                or default_address
            ),

            payment_terms=(
                data.payment_terms
            ),

            delivery_terms=(
                data.delivery_terms
            ),

            validity_days=(
                data.validity_days
            ),

            notes=(
                data.notes
            ),

            terms_and_conditions=(
                data.terms_and_conditions
            ),

            status=(
                data.status
            ),

            subtotal=(
                totals[
                    "subtotal"
                ]
            ),

            discount_amount=(
                totals[
                    "discount_amount"
                ]
            ),

            taxable_amount=(
                totals[
                    "taxable_amount"
                ]
            ),

            tax_amount=(
                totals[
                    "tax_amount"
                ]
            ),

            grand_total=(
                totals[
                    "grand_total"
                ]
            ),
        )

        # ----------------------------------------------------
        # ITEMS
        # ----------------------------------------------------

        for item_data in data.items:

            description = (
                item_data.description
                or ""
            ).strip()

            if not description:

                raise ValueError(
                    "Finished Product / Machine "
                    "name is required."
                )

            calculated = (
                self.calculate_item(
                    item_data
                )
            )

            item = ProformaItem(
                # New manufactured products are NOT purchased
                # Product Master items. product_id stays NULL.

                product_id=None,

                description=(
                    description
                ),

                quantity=(
                    item_data.quantity
                ),

                unit=(
                    item_data.unit
                    or "Nos"
                ),

                unit_price=(
                    item_data.unit_price
                ),

                discount_percent=(
                    item_data
                    .discount_percent
                ),

                tax_percent=(
                    item_data
                    .tax_percent
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

            proforma.items.append(
                item
            )

        created = (
            self.repository
            .create(
                proforma
            )
        )

        # ----------------------------------------------------
        # ENQUIRY MOVES INTO QUOTATION STAGE
        # ----------------------------------------------------

        enquiry_status = (
            enquiry.status
            or ""
        ).strip().lower()

        if enquiry_status in {
            "new",
            "contacted",
        }:

            enquiry.status = (
                "Quotation"
            )

            self.db.flush()

        return created

    # ========================================================
    # GET ONE
    # ========================================================

    def get_by_id(
        self,
        proforma_id: int,
    ) -> Optional[
        Proforma
    ]:

        return (
            self.repository
            .get_by_id(
                proforma_id
            )
        )

    # ========================================================
    # GET BY NUMBER
    # ========================================================

    def get_by_number(
        self,
        proforma_number: str,
    ) -> Optional[
        Proforma
    ]:

        return (
            self.repository
            .get_by_number(
                proforma_number
            )
        )

    # ========================================================
    # GET BY ENQUIRY
    # ========================================================

    def get_by_enquiry(
        self,
        enquiry_id: int,
    ) -> List[
        Proforma
    ]:

        return (
            self.repository
            .get_by_enquiry(
                enquiry_id
            )
        )

    # ========================================================
    # LIST
    # ========================================================

    def get_all(
        self,
        search: Optional[
            str
        ] = None,

        status: Optional[
            str
        ] = None,

        customer_id: Optional[
            int
        ] = None,

        enquiry_id: Optional[
            int
        ] = None,
    ) -> List[
        Proforma
    ]:

        return (
            self.repository
            .get_all(
                search=search,
                status=status,
                customer_id=customer_id,
                enquiry_id=enquiry_id,
            )
        )

    # ========================================================
    # UPDATE
    # ========================================================

    def update(
        self,
        proforma_id: int,
        data: ProformaUpdate,
    ) -> Optional[
        Proforma
    ]:

        proforma = (
            self.repository
            .get_by_id(
                proforma_id
            )
        )

        if not proforma:

            return None

        # ----------------------------------------------------
        # CUSTOMER / ENQUIRY IDENTITY IS LOCKED
        # ----------------------------------------------------

        update_data = (
            data.model_dump(
                exclude_unset=True,

                exclude={
                    "items",

                    "enquiry_id",
                    "customer_id",

                    "company_name",
                    "contact_person",
                    "phone",
                    "email",
                },
            )
        )

        for (
            field,
            value,
        ) in update_data.items():

            setattr(
                proforma,
                field,
                value,
            )

        # ----------------------------------------------------
        # REPLACE ITEMS
        # ----------------------------------------------------

        if (
            data.items
            is not None
        ):

            if not data.items:

                raise ValueError(
                    "At least one Proforma item "
                    "is required."
                )

            totals = (
                self.calculate_totals(
                    data.items
                )
            )

            proforma.subtotal = (
                totals[
                    "subtotal"
                ]
            )

            proforma.discount_amount = (
                totals[
                    "discount_amount"
                ]
            )

            proforma.taxable_amount = (
                totals[
                    "taxable_amount"
                ]
            )

            proforma.tax_amount = (
                totals[
                    "tax_amount"
                ]
            )

            proforma.grand_total = (
                totals[
                    "grand_total"
                ]
            )

            proforma.items.clear()

            for item_data in data.items:

                description = (
                    item_data.description
                    or ""
                ).strip()

                if not description:

                    raise ValueError(
                        "Finished Product / Machine "
                        "name is required."
                    )

                calculated = (
                    self.calculate_item(
                        item_data
                    )
                )

                item = ProformaItem(
                    product_id=None,

                    description=(
                        description
                    ),

                    quantity=(
                        item_data.quantity
                    ),

                    unit=(
                        item_data.unit
                        or "Nos"
                    ),

                    unit_price=(
                        item_data.unit_price
                    ),

                    discount_percent=(
                        item_data
                        .discount_percent
                    ),

                    tax_percent=(
                        item_data
                        .tax_percent
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

                proforma.items.append(
                    item
                )

        self.db.flush()

        self.db.refresh(
            proforma
        )

        return proforma

    # ========================================================
    # UPDATE STATUS
    # ========================================================

    def update_status(
        self,
        proforma_id: int,
        status: str,
    ) -> Optional[
        Proforma
    ]:

        proforma = (
            self.repository
            .get_by_id(
                proforma_id
            )
        )

        if not proforma:

            return None

        normalized_status = (
            status
            or ""
        ).strip()

        if not normalized_status:

            raise ValueError(
                "Proforma status is required."
            )

        proforma.status = (
            normalized_status
        )

        # ----------------------------------------------------
        # KEEP ENQUIRY WORKFLOW SYNCHRONIZED
        # ----------------------------------------------------

        if proforma.enquiry_id:

            enquiry = (
                EnquiryRepository
                .get_by_id(
                    self.db,
                    proforma.enquiry_id,
                )
            )

            if enquiry is not None:

                status_lower = (
                    normalized_status
                    .lower()
                )

                if status_lower in {
                    "confirmed",
                    "order confirmed",
                }:

                    enquiry.status = (
                        "Order Confirmed"
                    )

                elif status_lower in {
                    "draft",
                    "sent",
                    "rejected",
                    "cancelled",
                }:

                    current_enquiry_status = (
                        enquiry.status
                        or ""
                    ).strip().lower()

                    if (
                        current_enquiry_status
                        in {
                            "new",
                            "contacted",
                            "quotation",
                            "order confirmed",
                        }
                    ):

                        enquiry.status = (
                            "Quotation"
                        )

        self.db.flush()

        self.db.refresh(
            proforma
        )

        return proforma

    # ========================================================
    # DELETE
    # ========================================================

    def delete(
        self,
        proforma_id: int,
    ) -> bool:

        proforma = (
            self.repository
            .get_by_id(
                proforma_id
            )
        )

        if not proforma:

            return False

        self.repository.delete(
            proforma
        )

        return True