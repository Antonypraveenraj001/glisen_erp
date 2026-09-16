import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./FinancialAnalyzerPage.css";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  Factory,
  Loader2,
  ReceiptText,
  RefreshCcw,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import {
  downloadFinancialAnalysisExcel,
  getFinancialAnalysis,
} from "../../services/financialAnalyzerService";

import type {
  FinancialAnalyzerResponse,
} from "../../types/financialAnalyzer";


function formatCurrency(
  value: string | number
) {
  const numeric =
    typeof value === "number"
      ? value
      : Number(value);

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(
    Number.isFinite(numeric)
      ? numeric
      : 0
  );
}


export default function FinancialAnalyzerPage() {
  const [
    analysis,
    setAnalysis,
  ] =
    useState<
      FinancialAnalyzerResponse | null
    >(null);

  const [
    startDate,
    setStartDate,
  ] =
    useState("");

  const [
    endDate,
    setEndDate,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    downloading,
    setDownloading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);


  /* =========================================================
     LOAD ANALYSIS
  ========================================================= */

  const loadAnalysis =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError(null);

          const data =
            await getFinancialAnalysis({
              start_date:
                startDate ||
                undefined,

              end_date:
                endDate ||
                undefined,
            });

          setAnalysis(
            data
          );
        } catch (err) {
          console.error(
            err
          );

          setError(
            "Unable to load financial analysis."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        startDate,
        endDate,
      ]
    );


  useEffect(
    () => {
      void loadAnalysis();
    },
    [loadAnalysis]
  );


  /* =========================================================
     RESET
  ========================================================= */

  const handleReset =
    () => {
      setStartDate("");
      setEndDate("");
    };


  /* =========================================================
     EXCEL
  ========================================================= */

  const handleDownload =
    async () => {
      try {
        setDownloading(
          true
        );

        setError(
          null
        );

        await downloadFinancialAnalysisExcel({
          start_date:
            startDate ||
            undefined,

          end_date:
            endDate ||
            undefined,
        });
      } catch (err) {
        console.error(
          err
        );

        setError(
          "Unable to download Excel report."
        );
      } finally {
        setDownloading(
          false
        );
      }
    };


  /* =========================================================
     PROFIT / LOSS
  ========================================================= */

  const profitPositive =
    Number(
      analysis
        ?.net_profit ??
      0
    ) >= 0;


  const margin =
    useMemo(
      () => {
        const netSales =
          Number(
            analysis
              ?.net_sales ??
            0
          );

        const netProfit =
          Number(
            analysis
              ?.net_profit ??
            0
          );

        if (!netSales) {
          return 0;
        }

        return (
          (
            netProfit /
            netSales
          ) * 100
        );
      },
      [analysis]
    );


  /* =========================================================
     LOADING
  ========================================================= */

  if (
    loading &&
    !analysis
  ) {
    return (
      <div className="financial-page">

        <div className="financial-loading-state">

          <Loader2
            size={24}
            className="financial-spin"
          />

          <span>
            Loading financial analysis...
          </span>

        </div>

      </div>
    );
  }


  return (
    <div className="financial-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="financial-page-header">

        <div>

          <div className="financial-eyebrow">
            COMPANY MONEY TRACEABILITY
          </div>

          <h1 className="financial-title">
            Financial Analyzer
          </h1>

          <p className="financial-subtitle">
            Analyze sales revenue,
            actual production cost,
            company expenses,
            total business cost,
            and operating profit or loss
            from one trusted financial view.
          </p>

        </div>


        <button
          type="button"
          className="financial-primary-button"
          onClick={
            handleDownload
          }
          disabled={
            downloading
          }
        >

          {downloading ? (
            <Loader2
              size={17}
              className="financial-spin"
            />
          ) : (
            <Download
              size={17}
            />
          )}

          Download Excel

        </button>

      </div>


      {/* =====================================================
          FILTER
      ====================================================== */}

      <div className="financial-filter-card">

        <div className="financial-filter-heading">

          <div className="financial-filter-icon">
            <CalendarDays
              size={17}
            />
          </div>

          <div>

            <div className="financial-filter-title">
              Reporting Period
            </div>

            <div className="financial-filter-subtitle">
              Sales use invoice dates.
              Production cost uses finished-goods
              receipt dates. Expenses use
              expense dates.
            </div>

          </div>

        </div>


        <div className="financial-filter-controls">

          <label className="financial-field">

            <span>
              Start Date
            </span>

            <input
              type="date"
              value={
                startDate
              }
              onChange={(
                event
              ) =>
                setStartDate(
                  event
                    .target
                    .value
                )
              }
            />

          </label>


          <label className="financial-field">

            <span>
              End Date
            </span>

            <input
              type="date"
              value={
                endDate
              }
              onChange={(
                event
              ) =>
                setEndDate(
                  event
                    .target
                    .value
                )
              }
            />

          </label>


          <button
            type="button"
            className="financial-secondary-button"
            onClick={() =>
              void loadAnalysis()
            }
          >
            <RefreshCcw
              size={16}
            />

            Refresh
          </button>


          <button
            type="button"
            className="financial-ghost-button"
            onClick={
              handleReset
            }
          >
            Reset
          </button>

        </div>

      </div>


      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="financial-error">
          {error}
        </div>
      )}


      {analysis && (
        <>

          {/* =================================================
              MAIN KPI CARDS
          ================================================== */}

          <div className="financial-kpi-grid">

            {/* NET SALES */}

            <div className="financial-kpi-card">

              <div className="financial-kpi-top">

                <div>

                  <div className="financial-kpi-label">
                    Net Sales Revenue
                  </div>

                  <div className="financial-kpi-value">
                    {formatCurrency(
                      analysis
                        .net_sales
                    )}
                  </div>

                </div>


                <div className="financial-kpi-icon blue">
                  <TrendingUp
                    size={19}
                  />
                </div>

              </div>


              <div className="financial-kpi-meta">
                Revenue excluding GST,
                after issued Credit Notes
              </div>

            </div>


            {/* PRODUCTION COST */}

            <div className="financial-kpi-card">

              <div className="financial-kpi-top">

                <div>

                  <div className="financial-kpi-label">
                    Production Cost
                  </div>

                  <div className="financial-kpi-value">
                    {formatCurrency(
                      analysis
                        .total_production_cost
                    )}
                  </div>

                </div>


                <div className="financial-kpi-icon indigo">
                  <Factory
                    size={19}
                  />
                </div>

              </div>


              <div className="financial-kpi-meta">
                {
                  analysis
                    .finished_product_count
                }
                {" "}
                finished product
                {
                  analysis
                    .finished_product_count
                  === 1
                    ? ""
                    : "s"
                }
              </div>

            </div>


            {/* COMPANY EXPENSE */}

            <div className="financial-kpi-card">

              <div className="financial-kpi-top">

                <div>

                  <div className="financial-kpi-label">
                    Company Expenses
                  </div>

                  <div className="financial-kpi-value">
                    {formatCurrency(
                      analysis
                        .total_expenses
                    )}
                  </div>

                </div>


                <div className="financial-kpi-icon amber">
                  <ReceiptText
                    size={19}
                  />
                </div>

              </div>


              <div className="financial-kpi-meta">
                {
                  analysis
                    .expense_count
                }
                {" "}
                expense record
                {
                  analysis
                    .expense_count
                  === 1
                    ? ""
                    : "s"
                }
              </div>

            </div>


            {/* BUSINESS COST */}

            <div className="financial-kpi-card">

              <div className="financial-kpi-top">

                <div>

                  <div className="financial-kpi-label">
                    Total Business Cost
                  </div>

                  <div className="financial-kpi-value">
                    {formatCurrency(
                      analysis
                        .total_business_cost
                    )}
                  </div>

                </div>


                <div className="financial-kpi-icon rose">
                  <WalletCards
                    size={19}
                  />
                </div>

              </div>


              <div className="financial-kpi-meta">
                Production cost
                + company expenses
              </div>

            </div>


            {/* PROFIT / LOSS */}

            <div className="financial-kpi-card financial-profit-card">

              <div className="financial-kpi-top">

                <div>

                  <div className="financial-kpi-label">
                    Net Profit / Loss
                  </div>

                  <div
                    className={
                      profitPositive
                        ? "financial-kpi-value profit"
                        : "financial-kpi-value loss"
                    }
                  >
                    {formatCurrency(
                      analysis
                        .net_profit
                    )}
                  </div>

                </div>


                <div
                  className={
                    profitPositive
                      ? "financial-kpi-icon green"
                      : "financial-kpi-icon rose"
                  }
                >

                  {profitPositive ? (
                    <ArrowUpRight
                      size={19}
                    />
                  ) : (
                    <ArrowDownRight
                      size={19}
                    />
                  )}

                </div>

              </div>


              <div className="financial-kpi-meta">
                Margin{" "}
                {
                  margin.toFixed(
                    1
                  )
                }
                %
              </div>

            </div>

          </div>


          {/* =================================================
              SALES + PRODUCTION BREAKDOWN
          ================================================== */}

          <div className="financial-content-grid">

            {/* ===============================================
                COST STRUCTURE
            ================================================ */}

            <div className="financial-panel">

              <div className="financial-panel-header">

                <div>

                  <div className="financial-panel-title">
                    Cost Structure
                  </div>

                  <div className="financial-panel-subtitle">
                    Actual manufacturing cost
                    generated from product traceability.
                  </div>

                </div>


                <div className="financial-panel-badge">
                  {
                    analysis
                      .finished_product_count
                  }
                  {" "}
                  finished products
                </div>

              </div>


              <div className="financial-table-wrap">

                <table className="financial-table">

                  <thead>
                    <tr>

                      <th>
                        Cost Component
                      </th>

                      <th>
                        Source
                      </th>

                      <th className="align-right">
                        Amount
                      </th>

                    </tr>
                  </thead>


                  <tbody>

                    <tr>

                      <td>

                        <div className="financial-category-name">
                          Actual Material Cost
                        </div>

                      </td>

                      <td>
                        Shop Floor Issues
                      </td>

                      <td className="align-right financial-money">
                        {formatCurrency(
                          analysis
                            .actual_material_cost
                        )}
                      </td>

                    </tr>


                    <tr>

                      <td>

                        <div className="financial-category-name">
                          Actual Operation Cost
                        </div>

                      </td>

                      <td>
                        Production Operations
                      </td>

                      <td className="align-right financial-money">
                        {formatCurrency(
                          analysis
                            .actual_operation_cost
                        )}
                      </td>

                    </tr>


                    <tr>

                      <td>

                        <div className="financial-category-name">
                          Total Production Cost
                        </div>

                      </td>

                      <td>
                        Material + Operations
                      </td>

                      <td className="align-right financial-money">
                        {formatCurrency(
                          analysis
                            .total_production_cost
                        )}
                      </td>

                    </tr>

                  </tbody>

                </table>

              </div>

            </div>


            {/* ===============================================
                PERFORMANCE SUMMARY
            ================================================ */}

            <div className="financial-panel financial-summary-panel">

              <div className="financial-panel-header">

                <div>

                  <div className="financial-panel-title">
                    Performance Summary
                  </div>

                  <div className="financial-panel-subtitle">
                    Revenue to final
                    operating result.
                  </div>

                </div>

              </div>


              <div className="financial-summary-list">

                <div className="financial-summary-row">

                  <span>
                    Gross Sales Revenue
                  </span>

                  <strong>
                    {formatCurrency(
                      analysis
                        .gross_sales
                    )}
                  </strong>

                </div>


                <div className="financial-summary-row">

                  <span>
                    Less: Credit Notes
                  </span>

                  <strong className="financial-negative">
                    -
                    {formatCurrency(
                      analysis
                        .credit_notes
                    )}
                  </strong>

                </div>


                <div className="financial-summary-divider" />


                <div className="financial-summary-row emphasized">

                  <span>
                    Net Sales Revenue
                  </span>

                  <strong>
                    {formatCurrency(
                      analysis
                        .net_sales
                    )}
                  </strong>

                </div>


                <div className="financial-summary-row">

                  <span>
                    Less: Production Cost
                  </span>

                  <strong className="financial-negative">
                    -
                    {formatCurrency(
                      analysis
                        .total_production_cost
                    )}
                  </strong>

                </div>


                <div className="financial-summary-row">

                  <span>
                    Less: Company Expenses
                  </span>

                  <strong className="financial-negative">
                    -
                    {formatCurrency(
                      analysis
                        .total_expenses
                    )}
                  </strong>

                </div>


                <div className="financial-summary-divider" />


                <div className="financial-summary-row emphasized">

                  <span>
                    Total Business Cost
                  </span>

                  <strong>
                    {formatCurrency(
                      analysis
                        .total_business_cost
                    )}
                  </strong>

                </div>


                <div className="financial-summary-divider" />


                <div className="financial-summary-row total">

                  <span>
                    Net Profit / Loss
                  </span>

                  <strong
                    className={
                      profitPositive
                        ? "financial-positive"
                        : "financial-negative"
                    }
                  >
                    {formatCurrency(
                      analysis
                        .net_profit
                    )}
                  </strong>

                </div>

              </div>


              <div className="financial-summary-note">
                Sales revenue excludes GST.
                Production cost comes from actual
                material issues and production
                operations. This remains an
                internal management analysis,
                not a statutory financial statement.
              </div>

            </div>

          </div>


          {/* =================================================
              SALES DETAILS
          ================================================== */}

          <div className="financial-panel">

            <div className="financial-panel-header">

              <div>

                <div className="financial-panel-title">
                  Sales Revenue
                </div>

                <div className="financial-panel-subtitle">
                  Revenue basis excludes GST
                  and uses only effective
                  Issued invoice versions.
                </div>

              </div>


              <div className="financial-panel-badge">
                {
                  analysis
                    .invoice_count
                }
                {" "}
                invoices
              </div>

            </div>


            <div className="financial-table-wrap">

              <table className="financial-table">

                <thead>
                  <tr>

                    <th>
                      Metric
                    </th>

                    <th>
                      Records
                    </th>

                    <th className="align-right">
                      Amount
                    </th>

                  </tr>
                </thead>


                <tbody>

                  <tr>

                    <td>

                      <div className="financial-category-name">
                        Gross Sales Revenue
                      </div>

                    </td>

                    <td>
                      {
                        analysis
                          .invoice_count
                      }
                      {" "}
                      effective invoice
                      {
                        analysis
                          .invoice_count
                        === 1
                          ? ""
                          : "s"
                      }
                    </td>

                    <td className="align-right financial-money">
                      {formatCurrency(
                        analysis
                          .gross_sales
                      )}
                    </td>

                  </tr>


                  <tr>

                    <td>

                      <div className="financial-category-name">
                        Credit Notes
                      </div>

                    </td>

                    <td>
                      {
                        analysis
                          .credit_note_count
                      }
                      {" "}
                      issued Credit Note
                      {
                        analysis
                          .credit_note_count
                        === 1
                          ? ""
                          : "s"
                      }
                    </td>

                    <td className="align-right financial-money">
                      {formatCurrency(
                        analysis
                          .credit_notes
                      )}
                    </td>

                  </tr>


                  <tr>

                    <td>

                      <div className="financial-category-name">
                        Net Sales Revenue
                      </div>

                    </td>

                    <td>
                      After Credit Notes
                    </td>

                    <td className="align-right financial-money">
                      {formatCurrency(
                        analysis
                          .net_sales
                      )}
                    </td>

                  </tr>

                </tbody>

              </table>

            </div>

          </div>


          {/* =================================================
              EXPENSE BREAKDOWN
          ================================================== */}

          <div className="financial-panel">

            <div className="financial-panel-header">

              <div>

                <div className="financial-panel-title">
                  Company Expense Breakdown
                </div>

                <div className="financial-panel-subtitle">
                  Salary, rent, electricity,
                  transport and other
                  company-level expenses.
                </div>

              </div>


              <div className="financial-panel-badge">
                {
                  analysis
                    .expense_count
                }
                {" "}
                records
              </div>

            </div>


            {analysis
              .expense_breakdown
              .length === 0 ? (

              <div className="financial-empty-state">

                <WalletCards
                  size={22}
                />

                <div>
                  No company expenses found
                  for this period.
                </div>

              </div>

            ) : (

              <div className="financial-table-wrap">

                <table className="financial-table">

                  <thead>
                    <tr>

                      <th>
                        Category
                      </th>

                      <th>
                        Records
                      </th>

                      <th className="align-right">
                        Amount
                      </th>

                      <th className="align-right">
                        Share
                      </th>

                    </tr>
                  </thead>


                  <tbody>

                    {analysis
                      .expense_breakdown
                      .map(
                        (item) => {

                          const totalExpenses =
                            Number(
                              analysis
                                .total_expenses
                            );

                          const amount =
                            Number(
                              item.amount
                            );

                          const share =
                            totalExpenses
                              ? (
                                  amount /
                                  totalExpenses
                                ) * 100
                              : 0;

                          return (
                            <tr
                              key={
                                item
                                  .category
                              }
                            >

                              <td>

                                <div className="financial-category-name">
                                  {
                                    item
                                      .category
                                  }
                                </div>

                              </td>


                              <td>
                                {
                                  item
                                    .count
                                }
                              </td>


                              <td className="align-right financial-money">

                                {formatCurrency(
                                  item
                                    .amount
                                )}

                              </td>


                              <td className="align-right">

                                <span className="financial-share-pill">

                                  {share.toFixed(
                                    1
                                  )}
                                  %

                                </span>

                              </td>

                            </tr>
                          );
                        }
                      )}

                  </tbody>

                </table>

              </div>

            )}

          </div>


          {/* =================================================
              TRACEABILITY NOTE
          ================================================== */}

          <div className="financial-panel">

            <div className="financial-panel-header">

              <div>

                <div className="financial-panel-title">
                  Financial Traceability Basis
                </div>

                <div className="financial-panel-subtitle">
                  Where each Financial Analyzer
                  figure comes from.
                </div>

              </div>

            </div>


            <div className="financial-table-wrap">

              <table className="financial-table">

                <thead>
                  <tr>

                    <th>
                      Financial Area
                    </th>

                    <th>
                      ERP Source
                    </th>

                    <th>
                      Recognition Basis
                    </th>

                  </tr>
                </thead>


                <tbody>

                  <tr>

                    <td>

                      <div className="financial-category-name">
                        Sales Revenue
                      </div>

                    </td>

                    <td>
                      Final Billing / GST Report
                    </td>

                    <td>
                      Effective Issued invoice
                      taxable value, excluding GST
                    </td>

                  </tr>


                  <tr>

                    <td>

                      <div className="financial-category-name">
                        Material Cost
                      </div>

                    </td>

                    <td>
                      Shop Floor Issues
                    </td>

                    <td>
                      Actual issued material cost
                    </td>

                  </tr>


                  <tr>

                    <td>

                      <div className="financial-category-name">
                        Operation Cost
                      </div>

                    </td>

                    <td>
                      Production Operations
                    </td>

                    <td>
                      Actual operation cost
                    </td>

                  </tr>


                  <tr>

                    <td>

                      <div className="financial-category-name">
                        Production Period
                      </div>

                    </td>

                    <td>
                      Finished Goods Receipt
                    </td>

                    <td>
                      Finished-goods received date
                    </td>

                  </tr>


                  <tr>

                    <td>

                      <div className="financial-category-name">
                        Company Expenses
                      </div>

                    </td>

                    <td>
                      Expense Log
                    </td>

                    <td>
                      Expense date
                    </td>

                  </tr>

                </tbody>

              </table>

            </div>

          </div>

        </>
      )}

    </div>
  );
}