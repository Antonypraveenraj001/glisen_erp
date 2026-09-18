import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Printer,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";

import "./GSTReportPage.css";

import {
  downloadGSTReportExcel,
  downloadPurchaseGSTReportExcel,
  getGSTReport,
  getPurchaseGSTReport,
} from "../../services/gstReportService";

import type {
  GSTReportResponse,
} from "../../types/gstReport";


type ReportType =
  | "sales"
  | "purchase";


type PeriodType =
  | "monthly"
  | "quarterly"
  | "financial-year"
  | "custom";


interface DateRange {
  start_date: string;
  end_date: string;
  label: string;
}


interface NormalizedGSTRow {
  key: string;

  date: string;

  document_number: string;

  document_type: string;

  party_name: string;

  gst_number: string;

  taxable_amount: number;

  cgst_amount: number;

  sgst_amount: number;

  igst_amount: number;

  tax_amount: number;

  grand_total: number;
}


interface NormalizedGSTReport {
  document_count: number;

  taxable_amount: number;

  cgst_amount: number;

  sgst_amount: number;

  igst_amount: number;

  tax_amount: number;

  grand_total: number;

  rows: NormalizedGSTRow[];
}


/* ================================================================
   GENERAL HELPERS
================================================================ */

function formatCurrency(
  value:
    string
    | number
    | null
    | undefined
) {

  const numeric =
    Number(
      value ?? 0
    );


  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(
    Number.isNaN(
      numeric
    )
      ? 0
      : numeric
  );
}


function formatDate(
  value:
    string
    | null
    | undefined
) {

  if (!value) {
    return "—";
  }


  const raw =
    value.slice(
      0,
      10
    );


  const date =
    new Date(
      `${raw}T00:00:00`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }


  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}


function pad(
  value: number
) {

  return String(
    value
  ).padStart(
    2,
    "0"
  );
}


function makeDate(
  year: number,
  month: number,
  day: number
) {

  return (
    `${year}-`
    + `${pad(month)}-`
    + `${pad(day)}`
  );
}


function getLastDay(
  year: number,
  month: number
) {

  return new Date(
    year,
    month,
    0
  ).getDate();
}


function getCurrentFYStart() {

  const now =
    new Date();


  return (
    now.getMonth() + 1
    >= 4
      ? now.getFullYear()
      : now.getFullYear() - 1
  );
}


function getCurrentQuarter() {

  const month =
    new Date()
      .getMonth()
      + 1;


  if (
    month >= 4
    && month <= 6
  ) {
    return 1;
  }


  if (
    month >= 7
    && month <= 9
  ) {
    return 2;
  }


  if (
    month >= 10
    && month <= 12
  ) {
    return 3;
  }


  return 4;
}


function getCurrentMonthValue() {

  const now =
    new Date();


  return (
    `${now.getFullYear()}-`
    + `${pad(
      now.getMonth() + 1
    )}`
  );
}


function financialYearLabel(
  startYear: number
) {

  return (
    `${startYear}-`
    + `${String(
      startYear + 1
    ).slice(-2)}`
  );
}


/* ================================================================
   UNKNOWN OBJECT HELPERS

   Purchase GST response is intentionally normalized here so the
   frontend remains compatible with equivalent backend field names.
================================================================ */

function asRecord(
  value: unknown
): Record<string, unknown> {

  if (
    typeof value
      === "object"
    && value !== null
  ) {
    return value as
      Record<string, unknown>;
  }


  return {};
}


function pickValue(
  record:
    Record<string, unknown>,

  keys:
    string[]
) {

  for (
    const key
    of keys
  ) {

    const value =
      record[key];


    if (
      value !== undefined
      && value !== null
    ) {
      return value;
    }

  }


  return undefined;
}


function pickString(
  record:
    Record<string, unknown>,

  keys:
    string[]
) {

  const value =
    pickValue(
      record,
      keys
    );


  if (
    value === undefined
    || value === null
  ) {
    return "";
  }


  return String(
    value
  );
}


function pickNumber(
  record:
    Record<string, unknown>,

  keys:
    string[]
) {

  const value =
    pickValue(
      record,
      keys
    );


  const numberValue =
    Number(
      value ?? 0
    );


  return Number.isNaN(
    numberValue
  )
    ? 0
    : numberValue;
}


/* ================================================================
   SALES NORMALIZER
================================================================ */

function normalizeSalesReport(
  source:
    GSTReportResponse
): NormalizedGSTReport {

  return {
    document_count:
      source.invoice_count
      + source.credit_note_count,

    taxable_amount:
      Number(
        source.net_taxable_amount
      ),

    cgst_amount:
      Number(
        source.net_cgst_amount
      ),

    sgst_amount:
      Number(
        source.net_sgst_amount
      ),

    igst_amount:
      Number(
        source.net_igst_amount
      ),

    tax_amount:
      Number(
        source.net_tax_amount
      ),

    grand_total:
      Number(
        source.net_sales_total
      ),

    rows:
      source.items.map(
        item => ({
          key:
            `sales-${item.document_id}`,

          date:
            item.document_date,

          document_number:
            item.document_number,

          document_type:
            item.document_type,

          party_name:
            item.company_name,

          gst_number:
            item.gst_number
            || "—",

          taxable_amount:
            Number(
              item.taxable_amount
            ),

          cgst_amount:
            Number(
              item.cgst_amount
            ),

          sgst_amount:
            Number(
              item.sgst_amount
            ),

          igst_amount:
            Number(
              item.igst_amount
            ),

          tax_amount:
            Number(
              item.tax_amount
            ),

          grand_total:
            Number(
              item.grand_total
            ),
        })
      ),
  };
}


