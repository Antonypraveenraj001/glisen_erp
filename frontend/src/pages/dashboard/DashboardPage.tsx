import {
  useEffect,
  useMemo,
  useState,
} from "react";

import axios from "axios";

import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Factory,
  IndianRupee,
  Loader2,
  PackageOpen,
  ReceiptText,
  WalletCards,
  X,
} from "lucide-react";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  getDashboardSummary,
} from "../../services/dashboardService";

import {
  getPurchaseBillPaymentSummary,
  recordPurchaseBillPayment,
} from "../../services/purchaseBillService";

import type {
  DashboardQuarterPerformance,
  DashboardSummary,
  DashboardUnpaidPurchaseBill,
} from "../../types/dashboard";

import type {
  PurchaseBillPaymentCreate,
  PurchaseBillPaymentSummary,
} from "../../types/purchaseBill";

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
      style:
        "currency",

      currency:
        "INR",

      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
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
    new Date(
      value
    );


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
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  ).format(
    date
  );

}


function formatIndiaTime(
  value:
    string
) {

  const date =
    new Date(
      value
    );


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

        weekday:
          "short",

        day:
          "2-digit",

        month:
          "short",

        year:
          "numeric",
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

        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          true,
      }
    ).format(
      date
    );


  return (
    `${datePart} | `
    +
    `${timePart} IST`
  );

}


function getCurrentDateTimeInputValue() {

  const now =
    new Date();


  const offset =
    now.getTimezoneOffset();


  const local =
    new Date(
      now.getTime()
      -
      offset
      *
      60
      *
      1000
    );


  return local
    .toISOString()
    .slice(
      0,
      16
    );

}


function getErrorMessage(
  error:
    unknown,

  fallback:
    string
) {

  if (
    axios.isAxiosError(
      error
    )
  ) {

    const detail =
      error.response
        ?.data
        ?.detail;


    if (
      typeof detail
      ===
      "string"
    ) {
      return detail;
    }

  }


  if (
    error
    instanceof Error
  ) {
    return error.message;
  }


  return fallback;

}


/* ================================================================
   QUARTER METRIC
================================================================ */

interface QuarterMetricRowProps {

  label:
    string;

  current:
    string
    |
    number;

  previous:
    string
    |
    number;

}


