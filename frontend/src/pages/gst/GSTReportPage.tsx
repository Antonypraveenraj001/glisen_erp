import {
    useCallback,
    useEffect,
    useMemo,
    useState,
  } from "react";
  
  import {
    CalendarDays,
    Download,
    FileSpreadsheet,
    Landmark,
    Loader2,
    ReceiptText,
    RefreshCcw,
    RotateCcw,
    Sigma,
    WalletCards,
  } from "lucide-react";
  
  import "./GSTReportPage.css";
  
  import {
    downloadGSTReportExcel,
    getGSTReport,
  } from "../../services/gstReportService";
  
  import type {
    GSTReportResponse,
  } from "../../types/gstReport";
  
  
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
  
  
  function formatDate(
    value: string
  ) {
    const date =
      new Date(
        `${value}T00:00:00`
      );
  
    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }
  
  
  export default function GSTReportPage() {
    const [report, setReport] =
      useState<GSTReportResponse | null>(
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
  
  
    const loadReport =
      useCallback(async () => {
        try {
          setLoading(true);
          setError(null);
  
          const data =
            await getGSTReport({
              start_date:
                startDate || undefined,
  
              end_date:
                endDate || undefined,
            });
  
          setReport(data);
        } catch (err) {
          console.error(err);
  
          setError(
            "Unable to load GST report."
          );
        } finally {
          setLoading(false);
        }
      }, [startDate, endDate]);
  
  
    useEffect(() => {
      void loadReport();
    }, [loadReport]);
  
  
    const handleReset = () => {
      setStartDate("");
      setEndDate("");
    };
  
  
    const handleDownload = async () => {
      try {
        setDownloading(true);
        setError(null);
  
        await downloadGSTReportExcel({
          start_date:
            startDate || undefined,
  
          end_date:
            endDate || undefined,
        });
      } catch (err) {
        console.error(err);
  
        setError(
          "Unable to download GST Excel report."
        );
      } finally {
        setDownloading(false);
      }
    };
  
  
    const totalDocuments =
      useMemo(() => {
        if (!report) {
          return 0;
        }
  
        return (
          report.invoice_count +
          report.credit_note_count
        );
      }, [report]);
  
  
    if (loading && !report) {
      return (
        <div className="gst-page">
          <div className="gst-loading-state">
            <Loader2
              size={24}
              className="gst-spin"
            />
  
            <span>
              Loading GST report...
            </span>
          </div>
        </div>
      );
    }
  
  
    return (
      <div className="gst-page">
  
        {/* =========================
            HEADER
        ========================== */}
  
        <div className="gst-page-header">
          <div>
            <div className="gst-eyebrow">
              TAX & SALES REPORTING
            </div>
  
            <h1 className="gst-title">
              GST Report
            </h1>
  
            <p className="gst-subtitle">
              Review taxable sales,
              GST components, credit
              adjustments, and invoice
              activity in one place.
            </p>
          </div>
  
          <button
            type="button"
            className="gst-primary-button"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2
                size={17}
                className="gst-spin"
              />
            ) : (
              <Download size={17} />
            )}
  
            Download Excel
          </button>
        </div>
  
  
        {/* =========================
            FILTERS
        ========================== */}
  
        <div className="gst-filter-card">
  
          <div className="gst-filter-heading">
            <div className="gst-filter-icon">
              <CalendarDays size={17} />
            </div>
  
            <div>
              <div className="gst-filter-title">
                Reporting Period
              </div>
  
              <div className="gst-filter-subtitle">
                Filter GST activity by date range.
              </div>
            </div>
          </div>
  
  
          <div className="gst-filter-controls">
  
            <label className="gst-field">
              <span>
                Start Date
              </span>
  
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
  
  
            <label className="gst-field">
              <span>
                End Date
              </span>
  
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
              className="gst-secondary-button"
              onClick={loadReport}
            >
              <RefreshCcw size={16} />
  
              Refresh
            </button>
  
  
            <button
              type="button"
              className="gst-ghost-button"
              onClick={handleReset}
            >
              <RotateCcw size={15} />
  
              Reset
            </button>
  
          </div>
        </div>
  
  
        {error && (
          <div className="gst-error">
            {error}
          </div>
        )}
  
  
        {report && (
          <>
            {/* =========================
                KPI CARDS
            ========================== */}
  
            <div className="gst-kpi-grid">
  
              <div className="gst-kpi-card">
                <div className="gst-kpi-top">
  
                  <div>
                    <div className="gst-kpi-label">
                      Net Taxable Sales
                    </div>
  
                    <div className="gst-kpi-value">
                      {formatCurrency(
                        report.net_taxable_amount
                      )}
                    </div>
                  </div>
  
                  <div className="gst-kpi-icon blue">
                    <FileSpreadsheet size={19} />
                  </div>
  
                </div>
  
                <div className="gst-kpi-meta">
                  Taxable value after credit notes
                </div>
              </div>
  
  
              <div className="gst-kpi-card">
                <div className="gst-kpi-top">
  
                  <div>
                    <div className="gst-kpi-label">
                      Net GST
                    </div>
  
                    <div className="gst-kpi-value">
                      {formatCurrency(
                        report.net_tax_amount
                      )}
                    </div>
                  </div>
  
                  <div className="gst-kpi-icon indigo">
                    <Sigma size={19} />
                  </div>
  
                </div>
  
                <div className="gst-kpi-meta">
                  Total CGST + SGST + IGST
                </div>
              </div>
  
  
              <div className="gst-kpi-card">
                <div className="gst-kpi-top">
  
                  <div>
                    <div className="gst-kpi-label">
                      Net Sales Total
                    </div>
  
                    <div className="gst-kpi-value">
                      {formatCurrency(
                        report.net_sales_total
                      )}
                    </div>
                  </div>
  
                  <div className="gst-kpi-icon green">
                    <Landmark size={19} />
                  </div>
  
                </div>
  
                <div className="gst-kpi-meta">
                  Sales after credit adjustments
                </div>
              </div>
  
  
              <div className="gst-kpi-card">
                <div className="gst-kpi-top">
  
                  <div>
                    <div className="gst-kpi-label">
                      Invoices
                    </div>
  
                    <div className="gst-kpi-value">
                      {report.invoice_count}
                    </div>
                  </div>
  
                  <div className="gst-kpi-icon blue">
                    <ReceiptText size={19} />
                  </div>
  
                </div>
  
                <div className="gst-kpi-meta">
                  Effective invoices
                </div>
              </div>
  
  
              <div className="gst-kpi-card">
                <div className="gst-kpi-top">
  
                  <div>
                    <div className="gst-kpi-label">
                      Credit Notes
                    </div>
  
                    <div className="gst-kpi-value">
                      {report.credit_note_count}
                    </div>
                  </div>
  
                  <div className="gst-kpi-icon rose">
                    <WalletCards size={19} />
                  </div>
  
                </div>
  
                <div className="gst-kpi-meta">
                  {totalDocuments} total documents
                </div>
              </div>
  
            </div>
  
  
            {/* =========================
                TAX BREAKDOWN
            ========================== */}
  
            <div className="gst-tax-grid">
  
              <div className="gst-tax-card">
                <div className="gst-tax-label">
                  CGST
                </div>
  
                <div className="gst-tax-value">
                  {formatCurrency(
                    report.net_cgst_amount
                  )}
                </div>
  
                <div className="gst-tax-detail">
                  Gross{" "}
                  {formatCurrency(
                    report.gross_cgst_amount
                  )}
                  {" · "}
                  Credit{" "}
                  {formatCurrency(
                    report.credit_cgst_amount
                  )}
                </div>
              </div>
  
  
              <div className="gst-tax-card">
                <div className="gst-tax-label">
                  SGST
                </div>
  
                <div className="gst-tax-value">
                  {formatCurrency(
                    report.net_sgst_amount
                  )}
                </div>
  
                <div className="gst-tax-detail">
                  Gross{" "}
                  {formatCurrency(
                    report.gross_sgst_amount
                  )}
                  {" · "}
                  Credit{" "}
                  {formatCurrency(
                    report.credit_sgst_amount
                  )}
                </div>
              </div>
  
  
              <div className="gst-tax-card">
                <div className="gst-tax-label">
                  IGST
                </div>
  
                <div className="gst-tax-value">
                  {formatCurrency(
                    report.net_igst_amount
                  )}
                </div>
  
                <div className="gst-tax-detail">
                  Gross{" "}
                  {formatCurrency(
                    report.gross_igst_amount
                  )}
                  {" · "}
                  Credit{" "}
                  {formatCurrency(
                    report.credit_igst_amount
                  )}
                </div>
              </div>
  
            </div>
  
  
            {/* =========================
                DOCUMENT TABLE
            ========================== */}
  
            <div className="gst-panel">
  
              <div className="gst-panel-header">
  
                <div>
                  <div className="gst-panel-title">
                    GST Document Details
                  </div>
  
                  <div className="gst-panel-subtitle">
                    Invoice and credit-note activity
                    for the selected period.
                  </div>
                </div>
  
                <div className="gst-panel-badge">
                  {report.items.length} records
                </div>
  
              </div>
  
  
              {report.items.length === 0 ? (
                <div className="gst-empty-state">
                  <ReceiptText size={22} />
  
                  <div>
                    No GST documents found
                    for this period.
                  </div>
                </div>
              ) : (
                <div className="gst-table-wrap">
                  <table className="gst-table">
  
                    <thead>
                      <tr>
                        <th>
                          Date
                        </th>
  
                        <th>
                          Document
                        </th>
  
                        <th>
                          Type
                        </th>
  
                        <th>
                          Customer
                        </th>
  
                        <th>
                          GSTIN
                        </th>
  
                        <th className="align-right">
                          Taxable
                        </th>
  
                        <th className="align-right">
                          CGST
                        </th>
  
                        <th className="align-right">
                          SGST
                        </th>
  
                        <th className="align-right">
                          IGST
                        </th>
  
                        <th className="align-right">
                          GST
                        </th>
  
                        <th className="align-right">
                          Total
                        </th>
                      </tr>
                    </thead>
  
  
                    <tbody>
                      {report.items.map(
                        (item) => (
                          <tr
                            key={item.document_id}
                          >
                            <td>
                              {formatDate(
                                item.document_date
                              )}
                            </td>
  
                            <td>
                              <div className="gst-document-number">
                                {item.document_number}
                              </div>
  
                              {item.reference_invoice_number && (
                                <div className="gst-document-reference">
                                  Ref:{" "}
                                  {
                                    item.reference_invoice_number
                                  }
                                </div>
                              )}
                            </td>
  
                            <td>
                              <span
                                className={
                                  item.document_type ===
                                  "Credit Note"
                                    ? "gst-document-type credit"
                                    : "gst-document-type invoice"
                                }
                              >
                                {item.document_type}
                              </span>
                            </td>
  
                            <td>
                              {item.company_name}
                            </td>
  
                            <td>
                              {
                                item.gst_number ||
                                "—"
                              }
                            </td>
  
                            <td className="align-right gst-money">
                              {formatCurrency(
                                item.taxable_amount
                              )}
                            </td>
  
                            <td className="align-right">
                              {formatCurrency(
                                item.cgst_amount
                              )}
                            </td>
  
                            <td className="align-right">
                              {formatCurrency(
                                item.sgst_amount
                              )}
                            </td>
  
                            <td className="align-right">
                              {formatCurrency(
                                item.igst_amount
                              )}
                            </td>
  
                            <td className="align-right gst-money">
                              {formatCurrency(
                                item.tax_amount
                              )}
                            </td>
  
                            <td className="align-right gst-total-money">
                              {formatCurrency(
                                item.grand_total
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
  
                  </table>
                </div>
              )}
  
            </div>
          </>
        )}
      </div>
    );
  }