/* ================================================================
   PURCHASE NORMALIZER
================================================================ */

function normalizePurchaseReport(
  source:
    unknown
): NormalizedGSTReport {

  const report =
    asRecord(
      source
    );


  const sourceItems =
    Array.isArray(
      report.items
    )
      ? report.items
      : [];


  const rows:
    NormalizedGSTRow[] =
    sourceItems.map(
      (
        sourceItem,
        index
      ) => {

        const item =
          asRecord(
            sourceItem
          );


        return {
          key:
            `purchase-${
              pickString(
                item,
                [
                  "purchase_bill_id",
                  "document_id",
                  "id",
                ]
              )
              || index
            }`,

          date:
            pickString(
              item,
              [
                "bill_date",
                "document_date",
                "date",
              ]
            ),

          document_number:
            pickString(
              item,
              [
                "bill_number",
                "document_number",
              ]
            ),

          document_type:
            "Purchase Bill",

          party_name:
            pickString(
              item,
              [
                "supplier_name",
                "company_name",
              ]
            ),

          gst_number:
            pickString(
              item,
              [
                "supplier_gst_number",
                "gst_number",
              ]
            )
            || "—",

          taxable_amount:
            pickNumber(
              item,
              [
                "taxable_amount",
                "subtotal",
              ]
            ),

          cgst_amount:
            pickNumber(
              item,
              [
                "cgst_amount",
              ]
            ),

          sgst_amount:
            pickNumber(
              item,
              [
                "sgst_amount",
              ]
            ),

          igst_amount:
            pickNumber(
              item,
              [
                "igst_amount",
              ]
            ),

          tax_amount:
            pickNumber(
              item,
              [
                "tax_amount",
                "total_gst",
              ]
            ),

          grand_total:
            pickNumber(
              item,
              [
                "grand_total",
              ]
            ),
        };

      }
    );


  function total(
    field:
      | "taxable_amount"
      | "cgst_amount"
      | "sgst_amount"
      | "igst_amount"
      | "tax_amount"
      | "grand_total"
  ) {

    return rows.reduce(
      (
        sum,
        row
      ) =>
        sum
        + row[field],
      0
    );
  }


  return {
    document_count:
      pickNumber(
        report,
        [
          "purchase_bill_count",
          "bill_count",
          "document_count",
        ]
      )
      || rows.length,

    taxable_amount:
      pickNumber(
        report,
        [
          "total_taxable_amount",
          "taxable_amount",
        ]
      )
      || total(
        "taxable_amount"
      ),

    cgst_amount:
      pickNumber(
        report,
        [
          "total_cgst_amount",
          "cgst_amount",
        ]
      )
      || total(
        "cgst_amount"
      ),

    sgst_amount:
      pickNumber(
        report,
        [
          "total_sgst_amount",
          "sgst_amount",
        ]
      )
      || total(
        "sgst_amount"
      ),

    igst_amount:
      pickNumber(
        report,
        [
          "total_igst_amount",
          "igst_amount",
        ]
      )
      || total(
        "igst_amount"
      ),

    tax_amount:
      pickNumber(
        report,
        [
          "total_tax_amount",
          "tax_amount",
          "total_gst",
        ]
      )
      || total(
        "tax_amount"
      ),

    grand_total:
      pickNumber(
        report,
        [
          "total_bill_amount",
          "grand_total",
          "purchase_total",
        ]
      )
      || total(
        "grand_total"
      ),

    rows,
  };
}


/* ================================================================
   PAGE
================================================================ */

