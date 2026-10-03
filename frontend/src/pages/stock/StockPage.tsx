import axios from "axios";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CheckCircle2,
  Download,
  Factory,
  Filter,
  History,
  Loader2,
  PackageSearch,
  Printer,
  RefreshCw,
  Send,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";

import "./StockPage.css";

import {
  deleteOutOfStockProduct,
  downloadLiveStockExcel,
  getStockMovements,
  getStockSummary,
  issueStockToProductionOrder,
} from "../../services/stockService";

import {
  getProductionOrders,
} from "../../services/productionService";

import {
  getBusinessSettings,
  getCompanyLogoBlob,
  getCompanySettings,
  getDocumentSettings,
} from "../../services/settingsService";

import type {
  StockMovementResponse,
  StockSummaryItem,
  StockSummaryResponse,
} from "../../types/stock";

import type {
  ProductionOrder,
} from "../../types/production";

import type {
  CompanySettings,
  DocumentSettings,
} from "../../types/settings";


type StockReportScope =
  | "filtered"
  | "whole";


interface StockPrintAssets {
  company:
    CompanySettings;

  document:
    DocumentSettings;

  logoDataUrl:
    string |
    null;
}


const FALLBACK_PAGE_SIZE = 10;


const EMPTY_SUMMARY: StockSummaryResponse = {
  total_products: 0,
  total_stock_quantity: "0",
  total_stock_value: "0",
  low_stock_products: 0,
  out_of_stock_products: 0,
  items: [],
};


const EMPTY_MOVEMENTS: StockMovementResponse = {
  total_movements: 0,
  total_quantity_in: "0",
  total_quantity_out: "0",
  total_in_value: "0",
  total_out_value: "0",
  items: [],
};


/* ================================================================
   HELPERS
================================================================ */

function formatNumber(
  value:
    string |
    number |
    null
) {

  if (
    value === null
    ||
    value === undefined
  ) {
    return "0";
  }


  const numericValue =
    Number(
      value
    );


  if (
    Number.isNaN(
      numericValue
    )
  ) {
    return String(
      value
    );
  }


  return new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits:
        2,
    }
  ).format(
    numericValue
  );
}


function formatCurrency(
  value:
    string |
    number
) {

  const numericValue =
    Number(
      value
    );


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
      style:
        "currency",

      currency:
        "INR",

      maximumFractionDigits:
        2,
    }
  ).format(
    numericValue
  );
}


function formatDateTime(
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


  return date.toLocaleString(
    "en-IN"
  );
}


function getStockStatusClass(
  status:
    string
) {

  const normalized =
    status
      .toLowerCase()
      .replace(
        /\s+/g,
        "-"
      );


  if (
    normalized ===
    "in-stock"
  ) {
    return "in-stock";
  }


  if (
    normalized ===
    "low-stock"
  ) {
    return "low-stock";
  }


  if (
    normalized ===
    "out-of-stock"
  ) {
    return "out-of-stock";
  }


  if (
    normalized ===
    "over-stock"
  ) {
    return "over-stock";
  }


  return "default";
}


function getMovementClass(
  movementType:
    string
) {

  const normalized =
    movementType
      .toLowerCase();


  if (
    normalized.includes(
      "purchase"
    )
  ) {
    return "purchase";
  }


  if (
    normalized.includes(
      "finished"
    )
  ) {
    return "finished";
  }


  if (
    normalized.includes(
      "shop"
    )
    ||
    normalized.includes(
      "issue"
    )
  ) {
    return "issue";
  }


  return "default";
}


function getApiErrorMessage(
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
    error instanceof Error
    &&
    error.message
  ) {
    return error.message;
  }


  return fallback;
}



function escapeHtml(
  value:
    string |
    number |
    null |
    undefined
) {

  const map:
    Record<
      string,
      string
    > = {
      "&":
        "&amp;",

      "<":
        "&lt;",

      ">":
        "&gt;",

      '"':
        "&quot;",

      "'":
        "&#039;",
    };


  return String(
    value
    ??
    ""
  ).replace(
    /[&<>"']/g,
    character =>
      map[
        character
      ]
      ||
      character
  );
}


function blobToDataUrl(
  blob:
    Blob
):
Promise<string> {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const reader =
        new FileReader();


      reader.onload =
        () => {

          if (
            typeof reader.result
            ===
            "string"
          ) {

            resolve(
              reader.result
            );

          } else {

            reject(
              new Error(
                "Unable to read company logo."
              )
            );

          }

        };


      reader.onerror =
        () =>
          reject(
            new Error(
              "Unable to read company logo."
            )
          );


      reader.readAsDataURL(
        blob
      );

    }
  );
}


