import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Boxes,
  CircleDollarSign,
  Factory,
  FileText,
  Loader2,
  PackageCheck,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import {
  getFinancialAnalysis,
} from "../../services/financialAnalyzerService";

import {
  getStockSummary,
} from "../../services/stockService";

import {
  getProductionOrders,
} from "../../services/productionService";

import {
  getFinalBills,
} from "../../services/finalBillService";

import type {
  FinancialAnalyzerResponse,
} from "../../types/financialAnalyzer";

import type {
  StockSummaryResponse,
} from "../../types/stock";

import type {
  ProductionOrder,
} from "../../types/production";

import type {
  FinalBill,
} from "../../types/finalBill";

import "./DashboardPage.css";


function formatCurrency(
  value: string | number
) {
  const numericValue =
    Number(value);

  if (
    Number.isNaN(
      numericValue
    )
  ) {
    return `₹${value}`;
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(
    numericValue
  );
}


function formatDate(
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

  return date.toLocaleDateString(
    "en-IN"
  );
}


export default function DashboardPage() {
  const [
    financial,
    setFinancial,
  ] =
    useState<
      FinancialAnalyzerResponse | null
    >(null);

  const [
    stock,
    setStock,
  ] =
    useState<
      StockSummaryResponse | null
    >(null);

  const [
    productionOrders,
    setProductionOrders,
  ] =
    useState<
      ProductionOrder[]
    >([]);

  const [
    finalBills,
    setFinalBills,
  ] =
    useState<
      FinalBill[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );


  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const [
          financialData,
          stockData,
          productionData,
          billingData,
        ] =
          await Promise.all([
            getFinancialAnalysis(),
            getStockSummary(),
            getProductionOrders(),
            getFinalBills(),
          ]);

        setFinancial(
          financialData
        );

        setStock(
          stockData
        );

        setProductionOrders(
          productionData
        );

        setFinalBills(
          billingData
        );
      } catch (err) {
        console.error(err);

        setError(
          "Unable to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, []);


  const productionSummary =
    useMemo(
      () => {
        const completed =
          productionOrders.filter(
            (order) =>
              (
                order.status ||
                ""
              )
                .trim()
                .toLowerCase() ===
              "completed"
          ).length;

        const inProgress =
          productionOrders.filter(
            (order) =>
              (
                order.status ||
                ""
              )
                .trim()
                .toLowerCase() ===
              "in progress"
          ).length;

        const planned =
          productionOrders.length -
          completed -
          inProgress;

        return {
          total:
            productionOrders.length,

          completed,

          inProgress,

          planned,
        };
      },
      [productionOrders]
    );


  const billingSummary =
    useMemo(
      () => {
        const issued =
          finalBills.filter(
            (bill) =>
              bill.status ===
              "Issued"
          ).length;

        const draft =
          finalBills.filter(
            (bill) =>
              bill.status ===
              "Draft"
          ).length;

        const creditNotes =
          finalBills.filter(
            (bill) =>
              bill.invoice_type ===
              "Credit Note"
          ).length;

        return {
          total:
            finalBills.length,

          issued,

          draft,

          creditNotes,
        };
      },
      [finalBills]
    );


  const latestBills =
    useMemo(
      () =>
        [...finalBills]
          .sort(
            (
              first,
              second
            ) =>
              new Date(
                second.created_at
              ).getTime() -
              new Date(
                first.created_at
              ).getTime()
          )
          .slice(
            0,
            4
          ),
      [finalBills]
    );


  if (loading) {
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


  return (
    <div className="dashboard-page">

      <div className="dashboard-header">

        <div>
          <div className="dashboard-eyebrow">
            BUSINESS OVERVIEW
          </div>

          <h1 className="dashboard-title">
            Dashboard
          </h1>

          <p className="dashboard-subtitle">
            Live overview of sales,
            expenses, billing, stock,
            and production activity.
          </p>
        </div>

      </div>


      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}


      <div className="dashboard-kpi-grid">

        <div className="dashboard-kpi-card">

          <div>
            <div className="dashboard-kpi-label">
              Net Sales
            </div>

            <div className="dashboard-kpi-value">
              {formatCurrency(
                financial?.net_sales ??
                0
              )}
            </div>

            <div className="dashboard-kpi-note">
              After credit notes
            </div>
          </div>

          <div className="dashboard-kpi-icon blue">
            <TrendingUp
              size={21}
            />
          </div>

        </div>


        <div className="dashboard-kpi-card">

          <div>
            <div className="dashboard-kpi-label">
              Expenses
            </div>

            <div className="dashboard-kpi-value">
              {formatCurrency(
                financial?.total_expenses ??
                0
              )}
            </div>

            <div className="dashboard-kpi-note">
              {
                financial?.expense_count ??
                0
              } expense records
            </div>
          </div>

          <div className="dashboard-kpi-icon rose">
            <WalletCards
              size={21}
            />
          </div>

        </div>


        <div className="dashboard-kpi-card">

          <div>
            <div className="dashboard-kpi-label">
              Net Profit
            </div>

            <div className="dashboard-kpi-value">
              {formatCurrency(
                financial?.net_profit ??
                0
              )}
            </div>

            <div className="dashboard-kpi-note">
              Internal operating view
            </div>
          </div>

          <div className="dashboard-kpi-icon green">
            <CircleDollarSign
              size={21}
            />
          </div>

        </div>


        <div className="dashboard-kpi-card">

          <div>
            <div className="dashboard-kpi-label">
              Invoices
            </div>

            <div className="dashboard-kpi-value">
              {
                financial?.invoice_count ??
                0
              }
            </div>

            <div className="dashboard-kpi-note">
              {
                financial?.credit_note_count ??
                0
              } credit notes
            </div>
          </div>

          <div className="dashboard-kpi-icon lavender">
            <ReceiptText
              size={21}
            />
          </div>

        </div>

      </div>


      <div className="dashboard-operations-grid">

        <div className="dashboard-section-card">

          <div className="dashboard-section-header">

            <div>
              <div className="dashboard-section-title">
                Stock Overview
              </div>

              <div className="dashboard-section-subtitle">
                Current inventory position
              </div>
            </div>

            <div className="dashboard-section-icon blue">
              <Boxes
                size={18}
              />
            </div>

          </div>


          <div className="dashboard-stat-list">

            <div className="dashboard-stat-row">
              <span>
                Products
              </span>

              <strong>
                {
                  stock?.total_products ??
                  0
                }
              </strong>
            </div>

            <div className="dashboard-stat-row">
              <span>
                Stock Quantity
              </span>

              <strong>
                {
                  stock?.total_stock_quantity ??
                  "0"
                }
              </strong>
            </div>

            <div className="dashboard-stat-row">
              <span>
                Stock Value
              </span>

              <strong>
                {formatCurrency(
                  stock?.total_stock_value ??
                  0
                )}
              </strong>
            </div>

            <div className="dashboard-stat-row warning">
              <span>
                Low Stock
              </span>

              <strong>
                {
                  stock?.low_stock_products ??
                  0
                }
              </strong>
            </div>

            <div className="dashboard-stat-row danger">
              <span>
                Out of Stock
              </span>

              <strong>
                {
                  stock?.out_of_stock_products ??
                  0
                }
              </strong>
            </div>

          </div>

        </div>


        <div className="dashboard-section-card">

          <div className="dashboard-section-header">

            <div>
              <div className="dashboard-section-title">
                Production
              </div>

              <div className="dashboard-section-subtitle">
                Current production orders
              </div>
            </div>

            <div className="dashboard-section-icon lavender">
              <Factory
                size={18}
              />
            </div>

          </div>


          <div className="dashboard-stat-list">

            <div className="dashboard-stat-row">
              <span>
                Total Orders
              </span>

              <strong>
                {
                  productionSummary.total
                }
              </strong>
            </div>

            <div className="dashboard-stat-row">
              <span>
                Planned
              </span>

              <strong>
                {
                  productionSummary.planned
                }
              </strong>
            </div>

            <div className="dashboard-stat-row">
              <span>
                In Progress
              </span>

              <strong>
                {
                  productionSummary.inProgress
                }
              </strong>
            </div>

            <div className="dashboard-stat-row success">
              <span>
                Completed
              </span>

              <strong>
                {
                  productionSummary.completed
                }
              </strong>
            </div>

          </div>

        </div>


        <div className="dashboard-section-card">

          <div className="dashboard-section-header">

            <div>
              <div className="dashboard-section-title">
                Final Billing
              </div>

              <div className="dashboard-section-subtitle">
                Invoice document status
              </div>
            </div>

            <div className="dashboard-section-icon rose">
              <FileText
                size={18}
              />
            </div>

          </div>


          <div className="dashboard-stat-list">

            <div className="dashboard-stat-row">
              <span>
                Documents
              </span>

              <strong>
                {
                  billingSummary.total
                }
              </strong>
            </div>

            <div className="dashboard-stat-row success">
              <span>
                Issued
              </span>

              <strong>
                {
                  billingSummary.issued
                }
              </strong>
            </div>

            <div className="dashboard-stat-row warning">
              <span>
                Draft
              </span>

              <strong>
                {
                  billingSummary.draft
                }
              </strong>
            </div>

            <div className="dashboard-stat-row">
              <span>
                Credit Notes
              </span>

              <strong>
                {
                  billingSummary.creditNotes
                }
              </strong>
            </div>

          </div>

        </div>

      </div>


      <div className="dashboard-bottom-grid">

        <div className="dashboard-section-card">

          <div className="dashboard-section-header">

            <div>
              <div className="dashboard-section-title">
                Expense Breakdown
              </div>

              <div className="dashboard-section-subtitle">
                Operating cost by category
              </div>
            </div>

            <div className="dashboard-section-icon amber">
              <WalletCards
                size={18}
              />
            </div>

          </div>


          <div className="dashboard-breakdown-list">

            {
              financial?.expense_breakdown
                .length ? (
                financial
                  .expense_breakdown
                  .map(
                    (
                      item
                    ) => (
                      <div
                        key={
                          item.category
                        }
                        className="dashboard-breakdown-row"
                      >

                        <div>
                          <div className="dashboard-breakdown-category">
                            {
                              item.category
                            }
                          </div>

                          <div className="dashboard-breakdown-count">
                            {
                              item.count
                            } records
                          </div>
                        </div>

                        <strong>
                          {formatCurrency(
                            item.amount
                          )}
                        </strong>

                      </div>
                    )
                  )
              ) : (
                <div className="dashboard-empty-text">
                  No expense data.
                </div>
              )
            }

          </div>

        </div>


        <div className="dashboard-section-card">

          <div className="dashboard-section-header">

            <div>
              <div className="dashboard-section-title">
                Recent Billing
              </div>

              <div className="dashboard-section-subtitle">
                Latest final bill documents
              </div>
            </div>

            <div className="dashboard-section-icon green">
              <PackageCheck
                size={18}
              />
            </div>

          </div>


          <div className="dashboard-recent-list">

            {
              latestBills.length ? (
                latestBills.map(
                  (
                    bill
                  ) => (
                    <div
                      key={
                        bill.id
                      }
                      className="dashboard-recent-row"
                    >

                      <div>

                        <div className="dashboard-recent-number">
                          {
                            bill.invoice_number
                          }
                        </div>

                        <div className="dashboard-recent-meta">
                          {
                            bill.invoice_type
                          }
                          {" · "}
                          {
                            formatDate(
                              bill.invoice_date
                            )
                          }
                        </div>

                      </div>


                      <div className="dashboard-recent-right">

                        <strong>
                          {formatCurrency(
                            bill.grand_total
                          )}
                        </strong>

                        <span
                          className={`dashboard-status ${
                            bill.status ===
                            "Issued"
                              ? "issued"
                              : "draft"
                          }`}
                        >
                          {
                            bill.status
                          }
                        </span>

                      </div>

                    </div>
                  )
                )
              ) : (
                <div className="dashboard-empty-text">
                  No billing data.
                </div>
              )
            }

          </div>

        </div>

      </div>

    </div>
  );
}