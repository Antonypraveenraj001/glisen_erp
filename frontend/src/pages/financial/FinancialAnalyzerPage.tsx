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
    Landmark,
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
    ).format(numeric || 0);
  }
  
  
  export default function FinancialAnalyzerPage() {
    const [analysis, setAnalysis] =
      useState<FinancialAnalyzerResponse | null>(
        null
      );
  
    const [startDate, setStartDate] =
      useState("");
  
    const [endDate, setEndDate] =
      useState("");
  
    const [loading, setLoading] =
      useState(true);
  
    const [downloading, setDownloading] =
      useState(false);
  
    const [error, setError] =
      useState<string | null>(null);
  
  
    const loadAnalysis =
      useCallback(async () => {
        try {
          setLoading(true);
          setError(null);
  
          const data =
            await getFinancialAnalysis({
              start_date:
                startDate || undefined,
  
              end_date:
                endDate || undefined,
            });
  
          setAnalysis(data);
        } catch (err) {
          console.error(err);
  
          setError(
            "Unable to load financial analysis."
          );
        } finally {
          setLoading(false);
        }
      }, [startDate, endDate]);
  
  
    useEffect(() => {
      void loadAnalysis();
    }, [loadAnalysis]);
  
  
    const handleReset = () => {
      setStartDate("");
      setEndDate("");
    };
  
  
    const handleDownload = async () => {
      try {
        setDownloading(true);
        setError(null);
  
        await downloadFinancialAnalysisExcel({
          start_date:
            startDate || undefined,
  
          end_date:
            endDate || undefined,
        });
      } catch (err) {
        console.error(err);
  
        setError(
          "Unable to download Excel report."
        );
      } finally {
        setDownloading(false);
      }
    };
  
  
    const profitPositive =
      Number(
        analysis?.net_profit ?? 0
      ) >= 0;
  
  
    const margin = useMemo(() => {
      const netSales =
        Number(
          analysis?.net_sales ?? 0
        );
  
      const netProfit =
        Number(
          analysis?.net_profit ?? 0
        );
  
      if (!netSales) {
        return 0;
      }
  
      return (
        (netProfit / netSales) * 100
      );
    }, [analysis]);
  
  
    if (loading && !analysis) {
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
  
        {/* =========================
            HEADER
        ========================== */}
  
        <div className="financial-page-header">
          <div>
            <div className="financial-eyebrow">
              FINANCE & PERFORMANCE
            </div>
  
            <h1 className="financial-title">
              Financial Analyzer
            </h1>
  
            <p className="financial-subtitle">
              Track sales performance,
              credit adjustments,
              expenses, and operating
              profitability in one place.
            </p>
          </div>
  
          <button
            type="button"
            className="financial-primary-button"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2
                size={17}
                className="financial-spin"
              />
            ) : (
              <Download size={17} />
            )}
  
            Download Excel
          </button>
        </div>
  
  
        {/* =========================
            FILTER BAR
        ========================== */}
  
        <div className="financial-filter-card">
          <div className="financial-filter-heading">
            <div className="financial-filter-icon">
              <CalendarDays size={17} />
            </div>
  
            <div>
              <div className="financial-filter-title">
                Reporting Period
              </div>
  
              <div className="financial-filter-subtitle">
                Select a date range to
                analyze financial performance.
              </div>
            </div>
          </div>
  
          <div className="financial-filter-controls">
            <label className="financial-field">
              <span>Start Date</span>
  
              <input
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(
                    event.target.value
                  )
                }
              />
            </label>
  
            <label className="financial-field">
              <span>End Date</span>
  
              <input
                type="date"
                value={endDate}
                onChange={(event) =>
                  setEndDate(
                    event.target.value
                  )
                }
              />
            </label>
  
            <button
              type="button"
              className="financial-secondary-button"
              onClick={loadAnalysis}
            >
              <RefreshCcw size={16} />
              Refresh
            </button>
  
            <button
              type="button"
              className="financial-ghost-button"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </div>
  
  
        {error && (
          <div className="financial-error">
            {error}
          </div>
        )}
  
  
        {analysis && (
          <>
            {/* =========================
                KPI CARDS
            ========================== */}
  
            <div className="financial-kpi-grid">
  
              <div className="financial-kpi-card">
                <div className="financial-kpi-top">
                  <div>
                    <div className="financial-kpi-label">
                      Gross Sales
                    </div>
  
                    <div className="financial-kpi-value">
                      {formatCurrency(
                        analysis.gross_sales
                      )}
                    </div>
                  </div>
  
                  <div className="financial-kpi-icon blue">
                    <TrendingUp size={19} />
                  </div>
                </div>
  
                <div className="financial-kpi-meta">
                  {
                    analysis.invoice_count
                  }{" "}
                  effective invoice
                  {
                    analysis.invoice_count === 1
                      ? ""
                      : "s"
                  }
                </div>
              </div>
  
  
              <div className="financial-kpi-card">
                <div className="financial-kpi-top">
                  <div>
                    <div className="financial-kpi-label">
                      Credit Notes
                    </div>
  
                    <div className="financial-kpi-value">
                      {formatCurrency(
                        analysis.credit_notes
                      )}
                    </div>
                  </div>
  
                  <div className="financial-kpi-icon amber">
                    <ArrowDownRight size={19} />
                  </div>
                </div>
  
                <div className="financial-kpi-meta">
                  {
                    analysis.credit_note_count
                  }{" "}
                  credit note
                  {
                    analysis.credit_note_count === 1
                      ? ""
                      : "s"
                  }
                </div>
              </div>
  
  
              <div className="financial-kpi-card">
                <div className="financial-kpi-top">
                  <div>
                    <div className="financial-kpi-label">
                      Net Sales
                    </div>
  
                    <div className="financial-kpi-value">
                      {formatCurrency(
                        analysis.net_sales
                      )}
                    </div>
                  </div>
  
                  <div className="financial-kpi-icon indigo">
                    <Landmark size={19} />
                  </div>
                </div>
  
                <div className="financial-kpi-meta">
                  After credit adjustments
                </div>
              </div>
  
  
              <div className="financial-kpi-card">
                <div className="financial-kpi-top">
                  <div>
                    <div className="financial-kpi-label">
                      Total Expenses
                    </div>
  
                    <div className="financial-kpi-value">
                      {formatCurrency(
                        analysis.total_expenses
                      )}
                    </div>
                  </div>
  
                  <div className="financial-kpi-icon rose">
                    <ReceiptText size={19} />
                  </div>
                </div>
  
                <div className="financial-kpi-meta">
                  {
                    analysis.expense_count
                  }{" "}
                  expense record
                  {
                    analysis.expense_count === 1
                      ? ""
                      : "s"
                  }
                </div>
              </div>
  
  
              <div className="financial-kpi-card financial-profit-card">
                <div className="financial-kpi-top">
                  <div>
                    <div className="financial-kpi-label">
                      Net Profit
                    </div>
  
                    <div
                      className={
                        profitPositive
                          ? "financial-kpi-value profit"
                          : "financial-kpi-value loss"
                      }
                    >
                      {formatCurrency(
                        analysis.net_profit
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
                      <ArrowUpRight size={19} />
                    ) : (
                      <ArrowDownRight size={19} />
                    )}
                  </div>
                </div>
  
                <div className="financial-kpi-meta">
                  Operating margin{" "}
                  {margin.toFixed(1)}%
                </div>
              </div>
  
            </div>
  
  
            {/* =========================
                MAIN CONTENT GRID
            ========================== */}
  
            <div className="financial-content-grid">
  
              <div className="financial-panel">
                <div className="financial-panel-header">
                  <div>
                    <div className="financial-panel-title">
                      Expense Breakdown
                    </div>
  
                    <div className="financial-panel-subtitle">
                      Category-wise operating
                      expense distribution.
                    </div>
                  </div>
  
                  <div className="financial-panel-badge">
                    {
                      analysis.expense_count
                    }{" "}
                    records
                  </div>
                </div>
  
                {analysis.expense_breakdown
                  .length === 0 ? (
                  <div className="financial-empty-state">
                    <WalletCards size={22} />
  
                    <div>
                      No expenses found for
                      this period.
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
                        {analysis.expense_breakdown.map(
                          (item) => {
                            const totalExpenses =
                              Number(
                                analysis.total_expenses
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
                                  item.category
                                }
                              >
                                <td>
                                  <div className="financial-category-name">
                                    {
                                      item.category
                                    }
                                  </div>
                                </td>
  
                                <td>
                                  {
                                    item.count
                                  }
                                </td>
  
                                <td className="align-right financial-money">
                                  {formatCurrency(
                                    item.amount
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
  
  
              <div className="financial-panel financial-summary-panel">
                <div className="financial-panel-header">
                  <div>
                    <div className="financial-panel-title">
                      Performance Summary
                    </div>
  
                    <div className="financial-panel-subtitle">
                      Current period financial
                      position.
                    </div>
                  </div>
                </div>
  
                <div className="financial-summary-list">
                  <div className="financial-summary-row">
                    <span>
                      Gross Sales
                    </span>
  
                    <strong>
                      {formatCurrency(
                        analysis.gross_sales
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
                        analysis.credit_notes
                      )}
                    </strong>
                  </div>
  
                  <div className="financial-summary-divider" />
  
                  <div className="financial-summary-row emphasized">
                    <span>
                      Net Sales
                    </span>
  
                    <strong>
                      {formatCurrency(
                        analysis.net_sales
                      )}
                    </strong>
                  </div>
  
                  <div className="financial-summary-row">
                    <span>
                      Less: Expenses
                    </span>
  
                    <strong className="financial-negative">
                      -
                      {formatCurrency(
                        analysis.total_expenses
                      )}
                    </strong>
                  </div>
  
                  <div className="financial-summary-divider" />
  
                  <div className="financial-summary-row total">
                    <span>
                      Net Profit
                    </span>
  
                    <strong
                      className={
                        profitPositive
                          ? "financial-positive"
                          : "financial-negative"
                      }
                    >
                      {formatCurrency(
                        analysis.net_profit
                      )}
                    </strong>
                  </div>
                </div>
  
                <div className="financial-summary-note">
                  This dashboard is an
                  internal operating analysis,
                  not a statutory profit and
                  loss statement.
                </div>
              </div>
  
            </div>
          </>
        )}
      </div>
    );
  }