function QuarterMetricRow(
  {
    label,
    current,
    previous,
  }:
  QuarterMetricRowProps
) {

  return (
    <div className="dashboard-quarter-row">

      <div className="dashboard-quarter-metric">
        {label}
      </div>


      <div className="dashboard-quarter-value">

        {
          formatCurrency(
            current
          )
        }

      </div>


      <div className="dashboard-quarter-value">

        {
          formatCurrency(
            previous
          )
        }

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


function QuarterComparison(
  {
    current,
    previous,
  }:
  QuarterComparisonProps
) {

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

              {
                formatDate(
                  current.start_date
                )
              }

              {" – "}

              {
                formatDate(
                  current.end_date
                )
              }

            </span>

          </div>


          <div>

            <strong>
              {previous.label}
            </strong>


            <span>

              {
                formatDate(
                  previous.start_date
                )
              }

              {" – "}

              {
                formatDate(
                  previous.end_date
                )
              }

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
  } =
    useAuth();


  /* ==============================================================
     CORE DASHBOARD
  ============================================================== */

  const [
    dashboard,
    setDashboard,
  ] =
    useState<
      DashboardSummary
      |
      null
    >(
      null
    );


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
      string
      |
      null
    >(
      null
    );


  /* ==============================================================
     PURCHASE BILL PAYMENT MODAL
  ============================================================== */

  const [
    paymentOpen,
    setPaymentOpen,
  ] =
    useState(
      false
    );


  const [
    paymentBill,
    setPaymentBill,
  ] =
    useState<
      DashboardUnpaidPurchaseBill
      |
      null
    >(
      null
    );


  const [
    paymentSummary,
    setPaymentSummary,
  ] =
    useState<
      PurchaseBillPaymentSummary
      |
      null
    >(
      null
    );


  const [
    paymentLoading,
    setPaymentLoading,
  ] =
    useState(
      false
    );


  const [
    paymentAmount,
    setPaymentAmount,
  ] =
    useState(
      ""
    );


  const [
    paymentDate,
    setPaymentDate,
  ] =
    useState(
      getCurrentDateTimeInputValue()
    );


  const [
    paymentMode,
    setPaymentMode,
  ] =
    useState(
      "Bank Transfer"
    );


  const [
    paymentReference,
    setPaymentReference,
  ] =
    useState(
      ""
    );


  const [
    paymentNotes,
    setPaymentNotes,
  ] =
    useState(
      ""
    );


  const [
    paymentSubmitting,
    setPaymentSubmitting,
  ] =
    useState(
      false
    );


  const [
    paymentError,
    setPaymentError,
  ] =
    useState<
      string
      |
      null
    >(
      null
    );


  const [
    paymentSuccess,
    setPaymentSuccess,
  ] =
    useState<
      string
      |
      null
    >(
      null
    );


  /* ==============================================================
     ROLE VISIBILITY
  ============================================================== */

  const isBoss =
    user?.role
    ===
    "Boss";


  /*
   * Existing Dashboard visibility:
   *
   * Boss
   * Accounts
   * Purchase
   *
   * may view supplier outstanding bills.
   */
  const canViewPurchasePayments =
    user?.role === "Boss"
    ||
    user?.role === "Accounts"
    ||
    user?.role === "Purchase";


  /*
   * IMPORTANT:
   *
   * This intentionally matches the existing
   * PurchaseBillDetails payment rule.
   *
   * Purchase users can see outstanding bills,
   * but supplier payments are financial actions
   * for Boss / Accounts.
   */
  const canRecordPurchasePayment =
    user?.role === "Boss"
    ||
    user?.role === "Accounts";


  /* ==============================================================
     LOAD DASHBOARD
  ============================================================== */

  async function refreshDashboard() {

    const data =
      await getDashboardSummary();


    setDashboard(
      data
    );

  }


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

        } catch (
          err
        ) {

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
     PURCHASE BILL PAYMENT
  ============================================================== */

  async function openPurchasePayment(
    bill:
      DashboardUnpaidPurchaseBill
  ) {

    setPaymentBill(
      bill
    );


    setPaymentSummary(
      null
    );


    setPaymentAmount(
      ""
    );


    setPaymentDate(
      getCurrentDateTimeInputValue()
    );


    setPaymentMode(
      "Bank Transfer"
    );


    setPaymentReference(
      ""
    );


    setPaymentNotes(
      ""
    );


    setPaymentError(
      null
    );


    setPaymentSuccess(
      null
    );


    setPaymentOpen(
      true
    );


    try {

      setPaymentLoading(
        true
      );


      const summary =
        await getPurchaseBillPaymentSummary(
          bill.purchase_bill_id
        );


      setPaymentSummary(
        summary
      );

    } catch (
      err
    ) {

      console.error(
        "Unable to load Purchase Bill payment summary:",
        err
      );


      setPaymentError(
        getErrorMessage(
          err,
          "Unable to load Purchase Bill payment details."
        )
      );

    } finally {

      setPaymentLoading(
        false
      );

    }

  }


  function closePurchasePayment() {

    if (
      paymentSubmitting
    ) {
      return;
    }


    setPaymentOpen(
      false
    );


    setPaymentBill(
      null
    );


    setPaymentSummary(
      null
    );


    setPaymentError(
      null
    );

  }


  async function handlePurchasePayment() {

    if (
      !paymentBill
      ||
      !paymentSummary
    ) {
      return;
    }


    setPaymentError(
      null
    );


    const amount =
      Number(
        paymentAmount
      );


    const outstandingBalance =
      Number(
        paymentSummary.balance_amount
      );


    if (
      Number.isNaN(
        amount
      )
      ||
      amount <= 0
    ) {

      setPaymentError(
        "Enter a valid payment amount greater than zero."
      );

      return;

    }


    if (
      amount
      >
      outstandingBalance
    ) {

      setPaymentError(
        `Payment cannot exceed the outstanding balance of ${formatCurrency(
          outstandingBalance
        )}.`
      );

      return;

    }


    if (
      !paymentDate
    ) {

      setPaymentError(
        "Payment date is required."
      );

      return;

    }


    const billDate =
      new Date(
        paymentBill.bill_date
      );


    const selectedPaymentDate =
      new Date(
        paymentDate
      );


    if (
      !Number.isNaN(
        billDate.getTime()
      )
      &&
      !Number.isNaN(
        selectedPaymentDate.getTime()
      )
      &&
      selectedPaymentDate
      <
      billDate
    ) {

      setPaymentError(
        "Payment date cannot be earlier than the Purchase Bill date."
      );

      return;

    }


    const payload:
      PurchaseBillPaymentCreate =
      {

        payment_date:
          paymentDate,

        amount,

        payment_mode:
          paymentMode
          ||
          null,

        reference_number:
          paymentReference
            .trim()
          ||
          null,

        notes:
          paymentNotes
            .trim()
          ||
          null,

      };


    try {

      setPaymentSubmitting(
        true
      );


      await recordPurchaseBillPayment(
        paymentBill.purchase_bill_id,
        payload
      );


      /*
       * Refresh dashboard after payment.
       *
       * Partial:
       * balance reduces.
       *
       * Full:
       * bill disappears from unpaid list.
       */
      await refreshDashboard();


      setPaymentSuccess(
        `Payment recorded successfully for ${paymentBill.bill_number}.`
      );


      setPaymentOpen(
        false
      );


      setPaymentBill(
        null
      );


      setPaymentSummary(
        null
      );


      setPaymentAmount(
        ""
      );


      setPaymentReference(
        ""
      );


      setPaymentNotes(
        ""
      );


      setPaymentDate(
        getCurrentDateTimeInputValue()
      );

    } catch (
      err
    ) {

      console.error(
        "Dashboard supplier payment failed:",
        err
      );


      setPaymentError(
        getErrorMessage(
          err,
          "Unable to record supplier payment."
        )
      );

    } finally {

      setPaymentSubmitting(
        false
      );

    }

  }


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
              item =>
                !item.is_future
            )
            .map(
              item =>
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
     EMPTY / ERROR
  ============================================================== */

  if (
    !dashboard
  ) {

    return (
      <div className="dashboard-page">

        <div className="dashboard-error">

          {
            error
            ??
            "Dashboard data is unavailable."
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
            overview for{" "}

            {
              dashboard
                .financial_year_label
            }

            .

          </p>

        </div>


        <div className="dashboard-time-chip">

          <CalendarDays
            size={15}
          />


          <span>

            {
              formatIndiaTime(
                dashboard.as_of
              )
            }

          </span>

        </div>

      </div>


      {
        error
        &&
        (
          <div className="dashboard-error">
            {error}
          </div>
        )
      }


      {
        paymentSuccess
        &&
        (
          <div className="dashboard-success">

            <CheckCircle2
              size={16}
            />


            <span>
              {paymentSuccess}
            </span>


            <button
              type="button"
              onClick={
                () =>
                  setPaymentSuccess(
                    null
                  )
              }
            >

              <X
                size={15}
              />

            </button>

          </div>
        )
      }


      {/* ==========================================================
          BOSS KPI CARDS
      ========================================================== */}

      {
        isBoss
        &&
        (
          dashboard.open_enquiries
          !==
          null
        )
        &&
        (
          dashboard.current_fy_net_profit
          !==
          null
        )
        &&
        (
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
                    )
                    >=
                    0
                      ? "dashboard-management-value profit"
                      : "dashboard-management-value loss"
                  }
                >

                  {
                    formatCurrency(
                      dashboard
                        .current_fy_net_profit
                    )
                  }

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
            .length
          >
          0
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
                            item => (

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
                                    ??
                                    "—"
                                  }

                                </td>


                                <td>

                                  {
                                    item
                                      .machine_name
                                    ??
                                    "—"
                                  }

                                </td>


                                <td>

                                  <span className="dashboard-production-status">

                                    {
                                      item
                                        .operation_status
                                      ??
                                      item
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
          BOSS QUARTER COMPARISON
      ========================================================== */}

      {
        isBoss
        &&
        dashboard.current_quarter
        &&
        dashboard.previous_quarter
        &&
        (
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
          BOSS FY MONTHLY SALES
      ========================================================== */}

      {
        isBoss
        &&
        (
          dashboard
            .monthly_sales
            .length
          >
          0
        )
        &&
        (
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
                      item => {

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
                                    /
                                    monthlySalesMax
                                  )
                                  *
                                  124
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

          Visible:
              Boss
              Accounts
              Purchase

          Record Payment:
              Boss
              Accounts
      ========================================================== */}

      {
        canViewPurchasePayments
        &&
        (
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
                .length
              >
              0
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


                            {
                              canRecordPurchasePayment
                              &&
                              (
                                <th>
                                  Action
                                </th>
                              )
                            }

                          </tr>

                        </thead>


                        <tbody>

                          {
                            dashboard
                              .unpaid_purchase_bills
                              .map(
                                bill => (

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

                                      {
                                        formatDate(
                                          bill
                                            .bill_date
                                        )
                                      }

                                    </td>


                                    <td>

                                      {
                                        formatDate(
                                          bill
                                            .due_date
                                        )
                                      }

                                    </td>


                                    <td>

                                      <strong>

                                        {
                                          formatCurrency(
                                            bill
                                              .balance_amount
                                          )
                                        }

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
                                        }

                                        {" days"}

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
                                            ? (
                                                `${bill.overdue_days} days overdue`
                                              )
                                            : bill
                                                .payment_status
                                        }

                                      </span>

                                    </td>


                                    {
                                      canRecordPurchasePayment
                                      &&
                                      (
                                        <td>

                                          <button
                                            type="button"
                                            className="dashboard-record-payment"
                                            onClick={
                                              () =>
                                                void openPurchasePayment(
                                                  bill
                                                )
                                            }
                                          >

                                            <CreditCard
                                              size={14}
                                            />

                                            Record Payment

                                          </button>

                                        </td>
                                      )
                                    }

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
      ========================================================== */}

      {
        !isBoss
        &&
        (
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


      {/* ==========================================================
          PURCHASE BILL PAYMENT MODAL
      ========================================================== */}

      {
        paymentOpen
        &&
        paymentBill
        &&
        (
          <div className="dashboard-payment-backdrop">

            <div className="dashboard-payment-modal">

              {/* HEADER */}

              <div className="dashboard-payment-modal-header">

                <div className="dashboard-payment-modal-heading">

                  <div className="dashboard-payment-modal-icon">

                    <WalletCards
                      size={19}
                    />

                  </div>


                  <div>

                    <div className="dashboard-payment-eyebrow">
                      SUPPLIER PAYMENT
                    </div>


                    <h2>
                      Record Purchase Bill Payment
                    </h2>


                    <p>

                      {
                        paymentBill
                          .supplier_name
                      }

                      {" • "}

                      {
                        paymentBill
                          .bill_number
                      }

                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  className="dashboard-payment-close"
                  disabled={
                    paymentSubmitting
                  }
                  onClick={
                    closePurchasePayment
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              {/* ERROR */}

              {
                paymentError
                &&
                (
                  <div className="dashboard-payment-error">

                    {paymentError}

                  </div>
                )
              }


              {/* LOADING */}

              {
                paymentLoading
                  ? (
                      <div className="dashboard-payment-loading">

                        <Loader2
                          size={20}
                          className="dashboard-spin"
                        />

                        Loading payment details...

                      </div>
                    )
                  : paymentSummary
                    ? (
                        <>

                          {/* ================================
                              PAYMENT SUMMARY
                          ================================ */}

                          <div className="dashboard-payment-summary">

                            <div>

                              <span>
                                Grand Total
                              </span>


                              <strong>

                                {
                                  formatCurrency(
                                    paymentSummary
                                      .grand_total
                                  )
                                }

                              </strong>

                            </div>


                            <div>

                              <span>
                                Already Paid
                              </span>


                              <strong className="paid">

                                {
                                  formatCurrency(
                                    paymentSummary
                                      .paid_amount
                                  )
                                }

                              </strong>

                            </div>


                            <div>

                              <span>
                                Outstanding Balance
                              </span>


                              <strong className="balance">

                                {
                                  formatCurrency(
                                    paymentSummary
                                      .balance_amount
                                  )
                                }

                              </strong>

                            </div>

                          </div>


                          {/* ================================
                              PAYMENT FORM
                          ================================ */}

                          <form
                            onSubmit={
                              event => {

                                event.preventDefault();


                                void handlePurchasePayment();

                              }
                            }
                          >

                            <div className="dashboard-payment-fields">

                              {/* AMOUNT */}

                              <label>

                                <span>
                                  Payment Amount *
                                </span>


                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  max={
                                    Number(
                                      paymentSummary
                                        .balance_amount
                                    )
                                  }
                                  value={
                                    paymentAmount
                                  }
                                  onChange={
                                    event =>
                                      setPaymentAmount(
                                        event.target.value
                                      )
                                  }
                                  placeholder="0.00"
                                  required
                                />

                              </label>


                              {/* DATE */}

                              <label>

                                <span>
                                  Payment Date *
                                </span>


                                <input
                                  type="datetime-local"
                                  value={
                                    paymentDate
                                  }
                                  onChange={
                                    event =>
                                      setPaymentDate(
                                        event.target.value
                                      )
                                  }
                                  required
                                />

                              </label>


                              {/* MODE */}

                              <label>

                                <span>
                                  Payment Mode
                                </span>


                                <select
                                  value={
                                    paymentMode
                                  }
                                  onChange={
                                    event =>
                                      setPaymentMode(
                                        event.target.value
                                      )
                                  }
                                >

                                  {
                                    [
                                      "Bank Transfer",
                                      "NEFT",
                                      "RTGS",
                                      "IMPS",
                                      "UPI",
                                      "Cheque",
                                      "Cash",
                                      "Other",
                                    ].map(
                                      mode => (

                                        <option
                                          key={
                                            mode
                                          }
                                          value={
                                            mode
                                          }
                                        >
                                          {mode}
                                        </option>

                                      )
                                    )
                                  }

                                </select>

                              </label>


                              {/* REFERENCE */}

                              <label>

                                <span>
                                  Reference Number
                                </span>


                                <input
                                  type="text"
                                  value={
                                    paymentReference
                                  }
                                  onChange={
                                    event =>
                                      setPaymentReference(
                                        event.target.value
                                      )
                                  }
                                  placeholder="Transaction / cheque reference"
                                />

                              </label>


                              {/* NOTES */}

                              <label className="dashboard-payment-notes">

                                <span>
                                  Notes
                                </span>


                                <textarea
                                  rows={3}
                                  value={
                                    paymentNotes
                                  }
                                  onChange={
                                    event =>
                                      setPaymentNotes(
                                        event.target.value
                                      )
                                  }
                                  placeholder="Optional payment remarks"
                                />

                              </label>

                            </div>


                            {/* ================================
                                FOOTER
                            ================================ */}

                            <div className="dashboard-payment-footer">

                              <button
                                type="button"
                                className="dashboard-payment-full"
                                disabled={
                                  paymentSubmitting
                                }
                                onClick={
                                  () =>
                                    setPaymentAmount(
                                      String(
                                        paymentSummary
                                          .balance_amount
                                      )
                                    )
                                }
                              >

                                <IndianRupee
                                  size={14}
                                />

                                Use Full Balance

                              </button>


                              <div>

                                <button
                                  type="button"
                                  className="dashboard-payment-cancel"
                                  disabled={
                                    paymentSubmitting
                                  }
                                  onClick={
                                    closePurchasePayment
                                  }
                                >
                                  Cancel
                                </button>


                                <button
                                  type="submit"
                                  className="dashboard-payment-submit"
                                  disabled={
                                    paymentSubmitting
                                  }
                                >

                                  {
                                    paymentSubmitting
                                      ? (
                                          <>

                                            <Loader2
                                              size={15}
                                              className="dashboard-spin"
                                            />

                                            Recording...

                                          </>
                                        )
                                      : (
                                          <>

                                            <CreditCard
                                              size={15}
                                            />

                                            Record Payment

                                          </>
                                        )
                                  }

                                </button>

                              </div>

                            </div>

                          </form>

                        </>
                      )
                    : null
              }

            </div>

          </div>
        )
      }

    </div>
  );

}