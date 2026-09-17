import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  BarChart3,
  CalendarDays,
  Clock3,
  Factory,
  IndianRupee,
  Loader2,
  PackageOpen,
  ReceiptText,
} from "lucide-react";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  getDashboardSummary,
} from "../../services/dashboardService";

import type {
  DashboardQuarterPerformance,
  DashboardSummary,
} from "../../types/dashboard";

import "./DashboardPage.css";


/* ================================================================
   FORMATTERS
================================================================ */

function formatCurrency(
  value:
    | string
    | number
    | null
    | undefined
) {
  const numericValue =
    Number(
      value ?? 0
    );

  if (
    Number.isNaN(
      numericValue
    )
  ) {
    return "₹0.00";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(
    numericValue
  );
}


function formatDate(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    date
  );
}


function formatIndiaTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  const datePart =
    new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone:
          "Asia/Kolkata",
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ).format(
      date
    );

  const timePart =
    new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone:
          "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    ).format(
      date
    );

  return (
    `${datePart} | ` +
    `${timePart} IST`
  );
}


/* ================================================================
   QUARTER METRIC
================================================================ */

interface QuarterMetricRowProps {
  label: string;

  current:
    string
    | number;

  previous:
    string
    | number;
}


function QuarterMetricRow({
  label,
  current,
  previous,
}: QuarterMetricRowProps) {
  return (
    <div className="dashboard-quarter-row">

      <div className="dashboard-quarter-metric">
        {label}
      </div>

      <div className="dashboard-quarter-value">
        {formatCurrency(
          current
        )}
      </div>

      <div className="dashboard-quarter-value">
        {formatCurrency(
          previous
        )}
      </div>

    </div>
  );
}


/* ================================================================
   QUARTER SECTION
================================================================ */

interface QuarterComparisonProps {
  current:
    DashboardQuarterPerformance;

  previous:
    DashboardQuarterPerformance;
}


function QuarterComparison({
  current,
  previous,
}: QuarterComparisonProps) {
  return (
    <div className="dashboard-section-card dashboard-quarter-card">

      <div className="dashboard-section-header">

        <div>
          <div className="dashboard-section-title">
            Quarter-to-Quarter Performance
          </div>

          <div className="dashboard-section-subtitle">
            Current financial quarter compared
            with the previous quarter
          </div>
        </div>

        <div className="dashboard-section-icon lavender">
          <BarChart3
            size={18}
          />
        </div>

      </div>


      <div className="dashboard-quarter-table">

        <div className="dashboard-quarter-row dashboard-quarter-head">

          <div>
            Metric
          </div>

          <div>
            <strong>
              {current.label}
            </strong>

            <span>
              {formatDate(
                current.start_date
              )}
              {" – "}
              {formatDate(
                current.end_date
              )}
            </span>
          </div>

          <div>
            <strong>
              {previous.label}
            </strong>

            <span>
              {formatDate(
                previous.start_date
              )}
              {" – "}
              {formatDate(
                previous.end_date
              )}
            </span>
          </div>

        </div>


        <QuarterMetricRow
          label="Net Sales"
          current={
            current.net_sales
          }
          previous={
            previous.net_sales
          }
        />

        <QuarterMetricRow
          label="Production Cost"
          current={
            current.production_cost
          }
          previous={
            previous.production_cost
          }
        />

        <QuarterMetricRow
          label="Company Expenses"
          current={
            current.company_expenses
          }
          previous={
            previous.company_expenses
          }
        />

        <QuarterMetricRow
          label="Net Profit / Loss"
          current={
            current.net_profit
          }
          previous={
            previous.net_profit
          }
        />

      </div>

    </div>
  );
}


/* ================================================================
   DASHBOARD PAGE
================================================================ */

