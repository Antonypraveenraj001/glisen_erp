import calendar
from datetime import (
    date,
    datetime,
    timedelta,
)
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.repositories.dashboard_repository import (
    DashboardRepository,
)
from app.services.financial_analyzer_service import (
    FinancialAnalyzerService,
)
from app.services.gst_report_service import (
    GSTReportService,
)
from app.services.purchase_bill_payment_service import (
    PurchaseBillPaymentService,
)


class DashboardService:

    # ============================================================
    # TIMEZONE
    # ============================================================

    IST = ZoneInfo(
        "Asia/Kolkata"
    )

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
            Decimal("0.01")
        )

    # ============================================================
    # NORMALIZE AS-OF TIME TO IST
    # ============================================================

    @staticmethod
    def normalize_as_of(
        as_of: datetime | None = None,
    ) -> datetime:

        if as_of is None:
            return datetime.now(
                DashboardService.IST
            )

        if as_of.tzinfo is None:
            return as_of.replace(
                tzinfo=(
                    DashboardService.IST
                )
            )

        return as_of.astimezone(
            DashboardService.IST
        )

    # ============================================================
    # CURRENT INDIAN FINANCIAL YEAR
    # ============================================================

    @staticmethod
    def get_financial_year(
        current_date: date,
    ) -> dict:

        if current_date.month >= 4:
            start_year = (
                current_date.year
            )
        else:
            start_year = (
                current_date.year - 1
            )

        end_year = (
            start_year + 1
        )

        start_date = date(
            start_year,
            4,
            1,
        )

        end_date = date(
            end_year,
            3,
            31,
        )

        label = (
            f"FY {start_year}-"
            f"{str(end_year)[-2:]}"
        )

        return {
            "label": label,
            "start_year": start_year,
            "end_year": end_year,
            "start_date": start_date,
            "end_date": end_date,
        }

    # ============================================================
    # INDIAN FINANCIAL QUARTER
    # ============================================================

    @staticmethod
    def get_quarter(
        current_date: date,
    ) -> dict:

        month = (
            current_date.month
        )

        year = (
            current_date.year
        )

        # --------------------------------------------------------
        # Q1: APR - JUN
        # --------------------------------------------------------

        if 4 <= month <= 6:

            quarter_number = 1
            financial_year_start = year

            start_date = date(
                year,
                4,
                1,
            )

            end_date = date(
                year,
                6,
                30,
            )

        # --------------------------------------------------------
        # Q2: JUL - SEP
        # --------------------------------------------------------

        elif 7 <= month <= 9:

            quarter_number = 2
            financial_year_start = year

            start_date = date(
                year,
                7,
                1,
            )

            end_date = date(
                year,
                9,
                30,
            )

        # --------------------------------------------------------
        # Q3: OCT - DEC
        # --------------------------------------------------------

        elif 10 <= month <= 12:

            quarter_number = 3
            financial_year_start = year

            start_date = date(
                year,
                10,
                1,
            )

            end_date = date(
                year,
                12,
                31,
            )

        # --------------------------------------------------------
        # Q4: JAN - MAR
        # --------------------------------------------------------

        else:

            quarter_number = 4

            financial_year_start = (
                year - 1
            )

            start_date = date(
                year,
                1,
                1,
            )

            end_date = date(
                year,
                3,
                31,
            )

        financial_year_end = (
            financial_year_start
            + 1
        )

        label = (
            f"Q{quarter_number} "
            f"FY "
            f"{financial_year_start}-"
            f"{str(financial_year_end)[-2:]}"
        )

        return {
            "quarter_number": (
                quarter_number
            ),
            "label": (
                label
            ),
            "start_date": (
                start_date
            ),
            "end_date": (
                end_date
            ),
        }

    # ============================================================
    # PREVIOUS QUARTER
    # ============================================================

    @staticmethod
    def get_previous_quarter(
        current_quarter: dict,
    ) -> dict:

        previous_date = (
            current_quarter[
                "start_date"
            ]
            - timedelta(
                days=1
            )
        )

        return (
            DashboardService
            .get_quarter(
                previous_date
            )
        )

    # ============================================================
    # QUARTER PERFORMANCE
    # ============================================================

    @staticmethod
    def get_quarter_performance(
        db: Session,
        quarter: dict,
        current_date: date,
    ) -> dict:

        start_date = (
            quarter[
                "start_date"
            ]
        )

        nominal_end_date = (
            quarter[
                "end_date"
            ]
        )

        end_date = min(
            nominal_end_date,
            current_date,
        )

        analysis = (
            FinancialAnalyzerService
            .get_analysis(
                db=db,
                start_date=(
                    start_date
                ),
                end_date=(
                    end_date
                ),
            )
        )

        return {
            "label": (
                quarter[
                    "label"
                ]
            ),
            "start_date": (
                start_date
            ),
            "end_date": (
                end_date
            ),
            "net_sales": (
                DashboardService.money(
                    analysis[
                        "net_sales"
                    ]
                )
            ),
            "production_cost": (
                DashboardService.money(
                    analysis[
                        "total_production_cost"
                    ]
                )
            ),
            "company_expenses": (
                DashboardService.money(
                    analysis[
                        "total_expenses"
                    ]
                )
            ),
            "net_profit": (
                DashboardService.money(
                    analysis[
                        "net_profit"
                    ]
                )
            ),
        }

    # ============================================================
    # FY MONTHLY SALES
    # ============================================================

    @staticmethod
    def get_monthly_sales(
        db: Session,
        financial_year: dict,
        current_date: date,
    ) -> list[dict]:

        monthly_sales = []

        financial_year_start = (
            financial_year[
                "start_year"
            ]
        )

        months = [
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            1,
            2,
            3,
        ]

        for month in months:

            if month >= 4:
                year = (
                    financial_year_start
                )
            else:
                year = (
                    financial_year_start
                    + 1
                )

            month_start = date(
                year,
                month,
                1,
            )

            last_day = (
                calendar.monthrange(
                    year,
                    month,
                )[1]
            )

            month_end = date(
                year,
                month,
                last_day,
            )

            is_future = (
                month_start
                > current_date
            )

            # ----------------------------------------------------
            # FUTURE MONTH
            # ----------------------------------------------------

            if is_future:

                net_sales = Decimal(
                    "0.00"
                )

            # ----------------------------------------------------
            # CURRENT / PAST MONTH
            # ----------------------------------------------------

            else:

                report_end_date = min(
                    month_end,
                    current_date,
                )

                gst_report = (
                    GSTReportService
                    .get_report(
                        db=db,
                        start_date=(
                            month_start
                        ),
                        end_date=(
                            report_end_date
                        ),
                    )
                )

                net_sales = (
                    DashboardService
                    .money(
                        gst_report[
                            "net_taxable_amount"
                        ]
                    )
                )

            monthly_sales.append(
                {
                    "month_key": (
                        f"{year}-"
                        f"{month:02d}"
                    ),
                    "month_label": (
                        calendar.month_abbr[
                            month
                        ]
                    ),
                    "start_date": (
                        month_start
                    ),
                    "end_date": (
                        month_end
                    ),
                    "net_sales": (
                        net_sales
                    ),
                    "is_future": (
                        is_future
                    ),
                }
            )

        return monthly_sales

    # ============================================================
    # DASHBOARD SUMMARY
    # ============================================================

    @staticmethod
    def get_dashboard_summary(
        db: Session,
        *,
        as_of: datetime | None = None,
        can_view_financials: bool = False,
        can_view_purchase_payments: bool = False,
    ) -> dict:

        # --------------------------------------------------------
        # IST TIME
        # --------------------------------------------------------

        as_of_ist = (
            DashboardService
            .normalize_as_of(
                as_of
            )
        )

        current_date = (
            as_of_ist.date()
        )

        # --------------------------------------------------------
        # FINANCIAL YEAR
        # --------------------------------------------------------

        financial_year = (
            DashboardService
            .get_financial_year(
                current_date
            )
        )

        # --------------------------------------------------------
        # BOSS-ONLY OPEN ENQUIRIES
        #
        # Open enquiry information is considered
        # management-sensitive and is not loaded at all
        # for non-Boss users.
        # --------------------------------------------------------

        open_enquiries = None

        if can_view_financials:

            open_enquiries = (
                DashboardRepository
                .get_open_enquiry_count(
                    db=db,
                )
            )

        # --------------------------------------------------------
        # LIVE PRODUCTION
        #
        # Operational information available to authenticated
        # Dashboard users.
        # --------------------------------------------------------

        live_production = (
            DashboardRepository
            .get_live_production(
                db=db,
            )
        )

        # --------------------------------------------------------
        # BOSS-ONLY FINANCIAL DATA
        # --------------------------------------------------------

        current_fy_net_profit = None
        current_quarter_data = None
        previous_quarter_data = None
        monthly_sales = []

        if can_view_financials:

            # ----------------------------------------------------
            # CURRENT FY PROFIT / LOSS
            # ----------------------------------------------------

            fy_analysis_end = min(
                financial_year[
                    "end_date"
                ],
                current_date,
            )

            fy_analysis = (
                FinancialAnalyzerService
                .get_analysis(
                    db=db,
                    start_date=(
                        financial_year[
                            "start_date"
                        ]
                    ),
                    end_date=(
                        fy_analysis_end
                    ),
                )
            )

            current_fy_net_profit = (
                DashboardService
                .money(
                    fy_analysis[
                        "net_profit"
                    ]
                )
            )

            # ----------------------------------------------------
            # CURRENT QUARTER
            # ----------------------------------------------------

            current_quarter = (
                DashboardService
                .get_quarter(
                    current_date
                )
            )

            current_quarter_data = (
                DashboardService
                .get_quarter_performance(
                    db=db,
                    quarter=(
                        current_quarter
                    ),
                    current_date=(
                        current_date
                    ),
                )
            )

            # ----------------------------------------------------
            # PREVIOUS QUARTER
            # ----------------------------------------------------

            previous_quarter = (
                DashboardService
                .get_previous_quarter(
                    current_quarter
                )
            )

            previous_quarter_data = (
                DashboardService
                .get_quarter_performance(
                    db=db,
                    quarter=(
                        previous_quarter
                    ),
                    current_date=(
                        current_date
                    ),
                )
            )

            # ----------------------------------------------------
            # FY MONTHLY SALES
            # ----------------------------------------------------

            monthly_sales = (
                DashboardService
                .get_monthly_sales(
                    db=db,
                    financial_year=(
                        financial_year
                    ),
                    current_date=(
                        current_date
                    ),
                )
            )

        # --------------------------------------------------------
        # PURCHASE BILL PAYMENT WATCH
        #
        # Boss / Accounts / Purchase only.
        # --------------------------------------------------------

        unpaid_purchase_bills = []

        if can_view_purchase_payments:

            unpaid_purchase_bills = (
                PurchaseBillPaymentService
                .get_unpaid_aging(
                    db=db,
                    as_of=(
                        as_of_ist
                    ),
                )
            )

        # --------------------------------------------------------
        # RESPONSE
        # --------------------------------------------------------

        return {
            "as_of": (
                as_of_ist
            ),

            "financial_year_label": (
                financial_year[
                    "label"
                ]
            ),

            "financial_year_start": (
                financial_year[
                    "start_date"
                ]
            ),

            "financial_year_end": (
                financial_year[
                    "end_date"
                ]
            ),

            # Boss only.
            "open_enquiries": (
                open_enquiries
            ),

            # Boss only.
            "current_fy_net_profit": (
                current_fy_net_profit
            ),

            # Operational.
            "live_production": (
                live_production
            ),

            # Boss only.
            "current_quarter": (
                current_quarter_data
            ),

            # Boss only.
            "previous_quarter": (
                previous_quarter_data
            ),

            # Boss only.
            "monthly_sales": (
                monthly_sales
            ),

            # Boss / Accounts / Purchase.
            "unpaid_purchase_bills": (
                unpaid_purchase_bills
            ),
        }