function buildStockPrintDocumentHtml(
  items:
    StockSummaryItem[],
  assets:
    StockPrintAssets,
  scopeLabel:
    string
) {

  const {
    company,
    document,
    logoDataUrl,
  } =
    assets;


  const letterheadMode =
    document.default_print_mode
    ===
    "letterhead";


  const topSpace =
    Math.max(
      0,
      Number(
        document
          .letterhead_top_space_mm
      )
      ||
      0
    );


  const companyAddress =
    [
      company.address,
      company.state_name,
    ]
      .filter(
        Boolean
      )
      .join(
        ", "
      );


  const companyContact =
    [
      company.phone,
      company.email,
      company.website,
    ]
      .filter(
        Boolean
      )
      .join(
        " • "
      );


  const totalQuantity =
    items.reduce(
      (
        total,
        item
      ) =>
        total
        +
        (
          Number(
            item.current_stock
          )
          ||
          0
        ),
      0
    );


  const totalValue =
    items.reduce(
      (
        total,
        item
      ) =>
        total
        +
        (
          Number(
            item.stock_value
          )
          ||
          0
        ),
      0
    );


  const rows =
    items.map(
      item => `
        <tr>
          <td>${escapeHtml(
            item.hsn_code
            ||
            "-"
          )}</td>
          <td><strong>${escapeHtml(
            item.product_name
          )}</strong></td>
          <td>${escapeHtml(
            item.product_code
          )}</td>
          <td>${escapeHtml(
            item.unit
          )}</td>
          <td class="number">${escapeHtml(
            formatNumber(
              item.current_stock
            )
          )}</td>
          <td class="number">${escapeHtml(
            formatCurrency(
              item.purchase_price
            )
          )}</td>
          <td class="number">${escapeHtml(
            formatCurrency(
              item.stock_value
            )
          )}</td>
          <td>${escapeHtml(
            item.stock_status
          )}</td>
        </tr>
      `
    )
    .join(
      ""
    );


  const companyHeader =
    letterheadMode
      ? ""
      : `
          <div class="company-header">
            <div class="company-main">
              ${
                (
                  document.show_logo
                  &&
                  logoDataUrl
                )
                  ? `
                      <img
                        class="company-logo"
                        src="${logoDataUrl}"
                        alt="Company Logo"
                      />
                    `
                  : ""
              }

              <div>
                <div class="company-name">
                  ${escapeHtml(
                    company.company_name
                  )}
                </div>

                ${
                  companyAddress
                    ? `
                        <div class="company-line">
                          ${escapeHtml(
                            companyAddress
                          )}
                        </div>
                      `
                    : ""
                }

                ${
                  (
                    document.show_contact_details
                    &&
                    companyContact
                  )
                    ? `
                        <div class="company-line">
                          ${escapeHtml(
                            companyContact
                          )}
                        </div>
                      `
                    : ""
                }

                ${
                  (
                    document.show_gst_number
                    &&
                    company.gst_number
                  )
                    ? `
                        <div class="company-line">
                          GSTIN:
                          ${escapeHtml(
                            company.gst_number
                          )}
                        </div>
                      `
                    : ""
                }
              </div>
            </div>
          </div>
        `;


  const letterheadSpacer =
    letterheadMode
      ? `
          <div
            style="
              height:${topSpace}mm;
            "
          ></div>
        `
      : "";


  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Live Stock Report</title>

        <style>
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, sans-serif;
            color: #1f3554;
            font-size: 10px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .company-header {
            padding-bottom: 10px;
            margin-bottom: 12px;
            border-bottom: 2px solid #2f67d8;
          }

          .company-main {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .company-logo {
            width: 58px;
            height: 58px;
            object-fit: contain;
          }

          .company-name {
            font-size: 18px;
            font-weight: 700;
            color: #183a66;
            margin-bottom: 4px;
          }

          .company-line {
            color: #526b89;
            line-height: 1.45;
          }

          .report-header {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            align-items: flex-end;
            margin-bottom: 12px;
          }

          .report-title {
            font-size: 17px;
            font-weight: 700;
            color: #1e4f98;
          }

          .report-meta {
            text-align: right;
            color: #617695;
            line-height: 1.5;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          th,
          td {
            border: 1px solid #dce5f1;
            padding: 7px 6px;
            vertical-align: middle;
            word-wrap: break-word;
          }

          th {
            background: #eaf1ff;
            color: #274d83;
            font-size: 9px;
            text-transform: uppercase;
          }

          .number {
            text-align: right;
          }

          .totals {
            margin-top: 12px;
            display: flex;
            justify-content: flex-end;
            gap: 22px;
            font-weight: 700;
            color: #274d83;
          }

          .footer {
            margin-top: 16px;
            padding-top: 8px;
            border-top: 1px solid #e1e8f2;
            text-align: center;
            color: #74869e;
            font-size: 9px;
          }
        </style>
      </head>

      <body>
        ${letterheadSpacer}
        ${companyHeader}

        <div class="report-header">
          <div>
            <div class="report-title">
              LIVE STOCK REPORT
            </div>
            <div>
              ${escapeHtml(
                scopeLabel
              )}
            </div>
          </div>

          <div class="report-meta">
            <div>
              Generated:
              ${escapeHtml(
                new Date()
                  .toLocaleString(
                    "en-IN"
                  )
              )}
            </div>
            <div>
              Records:
              ${items.length}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>HSN</th>
              <th>Product</th>
              <th>Product Code</th>
              <th>Unit</th>
              <th>Current Stock</th>
              <th>Purchase Price</th>
              <th>Stock Value</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="totals">
          <div>
            Total Quantity:
            ${escapeHtml(
              formatNumber(
                totalQuantity
              )
            )}
          </div>

          <div>
            Total Stock Value:
            ${escapeHtml(
              formatCurrency(
                totalValue
              )
            )}
          </div>
        </div>

        ${
          document.footer_text
            ? `
                <div class="footer">
                  ${escapeHtml(
                    document.footer_text
                  )}
                </div>
              `
            : ""
        }
      </body>
    </html>
  `;
}


/* ================================================================
   MODAL STYLES
================================================================ */

const modalBackdropStyle:
React.CSSProperties = {

  position:
    "fixed",

  inset:
    0,

  zIndex:
    9999,

  display:
    "flex",

  justifyContent:
    "center",

  alignItems:
    "center",

  padding:
    "24px",

  background:
    "rgba(26, 47, 79, 0.58)",

  backdropFilter:
    "blur(3px)",
};


const modalStyle:
React.CSSProperties = {

  width:
    "min(1100px, 94vw)",

  maxHeight:
    "88vh",

  overflowY:
    "auto",

  borderRadius:
    "18px",

  background:
    "#ffffff",

  border:
    "1px solid #dce6f2",

  boxShadow:
    "0 24px 70px rgba(20, 45, 80, 0.22)",
};


const modalHeaderStyle:
React.CSSProperties = {

  display:
    "flex",

  justifyContent:
    "space-between",

  alignItems:
    "flex-start",

  gap:
    "20px",

  padding:
    "22px 24px",

  borderBottom:
    "1px solid #e8eef7",
};


const modalCloseStyle:
React.CSSProperties = {

  width:
    "38px",

  height:
    "38px",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  border:
    "0",

  borderRadius:
    "10px",

  background:
    "#f3f6fb",

  color:
    "#617695",

  cursor:
    "pointer",
};


const quantityInputStyle:
React.CSSProperties = {

  width:
    "95px",

  minHeight:
    "36px",

  padding:
    "0 9px",

  border:
    "1px solid #d9e3f0",

  borderRadius:
    "9px",

  outline:
    "none",

  fontSize:
    "11px",
};


const paginationStyle:
React.CSSProperties = {

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  gap:
    "14px",

  padding:
    "15px 18px",

  borderTop:
    "1px solid #e8eef7",

  background:
    "#ffffff",
};


/* ================================================================
   PAGE
================================================================ */

export default function StockPage() {

  /* ==============================================================
     SETTINGS
  ============================================================== */

  const [
    pageSize,
    setPageSize,
  ] =
    useState(
      FALLBACK_PAGE_SIZE
    );


  /* ==============================================================
     DATA
  ============================================================== */

  const [
    summary,
    setSummary,
  ] =
    useState<
      StockSummaryResponse
    >(
      EMPTY_SUMMARY
    );


  const [
    movements,
    setMovements,
  ] =
    useState<
      StockMovementResponse
    >(
      EMPTY_MOVEMENTS
    );


  /* ==============================================================
     STOCK FILTER
  ============================================================== */

  const [
    summarySearch,
    setSummarySearch,
  ] =
    useState(
      ""
    );


  const [
    liveStockStatus,
    setLiveStockStatus,
  ] =
    useState(
      ""
    );


  /* ==============================================================
     MOVEMENT FILTER
  ============================================================== */

  const [
    movementType,
    setMovementType,
  ] =
    useState(
      ""
    );


  const [
    movementProductId,
    setMovementProductId,
  ] =
    useState(
      ""
    );


  const [
    movementStartDate,
    setMovementStartDate,
  ] =
    useState(
      ""
    );


  const [
    movementEndDate,
    setMovementEndDate,
  ] =
    useState(
      ""
    );


  /* ==============================================================
     LOADING / MESSAGE
  ============================================================== */

  const [
    summaryLoading,
    setSummaryLoading,
  ] =
    useState(
      true
    );


  const [
    movementLoading,
    setMovementLoading,
  ] =
    useState(
      true
    );


  const [
    error,
    setError,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    success,
    setSuccess,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /* ==============================================================
     PAGINATION
  ============================================================== */

  const [
    liveStockPage,
    setLiveStockPage,
  ] =
    useState(
      1
    );


  const [
    outOfStockPage,
    setOutOfStockPage,
  ] =
    useState(
      1
    );


  const [
    movementPage,
    setMovementPage,
  ] =
    useState(
      1
    );


  /* ==============================================================
     MATERIAL ISSUE
  ============================================================== */

  const [
    issueQuantities,
    setIssueQuantities,
  ] =
    useState<
      Record<
        number,
        string
      >
    >({});


  const [
    selectedMaterial,
    setSelectedMaterial,
  ] =
    useState<
      StockSummaryItem |
      null
    >(
      null
    );


  const [
    selectedIssueQuantity,
    setSelectedIssueQuantity,
  ] =
    useState(
      0
    );


  const [
    issueModalOpen,
    setIssueModalOpen,
  ] =
    useState(
      false
    );


  const [
    productionOrders,
    setProductionOrders,
  ] =
    useState<
      ProductionOrder[]
    >([]);


  const [
    productionLoading,
    setProductionLoading,
  ] =
    useState(
      false
    );


  const [
    selectedProductionOrderId,
    setSelectedProductionOrderId,
  ] =
    useState<
      number |
      null
    >(
      null
    );


  const [
    issueRemarks,
    setIssueRemarks,
  ] =
    useState(
      ""
    );


  const [
    issuingMaterial,
    setIssuingMaterial,
  ] =
    useState(
      false
    );


  const [
    issueError,
    setIssueError,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /* ==============================================================
     STOCK REPORT / DELETE
  ============================================================== */

  const [
    reportScope,
    setReportScope,
  ] =
    useState<
      StockReportScope
    >(
      "filtered"
    );


  const [
    reportBusy,
    setReportBusy,
  ] =
    useState(
      false
    );


  const [
    deletingProductId,
    setDeletingProductId,
  ] =
    useState<
      number |
      null
    >(
      null
    );


  const [
    appliedSummarySearch,
    setAppliedSummarySearch,
  ] =
    useState(
      ""
    );


  /* ==============================================================
     BUSINESS SETTINGS
  ============================================================== */

  async function loadPageSize() {

    try {

      const settings =
        await getBusinessSettings();


      const configuredPageSize =
        Number(
          settings.default_page_size
        );


      if (
        Number.isInteger(
          configuredPageSize
        )
        &&
        configuredPageSize >= 5
        &&
        configuredPageSize <= 100
      ) {

        setPageSize(
          configuredPageSize
        );

      } else {

        setPageSize(
          FALLBACK_PAGE_SIZE
        );

      }

    } catch (
      err
    ) {

      console.error(
        "Unable to load default page size:",
        err
      );


      setPageSize(
        FALLBACK_PAGE_SIZE
      );

    }

  }


  /* ==============================================================
     LOAD STOCK SUMMARY
  ============================================================== */

  async function loadSummary(
    search =
      summarySearch
  ) {

    try {

      setSummaryLoading(
        true
      );


      setError(
        null
      );


      const normalizedSearch =
        search.trim();


      const data =
        await getStockSummary({
          search:
            normalizedSearch
              ? normalizedSearch
              : undefined,
        });


      setSummary(
        data
      );


      setAppliedSummarySearch(
        normalizedSearch
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to load stock summary."
        )
      );

    } finally {

      setSummaryLoading(
        false
      );

    }

  }


  /* ==============================================================
     LOAD MOVEMENTS
  ============================================================== */

  async function loadMovements() {

    try {

      setMovementLoading(
        true
      );


      setError(
        null
      );


      const productId =
        movementProductId
          ? Number(
              movementProductId
            )
          : undefined;


      const data =
        await getStockMovements({
          product_id:
            productId
            &&
            !Number.isNaN(
              productId
            )
              ? productId
              : undefined,

          movement_type:
            movementType
            ||
            undefined,

          start_date:
            movementStartDate
            ||
            undefined,

          end_date:
            movementEndDate
            ||
            undefined,
        });


      setMovements(
        data
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to load stock movements."
        )
      );

    } finally {

      setMovementLoading(
        false
      );

    }

  }


  /* ==============================================================
     INITIAL LOAD
  ============================================================== */

  useEffect(
    () => {

      void loadPageSize();

      void loadSummary(
        ""
      );

      void loadMovements();

      // Initial load only.
      // eslint-disable-next-line react-hooks/exhaustive-deps

    },
    []
  );


  /* ==============================================================
     LIVE / OUT-OF-STOCK DERIVATION
  ============================================================== */

  const liveStockItems =
    useMemo(
      () => {

        return summary.items.filter(
          item => {

            const current =
              Number(
                item.current_stock
              );


            if (
              Number.isNaN(
                current
              )
              ||
              current <= 0
            ) {
              return false;
            }


            if (
              !liveStockStatus
            ) {
              return true;
            }


            return (
              item.stock_status
                .trim()
                .toLowerCase()
              ===
              liveStockStatus
                .trim()
                .toLowerCase()
            );

          }
        );

      },
      [
        summary.items,
        liveStockStatus,
      ]
    );


  const outOfStockItems =
    useMemo(
      () => {

        return summary.items.filter(
          item => {

            const current =
              Number(
                item.current_stock
              );


            return (
              !Number.isNaN(
                current
              )
              &&
              current <= 0
            );

          }
        );

      },
      [
        summary.items,
      ]
    );


  /* ==============================================================
     LIVE STOCK PAGINATION
  ============================================================== */

  const liveStockTotalPages =
    Math.max(
      1,
      Math.ceil(
        liveStockItems.length
        /
        pageSize
      )
    );


  const paginatedLiveStock =
    useMemo(
      () => {

        const start =
          (
            liveStockPage
            -
            1
          )
          *
          pageSize;


        return liveStockItems.slice(
          start,
          start
          +
          pageSize
        );

      },
      [
        liveStockItems,
        liveStockPage,
        pageSize,
      ]
    );


  const liveFirstRecord =
    liveStockItems.length
    >
    0
      ? (
          (
            liveStockPage
            -
            1
          )
          *
          pageSize
        )
        +
        1
      : 0;


  const liveLastRecord =
    Math.min(
      liveStockPage
      *
      pageSize,
      liveStockItems.length
    );


  /* ==============================================================
     OUT-OF-STOCK PAGINATION
  ============================================================== */

  const outOfStockTotalPages =
    Math.max(
      1,
      Math.ceil(
        outOfStockItems.length
        /
        pageSize
      )
    );


  const paginatedOutOfStock =
    useMemo(
      () => {

        const start =
          (
            outOfStockPage
            -
            1
          )
          *
          pageSize;


        return outOfStockItems.slice(
          start,
          start
          +
          pageSize
        );

      },
      [
        outOfStockItems,
        outOfStockPage,
        pageSize,
      ]
    );


  const outFirstRecord =
    outOfStockItems.length
    >
    0
      ? (
          (
            outOfStockPage
            -
            1
          )
          *
          pageSize
        )
        +
        1
      : 0;


  const outLastRecord =
    Math.min(
      outOfStockPage
      *
      pageSize,
      outOfStockItems.length
    );


  /* ==============================================================
     MOVEMENT PAGINATION
  ============================================================== */

  const movementTotalPages =
    Math.max(
      1,
      Math.ceil(
        movements.items.length
        /
        pageSize
      )
    );


  const paginatedMovements =
    useMemo(
      () => {

        const start =
          (
            movementPage
            -
            1
          )
          *
          pageSize;


        return movements.items.slice(
          start,
          start
          +
          pageSize
        );

      },
      [
        movements.items,
        movementPage,
        pageSize,
      ]
    );


  const movementFirstRecord =
    movements.items.length
    >
    0
      ? (
          (
            movementPage
            -
            1
          )
          *
          pageSize
        )
        +
        1
      : 0;


  const movementLastRecord =
    Math.min(
      movementPage
      *
      pageSize,
      movements.items.length
    );


  /* ==============================================================
     RESET / CLAMP PAGINATION
  ============================================================== */

  useEffect(
    () => {

      setLiveStockPage(
        1
      );

      setOutOfStockPage(
        1
      );

    },
    [
      summarySearch,
      liveStockStatus,
      pageSize,
    ]
  );


  useEffect(
    () => {

      if (
        liveStockPage
        >
        liveStockTotalPages
      ) {

        setLiveStockPage(
          liveStockTotalPages
        );

      }


      if (
        outOfStockPage
        >
        outOfStockTotalPages
      ) {

        setOutOfStockPage(
          outOfStockTotalPages
        );

      }

    },
    [
      liveStockPage,
      liveStockTotalPages,
      outOfStockPage,
      outOfStockTotalPages,
    ]
  );


  useEffect(
    () => {

      if (
        movementPage
        >
        movementTotalPages
      ) {

        setMovementPage(
          movementTotalPages
        );

      }

    },
    [
      movementPage,
      movementTotalPages,
    ]
  );


  /* ==============================================================
     STOCK SEARCH
  ============================================================== */

  async function handleSummarySearch(
    event:
      React.FormEvent
  ) {

    event.preventDefault();


    setLiveStockPage(
      1
    );


    setOutOfStockPage(
      1
    );


    await loadSummary();

  }


  async function handleClearSummary() {

    setSummarySearch(
      ""
    );


    setLiveStockStatus(
      ""
    );


    setLiveStockPage(
      1
    );


    setOutOfStockPage(
      1
    );


    await loadSummary(
      ""
    );

  }


  /* ==============================================================
     STOCK REPORT PRINT / EXCEL
  ============================================================== */

  async function loadStockPrintAssets():
  Promise<StockPrintAssets> {

    const [
      company,
      document,
    ] =
      await Promise.all([
        getCompanySettings(),
        getDocumentSettings(),
      ]);


    let logoDataUrl:
      string |
      null =
      null;


    if (
      document.show_logo
      &&
      company.logo_path
    ) {

      try {

        const logoBlob =
          await getCompanyLogoBlob();


        logoDataUrl =
          await blobToDataUrl(
            logoBlob
          );

      } catch (
        err
      ) {

        console.error(
          "Unable to load company logo for Stock print:",
          err
        );

      }

    }


    return {
      company,
      document,
      logoDataUrl,
    };

  }


  async function getReportItems():
  Promise<StockSummaryItem[]> {

    if (
      reportScope
      ===
      "filtered"
    ) {
      return liveStockItems;
    }


    const wholeSummary =
      await getStockSummary();


    return wholeSummary.items.filter(
      item => {

        const current =
          Number(
            item.current_stock
          );


        return (
          !Number.isNaN(
            current
          )
          &&
          current > 0
        );

      }
    );

  }


  async function handlePrintStock() {

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1200,height=850"
      );


    if (
      !printWindow
    ) {

      setError(
        "The browser blocked the print window. "
        +
        "Allow pop-ups for this ERP and try again."
      );

      return;
    }


    printWindow.document.write(
      `
        <html>
          <body
            style="
              font-family:Arial,sans-serif;
              padding:30px;
            "
          >
            Preparing Live Stock report...
          </body>
        </html>
      `
    );


    try {

      setReportBusy(
        true
      );


      setError(
        null
      );


      const [
        items,
        assets,
      ] =
        await Promise.all([
          getReportItems(),
          loadStockPrintAssets(),
        ]);


      if (
        items.length
        ===
        0
      ) {

        throw new Error(
          "There are no Live Stock records to print for the selected scope."
        );

      }


      const scopeLabel =
        reportScope
        ===
        "filtered"
          ? "Filtered Live Stock"
          : "Whole Live Stock";


      const html =
        buildStockPrintDocumentHtml(
          items,
          assets,
          scopeLabel
        );


      printWindow.document.open();
      printWindow.document.write(
        html
      );
      printWindow.document.close();


      const printDocument =
        () => {

          printWindow.focus();


          window.setTimeout(
            () => {

              printWindow.print();

            },
            250
          );

        };


      if (
        printWindow.document
          .readyState
        ===
        "complete"
      ) {

        printDocument();

      } else {

        printWindow.onload =
          printDocument;

      }

    } catch (
      err
    ) {

      printWindow.close();


      setError(
        getApiErrorMessage(
          err,
          "Unable to prepare Live Stock report for printing."
        )
      );

    } finally {

      setReportBusy(
        false
      );

    }

  }


  async function handleDownloadStockExcel() {

    try {

      setReportBusy(
        true
      );


      setError(
        null
      );


      const blob =
        await downloadLiveStockExcel({
          scope:
            reportScope,

          search:
            reportScope
            ===
            "filtered"
              ? (
                  appliedSummarySearch
                  ||
                  undefined
                )
              : undefined,

          stock_status:
            reportScope
            ===
            "filtered"
              ? (
                  liveStockStatus
                  ||
                  undefined
                )
              : undefined,
        });


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          "a"
        );


      const datePart =
        new Date()
          .toISOString()
          .slice(
            0,
            10
          );


      link.href =
        url;

      link.download =
        `glisen_live_stock_${reportScope}_${datePart}.xlsx`;


      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      URL.revokeObjectURL(
        url
      );


      setSuccess(
        reportScope
        ===
        "filtered"
          ? "Filtered Live Stock Excel downloaded."
          : "Whole Live Stock Excel downloaded."
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to download Live Stock Excel."
        )
      );

    } finally {

      setReportBusy(
        false
      );

    }

  }


  async function handleDeleteOutOfStockProduct(
    item:
      StockSummaryItem
  ) {

    const currentStock =
      Number(
        item.current_stock
      );


    if (
      Number.isNaN(
        currentStock
      )
      ||
      currentStock > 0
    ) {

      setError(
        "Only an out-of-stock product can be deleted from this list."
      );

      return;
    }


    const confirmed =
      window.confirm(
        `Delete "${item.product_name}" from active Products and Stock?\n\n`
        +
        "The product will disappear from the Out of Stock list, "
        +
        "but existing Purchase Bill and Stock Movement history will be preserved."
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      setDeletingProductId(
        item.product_id
      );


      setError(
        null
      );

      setSuccess(
        null
      );


      await deleteOutOfStockProduct(
        item.product_id
      );


      setSuccess(
        `${item.product_name} removed from active stock. Historical transactions were preserved.`
      );


      await loadSummary(
        appliedSummarySearch
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to delete the out-of-stock product."
        )
      );

    } finally {

      setDeletingProductId(
        null
      );

    }

  }


  /* ==============================================================
     MOVEMENT FILTER
  ============================================================== */

  async function handleMovementFilter(
    event:
      React.FormEvent
  ) {

    event.preventDefault();


    setMovementPage(
      1
    );


    await loadMovements();

  }


  async function handleClearMovement() {

    setMovementType(
      ""
    );


    setMovementProductId(
      ""
    );


    setMovementStartDate(
      ""
    );


    setMovementEndDate(
      ""
    );


    setMovementPage(
      1
    );


    try {

      setMovementLoading(
        true
      );


      setError(
        null
      );


      const data =
        await getStockMovements();


      setMovements(
        data
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setError(
        getApiErrorMessage(
          err,
          "Unable to load stock movements."
        )
      );

    } finally {

      setMovementLoading(
        false
      );

    }

  }


  /* ==============================================================
     REFRESH
  ============================================================== */

  async function handleRefresh() {

    setSuccess(
      null
    );


    await Promise.all([
      loadPageSize(),
      loadSummary(),
      loadMovements(),
    ]);

  }


  /* ==============================================================
     ACTIVE PRODUCTION ORDERS
  ============================================================== */

  const activeProductionOrders =
    useMemo(
      () => {

        return productionOrders.filter(
          order =>
            order.status
              .trim()
              .toLowerCase()
            ===
            "in progress"
        );

      },
      [
        productionOrders,
      ]
    );


  /* ==============================================================
     OPEN MATERIAL ISSUE
  ============================================================== */

  async function openIssueMaterial(
    item:
      StockSummaryItem
  ) {

    setSuccess(
      null
    );


    setIssueError(
      null
    );


    const quantity =
      Number(
        issueQuantities[
          item.product_id
        ]
      );


    const available =
      Number(
        item.current_stock
      );


    if (
      Number.isNaN(
        quantity
      )
      ||
      quantity <= 0
    ) {

      setError(
        `Enter the quantity to issue for ${item.product_name}.`
      );

      return;

    }


    if (
      quantity
      >
      available
    ) {

      setError(
        `Issue quantity cannot exceed available stock of ${formatNumber(
          available
        )} ${item.unit}.`
      );

      return;

    }


    setError(
      null
    );


    setSelectedMaterial(
      item
    );


    setSelectedIssueQuantity(
      quantity
    );


    setSelectedProductionOrderId(
      null
    );


    setIssueRemarks(
      ""
    );


    setIssueModalOpen(
      true
    );


    try {

      setProductionLoading(
        true
      );


      const data =
        await getProductionOrders();


      setProductionOrders(
        data
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setIssueError(
        getApiErrorMessage(
          err,
          "Unable to load active Production Orders."
        )
      );

    } finally {

      setProductionLoading(
        false
      );

    }

  }


  function closeIssueModal() {

    if (
      issuingMaterial
    ) {
      return;
    }


    setIssueModalOpen(
      false
    );


    setSelectedMaterial(
      null
    );


    setSelectedProductionOrderId(
      null
    );


    setIssueRemarks(
      ""
    );


    setIssueError(
      null
    );

  }


  /* ==============================================================
     ISSUE MATERIAL
  ============================================================== */

  async function handleIssueMaterial() {

    if (
      !selectedMaterial
    ) {
      return;
    }


    if (
      selectedProductionOrderId
      ===
      null
    ) {

      setIssueError(
        "Select a Production Order first."
      );

      return;

    }


    try {

      setIssuingMaterial(
        true
      );


      setIssueError(
        null
      );


      const result =
        await issueStockToProductionOrder(
          selectedProductionOrderId,
          {
            product_id:
              selectedMaterial.product_id,

            quantity:
              selectedIssueQuantity,

            remarks:
              issueRemarks.trim()
              ||
              null,
          }
        );


      setIssueModalOpen(
        false
      );


      setSelectedProductionOrderId(
        null
      );


      setIssueQuantities(
        current => ({
          ...current,

          [selectedMaterial.product_id]:
            "",
        })
      );


      setSuccess(
        `${formatNumber(
          result.quantity_issued
        )} ${selectedMaterial.unit} of ${selectedMaterial.product_name} issued successfully to Production Order #${result.production_order_id}. Stock: ${formatNumber(
          result.stock_before
        )} → ${formatNumber(
          result.stock_after
        )}.`
      );


      setSelectedMaterial(
        null
      );


      await Promise.all([
        loadSummary(),
        loadMovements(),
      ]);

    } catch (
      err
    ) {

      console.error(
        err
      );


      setIssueError(
        getApiErrorMessage(
          err,
          "Unable to issue material."
        )
      );

    } finally {

      setIssuingMaterial(
        false
      );

    }

  }


  /* ==============================================================
     PAGINATION COMPONENT
  ============================================================== */

  function renderPagination(
    currentPage:
      number,
    totalPages:
      number,
    firstRecord:
      number,
    lastRecord:
      number,
    totalRecords:
      number,
    setPage:
      React.Dispatch<
        React.SetStateAction<number>
      >
  ) {

    return (
      <div style={paginationStyle}>

        <div className="stock-section-subtitle">

          Showing{" "}

          <strong>
            {firstRecord}
          </strong>

          {"–"}

          <strong>
            {lastRecord}
          </strong>

          {" of "}

          <strong>
            {totalRecords}
          </strong>

          {" records"}

          {" • "}

          {pageSize}
          {" per page"}

        </div>


        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              "10px",
          }}
        >

          <button
            type="button"
            className="stock-secondary-button"
            disabled={
              currentPage <= 1
            }
            onClick={
              () =>
                setPage(
                  page =>
                    Math.max(
                      1,
                      page - 1
                    )
                )
            }
          >
            Previous
          </button>


          <span className="stock-section-subtitle">

            Page{" "}

            <strong>
              {currentPage}
            </strong>

            {" of "}

            <strong>
              {totalPages}
            </strong>

          </span>


          <button
            type="button"
            className="stock-secondary-button"
            disabled={
              currentPage
              >=
              totalPages
            }
            onClick={
              () =>
                setPage(
                  page =>
                    Math.min(
                      totalPages,
                      page + 1
                    )
                )
            }
          >
            Next
          </button>

        </div>

      </div>
    );

  }


  /* ==============================================================
     PAGE
  ============================================================== */

  return (
    <div className="stock-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="stock-page-header">

        <div>

          <div className="stock-eyebrow">
            INVENTORY CONTROL
          </div>


          <h1 className="stock-title">
            Stock Management
          </h1>


          <p className="stock-subtitle">
            Monitor purchased inventory,
            issue Store materials directly
            to active Production Orders,
            and maintain stock movement history.
          </p>

        </div>


        <button
          type="button"
          className="stock-secondary-button"
          onClick={
            () =>
              void handleRefresh()
          }
        >

          <RefreshCw
            size={15}
          />

          Refresh

        </button>

      </div>


      {
        error
        &&
        (
          <div className="stock-error">
            {error}
          </div>
        )
      }


      {
        success
        &&
        (
          <div
            style={{
              padding:
                "12px 14px",

              border:
                "1px solid #bfe7cf",

              borderRadius:
                "10px",

              background:
                "#effaf4",

              color:
                "#18794e",

              fontSize:
                "12px",
            }}
          >

            <CheckCircle2
              size={15}
              style={{
                verticalAlign:
                  "middle",

                marginRight:
                  "7px",
              }}
            />

            {success}

          </div>
        )
      }


      {/* ======================================================
          KPI
      ====================================================== */}

      <div className="stock-kpi-grid">

        <div className="stock-kpi-card">

          <div>

            <div className="stock-kpi-label">
              Total Products
            </div>

            <div className="stock-kpi-value">
              {summary.total_products}
            </div>

          </div>


          <div className="stock-kpi-icon blue">

            <Boxes
              size={20}
            />

          </div>

        </div>


        <div className="stock-kpi-card">

          <div>

            <div className="stock-kpi-label">
              Stock Quantity
            </div>

            <div className="stock-kpi-value">

              {
                formatNumber(
                  summary.total_stock_quantity
                )
              }

            </div>

          </div>


          <div className="stock-kpi-icon lavender">

            <PackageSearch
              size={20}
            />

          </div>

        </div>


        <div className="stock-kpi-card">

          <div>

            <div className="stock-kpi-label">
              Stock Value
            </div>

            <div className="stock-kpi-value">

              {
                formatCurrency(
                  summary.total_stock_value
                )
              }

            </div>

          </div>


          <div className="stock-kpi-icon green">

            <ArrowDownToLine
              size={20}
            />

          </div>

        </div>


        <div className="stock-kpi-card">

          <div>

            <div className="stock-kpi-label">
              Low Stock
            </div>

            <div className="stock-kpi-value">
              {summary.low_stock_products}
            </div>

          </div>


          <div className="stock-kpi-icon amber">

            <TriangleAlert
              size={20}
            />

          </div>

        </div>


        <div className="stock-kpi-card">

          <div>

            <div className="stock-kpi-label">
              Out of Stock
            </div>

            <div className="stock-kpi-value">
              {summary.out_of_stock_products}
            </div>

          </div>


          <div className="stock-kpi-icon rose">

            <ArrowUpFromLine
              size={20}
            />

          </div>

        </div>

      </div>


      {/* ======================================================
          LIVE STOCK
      ====================================================== */}

      <div className="stock-section">

        <div className="stock-section-header">

          <div>

            <div className="stock-section-title">
              Live Stock
            </div>


            <div className="stock-section-subtitle">
              Only materials with available stock are shown here.
              Materials automatically leave this list when stock
              reaches zero and return when they are restocked.
            </div>

          </div>


          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "flex-end",

              gap:
                "8px",

              flexWrap:
                "wrap",
            }}
          >

            <select
              className="stock-select"
              value={
                reportScope
              }
              onChange={
                event => {

                  const value =
                    event.target.value;


                  if (
                    value
                    ===
                    "filtered"
                    ||
                    value
                    ===
                    "whole"
                  ) {

                    setReportScope(
                      value
                    );

                  }

                }
              }
              disabled={
                reportBusy
              }
              title="Choose whether Print / Excel uses the current filtered result or all Live Stock."
            >

              <option value="filtered">
                Filtered Result
              </option>

              <option value="whole">
                Whole Live Stock
              </option>

            </select>


            <button
              type="button"
              className="stock-secondary-button"
              onClick={
                () =>
                  void handlePrintStock()
              }
              disabled={
                reportBusy
              }
            >

              {
                reportBusy
                  ? (
                      <Loader2
                        size={15}
                        className="stock-spin"
                      />
                    )
                  : (
                      <Printer
                        size={15}
                      />
                    )
              }

              Print

            </button>


            <button
              type="button"
              className="stock-secondary-button"
              onClick={
                () =>
                  void handleDownloadStockExcel()
              }
              disabled={
                reportBusy
              }
            >

              <Download
                size={15}
              />

              Download Excel

            </button>


            <div className="stock-section-badge">

              <Boxes
                size={13}
              />

              {liveStockItems.length}
              {" live"}

            </div>

          </div>

        </div>


        <form
          className="stock-filter-bar"
          onSubmit={
            handleSummarySearch
          }
        >

          <div className="stock-search-field">

            <Search
              size={16}
            />


            <input
              type="text"
              value={
                summarySearch
              }
              onChange={
                event =>
                  setSummarySearch(
                    event.target.value
                  )
              }
              placeholder="Search HSN, product code or product name..."
            />

          </div>


          <select
            className="stock-select"
            value={
              liveStockStatus
            }
            onChange={
              event => {

                setLiveStockStatus(
                  event.target.value
                );

                setLiveStockPage(
                  1
                );

              }
            }
          >

            <option value="">
              All Live Stock
            </option>

            <option value="In Stock">
              In Stock
            </option>

            <option value="Low Stock">
              Low Stock
            </option>

            <option value="Over Stock">
              Over Stock
            </option>

          </select>


          <button
            type="submit"
            className="stock-primary-button"
          >

            <Filter
              size={15}
            />

            Apply

          </button>


          <button
            type="button"
            className="stock-secondary-button"
            onClick={
              () =>
                void handleClearSummary()
            }
          >
            Clear
          </button>

        </form>


        {
          summaryLoading
            ? (
                <div className="stock-loading-state">

                  <Loader2
                    size={22}
                    className="stock-spin"
                  />

                  Loading live stock...

                </div>
              )
            : liveStockItems.length
              ===
              0
                ? (
                    <div className="stock-empty-state">

                      <Boxes
                        size={25}
                      />

                      No live stock records found.

                    </div>
                  )
                : (
                    <>

                      <div className="stock-table-wrap">

                        <table className="stock-table">

                          <thead>

                            <tr>

                              <th>
                                HSN
                              </th>

                              <th>
                                Product
                              </th>

                              <th>
                                Unit
                              </th>

                              <th>
                                Current
                              </th>

                              <th>
                                Purchase Price
                              </th>

                              <th>
                                Stock Value
                              </th>

                              <th>
                                Status
                              </th>

                              <th>
                                Qty to Issue
                              </th>

                              <th>
                                Action
                              </th>

                            </tr>

                          </thead>


                          <tbody>

                            {
                              paginatedLiveStock.map(
                                item => (

                                  <tr
                                    key={
                                      item.product_id
                                    }
                                  >

                                    <td>
                                      {item.hsn_code || "-"}
                                    </td>


                                    <td>

                                      <div className="stock-product-name">
                                        {item.product_name}
                                      </div>

                                      <div className="stock-product-code">
                                        {item.product_code}
                                      </div>

                                    </td>


                                    <td>
                                      {item.unit}
                                    </td>


                                    <td>

                                      <strong>
                                        {
                                          formatNumber(
                                            item.current_stock
                                          )
                                        }
                                      </strong>

                                    </td>


                                    <td>
                                      {
                                        formatCurrency(
                                          item.purchase_price
                                        )
                                      }
                                    </td>


                                    <td>

                                      <strong>
                                        {
                                          formatCurrency(
                                            item.stock_value
                                          )
                                        }
                                      </strong>

                                    </td>


                                    <td>

                                      <span
                                        className={
                                          `stock-status ${getStockStatusClass(
                                            item.stock_status
                                          )}`
                                        }
                                      >
                                        {item.stock_status}
                                      </span>

                                    </td>


                                    <td>

                                      <input
                                        type="number"
                                        min="0"
                                        max={
                                          item.current_stock
                                        }
                                        step="0.01"
                                        value={
                                          issueQuantities[
                                            item.product_id
                                          ]
                                          ??
                                          ""
                                        }
                                        onChange={
                                          event =>
                                            setIssueQuantities(
                                              current => ({
                                                ...current,

                                                [item.product_id]:
                                                  event.target.value,
                                              })
                                            )
                                        }
                                        placeholder="Qty"
                                        style={
                                          quantityInputStyle
                                        }
                                      />

                                    </td>


                                    <td>

                                      <button
                                        type="button"
                                        className="stock-primary-button"
                                        onClick={
                                          () =>
                                            void openIssueMaterial(
                                              item
                                            )
                                        }
                                        style={{
                                          minHeight:
                                            "36px",
                                        }}
                                      >

                                        <Send
                                          size={14}
                                        />

                                        Issue Material

                                      </button>

                                    </td>

                                  </tr>

                                )
                              )
                            }

                          </tbody>

                        </table>

                      </div>


                      {
                        renderPagination(
                          liveStockPage,
                          liveStockTotalPages,
                          liveFirstRecord,
                          liveLastRecord,
                          liveStockItems.length,
                          setLiveStockPage
                        )
                      }

                    </>
                  )
        }

      </div>


      {/* ======================================================
          OUT OF STOCK
      ====================================================== */}

      <div className="stock-section">

        <div className="stock-section-header">

          <div>

            <div className="stock-section-title">
              Out of Stock
            </div>


            <div className="stock-section-subtitle">
              Products with zero available quantity.
              When a Purchase Bill restocks one of these products,
              it automatically returns to Live Stock.
            </div>

          </div>


          <div className="stock-section-badge">

            <TriangleAlert
              size={13}
            />

            {outOfStockItems.length}
            {" out"}

          </div>

        </div>


        {
          summaryLoading
            ? (
                <div className="stock-loading-state">

                  <Loader2
                    size={22}
                    className="stock-spin"
                  />

                  Loading out-of-stock products...

                </div>
              )
            : outOfStockItems.length
              ===
              0
                ? (
                    <div className="stock-empty-state">

                      <CheckCircle2
                        size={25}
                      />

                      No products are currently out of stock.

                    </div>
                  )
                : (
                    <>

                      <div className="stock-table-wrap">

                        <table className="stock-table">

                          <thead>

                            <tr>

                              <th>
                                HSN
                              </th>

                              <th>
                                Product
                              </th>

                              <th>
                                Unit
                              </th>

                              <th>
                                Current
                              </th>

                              <th>
                                Purchase Price
                              </th>

                              <th>
                                Stock Value
                              </th>

                              <th>
                                Status
                              </th>

                              <th>
                                Action
                              </th>

                            </tr>

                          </thead>


                          <tbody>

                            {
                              paginatedOutOfStock.map(
                                item => (

                                  <tr
                                    key={
                                      item.product_id
                                    }
                                  >

                                    <td>
                                      {item.hsn_code || "-"}
                                    </td>


                                    <td>

                                      <div className="stock-product-name">
                                        {item.product_name}
                                      </div>

                                      <div className="stock-product-code">
                                        {item.product_code}
                                      </div>

                                    </td>


                                    <td>
                                      {item.unit}
                                    </td>


                                    <td>

                                      <strong>
                                        0
                                      </strong>

                                    </td>


                                    <td>
                                      {
                                        formatCurrency(
                                          item.purchase_price
                                        )
                                      }
                                    </td>


                                    <td>
                                      {
                                        formatCurrency(
                                          item.stock_value
                                        )
                                      }
                                    </td>


                                    <td>

                                      <span
                                        className="stock-status out-of-stock"
                                      >
                                        Out of Stock
                                      </span>

                                    </td>


                                    <td>

                                      <button
                                        type="button"
                                        className="stock-secondary-button"
                                        onClick={
                                          () =>
                                            void handleDeleteOutOfStockProduct(
                                              item
                                            )
                                        }
                                        disabled={
                                          deletingProductId
                                          ===
                                          item.product_id
                                        }
                                        style={{
                                          minHeight:
                                            "34px",

                                          color:
                                            "#b4232d",

                                          borderColor:
                                            "#efc8cc",

                                          background:
                                            "#fff8f8",
                                        }}
                                      >

                                        {
                                          deletingProductId
                                          ===
                                          item.product_id
                                            ? (
                                                <Loader2
                                                  size={14}
                                                  className="stock-spin"
                                                />
                                              )
                                            : (
                                                <Trash2
                                                  size={14}
                                                />
                                              )
                                        }

                                        Delete

                                      </button>

                                    </td>

                                  </tr>

                                )
                              )
                            }

                          </tbody>

                        </table>

                      </div>


                      {
                        renderPagination(
                          outOfStockPage,
                          outOfStockTotalPages,
                          outFirstRecord,
                          outLastRecord,
                          outOfStockItems.length,
                          setOutOfStockPage
                        )
                      }

                    </>
                  )
        }

      </div>


      {/* ======================================================
          STOCK MOVEMENT HISTORY
      ====================================================== */}

      <div className="stock-section">

        <div className="stock-section-header">

          <div>

            <div className="stock-section-title">
              Stock Movement History
            </div>


            <div className="stock-section-subtitle">
              Purchase receipts,
              purchase reversals,
              production issues,
              and other inventory movements.
            </div>

          </div>


          <div className="stock-section-badge">

            <History
              size={13}
            />

            {movements.total_movements}
            {" movements"}

          </div>

        </div>


        <form
          className="stock-movement-filter-grid"
          onSubmit={
            handleMovementFilter
          }
        >

          <label className="stock-field">

            <span>
              Product ID
            </span>


            <input
              type="number"
              min="1"
              value={
                movementProductId
              }
              onChange={
                event =>
                  setMovementProductId(
                    event.target.value
                  )
              }
              placeholder="e.g. 1"
            />

          </label>


          <label className="stock-field">

            <span>
              Movement Type
            </span>


            <select
              value={
                movementType
              }
              onChange={
                event =>
                  setMovementType(
                    event.target.value
                  )
              }
            >

              <option value="">
                All Types
              </option>

              <option value="Purchase">
                Purchase
              </option>

              <option value="Purchase Reversal">
                Purchase Reversal
              </option>

              <option value="Shop Floor Issue">
                Shop Floor Issue
              </option>

              <option value="Finished Goods Receipt">
                Finished Goods Receipt
              </option>

            </select>

          </label>


          <label className="stock-field">

            <span>
              Start Date
            </span>


            <input
              type="datetime-local"
              value={
                movementStartDate
              }
              onChange={
                event =>
                  setMovementStartDate(
                    event.target.value
                  )
              }
            />

          </label>


          <label className="stock-field">

            <span>
              End Date
            </span>


            <input
              type="datetime-local"
              value={
                movementEndDate
              }
              onChange={
                event =>
                  setMovementEndDate(
                    event.target.value
                  )
              }
            />

          </label>


          <div className="stock-movement-actions">

            <button
              type="submit"
              className="stock-primary-button"
            >

              <Filter
                size={15}
              />

              Apply

            </button>


            <button
              type="button"
              className="stock-secondary-button"
              onClick={
                () =>
                  void handleClearMovement()
              }
            >
              Clear
            </button>

          </div>

        </form>


        <div className="stock-movement-kpis">

          <div>

            <span>
              Quantity In
            </span>

            <strong>
              {
                formatNumber(
                  movements.total_quantity_in
                )
              }
            </strong>

          </div>


          <div>

            <span>
              Quantity Out
            </span>

            <strong>
              {
                formatNumber(
                  movements.total_quantity_out
                )
              }
            </strong>

          </div>


          <div>

            <span>
              In Value
            </span>

            <strong>
              {
                formatCurrency(
                  movements.total_in_value
                )
              }
            </strong>

          </div>


          <div>

            <span>
              Out Value
            </span>

            <strong>
              {
                formatCurrency(
                  movements.total_out_value
                )
              }
            </strong>

          </div>

        </div>


        {
          movementLoading
            ? (
                <div className="stock-loading-state">

                  <Loader2
                    size={22}
                    className="stock-spin"
                  />

                  Loading stock movements...

                </div>
              )
            : movements.items.length
              ===
              0
                ? (
                    <div className="stock-empty-state">

                      <History
                        size={25}
                      />

                      No stock movements found.

                    </div>
                  )
                : (
                    <>

                      <div className="stock-table-wrap">

                        <table className="stock-table stock-movement-table">

                          <thead>

                            <tr>

                              <th>
                                Date
                              </th>

                              <th>
                                Type
                              </th>

                              <th>
                                Reference
                              </th>

                              <th>
                                Product
                              </th>

                              <th>
                                Qty In
                              </th>

                              <th>
                                Qty Out
                              </th>

                              <th>
                                Before
                              </th>

                              <th>
                                After
                              </th>

                              <th>
                                Unit Cost
                              </th>

                              <th>
                                Value
                              </th>

                              <th>
                                Remarks
                              </th>

                            </tr>

                          </thead>


                          <tbody>

                            {
                              paginatedMovements.map(
                                (
                                  item,
                                  index
                                ) => (

                                  <tr
                                    key={
                                      `${item.reference_id}-${item.product_id}-${item.movement_date}-${index}`
                                    }
                                  >

                                    <td>
                                      {
                                        formatDateTime(
                                          item.movement_date
                                        )
                                      }
                                    </td>


                                    <td>

                                      <span
                                        className={
                                          `stock-movement-type ${getMovementClass(
                                            item.movement_type
                                          )}`
                                        }
                                      >
                                        {item.movement_type}
                                      </span>

                                    </td>


                                    <td>

                                      <div className="stock-reference">
                                        {item.reference_number}
                                      </div>

                                    </td>


                                    <td>

                                      <div className="stock-product-name">
                                        {item.product_name}
                                      </div>

                                      <div className="stock-product-code">
                                        {item.product_code}
                                      </div>

                                    </td>


                                    <td className="stock-qty-in">

                                      {
                                        formatNumber(
                                          item.quantity_in
                                        )
                                      }

                                    </td>


                                    <td className="stock-qty-out">

                                      {
                                        formatNumber(
                                          item.quantity_out
                                        )
                                      }

                                    </td>


                                    <td>

                                      {
                                        item.stock_before
                                        !==
                                        null
                                          ? formatNumber(
                                              item.stock_before
                                            )
                                          : "-"
                                      }

                                    </td>


                                    <td>

                                      {
                                        item.stock_after
                                        !==
                                        null
                                          ? formatNumber(
                                              item.stock_after
                                            )
                                          : "-"
                                      }

                                    </td>


                                    <td>

                                      {
                                        formatCurrency(
                                          item.unit_cost
                                        )
                                      }

                                    </td>


                                    <td>

                                      {
                                        formatCurrency(
                                          item.movement_value
                                        )
                                      }

                                    </td>


                                    <td>

                                      <span className="stock-remarks">

                                        {
                                          item.remarks
                                          ||
                                          "-"
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


                      {
                        renderPagination(
                          movementPage,
                          movementTotalPages,
                          movementFirstRecord,
                          movementLastRecord,
                          movements.items.length,
                          setMovementPage
                        )
                      }

                    </>
                  )
        }

      </div>


      {/* ======================================================
          MATERIAL ISSUE MODAL
      ====================================================== */}

      {
        issueModalOpen
        &&
        selectedMaterial
        &&
        (
          <div
            style={
              modalBackdropStyle
            }
          >

            <div
              style={
                modalStyle
              }
            >

              {/* ==============================================
                  MODAL HEADER
              ============================================== */}

              <div
                style={
                  modalHeaderStyle
                }
              >

                <div>

                  <div className="stock-eyebrow">
                    STORE MATERIAL ISSUE
                  </div>


                  <div
                    style={{
                      color:
                        "#172b4d",

                      fontSize:
                        "20px",

                      fontWeight:
                        850,
                    }}
                  >
                    Issue Material To Production
                  </div>


                  <div
                    style={{
                      marginTop:
                        "5px",

                      color:
                        "#8292aa",

                      fontSize:
                        "11px",
                    }}
                  >
                    Select which active Production Order
                    should receive this material.
                  </div>

                </div>


                <button
                  type="button"
                  style={
                    modalCloseStyle
                  }
                  onClick={
                    closeIssueModal
                  }
                  disabled={
                    issuingMaterial
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              {
                issueError
                &&
                (
                  <div
                    className="stock-error"
                    style={{
                      margin:
                        "18px 20px 0",
                    }}
                  >
                    {issueError}
                  </div>
                )
              }


              {/* ==============================================
                  SELECTED MATERIAL
              ============================================== */}

              <div
                style={{
                  margin:
                    "20px",

                  padding:
                    "18px",

                  border:
                    "1px solid #dfe7f2",

                  borderRadius:
                    "14px",

                  background:
                    "#f8fbff",
                }}
              >

                <div
                  style={{
                    marginBottom:
                      "14px",

                    color:
                      "#263c5e",

                    fontSize:
                      "12px",

                    fontWeight:
                      800,
                  }}
                >
                  Selected Material
                </div>


                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(6, minmax(0, 1fr))",

                    gap:
                      "14px",
                  }}
                >

                  <div>

                    <div className="stock-product-code">
                      Material
                    </div>

                    <div className="stock-product-name">
                      {selectedMaterial.product_name}
                    </div>

                  </div>


                  <div>

                    <div className="stock-product-code">
                      Code
                    </div>

                    <strong>
                      {selectedMaterial.product_code}
                    </strong>

                  </div>


                  <div>

                    <div className="stock-product-code">
                      Available
                    </div>

                    <strong>

                      {
                        formatNumber(
                          selectedMaterial.current_stock
                        )
                      }

                      {" "}

                      {selectedMaterial.unit}

                    </strong>

                  </div>


                  <div>

                    <div className="stock-product-code">
                      Issue Quantity
                    </div>

                    <strong>

                      {
                        formatNumber(
                          selectedIssueQuantity
                        )
                      }

                      {" "}

                      {selectedMaterial.unit}

                    </strong>

                  </div>


                  <div>

                    <div className="stock-product-code">
                      Unit Cost
                    </div>

                    <strong>

                      {
                        formatCurrency(
                          selectedMaterial.purchase_price
                        )
                      }

                    </strong>

                  </div>


                  <div>

                    <div className="stock-product-code">
                      Issue Value
                    </div>

                    <strong>

                      {
                        formatCurrency(
                          Number(
                            selectedMaterial.purchase_price
                          )
                          *
                          selectedIssueQuantity
                        )
                      }

                    </strong>

                  </div>

                </div>

              </div>


              {/* ==============================================
                  PRODUCTION ORDERS
              ============================================== */}

              <div
                style={{
                  margin:
                    "0 20px",

                  border:
                    "1px solid #dfe7f2",

                  borderRadius:
                    "14px",

                  overflow:
                    "hidden",
                }}
              >

                <div
                  style={{
                    display:
                      "flex",

                    justifyContent:
                      "space-between",

                    alignItems:
                      "center",

                    padding:
                      "15px 17px",

                    borderBottom:
                      "1px solid #e8eef7",

                    background:
                      "#fbfdff",
                  }}
                >

                  <div>

                    <div className="stock-section-title">
                      Active Production Orders
                    </div>


                    <div className="stock-section-subtitle">
                      Only Production Orders currently
                      In Progress can receive materials.
                    </div>

                  </div>


                  <div className="stock-section-badge">

                    <Factory
                      size={13}
                    />

                    {activeProductionOrders.length}
                    {" active"}

                  </div>

                </div>


                {
                  productionLoading
                    ? (
                        <div className="stock-loading-state">

                          <Loader2
                            size={22}
                            className="stock-spin"
                          />

                          Loading Production Orders...

                        </div>
                      )
                    : activeProductionOrders.length
                      ===
                      0
                        ? (
                            <div className="stock-empty-state">

                              <Factory
                                size={25}
                              />

                              No Production Orders are currently In Progress.

                            </div>
                          )
                        : (
                            <div className="stock-table-wrap">

                              <table className="stock-table">

                                <thead>

                                  <tr>

                                    <th>
                                      Production Order
                                    </th>

                                    <th>
                                      Proforma
                                    </th>

                                    <th>
                                      Finished Product / Machine
                                    </th>

                                    <th>
                                      Production Qty
                                    </th>

                                    <th>
                                      Actual Start
                                    </th>

                                    <th>
                                      Status
                                    </th>

                                    <th>
                                      Select
                                    </th>

                                  </tr>

                                </thead>


                                <tbody>

                                  {
                                    activeProductionOrders.map(
                                      order => {

                                        const selected =
                                          selectedProductionOrderId
                                          ===
                                          order.id;


                                        return (
                                          <tr
                                            key={
                                              order.id
                                            }
                                            style={
                                              selected
                                                ? {
                                                    background:
                                                      "#f0f6ff",
                                                  }
                                                : undefined
                                            }
                                          >

                                            <td>

                                              <strong>
                                                {order.production_number}
                                              </strong>

                                            </td>


                                            <td>

                                              PF #
                                              {order.proforma_id}

                                            </td>


                                            <td>

                                              <strong>
                                                {order.product_name}
                                              </strong>

                                            </td>


                                            <td>

                                              {
                                                formatNumber(
                                                  order.quantity
                                                )
                                              }

                                              {" "}

                                              {order.unit}

                                            </td>


                                            <td>
                                              {
                                                order.actual_start_date
                                                ||
                                                "-"
                                              }
                                            </td>


                                            <td>

                                              <span
                                                style={{
                                                  display:
                                                    "inline-flex",

                                                  padding:
                                                    "5px 9px",

                                                  borderRadius:
                                                    "999px",

                                                  background:
                                                    "#fff6df",

                                                  color:
                                                    "#a36a00",

                                                  fontSize:
                                                    "9px",

                                                  fontWeight:
                                                    800,
                                                }}
                                              >
                                                {order.status}
                                              </span>

                                            </td>


                                            <td>

                                              <button
                                                type="button"
                                                className={
                                                  selected
                                                    ? "stock-primary-button"
                                                    : "stock-secondary-button"
                                                }
                                                onClick={
                                                  () =>
                                                    setSelectedProductionOrderId(
                                                      order.id
                                                    )
                                                }
                                                style={{
                                                  minHeight:
                                                    "34px",
                                                }}
                                              >
                                                {
                                                  selected
                                                    ? "Selected"
                                                    : "Select"
                                                }
                                              </button>

                                            </td>

                                          </tr>
                                        );

                                      }
                                    )
                                  }

                                </tbody>

                              </table>

                            </div>
                          )
                }

              </div>


              {/* ==============================================
                  REMARKS
              ============================================== */}

              <div
                style={{
                  margin:
                    "18px 20px 0",
                }}
              >

                <label className="stock-field">

                  <span>
                    Remarks
                  </span>


                  <input
                    type="text"
                    value={
                      issueRemarks
                    }
                    onChange={
                      event =>
                        setIssueRemarks(
                          event.target.value
                        )
                    }
                    placeholder="Optional issue remarks..."
                  />

                </label>

              </div>


              {/* ==============================================
                  MODAL ACTIONS
              ============================================== */}

              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "flex-end",

                  gap:
                    "10px",

                  padding:
                    "20px",

                  marginTop:
                    "18px",

                  borderTop:
                    "1px solid #e8eef7",
                }}
              >

                <button
                  type="button"
                  className="stock-secondary-button"
                  onClick={
                    closeIssueModal
                  }
                  disabled={
                    issuingMaterial
                  }
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className="stock-primary-button"
                  onClick={
                    () =>
                      void handleIssueMaterial()
                  }
                  disabled={
                    selectedProductionOrderId
                    ===
                    null
                    ||
                    issuingMaterial
                  }
                  style={{
                    opacity:
                      selectedProductionOrderId
                      ===
                      null
                      ||
                      issuingMaterial
                        ? 0.5
                        : 1,

                    cursor:
                      selectedProductionOrderId
                      ===
                      null
                      ||
                      issuingMaterial
                        ? "not-allowed"
                        : "pointer",
                  }}
                >

                  {
                    issuingMaterial
                      ? (
                          <>

                            <Loader2
                              size={15}
                              className="stock-spin"
                            />

                            Issuing...

                          </>
                        )
                      : (
                          <>

                            <Send
                              size={15}
                            />

                            Issue Material

                          </>
                        )
                  }

                </button>

              </div>

            </div>

          </div>
        )
      }

    </div>
  );
}