export default function DashboardPage() {

  const {
    user,
  } = useAuth();


  const [
    dashboard,
    setDashboard,
  ] =
    useState<
      DashboardSummary | null
    >(null);


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );


  /* ==============================================================
     ROLE VISIBILITY
  ============================================================== */

  const isBoss =
    user?.role ===
    "Boss";


  const canViewPurchasePayments =
    user?.role === "Boss"
    || user?.role === "Accounts"
    || user?.role === "Purchase";


  /* ==============================================================
     LOAD DASHBOARD
  ============================================================== */

  useEffect(
    () => {

      let isMounted =
        true;


      async function loadDashboard() {

        try {

          setLoading(
            true
          );

          setError(
            null
          );


          const data =
            await getDashboardSummary();


          if (
            isMounted
          ) {
            setDashboard(
              data
            );
          }

        } catch (err) {

          console.error(
            "Dashboard load failed:",
            err
          );


          if (
            isMounted
          ) {
            setError(
              "Unable to load dashboard data."
            );
          }

        } finally {

          if (
            isMounted
          ) {
            setLoading(
              false
            );
          }

        }

      }


      void loadDashboard();


      return () => {
        isMounted =
          false;
      };

    },
    []
  );


  /* ==============================================================
     MONTHLY SALES SCALE
  ============================================================== */

  const monthlySalesMax =
    useMemo(
      () => {

        if (
          !dashboard
        ) {
          return 1;
        }


        const values =
          dashboard
            .monthly_sales
            .filter(
              (item) =>
                !item.is_future
            )
            .map(
              (item) =>
                Math.abs(
                  Number(
                    item.net_sales
                  )
                )
            );


        return Math.max(
          ...values,
          1
        );

      },
      [
        dashboard,
      ]
    );


  /* ==============================================================
     LOADING
  ============================================================== */

  if (
    loading
  ) {
    return (
      <div className="dashboard-loading">

        <Loader2
          size={22}
          className="dashboard-spin"
        />

        Loading dashboard...

      </div>
    );
  }


  /* ==============================================================
     EMPTY / ERROR STATE
  ============================================================== */

  if (
    !dashboard
  ) {
    return (
      <div className="dashboard-page">

        <div className="dashboard-error">
          {
            error
            ?? "Dashboard data is unavailable."
          }
        </div>

      </div>
    );
  }


  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <div className="dashboard-page">

      {/* ==========================================================
          HEADER
      ========================================================== */}

      <div className="dashboard-header">

        <div>

          <h1 className="dashboard-title">
            Dashboard
          </h1>

          <p className="dashboard-subtitle">
            Operational and management
            overview for {
              dashboard
                .financial_year_label
            }.
          </p>

        </div>


        <div className="dashboard-time-chip">

          <CalendarDays
            size={15}
          />

          <span>
            {formatIndiaTime(
              dashboard.as_of
            )}
          </span>

        </div>

      </div>


      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}


      {/* ==========================================================
          BOSS-ONLY KPI CARDS

          These are not merely blank for other users.
          They are not rendered at all.
      ========================================================== */}

      {
        isBoss
        && (
          dashboard.open_enquiries
          !== null
        )
        && (
          dashboard.current_fy_net_profit
          !== null
        )
        && (
          <div className="dashboard-management-kpis">

            {/* OPEN ENQUIRIES */}

            <div className="dashboard-management-card">

              <div>

                <div className="dashboard-kpi-label">
                  Open Enquiries
                </div>

                <div className="dashboard-management-value">
                  {
                    dashboard
                      .open_enquiries
                  }
                </div>

                <div className="dashboard-kpi-note">
                  Active enquiry pipeline
                </div>

              </div>


              <div className="dashboard-kpi-icon blue">
                <Activity
                  size={21}
                />
              </div>

            </div>


            {/* FY PROFIT / LOSS */}

            <div className="dashboard-management-card">

              <div>

                <div className="dashboard-kpi-label">
                  Current FY Profit / Loss
                </div>

                <div
                  className={
                    Number(
                      dashboard
                        .current_fy_net_profit
                    ) >= 0
                      ? "dashboard-management-value profit"
                      : "dashboard-management-value loss"
                  }
                >
                  {formatCurrency(
                    dashboard
                      .current_fy_net_profit
                  )}
                </div>

                <div className="dashboard-kpi-note">
                  {
                    dashboard
                      .financial_year_label
                  }
                </div>

              </div>


              <div className="dashboard-kpi-icon green">
                <IndianRupee
                  size={21}
                />
              </div>

            </div>

          </div>
        )
      }


      {/* ==========================================================
          LIVE PRODUCTION
      ========================================================== */}

      <div className="dashboard-section-card">

        <div className="dashboard-section-header">

          <div>

            <div className="dashboard-section-title">
              Live Production Status
            </div>

            <div className="dashboard-section-subtitle">
              Active production orders
              and current operations
            </div>

          </div>


          <div className="dashboard-section-icon blue">
            <Factory
              size={18}
            />
          </div>

        </div>


        {
          dashboard
            .live_production
            .length > 0
            ? (
              <div className="dashboard-table-wrap">

                <table className="dashboard-live-table">

                  <thead>

                    <tr>
                      <th>
                        Production
                      </th>

                      <th>
                        Customer
                      </th>

                      <th>
                        Product
                      </th>

                      <th>
                        Qty
                      </th>

                      <th>
                        Current Operation
                      </th>

                      <th>
                        Machine
                      </th>

                      <th>
                        Status
                      </th>
                    </tr>

                  </thead>


                  <tbody>

                    {
                      dashboard
                        .live_production
                        .map(
                          (
                            item
                          ) => (

                            <tr
                              key={
                                item
                                  .production_order_id
                              }
                            >

                              <td>

                                <div className="dashboard-table-primary">
                                  {
                                    item
                                      .production_number
                                  }
                                </div>

                                <div className="dashboard-table-secondary">
                                  {
                                    item
                                      .proforma_number
                                  }
                                </div>

                              </td>


                              <td>
                                {
                                  item
                                    .company_name
                                }
                              </td>


                              <td>

                                <div className="dashboard-table-primary">
                                  {
                                    item
                                      .product_name
                                  }
                                </div>

                                <div className="dashboard-table-secondary">
                                  {
                                    item
                                      .product_code
                                  }
                                </div>

                              </td>


                              <td>
                                {
                                  item
                                    .quantity
                                }
                              </td>


                              <td>
                                {
                                  item
                                    .current_operation
                                  ?? "—"
                                }
                              </td>


                              <td>
                                {
                                  item
                                    .machine_name
                                  ?? "—"
                                }
                              </td>


                              <td>

                                <span className="dashboard-production-status">
                                  {
                                    item
                                      .operation_status
                                    ?? item
                                      .status
                                  }
                                </span>

                              </td>

                            </tr>

                          )
                        )
                    }

                  </tbody>

                </table>

              </div>
            )
            : (
              <div className="dashboard-empty-state">

                <Factory
                  size={24}
                />

                <div>

                  <strong>
                    No live production
                  </strong>

                  <span>
                    There are currently no
                    active production orders.
                  </span>

                </div>

              </div>
            )
        }

      </div>


      {/* ==========================================================
          BOSS-ONLY QUARTER COMPARISON
      ========================================================== */}

      {
        isBoss
        && dashboard.current_quarter
        && dashboard.previous_quarter
        && (
          <QuarterComparison
            current={
              dashboard
                .current_quarter
            }
            previous={
              dashboard
                .previous_quarter
            }
          />
        )
      }


      {/* ==========================================================
          BOSS-ONLY FY MONTHLY SALES
      ========================================================== */}

      {
        isBoss
        && (
          dashboard
            .monthly_sales
            .length > 0
        )
        && (
          <div className="dashboard-section-card">

            <div className="dashboard-section-header">

              <div>

                <div className="dashboard-section-title">
                  Financial Year Monthly Sales
                </div>

                <div className="dashboard-section-subtitle">
                  Net taxable sales,
                  excluding GST · April to March
                </div>

              </div>


              <div className="dashboard-section-icon lavender">
                <BarChart3
                  size={18}
                />
              </div>

            </div>


            <div className="dashboard-sales-chart">

              <div className="dashboard-sales-bars">

                {
                  dashboard
                    .monthly_sales
                    .map(
                      (
                        item
                      ) => {

                        const numericValue =
                          Number(
                            item
                              .net_sales
                          );


                        const absoluteValue =
                          Math.abs(
                            numericValue
                          );


                        const barHeight =
                          item.is_future
                            ? 8
                            : Math.max(
                                8,
                                Math.round(
                                  (
                                    absoluteValue
                                    / monthlySalesMax
                                  )
                                  * 124
                                )
                              );


                        return (
                          <div
                            key={
                              item
                                .month_key
                            }
                            className="dashboard-sales-month"
                          >

                            <div className="dashboard-sales-value">
                              {
                                item.is_future
                                  ? "—"
                                  : formatCurrency(
                                      item
                                        .net_sales
                                    )
                              }
                            </div>


                            <div className="dashboard-sales-track">

                              <div
                                className={
                                  [
                                    "dashboard-sales-bar",

                                    item.is_future
                                      ? "future"
                                      : "",

                                    numericValue < 0
                                      ? "negative"
                                      : "",
                                  ]
                                    .filter(
                                      Boolean
                                    )
                                    .join(
                                      " "
                                    )
                                }
                                style={{
                                  height:
                                    `${barHeight}px`,
                                }}
                              />

                            </div>


                            <div className="dashboard-sales-label">
                              {
                                item
                                  .month_label
                              }
                            </div>

                          </div>
                        );

                      }
                    )
                }

              </div>


              <div className="dashboard-chart-note">

                <Clock3
                  size={13}
                />

                Future financial-year
                months remain blank until
                actual sales are recorded.

              </div>

            </div>

          </div>
        )
      }


      {/* ==========================================================
          UNPAID PURCHASE BILLS

          Boss / Accounts / Purchase only.
      ========================================================== */}

      {
        canViewPurchasePayments
        && (
          <div className="dashboard-section-card">

            <div className="dashboard-section-header">

              <div>

                <div className="dashboard-section-title">
                  Unpaid Purchase Bills
                </div>

                <div className="dashboard-section-subtitle">
                  Supplier bills with tracked
                  outstanding balances · oldest
                  unpaid first
                </div>

              </div>


              <div className="dashboard-section-icon rose">
                <ReceiptText
                  size={18}
                />
              </div>

            </div>


            {
              dashboard
                .unpaid_purchase_bills
                .length > 0
                ? (
                  <div className="dashboard-table-wrap">

                    <table className="dashboard-live-table dashboard-purchase-table">

                      <thead>

                        <tr>
                          <th>
                            Supplier
                          </th>

                          <th>
                            Bill
                          </th>

                          <th>
                            Bill Date
                          </th>

                          <th>
                            Due Date
                          </th>

                          <th>
                            Balance
                          </th>

                          <th>
                            Days Unpaid
                          </th>

                          <th>
                            Status
                          </th>
                        </tr>

                      </thead>


                      <tbody>

                        {
                          dashboard
                            .unpaid_purchase_bills
                            .map(
                              (
                                bill
                              ) => (

                                <tr
                                  key={
                                    bill
                                      .purchase_bill_id
                                  }
                                >

                                  <td>

                                    <div className="dashboard-table-primary">
                                      {
                                        bill
                                          .supplier_name
                                      }
                                    </div>

                                  </td>


                                  <td>
                                    {
                                      bill
                                        .bill_number
                                    }
                                  </td>


                                  <td>
                                    {formatDate(
                                      bill
                                        .bill_date
                                    )}
                                  </td>


                                  <td>
                                    {formatDate(
                                      bill
                                        .due_date
                                    )}
                                  </td>


                                  <td>

                                    <strong>
                                      {formatCurrency(
                                        bill
                                          .balance_amount
                                      )}
                                    </strong>

                                  </td>


                                  <td>

                                    <span
                                      className={
                                        bill
                                          .is_overdue
                                          ? "dashboard-aging overdue"
                                          : "dashboard-aging"
                                      }
                                    >
                                      {
                                        bill
                                          .days_unpaid
                                      } days
                                    </span>

                                  </td>


                                  <td>

                                    <span
                                      className={
                                        bill
                                          .is_overdue
                                          ? "dashboard-payment-status overdue"
                                          : "dashboard-payment-status"
                                      }
                                    >
                                      {
                                        bill
                                          .is_overdue
                                          ? `${bill.overdue_days} days overdue`
                                          : bill.payment_status
                                      }
                                    </span>

                                  </td>

                                </tr>

                              )
                            )
                        }

                      </tbody>

                    </table>

                  </div>
                )
                : (
                  <div className="dashboard-empty-state">

                    <PackageOpen
                      size={24}
                    />

                    <div>

                      <strong>
                        No tracked unpaid bills
                      </strong>

                      <span>
                        No purchase bills with
                        tracked outstanding
                        balances are currently
                        available.
                      </span>

                    </div>

                  </div>
                )
            }

          </div>
        )
      }


      {/* ==========================================================
          NON-BOSS OPERATIONAL NOTE

          No enquiry count, sales, profit/loss or
          Financial Analyzer-derived information is rendered.
      ========================================================== */}

      {
        !isBoss
        && (
          <div className="dashboard-operational-note">

            <Activity
              size={16}
            />

            <div>

              <strong>
                Operational Dashboard
              </strong>

              <span>
                Production information is
                shown according to your
                application access.
              </span>

            </div>

          </div>
        )
      }

    </div>
  );
}