export default function GSTReportPage() {

  const currentFY =
    getCurrentFYStart();


  const [
    reportType,
    setReportType,
  ] =
    useState<ReportType>(
      "sales"
    );


  const [
    periodType,
    setPeriodType,
  ] =
    useState<PeriodType>(
      "monthly"
    );


  const [
    selectedMonth,
    setSelectedMonth,
  ] =
    useState(
      getCurrentMonthValue()
    );


  const [
    financialYear,
    setFinancialYear,
  ] =
    useState(
      currentFY
    );


  const [
    quarter,
    setQuarter,
  ] =
    useState(
      getCurrentQuarter()
    );


  const [
    customStart,
    setCustomStart,
  ] =
    useState(
      ""
    );


  const [
    customEnd,
    setCustomEnd,
  ] =
    useState(
      ""
    );


  const [
    report,
    setReport,
  ] =
    useState<
      NormalizedGSTReport
      | null
    >(
      null
    );


  const [
    activeRange,
    setActiveRange,
  ] =
    useState<
      DateRange
      | null
    >(
      null
    );


  const [
    activeReportType,
    setActiveReportType,
  ] =
    useState<ReportType>(
      "sales"
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );


  const [
    downloading,
    setDownloading,
  ] =
    useState(
      false
    );


  const [
    error,
    setError,
  ] =
    useState(
      ""
    );


  /* ==============================================================
     FINANCIAL YEAR OPTIONS
  ============================================================== */

  const financialYearOptions =
    useMemo(
      () => {

        const years:
          number[] =
          [];


        for (
          let offset = -5;
          offset <= 3;
          offset += 1
        ) {

          years.push(
            currentFY
            + offset
          );

        }


        return years;

      },
      [
        currentFY,
      ]
    );


  /* ==============================================================
     RESOLVE PERIOD
  ============================================================== */

  function resolvePeriod():
    DateRange {

    /* ----------------------------------------------------------
       MONTH
    ---------------------------------------------------------- */

    if (
      periodType
      === "monthly"
    ) {

      if (
        !selectedMonth
      ) {
        throw new Error(
          "Select a month."
        );
      }


      const parts =
        selectedMonth.split(
          "-"
        );


      const year =
        Number(
          parts[0]
        );


      const month =
        Number(
          parts[1]
        );


      if (
        !year
        || !month
      ) {
        throw new Error(
          "Select a valid month."
        );
      }


      const label =
        new Date(
          year,
          month - 1,
          1
        ).toLocaleDateString(
          "en-IN",
          {
            month: "long",
            year: "numeric",
          }
        );


      return {
        start_date:
          makeDate(
            year,
            month,
            1
          ),

        end_date:
          makeDate(
            year,
            month,
            getLastDay(
              year,
              month
            )
          ),

        label,
      };
    }


    /* ----------------------------------------------------------
       QUARTER
    ---------------------------------------------------------- */

    if (
      periodType
      === "quarterly"
    ) {

      if (
        quarter === 1
      ) {

        return {
          start_date:
            `${financialYear}-04-01`,

          end_date:
            `${financialYear}-06-30`,

          label:
            `Q1 FY ${financialYearLabel(
              financialYear
            )}`,
        };
      }


      if (
        quarter === 2
      ) {

        return {
          start_date:
            `${financialYear}-07-01`,

          end_date:
            `${financialYear}-09-30`,

          label:
            `Q2 FY ${financialYearLabel(
              financialYear
            )}`,
        };
      }


      if (
        quarter === 3
      ) {

        return {
          start_date:
            `${financialYear}-10-01`,

          end_date:
            `${financialYear}-12-31`,

          label:
            `Q3 FY ${financialYearLabel(
              financialYear
            )}`,
        };
      }


      return {
        start_date:
          `${financialYear + 1}-01-01`,

        end_date:
          `${financialYear + 1}-03-31`,

        label:
          `Q4 FY ${financialYearLabel(
            financialYear
          )}`,
      };
    }


    /* ----------------------------------------------------------
       FINANCIAL YEAR
    ---------------------------------------------------------- */

    if (
      periodType
      === "financial-year"
    ) {

      return {
        start_date:
          `${financialYear}-04-01`,

        end_date:
          `${financialYear + 1}-03-31`,

        label:
          `FY ${financialYearLabel(
            financialYear
          )}`,
      };
    }


    /* ----------------------------------------------------------
       CUSTOM
    ---------------------------------------------------------- */

    if (
      !customStart
      || !customEnd
    ) {
      throw new Error(
        "Select both start date and end date."
      );
    }


    if (
      customStart
      > customEnd
    ) {
      throw new Error(
        "Start date cannot be after end date."
      );
    }


    return {
      start_date:
        customStart,

      end_date:
        customEnd,

      label:
        `${formatDate(
          customStart
        )} to ${formatDate(
          customEnd
        )}`,
    };
  }


  /* ==============================================================
     LOAD REPORT
  ============================================================== */

  async function loadReport(
    type:
      ReportType,

    range:
      DateRange
  ) {

    try {

      setLoading(
        true
      );

      setError(
        ""
      );


      if (
        type === "sales"
      ) {

        const response =
          await getGSTReport({
            start_date:
              range.start_date,

            end_date:
              range.end_date,
          });


        setReport(
          normalizeSalesReport(
            response
          )
        );

      } else {

        const response =
          await getPurchaseGSTReport({
            start_date:
              range.start_date,

            end_date:
              range.end_date,
          });


        setReport(
          normalizePurchaseReport(
            response
          )
        );

      }


      setActiveRange(
        range
      );


      setActiveReportType(
        type
      );

    } catch (
      err
    ) {

      console.error(
        "GST report loading error:",
        err
      );


      setReport(
        null
      );


      setError(
        err instanceof Error
          ? err.message
          : "Unable to load GST report."
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  /* ==============================================================
     INITIAL CURRENT-MONTH SALES VIEW
  ============================================================== */

  useEffect(
    () => {

      const currentMonth =
        getCurrentMonthValue();


      const [
        yearText,
        monthText,
      ] =
        currentMonth.split(
          "-"
        );


      const year =
        Number(
          yearText
        );


      const month =
        Number(
          monthText
        );


      const range:
        DateRange =
        {
          start_date:
            makeDate(
              year,
              month,
              1
            ),

          end_date:
            makeDate(
              year,
              month,
              getLastDay(
                year,
                month
              )
            ),

          label:
            new Date(
              year,
              month - 1,
              1
            ).toLocaleDateString(
              "en-IN",
              {
                month: "long",
                year: "numeric",
              }
            ),
        };


      void loadReport(
        "sales",
        range
      );

      // Initial load only.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );


  /* ==============================================================
     VIEW REPORT
  ============================================================== */

  async function handleView() {

    try {

      setError(
        ""
      );


      const range =
        resolvePeriod();


      await loadReport(
        reportType,
        range
      );

    } catch (
      err
    ) {

      setError(
        err instanceof Error
          ? err.message
          : "Invalid reporting period."
      );

    }

  }


  /* ==============================================================
     DOWNLOAD EXCEL
  ============================================================== */

  async function handleDownload() {

    if (
      !activeRange
      || !report
    ) {
      return;
    }


    try {

      setDownloading(
        true
      );

      setError(
        ""
      );


      const filters =
        {
          start_date:
            activeRange.start_date,

          end_date:
            activeRange.end_date,
        };


      if (
        activeReportType
        === "sales"
      ) {

        await downloadGSTReportExcel(
          filters
        );

      } else {

        await downloadPurchaseGSTReportExcel(
          filters
        );

      }

    } catch (
      err
    ) {

      console.error(
        "GST Excel download error:",
        err
      );


      setError(
        "Unable to download GST Excel report."
      );

    } finally {

      setDownloading(
        false
      );

    }

  }


  /* ==============================================================
     PRINT

     IMPORTANT:
     Only the dedicated GST print document is copied to a temporary
     window. The ERP sidebar/topbar/layout therefore cannot create
     phantom blank pages.
  ============================================================== */

  function handlePrint() {

    if (
      !report
      || !activeRange
    ) {
      return;
    }


    const printElement =
      document.querySelector(
        ".gst-print-sheet"
      ) as HTMLElement | null;


    if (
      !printElement
    ) {
      setError(
        "Unable to prepare GST report for printing."
      );

      return;
    }


    const reportName =
      activeReportType
      === "sales"
        ? "Sales GST Report"
        : "Purchase GST Report";


    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1200,height=800"
      );


    if (
      !printWindow
    ) {

      setError(
        "Unable to open print preview. Please allow pop-ups for this site."
      );

      return;
    }


    printWindow.document.open();


    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

        <head>

          <meta charset="UTF-8" />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />

          <title>
            ${reportName}
          </title>

          <style>

            @page {
              size: A4 landscape;

              margin:
                10mm
                12mm
                10mm
                12mm;
            }


            * {
              box-sizing: border-box;
            }


            html,
            body {
              margin: 0;

              padding: 0;

              width: 100%;

              background: #ffffff;

              color: #12233f;

              font-family:
                Arial,
                Helvetica,
                sans-serif;
            }


            body {
              -webkit-print-color-adjust:
                exact;

              print-color-adjust:
                exact;
            }


            .gst-print-sheet {
              display: block !important;

              position: static !important;

              width: 100%;

              max-width: none;

              min-height: 0;

              margin: 0;

              padding: 0;

              visibility: visible !important;

              background: #ffffff;

              break-after: auto;

              page-break-after: auto;
            }


            .gst-print-sheet * {
              visibility: visible !important;
            }


            /* ================================================
               COMPANY LETTERHEAD AREA
            ================================================= */

            .gst-print-letterhead {
              display: block;

              height: 22mm;

              margin: 0;

              padding: 0;
            }


            /* ================================================
               REPORT HEADER
            ================================================= */

            .gst-print-header {
              display: flex;

              justify-content:
                space-between;

              align-items:
                flex-start;

              gap: 20px;

              padding-bottom: 8px;

              border-bottom:
                1.5px solid #263d5f;

              break-inside:
                avoid;

              page-break-inside:
                avoid;
            }


            .gst-print-eyebrow {
              margin-bottom: 4px;

              font-size: 8px;

              font-weight: 700;

              letter-spacing:
                1.2px;

              color: #3769c8;
            }


            .gst-print-header h1 {
              margin:
                0
                0
                4px;

              padding: 0;

              font-size: 18px;

              line-height: 1.15;

              color: #12233f;
            }


            .gst-print-period {
              font-size: 8.5px;

              line-height: 1.4;

              color: #536783;
            }


            .gst-print-count {
              min-width: 70px;

              text-align: right;
            }


            .gst-print-count span {
              display: block;

              margin-bottom: 3px;

              font-size: 7px;

              color: #75859c;
            }


            .gst-print-count strong {
              display: block;

              font-size: 15px;

              color: #12233f;
            }


            /* ================================================
               SUMMARY
            ================================================= */

            .gst-print-summary {
              display: grid;

              grid-template-columns:
                repeat(
                  6,
                  minmax(
                    0,
                    1fr
                  )
                );

              gap: 5px;

              margin:
                9px
                0;

              break-inside:
                avoid;

              page-break-inside:
                avoid;
            }


            .gst-print-summary > div {
              min-height: 38px;

              padding:
                6px
                7px;

              border:
                1px solid #cbd7e8;

              border-radius: 3px;

              break-inside:
                avoid;

              page-break-inside:
                avoid;
            }


            .gst-print-summary span {
              display: block;

              margin-bottom: 4px;

              font-size: 6.8px;

              font-weight: 600;

              color: #61728b;
            }


            .gst-print-summary strong {
              display: block;

              font-size: 10px;

              font-weight: 700;

              color: #12233f;
            }


            /* ================================================
               GST TABLE
            ================================================= */

            .gst-print-table {
              width: 100%;

              border-collapse:
                collapse;

              table-layout:
                fixed;

              margin: 0;

              font-size: 6.8px;
            }


            .gst-print-table thead {
              display:
                table-header-group;
            }


            .gst-print-table tfoot {
              display:
                table-footer-group;
            }


            .gst-print-table tr {
              break-inside:
                avoid;

              page-break-inside:
                avoid;
            }


            .gst-print-table th,
            .gst-print-table td {
              padding:
                5px
                4px;

              border:
                1px solid #cbd7e8;

              vertical-align:
                middle;

              overflow-wrap:
                anywhere;

              word-break:
                normal;
            }


            .gst-print-table th {
              background: #eef4fc;

              font-size: 6.2px;

              font-weight: 700;

              text-transform:
                uppercase;

              color: #3d526f;

              text-align: left;
            }


            .gst-print-table th:nth-child(n+5),
            .gst-print-table td:nth-child(n+5) {
              text-align: right;
            }


            .gst-print-table td {
              color: #263a56;
            }


            .gst-print-table tbody tr:nth-child(even) {
              background: #fafcff;
            }


            .gst-print-table tfoot td {
              font-weight: 700;

              background: #f2f6fc;

              color: #12233f;
            }


            .gst-print-table tfoot td:first-child {
              text-align: right;
            }


            /* ================================================
               COLUMN WIDTHS
            ================================================= */

            .gst-print-table th:nth-child(1),
            .gst-print-table td:nth-child(1) {
              width: 8%;
            }


            .gst-print-table th:nth-child(2),
            .gst-print-table td:nth-child(2) {
              width: 14%;
            }


            .gst-print-table th:nth-child(3),
            .gst-print-table td:nth-child(3) {
              width: 15%;
            }


            .gst-print-table th:nth-child(4),
            .gst-print-table td:nth-child(4) {
              width: 11%;
            }


            .gst-print-table th:nth-child(5),
            .gst-print-table td:nth-child(5) {
              width: 10%;
            }


            .gst-print-table th:nth-child(6),
            .gst-print-table td:nth-child(6),
            .gst-print-table th:nth-child(7),
            .gst-print-table td:nth-child(7),
            .gst-print-table th:nth-child(8),
            .gst-print-table td:nth-child(8) {
              width: 7%;
            }


            .gst-print-table th:nth-child(9),
            .gst-print-table td:nth-child(9) {
              width: 8%;
            }


            .gst-print-table th:nth-child(10),
            .gst-print-table td:nth-child(10) {
              width: 10%;
            }


            /* ================================================
               FOOTER
            ================================================= */

            .gst-print-footer {
              margin-top: 8px;

              padding-top: 5px;

              border-top:
                1px solid #d8e1ee;

              text-align: right;

              font-size: 6.5px;

              color: #74859d;

              break-inside:
                avoid;

              page-break-inside:
                avoid;
            }


            @media print {

              html,
              body {
                width: auto;

                height: auto;

                min-height: 0;

                overflow: visible;
              }


              body {
                margin: 0 !important;

                padding: 0 !important;
              }


              .gst-print-sheet {
                display: block !important;

                position: static !important;

                width: 100% !important;

                min-height: 0 !important;

                margin: 0 !important;

                padding: 0 !important;

                overflow: visible !important;

                break-after: auto !important;

                page-break-after: auto !important;
              }

            }

          </style>

        </head>


        <body>

          ${printElement.outerHTML}

        </body>

      </html>
    `);


    printWindow.document.close();


    printWindow.focus();


    window.setTimeout(
      () => {

        printWindow.print();


        printWindow.onafterprint =
          () => {

            printWindow.close();

          };

      },
      300
    );
  }


  /* ==============================================================
     REPORT TYPE CHANGE
  ============================================================== */

  function changeReportType(
    type:
      ReportType
  ) {

    setReportType(
      type
    );


    setReport(
      null
    );


    setActiveRange(
      null
    );


    setError(
      ""
    );
  }


  const reportTitle =
    activeReportType
    === "sales"
      ? "Sales GST Report"
      : "Purchase GST Report";


  const partyHeading =
    activeReportType
    === "sales"
      ? "Customer"
      : "Supplier";


  return (
    <div className="gst-page">

      {/* ========================================================
          SCREEN VERSION
      ========================================================= */}

      <div className="gst-screen">

        {/* ======================================================
            HEADER
        ======================================================= */}

        <header className="gst-page-header">

          <div>

            <div className="gst-eyebrow">
              TAX REPORTING
            </div>


            <h1 className="gst-title">
              GST Reports
            </h1>


            <p className="gst-subtitle">
              View, print and download
              Sales GST and Purchase GST
              by month, quarter,
              financial year or a
              custom date range.
            </p>

          </div>

        </header>


        {/* ======================================================
            SALES / PURCHASE TABS
        ======================================================= */}

        <div className="gst-report-tabs">

          <button
            type="button"
            className={
              reportType
              === "sales"
                ? "gst-report-tab active"
                : "gst-report-tab"
            }
            onClick={() =>
              changeReportType(
                "sales"
              )
            }
          >

            <ReceiptText
              size={17}
            />

            Sales GST

          </button>


          <button
            type="button"
            className={
              reportType
              === "purchase"
                ? "gst-report-tab active"
                : "gst-report-tab"
            }
            onClick={() =>
              changeReportType(
                "purchase"
              )
            }
          >

            <ShoppingCart
              size={17}
            />

            Purchase GST

          </button>

        </div>


        {/* ======================================================
            PERIOD SELECTION
        ======================================================= */}

        <section className="gst-period-card">

          <div className="gst-period-heading">

            <div className="gst-period-icon">

              <CalendarDays
                size={18}
              />

            </div>


            <div>

              <h2>
                Reporting Period
              </h2>

              <p>
                Select how the GST report
                should be grouped and viewed.
              </p>

            </div>

          </div>


          {/* PERIOD TYPE */}

          <div className="gst-period-types">

            <button
              type="button"
              className={
                periodType
                === "monthly"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPeriodType(
                  "monthly"
                )
              }
            >
              Monthly
            </button>


            <button
              type="button"
              className={
                periodType
                === "quarterly"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPeriodType(
                  "quarterly"
                )
              }
            >
              Quarterly
            </button>


            <button
              type="button"
              className={
                periodType
                === "financial-year"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPeriodType(
                  "financial-year"
                )
              }
            >
              Financial Year
            </button>


            <button
              type="button"
              className={
                periodType
                === "custom"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setPeriodType(
                  "custom"
                )
              }
            >
              Custom Date
            </button>

          </div>


          {/* ====================================================
              MONTH
          ===================================================== */}

          {
            periodType
            === "monthly"
            && (
              <div className="gst-period-fields">

                <label>

                  <span>
                    Month
                  </span>


                  <input
                    type="month"
                    value={
                      selectedMonth
                    }
                    onChange={
                      event =>
                        setSelectedMonth(
                          event.target.value
                        )
                    }
                  />

                </label>

              </div>
            )
          }


          {/* ====================================================
              QUARTER
          ===================================================== */}

          {
            periodType
            === "quarterly"
            && (
              <div className="gst-period-fields">

                <label>

                  <span>
                    Financial Year
                  </span>


                  <select
                    value={
                      financialYear
                    }
                    onChange={
                      event =>
                        setFinancialYear(
                          Number(
                            event.target.value
                          )
                        )
                    }
                  >

                    {
                      financialYearOptions.map(
                        year => (
                          <option
                            key={
                              year
                            }
                            value={
                              year
                            }
                          >
                            {
                              financialYearLabel(
                                year
                              )
                            }
                          </option>
                        )
                      )
                    }

                  </select>

                </label>


                <label>

                  <span>
                    Quarter
                  </span>


                  <select
                    value={
                      quarter
                    }
                    onChange={
                      event =>
                        setQuarter(
                          Number(
                            event.target.value
                          )
                        )
                    }
                  >

                    <option value={1}>
                      Q1 · Apr - Jun
                    </option>

                    <option value={2}>
                      Q2 · Jul - Sep
                    </option>

                    <option value={3}>
                      Q3 · Oct - Dec
                    </option>

                    <option value={4}>
                      Q4 · Jan - Mar
                    </option>

                  </select>

                </label>

              </div>
            )
          }


          {/* ====================================================
              FINANCIAL YEAR
          ===================================================== */}

          {
            periodType
            === "financial-year"
            && (
              <div className="gst-period-fields">

                <label>

                  <span>
                    Financial Year
                  </span>


                  <select
                    value={
                      financialYear
                    }
                    onChange={
                      event =>
                        setFinancialYear(
                          Number(
                            event.target.value
                          )
                        )
                    }
                  >

                    {
                      financialYearOptions.map(
                        year => (
                          <option
                            key={
                              year
                            }
                            value={
                              year
                            }
                          >
                            {
                              financialYearLabel(
                                year
                              )
                            }
                          </option>
                        )
                      )
                    }

                  </select>

                </label>

              </div>
            )
          }


          {/* ====================================================
              CUSTOM DATE
          ===================================================== */}

          {
            periodType
            === "custom"
            && (
              <div className="gst-period-fields">

                <label>

                  <span>
                    Start Date
                  </span>


                  <input
                    type="date"
                    value={
                      customStart
                    }
                    onChange={
                      event =>
                        setCustomStart(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  <span>
                    End Date
                  </span>


                  <input
                    type="date"
                    value={
                      customEnd
                    }
                    onChange={
                      event =>
                        setCustomEnd(
                          event.target.value
                        )
                    }
                  />

                </label>

              </div>
            )
          }


          {/* ====================================================
              ACTIONS
          ===================================================== */}

          <div className="gst-period-actions">

            <button
              type="button"
              className="gst-view-button"
              onClick={() =>
                void handleView()
              }
              disabled={
                loading
              }
            >

              {
                loading
                  ? (
                    <Loader2
                      size={17}
                      className="gst-spin"
                    />
                  )
                  : (
                    <Eye
                      size={17}
                    />
                  )
              }

              View Report

            </button>


            <button
              type="button"
              className="gst-secondary-button"
              onClick={
                handlePrint
              }
              disabled={
                !report
                || !activeRange
              }
            >

              <Printer
                size={16}
              />

              Print

            </button>


            <button
              type="button"
              className="gst-secondary-button"
              onClick={() =>
                void handleDownload()
              }
              disabled={
                !report
                || !activeRange
                || downloading
              }
            >

              {
                downloading
                  ? (
                    <Loader2
                      size={16}
                      className="gst-spin"
                    />
                  )
                  : (
                    <Download
                      size={16}
                    />
                  )
              }

              Download Excel

            </button>

          </div>

        </section>


        {/* ======================================================
            ERROR
        ======================================================= */}

        {
          error
          && (
            <div className="gst-error">
              {error}
            </div>
          )
        }


        {/* ======================================================
            REPORT BODY
        ======================================================= */}

        {
          loading
          && !report
            ? (
              <div className="gst-loading-state">

                <Loader2
                  size={23}
                  className="gst-spin"
                />

                Loading GST report...

              </div>
            )
            : report
              && activeRange
              ? (
                <>

                  {/* ==================================================
                      REPORT TITLE
                  =================================================== */}

                  <div className="gst-report-heading">

                    <div>

                      <div className="gst-report-heading-label">

                        {
                          activeReportType
                          === "sales"
                            ? "SALES GST"
                            : "PURCHASE GST"
                        }

                      </div>


                      <h2>
                        {reportTitle}
                      </h2>


                      <p>

                        {
                          activeRange.label
                        }

                        {" · "}

                        {
                          formatDate(
                            activeRange.start_date
                          )
                        }

                        {" to "}

                        {
                          formatDate(
                            activeRange.end_date
                          )
                        }

                      </p>

                    </div>


                    <div className="gst-record-count">

                      {
                        report.document_count
                      }{" "}

                      document
                      {
                        report.document_count
                        === 1
                          ? ""
                          : "s"
                      }

                    </div>

                  </div>


                  {/* ==================================================
                      SUMMARY
                  =================================================== */}

                  <div className="gst-summary-grid">

                    <SummaryCard
                      label="Taxable Value"
                      value={
                        formatCurrency(
                          report.taxable_amount
                        )
                      }
                    />


                    <SummaryCard
                      label="CGST"
                      value={
                        formatCurrency(
                          report.cgst_amount
                        )
                      }
                    />


                    <SummaryCard
                      label="SGST"
                      value={
                        formatCurrency(
                          report.sgst_amount
                        )
                      }
                    />


                    <SummaryCard
                      label="IGST"
                      value={
                        formatCurrency(
                          report.igst_amount
                        )
                      }
                    />


                    <SummaryCard
                      label="Total GST"
                      value={
                        formatCurrency(
                          report.tax_amount
                        )
                      }
                    />


                    <SummaryCard
                      label={
                        activeReportType
                        === "sales"
                          ? "Net Sales Total"
                          : "Purchase Total"
                      }
                      value={
                        formatCurrency(
                          report.grand_total
                        )
                      }
                      highlight
                    />

                  </div>


                  {/* ==================================================
                      DOCUMENT DETAILS
                  =================================================== */}

                  <section className="gst-report-panel">

                    <div className="gst-report-panel-header">

                      <div>

                        <h3>
                          Document Details
                        </h3>


                        <p>

                          {
                            activeReportType
                            === "sales"
                              ? (
                                "Effective sales invoices "
                                + "and credit notes for "
                                + "the selected period."
                              )
                              : (
                                "Supplier purchase bills "
                                + "and input GST for "
                                + "the selected period."
                              )
                          }

                        </p>

                      </div>

                    </div>


                    {
                      report.rows.length
                      === 0
                        ? (
                          <div className="gst-empty-state">

                            <FileSpreadsheet
                              size={24}
                            />

                            <div>
                              No GST documents
                              found for this period.
                            </div>

                          </div>
                        )
                        : (
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
                                    {partyHeading}
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

                                {
                                  report.rows.map(
                                    row => (
                                      <tr
                                        key={
                                          row.key
                                        }
                                      >

                                        <td>
                                          {
                                            formatDate(
                                              row.date
                                            )
                                          }
                                        </td>


                                        <td>

                                          <div className="gst-document-number">
                                            {
                                              row.document_number
                                              || "—"
                                            }
                                          </div>


                                          <div className="gst-document-type-text">
                                            {
                                              row.document_type
                                            }
                                          </div>

                                        </td>


                                        <td>
                                          {
                                            row.party_name
                                            || "—"
                                          }
                                        </td>


                                        <td>
                                          {
                                            row.gst_number
                                            || "—"
                                          }
                                        </td>


                                        <td className="align-right">
                                          {
                                            formatCurrency(
                                              row.taxable_amount
                                            )
                                          }
                                        </td>


                                        <td className="align-right">
                                          {
                                            formatCurrency(
                                              row.cgst_amount
                                            )
                                          }
                                        </td>


                                        <td className="align-right">
                                          {
                                            formatCurrency(
                                              row.sgst_amount
                                            )
                                          }
                                        </td>


                                        <td className="align-right">
                                          {
                                            formatCurrency(
                                              row.igst_amount
                                            )
                                          }
                                        </td>


                                        <td className="align-right gst-money">
                                          {
                                            formatCurrency(
                                              row.tax_amount
                                            )
                                          }
                                        </td>


                                        <td className="align-right gst-total-money">
                                          {
                                            formatCurrency(
                                              row.grand_total
                                            )
                                          }
                                        </td>

                                      </tr>
                                    )
                                  )
                                }

                              </tbody>


                              <tfoot>

                                <tr>

                                  <td
                                    colSpan={4}
                                    className="gst-total-label"
                                  >
                                    TOTAL
                                  </td>


                                  <td className="align-right">
                                    {
                                      formatCurrency(
                                        report.taxable_amount
                                      )
                                    }
                                  </td>


                                  <td className="align-right">
                                    {
                                      formatCurrency(
                                        report.cgst_amount
                                      )
                                    }
                                  </td>


                                  <td className="align-right">
                                    {
                                      formatCurrency(
                                        report.sgst_amount
                                      )
                                    }
                                  </td>


                                  <td className="align-right">
                                    {
                                      formatCurrency(
                                        report.igst_amount
                                      )
                                    }
                                  </td>


                                  <td className="align-right">
                                    {
                                      formatCurrency(
                                        report.tax_amount
                                      )
                                    }
                                  </td>


                                  <td className="align-right">
                                    {
                                      formatCurrency(
                                        report.grand_total
                                      )
                                    }
                                  </td>

                                </tr>

                              </tfoot>

                            </table>

                          </div>
                        )
                    }

                  </section>

                </>
              )
              : (
                <div className="gst-empty-selection">

                  <ReceiptText
                    size={28}
                  />


                  <h3>
                    Select a reporting period
                  </h3>


                  <p>
                    Choose Sales or Purchase GST,
                    select a period and click
                    View Report.
                  </p>

                </div>
              )
        }

      </div>


      {/* ========================================================
          DEDICATED PRINT DOCUMENT

          This remains hidden on screen by GSTReportPage.css.
          handlePrint() copies this exact document into an isolated
          print window.
      ========================================================= */}

      {
        report
        && activeRange
        && (
          <article className="gst-print-sheet">

            {/* ==================================================
                COMPANY LETTERHEAD SPACE
            =================================================== */}

            <div className="gst-print-letterhead" />


            {/* ==================================================
                PRINT HEADER
            =================================================== */}

            <header className="gst-print-header">

              <div>

                <div className="gst-print-eyebrow">

                  {
                    activeReportType
                    === "sales"
                      ? "SALES GST REPORT"
                      : "PURCHASE GST REPORT"
                  }

                </div>


                <h1>
                  {reportTitle}
                </h1>


                <div className="gst-print-period">

                  {
                    activeRange.label
                  }

                  {" · "}

                  {
                    formatDate(
                      activeRange.start_date
                    )
                  }

                  {" to "}

                  {
                    formatDate(
                      activeRange.end_date
                    )
                  }

                </div>

              </div>


              <div className="gst-print-count">

                <span>
                  Documents
                </span>

                <strong>
                  {
                    report.document_count
                  }
                </strong>

              </div>

            </header>


            {/* ==================================================
                PRINT SUMMARY
            =================================================== */}

            <div className="gst-print-summary">

              <PrintSummary
                label="Taxable"
                value={
                  formatCurrency(
                    report.taxable_amount
                  )
                }
              />


              <PrintSummary
                label="CGST"
                value={
                  formatCurrency(
                    report.cgst_amount
                  )
                }
              />


              <PrintSummary
                label="SGST"
                value={
                  formatCurrency(
                    report.sgst_amount
                  )
                }
              />


              <PrintSummary
                label="IGST"
                value={
                  formatCurrency(
                    report.igst_amount
                  )
                }
              />


              <PrintSummary
                label="GST"
                value={
                  formatCurrency(
                    report.tax_amount
                  )
                }
              />


              <PrintSummary
                label="Total"
                value={
                  formatCurrency(
                    report.grand_total
                  )
                }
              />

            </div>


            {/* ==================================================
                PRINT TABLE
            =================================================== */}

            <table className="gst-print-table">

              <thead>

                <tr>

                  <th>
                    Date
                  </th>

                  <th>
                    Document
                  </th>

                  <th>
                    {partyHeading}
                  </th>

                  <th>
                    GSTIN
                  </th>

                  <th>
                    Taxable
                  </th>

                  <th>
                    CGST
                  </th>

                  <th>
                    SGST
                  </th>

                  <th>
                    IGST
                  </th>

                  <th>
                    GST
                  </th>

                  <th>
                    Total
                  </th>

                </tr>

              </thead>


              <tbody>

                {
                  report.rows.map(
                    row => (
                      <tr
                        key={
                          `print-${row.key}`
                        }
                      >

                        <td>
                          {
                            formatDate(
                              row.date
                            )
                          }
                        </td>


                        <td>
                          {
                            row.document_number
                            || "—"
                          }
                        </td>


                        <td>
                          {
                            row.party_name
                            || "—"
                          }
                        </td>


                        <td>
                          {
                            row.gst_number
                            || "—"
                          }
                        </td>


                        <td>
                          {
                            formatCurrency(
                              row.taxable_amount
                            )
                          }
                        </td>


                        <td>
                          {
                            formatCurrency(
                              row.cgst_amount
                            )
                          }
                        </td>


                        <td>
                          {
                            formatCurrency(
                              row.sgst_amount
                            )
                          }
                        </td>


                        <td>
                          {
                            formatCurrency(
                              row.igst_amount
                            )
                          }
                        </td>


                        <td>
                          {
                            formatCurrency(
                              row.tax_amount
                            )
                          }
                        </td>


                        <td>
                          {
                            formatCurrency(
                              row.grand_total
                            )
                          }
                        </td>

                      </tr>
                    )
                  )
                }

              </tbody>


              <tfoot>

                <tr>

                  <td colSpan={4}>
                    TOTAL
                  </td>


                  <td>
                    {
                      formatCurrency(
                        report.taxable_amount
                      )
                    }
                  </td>


                  <td>
                    {
                      formatCurrency(
                        report.cgst_amount
                      )
                    }
                  </td>


                  <td>
                    {
                      formatCurrency(
                        report.sgst_amount
                      )
                    }
                  </td>


                  <td>
                    {
                      formatCurrency(
                        report.igst_amount
                      )
                    }
                  </td>


                  <td>
                    {
                      formatCurrency(
                        report.tax_amount
                      )
                    }
                  </td>


                  <td>
                    {
                      formatCurrency(
                        report.grand_total
                      )
                    }
                  </td>

                </tr>

              </tfoot>

            </table>


            {/* ==================================================
                PRINT FOOTER
            =================================================== */}

            <footer className="gst-print-footer">
              Generated from Glisen ERP
            </footer>

          </article>
        )
      }

    </div>
  );
}


/* ================================================================
   SCREEN SUMMARY CARD
================================================================ */

function SummaryCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {

  return (
    <div
      className={
        highlight
          ? "gst-summary-card highlight"
          : "gst-summary-card"
      }
    >

      <span>
        {label}
      </span>


      <strong>
        {value}
      </strong>

    </div>
  );
}


/* ================================================================
   PRINT SUMMARY CARD
================================================================ */

function PrintSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {

  return (
    <div>

      <span>
        {label}
      </span>


      <strong>
        {value}
      </strong>

    </div>
  );
}