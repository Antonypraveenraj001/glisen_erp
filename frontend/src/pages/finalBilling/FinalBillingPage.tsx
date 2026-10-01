import axios from "axios";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BadgeIndianRupee,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  Edit3,
  FilePlus2,
  FileText,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";

import "./FinalBillingPage.css";

import {
  createFinalBillCreditNote,
  createFinalBillFromProforma,
  createFinalBillPayment,
  createFinalBillRevision,
  getFinalBillById,
  getFinalBillPaymentSummary,
  getFinalBills,
  issueFinalBill,
  updateFinalBill,
  updateFinalBillItem,
} from "../../services/finalBillService";

import {
  getProductionOrders,
} from "../../services/productionService";

import {
  getProformas,
} from "../../services/proformaService";

import {
  getBusinessSettings,
  getCompanyLogoBlob,
  getCompanySettings,
  getDocumentSettings,
} from "../../services/settingsService";

import type {
  FinalBill,
} from "../../types/finalBill";

import type {
  FinalBillPaymentSummary,
} from "../../types/finalBillPayment";

import type {
  Proforma,
} from "../../types/proforma";

import type {
  ProductionOrder,
} from "../../types/production";

import type {
  CompanySettings,
  DocumentSettings,
} from "../../types/settings";


const FALLBACK_PAGE_SIZE =
  10;


/* ================================================================
   LOCAL TYPES
================================================================ */

interface DraftHeaderForm {
  invoice_date: string;

  billing_address: string;

  shipping_address: string;

  payment_terms: string;

  delivery_terms: string;

  notes: string;
}


interface DraftItemForm {
  id: number;

  description: string;

  hsn_code: string;

  quantity: string;

  unit: string;

  unit_price: string;

  discount_percent: string;

  gst_percent: string;
}


interface PrintAssets {
  company:
    CompanySettings;

  document:
    DocumentSettings;

  logoDataUrl:
    string | null;
}


/* ================================================================
   GENERAL HELPERS
================================================================ */

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


function money(
  value:
    string |
    number
) {

  const numericValue =
    Number(
      value
      ||
      0
    );


  return numericValue.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  );

}


function formatNumber(
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


function formatDate(
  value:
    string |
    null |
    undefined
) {

  if (
    !value
  ) {
    return "-";
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


  return date.toLocaleDateString(
    "en-IN"
  );

}


function documentDate(
  value:
    string |
    null |
    undefined
) {

  if (
    !value
  ) {
    return "-";
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


  return date.toLocaleDateString(
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",
    }
  );

}


function formatDateTime(
  value:
    string |
    null |
    undefined
) {

  if (
    !value
  ) {
    return "-";
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


  return date.toLocaleString(
    "en-IN"
  );

}


function getLocalToday() {

  const now =
    new Date();


  const year =
    now.getFullYear();


  const month =
    String(
      now.getMonth()
      +
      1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );


  return (
    `${year}-${month}-${day}`
  );

}


function getLocalDateTime() {

  const now =
    new Date();


  const timezoneOffset =
    now.getTimezoneOffset()
    *
    60000;


  return new Date(
    now.getTime()
    -
    timezoneOffset
  )
    .toISOString()
    .slice(
      0,
      16
    );

}


function getStatusClass(
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
    normalized
    ===
    "issued"
  ) {
    return "issued";
  }


  if (
    normalized
    ===
    "draft"
  ) {
    return "draft";
  }


  if (
    normalized
    ===
    "cancelled"
  ) {
    return "cancelled";
  }


  return "default";

}


function getInvoiceTypeClass(
  invoiceType:
    string
) {

  const normalized =
    invoiceType
      .toLowerCase();


  if (
    normalized.includes(
      "credit"
    )
  ) {
    return "credit-note";
  }


  if (
    normalized.includes(
      "revised"
    )
  ) {
    return "revised";
  }


  if (
    normalized.includes(
      "tax"
    )
  ) {
    return "tax-invoice";
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


function getPaymentStatusColor(
  status:
    string
) {

  switch (
    status
  ) {

    case "Paid":

      return "#159a5b";


    case "Partially Paid":

      return "#d78500";


    case "Pending":

      return "#d66523";


    default:

      return "#7183a3";

  }

}


/* ================================================================
   DOCUMENT HELPERS
================================================================ */

function escapeHtml(
  value:
    unknown
) {

  return String(
    value
    ??
    ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function htmlText(
  value:
    unknown
) {

  return escapeHtml(
    value
  ).replace(
    /\r?\n/g,
    "<br />"
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

          resolve(
            String(
              reader.result
            )
          );

        };


      reader.onerror =
        () => {

          reject(
            reader.error
            ||
            new Error(
              "Unable to read company logo."
            )
          );

        };


      reader.readAsDataURL(
        blob
      );

    }
  );

}


function buildCompanyContactLine(
  company:
    CompanySettings
) {

  return [
    company.phone,
    company.email,
    company.website,
  ]
    .filter(
      Boolean
    )
    .join(
      " | "
    );

}


function buildCompanyAddress(
  company:
    CompanySettings
) {

  return [
    company.address,
    company.state_name,
  ]
    .filter(
      Boolean
    )
    .join(
      ", "
    );

}


function getDocumentTitle(
  bill:
    FinalBill
) {

  const type =
    bill.invoice_type
      .trim()
      .toLowerCase();


  if (
    type.includes(
      "credit"
    )
  ) {
    return "CREDIT NOTE";
  }


  if (
    type.includes(
      "revised"
    )
  ) {
    return "REVISED TAX INVOICE";
  }


  return "TAX INVOICE";

}


/* ================================================================
   BUILD FINAL BILL PRINT / WORD DOCUMENT
================================================================ */

function buildFinalBillDocumentHtml(
  bill:
    FinalBill,

  proformaNumber:
    string,

  assets:
    PrintAssets
) {

  const {
    company,
    document,
    logoDataUrl,
  } =
    assets;


  const letterheadMode =
    document
      .default_print_mode
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
    buildCompanyAddress(
      company
    );


  const companyContact =
    buildCompanyContactLine(
      company
    );


  const itemRows =
    bill.items
      .map(
        (
          item,
          index
        ) => {

          return `
            <tr>

              <td class="center">
                ${index + 1}
              </td>

              <td>
                ${htmlText(
                  item.description
                  ||
                  "-"
                )}
              </td>

              <td>
                ${escapeHtml(
                  item.hsn_code
                  ||
                  "-"
                )}
              </td>

              <td class="right">
                ${escapeHtml(
                  item.quantity
                )}
              </td>

              <td>
                ${escapeHtml(
                  item.unit
                  ||
                  "-"
                )}
              </td>

              <td class="right">
                ₹${money(
                  item.unit_price
                )}
              </td>

              <td class="right">
                ${escapeHtml(
                  item.discount_percent
                )}%
              </td>

              <td class="right">
                ₹${money(
                  item.taxable_amount
                )}
              </td>

              <td class="right">
                ${escapeHtml(
                  item.gst_percent
                )}%
              </td>

              <td class="right">
                ₹${money(
                  item.line_total
                )}
              </td>

            </tr>
          `;

        }
      )
      .join(
        ""
      );


  const companyHeader =
    letterheadMode
      ? `
          <div
            class="letterhead-space"
            style="height:${topSpace}mm;"
          ></div>
        `
      : `
          <header class="company-header">

            ${
              document.show_logo
              &&
              logoDataUrl
                ? `
                    <div class="company-logo-box">
                      <img
                        src="${logoDataUrl}"
                        alt="Company Logo"
                      />
                    </div>
                  `
                : ""
            }

            <div class="company-heading">

              <h1>
                ${escapeHtml(
                  company.company_name
                )}
              </h1>

              ${
                companyAddress
                  ? `
                      <div>
                        ${htmlText(
                          companyAddress
                        )}
                      </div>
                    `
                  : ""
              }

              ${
                document.show_contact_details
                &&
                companyContact
                  ? `
                      <div>
                        ${escapeHtml(
                          companyContact
                        )}
                      </div>
                    `
                  : ""
              }

              ${
                document.show_gst_number
                &&
                company.gst_number
                  ? `
                      <div class="company-tax">

                        GSTIN:
                        <strong>
                          ${escapeHtml(
                            company.gst_number
                          )}
                        </strong>

                        ${
                          company.pan_number
                            ? `
                                &nbsp;&nbsp;
                                PAN:
                                <strong>
                                  ${escapeHtml(
                                    company.pan_number
                                  )}
                                </strong>
                              `
                            : ""
                        }

                      </div>
                    `
                  : ""
              }

            </div>

          </header>
        `;


  const bankSection =
    document
      .show_bank_details_on_final_bill
      ? `
          <section class="bottom-block">

            <h3>
              Bank Details
            </h3>

            <div class="bank-grid">

              <div>
                <span>
                  Account Name
                </span>

                <strong>
                  ${escapeHtml(
                    company.bank_account_name
                    ||
                    "-"
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Bank
                </span>

                <strong>
                  ${escapeHtml(
                    company.bank_name
                    ||
                    "-"
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Account Number
                </span>

                <strong>
                  ${escapeHtml(
                    company.bank_account_number
                    ||
                    "-"
                  )}
                </strong>
              </div>

              <div>
                <span>
                  IFSC
                </span>

                <strong>
                  ${escapeHtml(
                    company.bank_ifsc_code
                    ||
                    "-"
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Branch
                </span>

                <strong>
                  ${escapeHtml(
                    company.bank_branch
                    ||
                    "-"
                  )}
                </strong>
              </div>

              <div>
                <span>
                  UPI ID
                </span>

                <strong>
                  ${escapeHtml(
                    company.upi_id
                    ||
                    "-"
                  )}
                </strong>
              </div>

            </div>

          </section>
        `
      : "";


  const signatureSection =
    document
      .show_authorized_signature
      ? `
          <section class="signature">

            <div></div>

            <div class="signature-box">

              <div class="signature-space"></div>

              <strong>
                ${escapeHtml(
                  document
                    .authorized_signatory_name
                  ||
                  "Authorized Signatory"
                )}
              </strong>

              ${
                document
                  .authorized_signatory_designation
                  ? `
                      <span>
                        ${escapeHtml(
                          document
                            .authorized_signatory_designation
                        )}
                      </span>
                    `
                  : ""
              }

              <span>
                For
                ${escapeHtml(
                  company.company_name
                )}
              </span>

            </div>

          </section>
        `
      : "";


  const footer =
    document.footer_text
      ? `
          <footer>
            ${htmlText(
              document.footer_text
            )}
          </footer>
        `
      : "";


  const draftWatermark =
    bill.status
      .trim()
      .toLowerCase()
    ===
    "draft"
      ? `
          <div class="watermark">
            DRAFT
          </div>
        `
      : "";


  return `
<!DOCTYPE html>

<html>

<head>

  <meta charset="UTF-8" />

  <title>
    ${escapeHtml(
      bill.invoice_number
    )}
  </title>

  <style>

    @page {
      size: A4 portrait;

      margin:
        12mm
        12mm
        14mm
        12mm;
    }

    * {
      box-sizing:
        border-box;
    }

    html,
    body {
      margin:
        0;

      padding:
        0;

      background:
        #ffffff;

      color:
        #111827;

      font-family:
        Arial,
        Helvetica,
        sans-serif;

      font-size:
        10px;

      line-height:
        1.45;

      -webkit-print-color-adjust:
        exact;

      print-color-adjust:
        exact;
    }

    body {
      width:
        100%;
    }

    .document {
      position:
        relative;

      width:
        100%;

      margin:
        0 auto;
    }

    .watermark {
      position:
        fixed;

      top:
        42%;

      left:
        17%;

      z-index:
        -1;

      color:
        rgba(
          220,
          38,
          38,
          0.07
        );

      font-size:
        100px;

      font-weight:
        800;

      letter-spacing:
        16px;

      transform:
        rotate(
          -28deg
        );
    }

    .letterhead-space {
      width:
        100%;
    }

    .company-header {
      display:
        flex;

      align-items:
        center;

      gap:
        16px;

      margin-bottom:
        8mm;

      padding-bottom:
        5mm;

      border-bottom:
        2px solid #1d4ed8;
    }

    .company-logo-box {
      flex:
        0 0 72px;

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;
    }

    .company-logo-box img {
      max-width:
        72px;

      max-height:
        64px;

      object-fit:
        contain;
    }

    .company-heading {
      flex:
        1;

      min-width:
        0;
    }

    .company-heading h1 {
      margin:
        0 0 4px;

      color:
        #0f172a;

      font-size:
        22px;

      line-height:
        1.1;
    }

    .company-heading > div {
      margin-top:
        2px;

      color:
        #475569;
    }

    .company-tax {
      margin-top:
        4px !important;

      color:
        #111827 !important;
    }

    .document-title-row {
      display:
        flex;

      align-items:
        flex-start;

      justify-content:
        space-between;

      gap:
        20px;

      margin-bottom:
        6mm;
    }

    .document-title {
      margin:
        0;

      color:
        #111827;

      font-size:
        20px;

      letter-spacing:
        0.04em;
    }

    .document-status {
      margin-top:
        5px;

      color:
        #64748b;

      font-size:
        9px;

      font-weight:
        700;

      text-transform:
        uppercase;
    }

    .document-meta {
      min-width:
        225px;

      overflow:
        hidden;

      border:
        1px solid #cbd5e1;

      border-radius:
        5px;
    }

    .document-meta-row {
      display:
        grid;

      grid-template-columns:
        94px
        1fr;

      border-bottom:
        1px solid #e2e8f0;
    }

    .document-meta-row:last-child {
      border-bottom:
        0;
    }

    .document-meta-row span,
    .document-meta-row strong {
      padding:
        6px 8px;
    }

    .document-meta-row span {
      background:
        #f8fafc;

      color:
        #64748b;
    }

    .party-grid {
      display:
        grid;

      grid-template-columns:
        repeat(
          2,
          minmax(
            0,
            1fr
          )
        );

      gap:
        5mm;

      margin-bottom:
        6mm;
    }

    .party-card {
      min-height:
        37mm;

      padding:
        4mm;

      border:
        1px solid #cbd5e1;

      border-radius:
        5px;
    }

    .party-card h3,
    .bottom-block h3 {
      margin:
        0 0 3mm;

      color:
        #1d4ed8;

      font-size:
        10px;

      letter-spacing:
        0.08em;

      text-transform:
        uppercase;
    }

    .party-company {
      margin-bottom:
        2mm;

      color:
        #111827;

      font-size:
        13px;
    }

    .party-line {
      margin-top:
        1.2mm;

      color:
        #475569;
    }

    table {
      width:
        100%;

      border-collapse:
        collapse;

      page-break-inside:
        auto;
    }

    thead {
      display:
        table-header-group;
    }

    tr {
      page-break-inside:
        avoid;

      page-break-after:
        auto;
    }

    th {
      padding:
        7px 6px;

      border:
        1px solid #cbd5e1;

      background:
        #eef4ff;

      color:
        #334155;

      font-size:
        8px;

      text-align:
        left;
    }

    td {
      padding:
        7px 6px;

      border:
        1px solid #cbd5e1;

      vertical-align:
        top;
    }

    .right {
      text-align:
        right;
    }

    .center {
      text-align:
        center;
    }

    .summary-grid {
      display:
        grid;

      grid-template-columns:
        1fr
        75mm;

      gap:
        6mm;

      margin-top:
        6mm;
    }

    .terms {
      padding:
        4mm;

      border:
        1px solid #cbd5e1;

      border-radius:
        5px;
    }

    .terms h3 {
      margin:
        0 0 3mm;

      color:
        #1d4ed8;

      font-size:
        10px;

      text-transform:
        uppercase;
    }

    .term-row {
      margin-top:
        2mm;
    }

    .term-row span {
      display:
        block;

      margin-bottom:
        1mm;

      color:
        #64748b;

      font-size:
        8px;

      text-transform:
        uppercase;
    }

    .totals {
      overflow:
        hidden;

      border:
        1px solid #cbd5e1;

      border-radius:
        5px;
    }

    .total-row {
      display:
        grid;

      grid-template-columns:
        1fr
        35mm;

      border-bottom:
        1px solid #e2e8f0;
    }

    .total-row:last-child {
      border-bottom:
        0;
    }

    .total-row span,
    .total-row strong {
      padding:
        6px 8px;
    }

    .total-row span {
      color:
        #64748b;
    }

    .total-row strong {
      text-align:
        right;
    }

    .total-row.grand {
      background:
        #eef4ff;

      color:
        #0f172a;

      font-size:
        12px;
    }

    .bottom-block {
      margin-top:
        6mm;

      padding:
        4mm;

      border:
        1px solid #cbd5e1;

      border-radius:
        5px;
    }

    .bank-grid {
      display:
        grid;

      grid-template-columns:
        repeat(
          3,
          minmax(
            0,
            1fr
          )
        );

      gap:
        3mm;
    }

    .bank-grid div {
      display:
        flex;

      flex-direction:
        column;

      gap:
        1mm;
    }

    .bank-grid span {
      color:
        #64748b;

      font-size:
        8px;

      text-transform:
        uppercase;
    }

    .signature {
      display:
        grid;

      grid-template-columns:
        1fr
        58mm;

      margin-top:
        7mm;
    }

    .signature-box {
      text-align:
        center;
    }

    .signature-space {
      height:
        20mm;

      margin-bottom:
        2mm;

      border-bottom:
        1px solid #94a3b8;
    }

    .signature-box strong,
    .signature-box span {
      display:
        block;
    }

    .signature-box span {
      margin-top:
        1mm;

      color:
        #64748b;

      font-size:
        9px;
    }

    footer {
      margin-top:
        8mm;

      padding-top:
        4mm;

      border-top:
        1px solid #cbd5e1;

      color:
        #64748b;

      font-size:
        8px;

      text-align:
        center;
    }

  </style>

</head>

<body>

  <div class="document">

    ${draftWatermark}

    ${companyHeader}

    <div class="document-title-row">

      <div>

        <h2 class="document-title">

          ${escapeHtml(
            getDocumentTitle(
              bill
            )
          )}

        </h2>

        <div class="document-status">

          Status:
          ${escapeHtml(
            bill.status
          )}

        </div>

      </div>


      <div class="document-meta">

        <div class="document-meta-row">

          <span>
            Invoice No.
          </span>

          <strong>
            ${escapeHtml(
              bill.invoice_number
            )}
          </strong>

        </div>


        <div class="document-meta-row">

          <span>
            Invoice Date
          </span>

          <strong>
            ${escapeHtml(
              documentDate(
                bill.invoice_date
              )
            )}
          </strong>

        </div>


        <div class="document-meta-row">

          <span>
            Proforma
          </span>

          <strong>
            ${escapeHtml(
              proformaNumber
            )}
          </strong>

        </div>


        <div class="document-meta-row">

          <span>
            Revision
          </span>

          <strong>
            R${escapeHtml(
              bill.revision_number
            )}
          </strong>

        </div>

      </div>

    </div>


    <section class="party-grid">

      <div class="party-card">

        <h3>
          Bill To
        </h3>

        <div class="party-company">

          <strong>
            ${escapeHtml(
              bill.company_name
            )}
          </strong>

        </div>


        ${
          bill.contact_person
            ? `
                <div class="party-line">
                  Attn:
                  ${escapeHtml(
                    bill.contact_person
                  )}
                </div>
              `
            : ""
        }


        ${
          bill.billing_address
            ? `
                <div class="party-line">
                  ${htmlText(
                    bill.billing_address
                  )}
                </div>
              `
            : ""
        }


        ${
          bill.gst_number
            ? `
                <div class="party-line">
                  GSTIN:
                  <strong>
                    ${escapeHtml(
                      bill.gst_number
                    )}
                  </strong>
                </div>
              `
            : ""
        }


        ${
          bill.phone
            ? `
                <div class="party-line">
                  Phone:
                  ${escapeHtml(
                    bill.phone
                  )}
                </div>
              `
            : ""
        }


        ${
          bill.email
            ? `
                <div class="party-line">
                  Email:
                  ${escapeHtml(
                    bill.email
                  )}
                </div>
              `
            : ""
        }

      </div>


      <div class="party-card">

        <h3>
          Ship To
        </h3>

        <div class="party-company">

          <strong>
            ${escapeHtml(
              bill.company_name
            )}
          </strong>

        </div>


        <div class="party-line">

          ${
            bill.shipping_address
              ? htmlText(
                  bill.shipping_address
                )
              : htmlText(
                  bill.billing_address
                  ||
                  "-"
                )
          }

        </div>

      </div>

    </section>


    <table>

      <thead>

        <tr>

          <th class="center">
            #
          </th>

          <th>
            Description
          </th>

          <th>
            HSN
          </th>

          <th class="right">
            Qty
          </th>

          <th>
            Unit
          </th>

          <th class="right">
            Unit Price
          </th>

          <th class="right">
            Disc. %
          </th>

          <th class="right">
            Taxable
          </th>

          <th class="right">
            GST %
          </th>

          <th class="right">
            Total
          </th>

        </tr>

      </thead>


      <tbody>

        ${itemRows}

      </tbody>

    </table>


    <div class="summary-grid">

      <div class="terms">

        <h3>
          Commercial Terms
        </h3>


        <div class="term-row">

          <span>
            Payment Terms
          </span>

          <strong>
            ${htmlText(
              bill.payment_terms
              ||
              "-"
            )}
          </strong>

        </div>


        <div class="term-row">

          <span>
            Delivery Terms
          </span>

          <strong>
            ${htmlText(
              bill.delivery_terms
              ||
              "-"
            )}
          </strong>

        </div>


        ${
          bill.notes
            ? `
                <div class="term-row">

                  <span>
                    Notes
                  </span>

                  <strong>
                    ${htmlText(
                      bill.notes
                    )}
                  </strong>

                </div>
              `
            : ""
        }

      </div>


      <div class="totals">

        <div class="total-row">

          <span>
            Subtotal
          </span>

          <strong>
            ₹${money(
              bill.subtotal
            )}
          </strong>

        </div>


        <div class="total-row">

          <span>
            Discount
          </span>

          <strong>
            ₹${money(
              bill.discount_amount
            )}
          </strong>

        </div>


        <div class="total-row">

          <span>
            Taxable Amount
          </span>

          <strong>
            ₹${money(
              bill.taxable_amount
            )}
          </strong>

        </div>


        <div class="total-row">

          <span>
            CGST
          </span>

          <strong>
            ₹${money(
              bill.cgst_amount
            )}
          </strong>

        </div>


        <div class="total-row">

          <span>
            SGST
          </span>

          <strong>
            ₹${money(
              bill.sgst_amount
            )}
          </strong>

        </div>


        <div class="total-row">

          <span>
            IGST
          </span>

          <strong>
            ₹${money(
              bill.igst_amount
            )}
          </strong>

        </div>


        <div class="total-row grand">

          <span>
            Grand Total
          </span>

          <strong>
            ₹${money(
              bill.grand_total
            )}
          </strong>

        </div>

      </div>

    </div>


    ${bankSection}

    ${signatureSection}

    ${footer}

  </div>

</body>

</html>
  `;

}


/* ================================================================
   PAGE
================================================================ */

export default function FinalBillingPage() {

  /* ==============================================================
     CORE DATA
  ============================================================== */

  const [
    bills,
    setBills,
  ] =
    useState<
      FinalBill[]
    >([]);


  const [
    proformas,
    setProformas,
  ] =
    useState<
      Proforma[]
    >([]);


  const [
    productionOrders,
    setProductionOrders,
  ] =
    useState<
      ProductionOrder[]
    >([]);


  const [
    paymentSummaries,
    setPaymentSummaries,
  ] =
    useState<
      Record<
        number,
        FinalBillPaymentSummary
      >
    >({});


  const [
    selectedBill,
    setSelectedBill,
  ] =
    useState<
      FinalBill |
      null
    >(
      null
    );


  const [
    selectedPaymentSummary,
    setSelectedPaymentSummary,
  ] =
    useState<
      FinalBillPaymentSummary |
      null
    >(
      null
    );


  /* ==============================================================
     FILTERS
  ============================================================== */

  const [
    search,
    setSearch,
  ] =
    useState(
      ""
    );


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState(
      ""
    );


  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState(
      ""
    );


  /* ==============================================================
     SETTINGS CONTROLLED PAGINATION
  ============================================================== */

  const [
    pageSize,
    setPageSize,
  ] =
    useState(
      FALLBACK_PAGE_SIZE
    );


  const [
    currentPage,
    setCurrentPage,
  ] =
    useState(
      1
    );


  const [
    proformaPage,
    setProformaPage,
  ] =
    useState(
      1
    );


  /* ==============================================================
     GENERAL UI
  ============================================================== */

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    detailLoading,
    setDetailLoading,
  ] =
    useState(
      false
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
    detailError,
    setDetailError,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  const [
    detailMessage,
    setDetailMessage,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /* ==============================================================
     PRINT / DOWNLOAD
  ============================================================== */

  const [
    documentBusy,
    setDocumentBusy,
  ] =
    useState(
      false
    );


  /* ==============================================================
     CREATE BILL
  ============================================================== */

  const [
    createBillOpen,
    setCreateBillOpen,
  ] =
    useState(
      false
    );


  const [
    proformaLoading,
    setProformaLoading,
  ] =
    useState(
      false
    );


  const [
    proformaSearch,
    setProformaSearch,
  ] =
    useState(
      ""
    );


  const [
    selectedProformaId,
    setSelectedProformaId,
  ] =
    useState<
      number |
      null
    >(
      null
    );


  const [
    invoiceDate,
    setInvoiceDate,
  ] =
    useState(
      getLocalToday()
    );


  const [
    creatingBill,
    setCreatingBill,
  ] =
    useState(
      false
    );


  const [
    createBillError,
    setCreateBillError,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /* ==============================================================
     ISSUE BILL
  ============================================================== */

  const [
    issuingBill,
    setIssuingBill,
  ] =
    useState(
      false
    );


  /* ==============================================================
     DRAFT EDITOR
  ============================================================== */

  const [
    draftEditOpen,
    setDraftEditOpen,
  ] =
    useState(
      false
    );


  const [
    draftHeader,
    setDraftHeader,
  ] =
    useState<
      DraftHeaderForm
    >({
      invoice_date:
        "",

      billing_address:
        "",

      shipping_address:
        "",

      payment_terms:
        "",

      delivery_terms:
        "",

      notes:
        "",
    });


  const [
    draftItems,
    setDraftItems,
  ] =
    useState<
      DraftItemForm[]
    >([]);


  const [
    draftSaving,
    setDraftSaving,
  ] =
    useState(
      false
    );


  const [
    draftError,
    setDraftError,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /* ==============================================================
     REVISION
  ============================================================== */

  const [
    revisionOpen,
    setRevisionOpen,
  ] =
    useState(
      false
    );


  const [
    revisionSource,
    setRevisionSource,
  ] =
    useState<
      FinalBill |
      null
    >(
      null
    );


  const [
    revisionDate,
    setRevisionDate,
  ] =
    useState(
      getLocalToday()
    );


  const [
    revisionNotes,
    setRevisionNotes,
  ] =
    useState(
      ""
    );


  const [
    revisionCreating,
    setRevisionCreating,
  ] =
    useState(
      false
    );


  const [
    revisionError,
    setRevisionError,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /* ==============================================================
     CREDIT NOTE
  ============================================================== */

  const [
    creditNoteOpen,
    setCreditNoteOpen,
  ] =
    useState(
      false
    );


  const [
    creditNoteSource,
    setCreditNoteSource,
  ] =
    useState<
      FinalBill |
      null
    >(
      null
    );


  const [
    creditNoteDate,
    setCreditNoteDate,
  ] =
    useState(
      getLocalToday()
    );


  const [
    creditNoteNotes,
    setCreditNoteNotes,
  ] =
    useState(
      ""
    );


  const [
    creditNoteCreating,
    setCreditNoteCreating,
  ] =
    useState(
      false
    );


  const [
    creditNoteError,
    setCreditNoteError,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /* ==============================================================
     CUSTOMER PAYMENT
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
      FinalBill |
      null
    >(
      null
    );


  const [
    paymentSummary,
    setPaymentSummary,
  ] =
    useState<
      FinalBillPaymentSummary |
      null
    >(
      null
    );


  const [
    paymentDate,
    setPaymentDate,
  ] =
    useState(
      getLocalDateTime()
    );


  const [
    paymentAmount,
    setPaymentAmount,
  ] =
    useState(
      ""
    );


  const [
    paymentType,
    setPaymentType,
  ] =
    useState(
      "Advance"
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
    paymentSaving,
    setPaymentSaving,
  ] =
    useState(
      false
    );


  const [
    paymentError,
    setPaymentError,
  ] =
    useState<
      string |
      null
    >(
      null
    );


  /* ==============================================================
     LOAD PAGE SIZE
  ============================================================== */

  useEffect(
    () => {

      async function loadPageSize() {

        try {

          const settings =
            await getBusinessSettings();


          const configured =
            Number(
              settings.default_page_size
            );


          if (
            Number.isInteger(
              configured
            )
            &&
            configured >= 5
            &&
            configured <= 100
          ) {

            setPageSize(
              configured
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
            "Unable to load Final Billing page size:",
            err
          );


          setPageSize(
            FALLBACK_PAGE_SIZE
          );

        }

      }


      void loadPageSize();

    },
    []
  );


  /* ==============================================================
     PROFORMA LOOKUP
  ============================================================== */

  const proformaById =
    useMemo(
      () =>
        new Map(
          proformas.map(
            proforma => [
              proforma.id,
              proforma,
            ]
          )
        ),
      [
        proformas,
      ]
    );


  function getProformaNumber(
    proformaId:
      number
  ) {

    return (
      proformaById
        .get(
          proformaId
        )
        ?.proforma_number
      ??
      "Linked Proforma"
    );

  }


  /* ==============================================================
     INVOICE RELATION HELPERS
  ============================================================== */

  function getRootInvoiceId(
    bill:
      FinalBill
  ) {

    return (
      bill.parent_invoice_id
      ??
      bill.id
    );

  }


  function getOpenDraftRevision(
    bill:
      FinalBill
  ) {

    const rootInvoiceId =
      getRootInvoiceId(
        bill
      );


    return bills.find(
      candidate =>
        candidate.invoice_type
          .toLowerCase()
        ===
        "revised invoice"
        &&
        candidate.status
          .toLowerCase()
        ===
        "draft"
        &&
        (
          candidate.parent_invoice_id
          ??
          candidate.id
        )
        ===
        rootInvoiceId
    );

  }


  function getOpenDraftCreditNote(
    bill:
      FinalBill
  ) {

    return bills.find(
      candidate =>
        candidate.invoice_type
          .toLowerCase()
        ===
        "credit note"
        &&
        candidate.status
          .toLowerCase()
        ===
        "draft"
        &&
        candidate.parent_invoice_id
        ===
        bill.id
    );

  }


  /* ==============================================================
     PAYMENT SUMMARIES
  ============================================================== */

  async function loadPaymentSummaries(
    finalBills:
      FinalBill[]
  ) {

    const results =
      await Promise.all(
        finalBills.map(
          async bill => {

            try {

              const summary =
                await getFinalBillPaymentSummary(
                  bill.id
                );


              return {
                billId:
                  bill.id,

                summary,
              };

            } catch {

              return {
                billId:
                  bill.id,

                summary:
                  null,
              };

            }

          }
        )
      );


    const map:
      Record<
        number,
        FinalBillPaymentSummary
      > =
      {};


    results.forEach(
      result => {

        if (
          result.summary
        ) {

          map[
            result.billId
          ] =
            result.summary;

        }

      }
    );


    setPaymentSummaries(
      map
    );

  }


  async function refreshPaymentSummary(
    finalBillId:
      number
  ) {

    const summary =
      await getFinalBillPaymentSummary(
        finalBillId
      );


    setPaymentSummaries(
      current => ({
        ...current,

        [finalBillId]:
          summary,
      })
    );


    return summary;

  }


  /* ==============================================================
     LOAD FINAL BILLS
  ============================================================== */

  async function loadBills() {

    try {

      setLoading(
        true
      );


      setError(
        null
      );


      const [
        billData,
        proformaData,
        productionData,
      ] =
        await Promise.all([
          getFinalBills(),
          getProformas(),
          getProductionOrders(),
        ]);


      setBills(
        billData
      );


      setProformas(
        proformaData
      );


      setProductionOrders(
        productionData
      );


      await loadPaymentSummaries(
        billData
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
          "Unable to load Final Bills."
        )
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  useEffect(
    () => {

      void loadBills();

    },
    []
  );


  /* ==============================================================
     MAIN BILL FILTERING
  ============================================================== */

  const filteredBills =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        return bills.filter(
          bill => {

            const proformaNumber =
              proformaById
                .get(
                  bill.proforma_id
                )
                ?.proforma_number
              ??
              "";


            const matchesSearch =
              !query
              ||
              bill.invoice_number
                .toLowerCase()
                .includes(
                  query
                )
              ||
              bill.company_name
                .toLowerCase()
                .includes(
                  query
                )
              ||
              (
                bill.gst_number
                ??
                ""
              )
                .toLowerCase()
                .includes(
                  query
                )
              ||
              proformaNumber
                .toLowerCase()
                .includes(
                  query
                );


            const matchesStatus =
              !statusFilter
              ||
              bill.status
              ===
              statusFilter;


            const matchesType =
              !typeFilter
              ||
              bill.invoice_type
              ===
              typeFilter;


            return (
              matchesSearch
              &&
              matchesStatus
              &&
              matchesType
            );

          }
        );

      },
      [
        bills,
        search,
        statusFilter,
        typeFilter,
        proformaById,
      ]
    );


  /* ==============================================================
     MAIN BILL PAGINATION
  ============================================================== */

  useEffect(
    () => {

      setCurrentPage(
        1
      );

    },
    [
      search,
      statusFilter,
      typeFilter,
      pageSize,
    ]
  );


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredBills.length
        /
        pageSize
      )
    );


  useEffect(
    () => {

      if (
        currentPage
        >
        totalPages
      ) {

        setCurrentPage(
          totalPages
        );

      }

    },
    [
      currentPage,
      totalPages,
    ]
  );


  const paginatedBills =
    useMemo(
      () => {

        const start =
          (
            currentPage
            -
            1
          )
          *
          pageSize;


        return filteredBills.slice(
          start,
          start
          +
          pageSize
        );

      },
      [
        filteredBills,
        currentPage,
        pageSize,
      ]
    );


  /* ==============================================================
     KPI
  ============================================================== */

  const issuedCount =
    useMemo(
      () =>
        bills.filter(
          bill =>
            bill.status
              .toLowerCase()
            ===
            "issued"
        ).length,
      [
        bills,
      ]
    );


  const draftCount =
    useMemo(
      () =>
        bills.filter(
          bill =>
            bill.status
              .toLowerCase()
            ===
            "draft"
        ).length,
      [
        bills,
      ]
    );


  const creditNoteCount =
    useMemo(
      () =>
        bills.filter(
          bill =>
            bill.invoice_type
              .toLowerCase()
              .includes(
                "credit"
              )
        ).length,
      [
        bills,
      ]
    );


  const totalInvoiceValue =
    useMemo(
      () =>
        bills.reduce(
          (
            total,
            bill
          ) =>
            total
            +
            Number(
              bill.grand_total
            ),
          0
        ),
      [
        bills,
      ]
    );


  /* ==============================================================
     OPEN BILL DETAIL
  ============================================================== */

  async function openBillDetail(
    bill:
      FinalBill
  ) {

    try {

      setDetailLoading(
        true
      );


      setError(
        null
      );


      setDetailError(
        null
      );


      setDetailMessage(
        null
      );


      const [
        detail,
        summary,
      ] =
        await Promise.all([
          getFinalBillById(
            bill.id
          ),

          getFinalBillPaymentSummary(
            bill.id
          ),
        ]);


      setSelectedBill(
        detail
      );


      setSelectedPaymentSummary(
        summary
      );


      setPaymentSummaries(
        current => ({
          ...current,

          [bill.id]:
            summary,
        })
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
          "Unable to load Final Bill details."
        )
      );

    } finally {

      setDetailLoading(
        false
      );

    }

  }


  function closeDetail() {

    if (
      issuingBill
      ||
      draftSaving
      ||
      revisionCreating
      ||
      creditNoteCreating
      ||
      documentBusy
    ) {
      return;
    }


    setSelectedBill(
      null
    );


    setSelectedPaymentSummary(
      null
    );


    setDetailError(
      null
    );


    setDetailMessage(
      null
    );

  }


  /* ==============================================================
     DOCUMENT SETTINGS / PRINT ASSETS
  ============================================================== */

  async function loadPrintAssets():
  Promise<PrintAssets> {

    const [
      company,
      documentSettings,
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
      documentSettings.show_logo
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
          "Unable to load company logo for document:",
          err
        );


        logoDataUrl =
          null;

      }

    }


    return {
      company,

      document:
        documentSettings,

      logoDataUrl,
    };

  }


  /* ==============================================================
     PRINT FINAL BILL
  ============================================================== */

  async function handlePrintBill() {

    if (
      !selectedBill
    ) {
      return;
    }


    const bill =
      selectedBill;


    /*
     * Open immediately before API requests so the browser
     * does not block the print window.
     */

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1000,height=800"
      );


    if (
      !printWindow
    ) {

      setDetailError(
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
            Preparing invoice...
          </body>
        </html>
      `
    );


    try {

      setDocumentBusy(
        true
      );


      setDetailError(
        null
      );


      const assets =
        await loadPrintAssets();


      const html =
        buildFinalBillDocumentHtml(
          bill,

          getProformaNumber(
            bill.proforma_id
          ),

          assets
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


      console.error(
        err
      );


      setDetailError(
        getApiErrorMessage(
          err,
          "Unable to prepare the invoice for printing."
        )
      );

    } finally {

      setDocumentBusy(
        false
      );

    }

  }


  /* ==============================================================
     DOWNLOAD FINAL BILL

     Uses the same Company Header / Letterhead settings as Print.
     The generated file is Word-compatible.
  ============================================================== */

  async function handleDownloadBill() {

    if (
      !selectedBill
    ) {
      return;
    }


    const bill =
      selectedBill;


    try {

      setDocumentBusy(
        true
      );


      setDetailError(
        null
      );


      const assets =
        await loadPrintAssets();


      const html =
        buildFinalBillDocumentHtml(
          bill,

          getProformaNumber(
            bill.proforma_id
          ),

          assets
        );


      const blob =
        new Blob(
          [
            "\ufeff",
            html,
          ],
          {
            type:
              "application/msword;charset=utf-8",
          }
        );


      const url =
        URL.createObjectURL(
          blob
        );


      const link =
        document.createElement(
          "a"
        );


      link.href =
        url;


      link.download =
        `${bill.invoice_number}.doc`;


      document.body.appendChild(
        link
      );


      link.click();


      link.remove();


      window.setTimeout(
        () => {

          URL.revokeObjectURL(
            url
          );

        },
        1000
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setDetailError(
        getApiErrorMessage(
          err,
          "Unable to download the invoice."
        )
      );

    } finally {

      setDocumentBusy(
        false
      );

    }

  }


  /* ==============================================================
     DRAFT EDITOR
  ============================================================== */

  function openDraftEditor() {

    if (
      !selectedBill
    ) {
      return;
    }


    if (
      selectedBill.status
        .toLowerCase()
      !==
      "draft"
    ) {

      setDetailError(
        "Only Draft invoices can be corrected."
      );

      return;

    }


    setDraftHeader({
      invoice_date:
        selectedBill.invoice_date,

      billing_address:
        selectedBill.billing_address
        ??
        "",

      shipping_address:
        selectedBill.shipping_address
        ??
        "",

      payment_terms:
        selectedBill.payment_terms
        ??
        "",

      delivery_terms:
        selectedBill.delivery_terms
        ??
        "",

      notes:
        selectedBill.notes
        ??
        "",
    });


    setDraftItems(
      selectedBill.items.map(
        item => ({
          id:
            item.id,

          description:
            item.description
            ??
            "",

          hsn_code:
            item.hsn_code
            ??
            "",

          quantity:
            String(
              item.quantity
            ),

          unit:
            item.unit
            ??
            "",

          unit_price:
            String(
              item.unit_price
            ),

          discount_percent:
            String(
              item.discount_percent
            ),

          gst_percent:
            String(
              item.gst_percent
            ),
        })
      )
    );


    setDraftError(
      null
    );


    setDraftEditOpen(
      true
    );

  }


  function closeDraftEditor() {

    if (
      draftSaving
    ) {
      return;
    }


    setDraftEditOpen(
      false
    );


    setDraftError(
      null
    );

  }


  function updateDraftHeader(
    field:
      keyof DraftHeaderForm,

    value:
      string
  ) {

    setDraftHeader(
      current => ({
        ...current,

        [field]:
          value,
      })
    );

  }


  function updateDraftItem(
    itemId:
      number,

    field:
      keyof DraftItemForm,

    value:
      string
  ) {

    setDraftItems(
      current =>
        current.map(
          item =>
            item.id
            ===
            itemId
              ? {
                  ...item,

                  [field]:
                    value,
                }
              : item
        )
    );

  }


  function validateDraft() {

    if (
      !draftHeader.invoice_date
    ) {

      return (
        "Invoice date is required."
      );

    }


    if (
      draftItems.length
      ===
      0
    ) {

      return (
        "Invoice must contain at least one item."
      );

    }


    for (
      let index = 0;
      index < draftItems.length;
      index += 1
    ) {

      const item =
        draftItems[
          index
        ];


      if (
        !item.description
          .trim()
      ) {

        return (
          `Item ${index + 1}: description is required.`
        );

      }


      const quantity =
        Number(
          item.quantity
        );


      if (
        Number.isNaN(
          quantity
        )
        ||
        quantity <= 0
      ) {

        return (
          `Item ${index + 1}: quantity must be greater than zero.`
        );

      }


      const unitPrice =
        Number(
          item.unit_price
        );


      if (
        Number.isNaN(
          unitPrice
        )
        ||
        unitPrice < 0
      ) {

        return (
          `Item ${index + 1}: unit price cannot be negative.`
        );

      }


      const discount =
        Number(
          item.discount_percent
        );


      if (
        Number.isNaN(
          discount
        )
        ||
        discount < 0
        ||
        discount > 100
      ) {

        return (
          `Item ${index + 1}: discount must be between 0 and 100.`
        );

      }


      const gst =
        Number(
          item.gst_percent
        );


      if (
        Number.isNaN(
          gst
        )
        ||
        gst < 0
        ||
        gst > 100
      ) {

        return (
          `Item ${index + 1}: GST must be between 0 and 100.`
        );

      }

    }


    return "";

  }


  async function handleSaveDraft() {

    if (
      !selectedBill
    ) {
      return;
    }


    const validation =
      validateDraft();


    if (
      validation
    ) {

      setDraftError(
        validation
      );

      return;

    }


    try {

      setDraftSaving(
        true
      );


      setDraftError(
        null
      );


      let updated =
        await updateFinalBill(
          selectedBill.id,
          {
            invoice_date:
              draftHeader.invoice_date,

            billing_address:
              draftHeader.billing_address
                .trim()
              ||
              null,

            shipping_address:
              draftHeader.shipping_address
                .trim()
              ||
              null,

            payment_terms:
              draftHeader.payment_terms
                .trim()
              ||
              null,

            delivery_terms:
              draftHeader.delivery_terms
                .trim()
              ||
              null,

            notes:
              draftHeader.notes
                .trim()
              ||
              null,
          }
        );


      for (
        const item of draftItems
      ) {

        updated =
          await updateFinalBillItem(
            selectedBill.id,
            item.id,
            {
              description:
                item.description
                  .trim(),

              hsn_code:
                item.hsn_code
                  .trim()
                ||
                null,

              quantity:
                Number(
                  item.quantity
                ),

              unit:
                item.unit
                  .trim()
                ||
                null,

              unit_price:
                Number(
                  item.unit_price
                ),

              discount_percent:
                Number(
                  item.discount_percent
                ),

              gst_percent:
                Number(
                  item.gst_percent
                ),
            }
          );

      }


      setSelectedBill(
        updated
      );


      setBills(
        current =>
          current.map(
            bill =>
              bill.id
              ===
              updated.id
                ? updated
                : bill
          )
      );


      setDraftEditOpen(
        false
      );


      setDetailError(
        null
      );


      setDetailMessage(
        updated.invoice_type
          .toLowerCase()
        ===
        "revised invoice"
          ? (
              "Revised invoice draft saved. "
              +
              "Review it and issue the revision when ready."
            )
          : updated.invoice_type
              .toLowerCase()
            ===
            "credit note"
              ? (
                  "Credit Note draft saved. "
                  +
                  "Review the credited quantity/value "
                  +
                  "and issue it when ready."
                )
              : (
                  "Draft corrections saved. "
                  +
                  "Review the invoice and issue it when ready."
                )
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setDraftError(
        getApiErrorMessage(
          err,
          "Unable to save Draft corrections."
        )
      );

    } finally {

      setDraftSaving(
        false
      );

    }

  }


  /* ==============================================================
     REVISION
  ============================================================== */

  function openRevisionCreator(
    bill:
      FinalBill
  ) {

    if (
      bill.status
        .toLowerCase()
      !==
      "issued"
    ) {

      setDetailError(
        "Only an Issued invoice can be revised."
      );

      return;

    }


    if (
      bill.invoice_type
        .toLowerCase()
        .includes(
          "credit"
        )
    ) {

      setDetailError(
        "A Credit Note cannot be revised as an invoice."
      );

      return;

    }


    const summary =
      selectedBill?.id
      ===
      bill.id
        ? selectedPaymentSummary
        : paymentSummaries[
            bill.id
          ];


    if (
      !summary
      ||
      !summary.is_effective_invoice
    ) {

      setDetailError(
        "Only the current effective invoice can be revised."
      );

      return;

    }


    const existingDraft =
      getOpenDraftRevision(
        bill
      );


    if (
      existingDraft
    ) {

      void openBillDetail(
        existingDraft
      );

      return;

    }


    const existingCreditNote =
      getOpenDraftCreditNote(
        bill
      );


    if (
      existingCreditNote
    ) {

      setDetailError(
        "Finish or issue the existing Draft Credit Note "
        +
        "before creating a Revision."
      );

      return;

    }


    setRevisionSource(
      bill
    );


    setRevisionDate(
      getLocalToday()
    );


    setRevisionNotes(
      ""
    );


    setRevisionError(
      null
    );


    setRevisionOpen(
      true
    );

  }


  function closeRevisionCreator() {

    if (
      revisionCreating
    ) {
      return;
    }


    setRevisionOpen(
      false
    );


    setRevisionSource(
      null
    );


    setRevisionError(
      null
    );

  }


  async function handleCreateRevision() {

    if (
      !revisionSource
    ) {
      return;
    }


    if (
      !revisionDate
    ) {

      setRevisionError(
        "Revision invoice date is required."
      );

      return;

    }


    try {

      setRevisionCreating(
        true
      );


      setRevisionError(
        null
      );


      const created =
        await createFinalBillRevision(
          revisionSource.id,
          {
            invoice_date:
              revisionDate,

            notes:
              revisionNotes
                .trim()
              ||
              null,
          }
        );


      const [
        summary,
        refreshedBills,
      ] =
        await Promise.all([
          getFinalBillPaymentSummary(
            created.id
          ),

          getFinalBills(),
        ]);


      setBills(
        refreshedBills
      );


      setPaymentSummaries(
        current => ({
          ...current,

          [created.id]:
            summary,
        })
      );


      setSelectedBill(
        created
      );


      setSelectedPaymentSummary(
        summary
      );


      setRevisionOpen(
        false
      );


      setRevisionSource(
        null
      );


      setDetailError(
        null
      );


      setDetailMessage(
        `${created.invoice_number} created as a Draft. `
        +
        "Use Edit Draft to make the required correction, "
        +
        "then issue the revised invoice."
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setRevisionError(
        getApiErrorMessage(
          err,
          "Unable to create revised invoice."
        )
      );

    } finally {

      setRevisionCreating(
        false
      );

    }

  }


  /* ==============================================================
     CREDIT NOTE
  ============================================================== */

  function openCreditNoteCreator(
    bill:
      FinalBill
  ) {

    if (
      bill.status
        .toLowerCase()
      !==
      "issued"
    ) {

      setDetailError(
        "Credit Note can be created only from an Issued invoice."
      );

      return;

    }


    if (
      bill.invoice_type
        .toLowerCase()
        .includes(
          "credit"
        )
    ) {

      setDetailError(
        "A Credit Note cannot be created from another Credit Note."
      );

      return;

    }


    const summary =
      selectedBill?.id
      ===
      bill.id
        ? selectedPaymentSummary
        : paymentSummaries[
            bill.id
          ];


    if (
      !summary
      ||
      !summary.is_effective_invoice
    ) {

      setDetailError(
        "Credit Note can be created only against "
        +
        "the current effective invoice."
      );

      return;

    }


    const existingRevision =
      getOpenDraftRevision(
        bill
      );


    if (
      existingRevision
    ) {

      setDetailError(
        "Finish or issue the existing Draft Revision "
        +
        "before creating a Credit Note."
      );

      return;

    }


    const existingCreditNote =
      getOpenDraftCreditNote(
        bill
      );


    if (
      existingCreditNote
    ) {

      void openBillDetail(
        existingCreditNote
      );

      return;

    }


    setCreditNoteSource(
      bill
    );


    setCreditNoteDate(
      getLocalToday()
    );


    setCreditNoteNotes(
      ""
    );


    setCreditNoteError(
      null
    );


    setCreditNoteOpen(
      true
    );

  }


  function closeCreditNoteCreator() {

    if (
      creditNoteCreating
    ) {
      return;
    }


    setCreditNoteOpen(
      false
    );


    setCreditNoteSource(
      null
    );


    setCreditNoteError(
      null
    );

  }


  async function handleCreateCreditNote() {

    if (
      !creditNoteSource
    ) {
      return;
    }


    if (
      !creditNoteDate
    ) {

      setCreditNoteError(
        "Credit Note date is required."
      );

      return;

    }


    try {

      setCreditNoteCreating(
        true
      );


      setCreditNoteError(
        null
      );


      const created =
        await createFinalBillCreditNote(
          creditNoteSource.id,
          {
            invoice_date:
              creditNoteDate,

            notes:
              creditNoteNotes
                .trim()
              ||
              null,
          }
        );


      const [
        summary,
        refreshedBills,
      ] =
        await Promise.all([
          getFinalBillPaymentSummary(
            created.id
          ),

          getFinalBills(),
        ]);


      setBills(
        refreshedBills
      );


      setPaymentSummaries(
        current => ({
          ...current,

          [created.id]:
            summary,
        })
      );


      setSelectedBill(
        created
      );


      setSelectedPaymentSummary(
        summary
      );


      setCreditNoteOpen(
        false
      );


      setCreditNoteSource(
        null
      );


      setDetailError(
        null
      );


      setDetailMessage(
        `${created.invoice_number} created as a Draft. `
        +
        "Use Edit Draft to set the quantity/value being credited, "
        +
        "then issue the Credit Note."
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setCreditNoteError(
        getApiErrorMessage(
          err,
          "Unable to create Credit Note."
        )
      );

    } finally {

      setCreditNoteCreating(
        false
      );

    }

  }


  /* ==============================================================
     ISSUE BILL
  ============================================================== */

  async function handleIssueBill() {

    if (
      !selectedBill
    ) {
      return;
    }


    const isCreditNote =
      selectedBill.invoice_type
        .toLowerCase()
        .includes(
          "credit"
        );


    const isRevision =
      selectedBill.invoice_type
        .toLowerCase()
      ===
      "revised invoice";


    const confirmed =
      window.confirm(
        isCreditNote
          ? (
              "Issue this Credit Note?\n\n"
              +
              "Once issued, it will be included automatically "
              +
              "in GST reporting."
            )
          : isRevision
            ? (
                "Issue this revised invoice?\n\n"
                +
                "Please confirm that the correction, items, "
                +
                "HSN, price and GST are correct.\n\n"
                +
                "After issue, this revision becomes the "
                +
                "current effective invoice."
              )
            : (
                "Issue this invoice?\n\n"
                +
                "Please confirm that customer details, items, "
                +
                "price, HSN and GST are correct.\n\n"
                +
                "Once issued, it becomes an official billing "
                +
                "document and will be included automatically "
                +
                "in the Sales GST report."
              )
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {

      setIssuingBill(
        true
      );


      setDetailError(
        null
      );


      setDetailMessage(
        null
      );


      const issued =
        await issueFinalBill(
          selectedBill.id
        );


      const refreshedBills =
        await getFinalBills();


      setBills(
        refreshedBills
      );


      await loadPaymentSummaries(
        refreshedBills
      );


      const summary =
        await getFinalBillPaymentSummary(
          issued.id
        );


      setSelectedBill(
        issued
      );


      setSelectedPaymentSummary(
        summary
      );


      setDetailMessage(
        isCreditNote
          ? (
              "Credit Note issued successfully. "
              +
              "GST reporting will include it automatically."
            )
          : isRevision
            ? (
                "Revised invoice issued successfully. "
                +
                "This revision is now the current effective invoice."
              )
            : (
                "Invoice issued successfully. "
                +
                "It is now included automatically "
                +
                "in the Sales GST report."
              )
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setDetailError(
        getApiErrorMessage(
          err,
          "Unable to issue this billing document."
        )
      );

    } finally {

      setIssuingBill(
        false
      );

    }

  }


  /* ==============================================================
     CREATE BILL
  ============================================================== */

  async function openCreateBill() {

    setCreateBillOpen(
      true
    );


    setSelectedProformaId(
      null
    );


    setProformaSearch(
      ""
    );


    setProformaPage(
      1
    );


    setInvoiceDate(
      getLocalToday()
    );


    setCreateBillError(
      null
    );


    try {

      setProformaLoading(
        true
      );


      const [
        proformaData,
        productionData,
      ] =
        await Promise.all([
          getProformas(),
          getProductionOrders(),
        ]);


      setProformas(
        proformaData
      );


      setProductionOrders(
        productionData
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setCreateBillError(
        getApiErrorMessage(
          err,
          "Unable to load Proformas."
        )
      );

    } finally {

      setProformaLoading(
        false
      );

    }

  }


  function closeCreateBill() {

    if (
      creatingBill
    ) {
      return;
    }


    setCreateBillOpen(
      false
    );


    setSelectedProformaId(
      null
    );


    setCreateBillError(
      null
    );

  }


  const billedProformaIds =
    useMemo(
      () =>
        new Set(
          bills
            .filter(
              bill =>
                bill.parent_invoice_id
                ===
                null
            )
            .map(
              bill =>
                bill.proforma_id
            )
        ),
      [
        bills,
      ]
    );


  /* ==============================================================
     PRODUCTION COMPLETION ELIGIBILITY

     A Proforma can appear in Create Bill only when:

     1. At least one Production Order exists.
     2. Every Production Order linked to that Proforma is Completed.

     Backend FinalBillService still performs the authoritative
     Finished Goods Receipt / quantity validation when the bill
     is actually created.
  ============================================================== */

  const productionOrdersByProforma =
    useMemo(
      () => {

        const map =
          new Map<
            number,
            ProductionOrder[]
          >();


        productionOrders.forEach(
          order => {

            const existing =
              map.get(
                order.proforma_id
              )
              ??
              [];


            existing.push(
              order
            );


            map.set(
              order.proforma_id,
              existing
            );

          }
        );


        return map;

      },
      [
        productionOrders,
      ]
    );


  const productionCompletedProformaIds =
    useMemo(
      () => {

        const completed =
          new Set<
            number
          >();


        productionOrdersByProforma.forEach(
          (
            orders,
            proformaId
          ) => {

            /*
             * There must actually be a Production Order.
             */
            if (
              orders.length
              ===
              0
            ) {
              return;
            }


            /*
             * If a Proforma contains multiple manufactured
             * items, ALL linked Production Orders must be
             * completed before billing is allowed.
             */
            const allCompleted =
              orders.every(
                order =>
                  (
                    order.status
                    ??
                    ""
                  )
                    .trim()
                    .toLowerCase()
                  ===
                  "completed"
              );


            if (
              allCompleted
            ) {

              completed.add(
                proformaId
              );

            }

          }
        );


        return completed;

      },
      [
        productionOrdersByProforma,
      ]
    );


  const availableProformas =
    useMemo(
      () => {

        const query =
          proformaSearch
            .trim()
            .toLowerCase();


        return proformas

          /*
           * Do not show Proformas that already have
           * an original Final Bill.
           */
          .filter(
            proforma =>
              !billedProformaIds
                .has(
                  proforma.id
                )
          )

          /*
           * BILLING ELIGIBILITY:
           *
           * Do not show:
           * - Order Confirmed
           * - Production Started
           * - Pending Production
           * - In Progress Production
           * - Proformas without Production Orders
           *
           * Show only when every linked Production
           * Order has reached Completed.
           */
          .filter(
            proforma =>
              productionCompletedProformaIds
                .has(
                  proforma.id
                )
          )

          .filter(
            proforma => {

              if (
                !query
              ) {
                return true;
              }


              return (
                proforma.proforma_number
                  .toLowerCase()
                  .includes(
                    query
                  )
                ||
                proforma.company_name
                  .toLowerCase()
                  .includes(
                    query
                  )
              );

            }
          )

          .sort(
            (
              a,
              b
            ) =>
              new Date(
                b.proforma_date
              ).getTime()
              -
              new Date(
                a.proforma_date
              ).getTime()
          );

      },
      [
        proformas,
        billedProformaIds,
        productionCompletedProformaIds,
        proformaSearch,
      ]
    );


  useEffect(
    () => {

      setProformaPage(
        1
      );

    },
    [
      proformaSearch,
      pageSize,
    ]
  );


  const proformaTotalPages =
    Math.max(
      1,
      Math.ceil(
        availableProformas.length
        /
        pageSize
      )
    );


  useEffect(
    () => {

      if (
        proformaPage
        >
        proformaTotalPages
      ) {

        setProformaPage(
          proformaTotalPages
        );

      }

    },
    [
      proformaPage,
      proformaTotalPages,
    ]
  );


  const paginatedAvailableProformas =
    useMemo(
      () => {

        const start =
          (
            proformaPage
            -
            1
          )
          *
          pageSize;


        return availableProformas.slice(
          start,
          start
          +
          pageSize
        );

      },
      [
        availableProformas,
        proformaPage,
        pageSize,
      ]
    );


  const selectedProforma =
    useMemo(
      () =>
        availableProformas.find(
          proforma =>
            proforma.id
            ===
            selectedProformaId
        )
        ??
        null,
      [
        availableProformas,
        selectedProformaId,
      ]
    );


  async function handleCreateBill() {

    if (
      selectedProformaId
      ===
      null
    ) {

      setCreateBillError(
        "Select a Proforma first."
      );

      return;

    }


    try {

      setCreatingBill(
        true
      );


      setCreateBillError(
        null
      );


      const created =
        await createFinalBillFromProforma(
          selectedProformaId,
          {
            invoice_date:
              invoiceDate
              ||
              undefined,
          }
        );


      const summary =
        await getFinalBillPaymentSummary(
          created.id
        );


      setBills(
        current => [
          created,
          ...current,
        ]
      );


      setPaymentSummaries(
        current => ({
          ...current,

          [created.id]:
            summary,
        })
      );


      setCreateBillOpen(
        false
      );


      setSelectedProformaId(
        null
      );


      setCurrentPage(
        1
      );


      setSelectedBill(
        created
      );


      setSelectedPaymentSummary(
        summary
      );


      setDetailMessage(
        "Draft invoice created. "
        +
        "Review and correct it before issuing."
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setCreateBillError(
        getApiErrorMessage(
          err,
          "Unable to create Final Bill."
        )
      );

    } finally {

      setCreatingBill(
        false
      );

    }

  }


  /* ==============================================================
     CUSTOMER PAYMENT
  ============================================================== */

  async function openPayment(
    bill:
      FinalBill
  ) {

    try {

      setPaymentError(
        null
      );


      const summary =
        paymentSummaries[
          bill.id
        ]
        ??
        (
          await getFinalBillPaymentSummary(
            bill.id
          )
        );


      if (
        !summary.is_effective_invoice
      ) {
        return;
      }


      setPaymentBill(
        bill
      );


      setPaymentSummary(
        summary
      );


      setPaymentDate(
        getLocalDateTime()
      );


      setPaymentAmount(
        ""
      );


      setPaymentType(
        Number(
          summary.paid_amount
        )
        >
        0
          ? "Part Payment"
          : "Advance"
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


      setPaymentOpen(
        true
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
          "Unable to load payment information."
        )
      );

    }

  }


  function closePayment() {

    if (
      paymentSaving
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


  async function handleRecordPayment() {

    if (
      !paymentBill
      ||
      !paymentSummary
    ) {
      return;
    }


    const amount =
      Number(
        paymentAmount
      );


    const balance =
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
        "Enter a payment amount greater than zero."
      );

      return;

    }


    if (
      amount
      >
      balance
    ) {

      setPaymentError(
        `Payment cannot exceed the balance of ${formatCurrency(balance)}.`
      );

      return;

    }


    try {

      setPaymentSaving(
        true
      );


      setPaymentError(
        null
      );


      await createFinalBillPayment(
        paymentBill.id,
        {
          payment_date:
            paymentDate,

          amount,

          payment_type:
            paymentType
            ||
            null,

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
        }
      );


      const refreshedSummary =
        await refreshPaymentSummary(
          paymentBill.id
        );


      setPaymentSummary(
        refreshedSummary
      );


      if (
        selectedBill
        &&
        selectedBill.id
        ===
        paymentBill.id
      ) {

        setSelectedPaymentSummary(
          refreshedSummary
        );


        setDetailMessage(
          refreshedSummary.payment_status
          ===
          "Paid"
            ? (
                "Final payment recorded. "
                +
                "Payment Received ✓"
              )
            : (
                "Payment recorded successfully."
              )
        );

      }


      setPaymentOpen(
        false
      );


      setPaymentBill(
        null
      );

    } catch (
      err
    ) {

      console.error(
        err
      );


      setPaymentError(
        getApiErrorMessage(
          err,
          "Unable to record customer payment."
        )
      );

    } finally {

      setPaymentSaving(
        false
      );

    }

  }


  /* ==============================================================
     PAYMENT CELL
  ============================================================== */

  function renderPaymentCell(
    bill:
      FinalBill
  ) {

    const summary =
      paymentSummaries[
        bill.id
      ];


    const isCreditNote =
      bill.invoice_type
        .toLowerCase()
        .includes(
          "credit"
        );


    if (
      isCreditNote
    ) {

      return (
        <div
          style={{
            color:
              "#7183a3",

            fontSize:
              "10px",

            fontWeight:
              700,
          }}
        >
          N/A
        </div>
      );

    }


    if (
      bill.status
        .toLowerCase()
      !==
      "issued"
    ) {

      return (
        <div
          style={{
            color:
              "#7183a3",

            fontSize:
              "10px",

            fontWeight:
              700,
          }}
        >
          Not Issued
        </div>
      );

    }


    if (
      !summary
    ) {

      return (
        <span
          style={{
            color:
              "#7183a3",

            fontSize:
              "10px",
          }}
        >
          Loading...
        </span>
      );

    }


    if (
      !summary.is_effective_invoice
    ) {

      return null;

    }


    const paid =
      Number(
        summary.paid_amount
      );


    const balance =
      Number(
        summary.balance_amount
      );


    return (
      <div
        style={{
          display:
            "flex",

          flexDirection:
            "column",

          alignItems:
            "flex-start",

          gap:
            "4px",

          minWidth:
            "135px",
        }}
      >

        <strong
          style={{
            color:
              getPaymentStatusColor(
                summary.payment_status
              ),

            fontSize:
              "10px",
          }}
        >

          {
            summary.payment_status
            ===
            "Paid"
              ? "Payment Received ✓"
              : summary.payment_status
          }

        </strong>


        {
          summary.payment_status
          !==
          "Paid"
          &&
          (
            <span
              style={{
                color:
                  "#7183a3",

                fontSize:
                  "9px",
              }}
            >

              {
                formatCurrency(
                  paid
                )
              }{" "}
              received

              <br />

              {
                formatCurrency(
                  balance
                )
              }{" "}
              balance

            </span>
          )
        }


        {
          balance
          >
          0
          &&
          (
            <button
              type="button"
              className="final-billing-view-button"
              onClick={
                () =>
                  void openPayment(
                    bill
                  )
              }
              style={{
                marginTop:
                  "3px",

                padding:
                  "4px 8px",

                fontSize:
                  "9px",
              }}
            >

              <WalletCards
                size={12}
              />

              Record Payment

            </button>
          )
        }

      </div>
    );

  }


  /* ==============================================================
     PAGINATION FOOTER
  ============================================================== */

  function renderPagination(
    current:
      number,

    total:
      number,

    recordCount:
      number,

    onPrevious:
      () => void,

    onNext:
      () => void
  ) {

    const firstRecord =
      recordCount
      >
      0
        ? (
            (
              current
              -
              1
            )
            *
            pageSize
          )
          +
          1
        : 0;


    const lastRecord =
      Math.min(
        current
        *
        pageSize,

        recordCount
      );


    return (
      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap:
            "14px",

          padding:
            "14px 18px",

          borderTop:
            "1px solid #e8eef7",

          background:
            "#ffffff",

          flexWrap:
            "wrap",
        }}
      >

        <div
          style={{
            color:
              "#8a9bb3",

            fontSize:
              "10px",
          }}
        >

          Showing{" "}

          <strong
            style={{
              color:
                "#526b8f",
            }}
          >
            {firstRecord}
          </strong>

          {"–"}

          <strong
            style={{
              color:
                "#526b8f",
            }}
          >
            {lastRecord}
          </strong>

          {" of "}

          <strong
            style={{
              color:
                "#526b8f",
            }}
          >
            {recordCount}
          </strong>

          {" records • "}

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
              "9px",
          }}
        >

          <button
            type="button"
            className="final-billing-refresh"
            disabled={
              current
              <=
              1
            }
            onClick={
              onPrevious
            }
            style={{
              minHeight:
                "34px",
            }}
          >
            Previous
          </button>


          <span
            style={{
              minWidth:
                "78px",

              color:
                "#7183a0",

              textAlign:
                "center",

              fontSize:
                "10px",
            }}
          >

            Page{" "}

            <strong>
              {current}
            </strong>

            {" of "}

            <strong>
              {total}
            </strong>

          </span>


          <button
            type="button"
            className="final-billing-refresh"
            disabled={
              current
              >=
              total
            }
            onClick={
              onNext
            }
            style={{
              minHeight:
                "34px",
            }}
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
    <div className="final-billing-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="final-billing-header">

        <div>

          <div className="final-billing-eyebrow">
            SALES & TAX DOCUMENTS
          </div>


          <h1 className="final-billing-title">
            Final Billing
          </h1>


          <p className="final-billing-subtitle">
            Create, review and issue invoices,
            track customer payments and maintain
            GST-ready sales documents.
          </p>

        </div>


        <div
          style={{
            display:
              "flex",

            gap:
              "10px",

            alignItems:
              "center",

            flexWrap:
              "wrap",
          }}
        >

          <button
            type="button"
            className="final-billing-refresh"
            onClick={
              () =>
                void openCreateBill()
            }
            style={{
              background:
                "#3478ed",

              borderColor:
                "#3478ed",

              color:
                "#ffffff",
            }}
          >

            <FilePlus2
              size={16}
            />

            Create Bill

          </button>


          <button
            type="button"
            className="final-billing-refresh"
            onClick={
              () =>
                void loadBills()
            }
          >

            <RefreshCw
              size={16}
            />

            Refresh

          </button>

        </div>

      </div>


      {
        error
        &&
        (
          <div className="final-billing-error">
            {error}
          </div>
        )
      }


      {/* ======================================================
          KPI
      ====================================================== */}

      <div className="final-billing-kpi-grid">

        <div className="final-billing-kpi-card">

          <div>

            <div className="final-billing-kpi-label">
              Total Documents
            </div>


            <div className="final-billing-kpi-value">
              {bills.length}
            </div>

          </div>


          <div className="final-billing-kpi-icon blue">

            <FileText
              size={20}
            />

          </div>

        </div>


        <div className="final-billing-kpi-card">

          <div>

            <div className="final-billing-kpi-label">
              Issued
            </div>


            <div className="final-billing-kpi-value">
              {issuedCount}
            </div>

          </div>


          <div className="final-billing-kpi-icon green">

            <CheckCircle2
              size={20}
            />

          </div>

        </div>


        <div className="final-billing-kpi-card">

          <div>

            <div className="final-billing-kpi-label">
              Draft
            </div>


            <div className="final-billing-kpi-value">
              {draftCount}
            </div>

          </div>


          <div className="final-billing-kpi-icon lavender">

            <ReceiptText
              size={20}
            />

          </div>

        </div>


        <div className="final-billing-kpi-card">

          <div>

            <div className="final-billing-kpi-label">
              Credit Notes
            </div>


            <div className="final-billing-kpi-value">
              {creditNoteCount}
            </div>

          </div>


          <div className="final-billing-kpi-icon rose">

            <ShieldCheck
              size={20}
            />

          </div>

        </div>


        <div className="final-billing-kpi-card">

          <div>

            <div className="final-billing-kpi-label">
              Total Document Value
            </div>


            <div className="final-billing-kpi-value final-billing-kpi-money">

              {
                formatCurrency(
                  totalInvoiceValue
                )
              }

            </div>

          </div>


          <div className="final-billing-kpi-icon amber">

            <BadgeIndianRupee
              size={20}
            />

          </div>

        </div>

      </div>


      {/* ======================================================
          BILL LIST
      ====================================================== */}

      <div className="final-billing-panel">

        <div className="final-billing-panel-header">

          <div>

            <div className="final-billing-panel-title">
              Billing Documents
            </div>


            <div className="final-billing-panel-subtitle">
              Tax invoices, revised invoices,
              credit notes and payment status.
            </div>

          </div>


          <div className="final-billing-record-count">
            {filteredBills.length} records
          </div>

        </div>


        <div className="final-billing-toolbar">

          <div className="final-billing-search">

            <Search
              size={16}
            />


            <input
              type="text"
              value={
                search
              }
              onChange={
                event =>
                  setSearch(
                    event.target.value
                  )
              }
              placeholder="Search invoice, customer, GSTIN or Proforma..."
            />


            {
              search
              &&
              (
                <button
                  type="button"
                  className="final-billing-search-clear"
                  onClick={
                    () =>
                      setSearch(
                        ""
                      )
                  }
                >

                  <X
                    size={15}
                  />

                </button>
              )
            }

          </div>


          <select
            className="final-billing-select"
            value={
              statusFilter
            }
            onChange={
              event =>
                setStatusFilter(
                  event.target.value
                )
            }
          >

            <option value="">
              All Status
            </option>

            <option value="Draft">
              Draft
            </option>

            <option value="Issued">
              Issued
            </option>

          </select>


          <select
            className="final-billing-select"
            value={
              typeFilter
            }
            onChange={
              event =>
                setTypeFilter(
                  event.target.value
                )
            }
          >

            <option value="">
              All Invoice Types
            </option>

            <option value="Tax Invoice">
              Tax Invoice
            </option>

            <option value="Revised Invoice">
              Revised Invoice
            </option>

            <option value="Credit Note">
              Credit Note
            </option>

          </select>

        </div>


        {
          loading
            ? (
                <div className="final-billing-loading">

                  <Loader2
                    size={22}
                    className="final-billing-spin"
                  />

                  Loading Final Bills...

                </div>
              )
            : filteredBills.length
              ===
              0
                ? (
                    <div className="final-billing-empty">

                      <FileText
                        size={25}
                      />

                      No billing documents found.

                    </div>
                  )
                : (
                    <>

                      <div className="final-billing-table-wrap">

                        <table className="final-billing-table">

                          <thead>

                            <tr>

                              <th>
                                Invoice
                              </th>

                              <th>
                                Date
                              </th>

                              <th>
                                Customer
                              </th>

                              <th>
                                Type
                              </th>

                              <th>
                                Revision
                              </th>

                              <th>
                                Grand Total
                              </th>

                              <th>
                                Payment
                              </th>

                              <th>
                                Status
                              </th>

                              <th className="align-right">
                                View
                              </th>

                            </tr>

                          </thead>


                          <tbody>

                            {
                              paginatedBills.map(
                                bill => (

                                  <tr
                                    key={
                                      bill.id
                                    }
                                  >

                                    <td>

                                      <div className="final-billing-invoice-number">

                                        {
                                          bill.invoice_number
                                        }

                                      </div>


                                      <div className="final-billing-row-note">

                                        {
                                          getProformaNumber(
                                            bill.proforma_id
                                          )
                                        }

                                      </div>

                                    </td>


                                    <td>

                                      {
                                        formatDate(
                                          bill.invoice_date
                                        )
                                      }

                                    </td>


                                    <td>

                                      <div className="final-billing-company">

                                        {
                                          bill.company_name
                                        }

                                      </div>


                                      <div className="final-billing-row-note">

                                        {
                                          bill.gst_number
                                          ||
                                          "No GSTIN"
                                        }

                                      </div>

                                    </td>


                                    <td>

                                      <span
                                        className={
                                          `final-billing-type ${
                                            getInvoiceTypeClass(
                                              bill.invoice_type
                                            )
                                          }`
                                        }
                                      >

                                        {
                                          bill.invoice_type
                                        }

                                      </span>

                                    </td>


                                    <td>
                                      R{bill.revision_number}
                                    </td>


                                    <td>

                                      <strong>

                                        {
                                          formatCurrency(
                                            bill.grand_total
                                          )
                                        }

                                      </strong>

                                    </td>


                                    <td>

                                      {
                                        renderPaymentCell(
                                          bill
                                        )
                                      }

                                    </td>


                                    <td>

                                      <span
                                        className={
                                          `final-billing-status ${
                                            getStatusClass(
                                              bill.status
                                            )
                                          }`
                                        }
                                      >

                                        {
                                          bill.status
                                        }

                                      </span>

                                    </td>


                                    <td className="align-right">

                                      <button
                                        type="button"
                                        className="final-billing-view-button"
                                        onClick={
                                          () =>
                                            void openBillDetail(
                                              bill
                                            )
                                        }
                                      >

                                        Details

                                        <ChevronRight
                                          size={14}
                                        />

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
                          currentPage,

                          totalPages,

                          filteredBills.length,

                          () =>
                            setCurrentPage(
                              page =>
                                Math.max(
                                  1,
                                  page - 1
                                )
                            ),

                          () =>
                            setCurrentPage(
                              page =>
                                Math.min(
                                  totalPages,
                                  page + 1
                                )
                            )
                        )
                      }

                    </>
                  )
        }

      </div>


      {
        detailLoading
        &&
        (
          <div className="final-billing-detail-loading">

            <Loader2
              size={20}
              className="final-billing-spin"
            />

            Loading invoice details...

          </div>
        )
      }


      {/* ======================================================
          CREATE BILL MODAL
      ====================================================== */}

      {
        createBillOpen
        &&
        (
          <div className="final-billing-modal-backdrop">

            <div className="final-billing-modal">

              <div className="final-billing-modal-header">

                <div>

                  <div className="final-billing-modal-eyebrow">
                    CREATE TAX INVOICE
                  </div>


                  <div className="final-billing-modal-title">
                    Create Bill Against Proforma
                  </div>


                  <div className="final-billing-modal-subtitle">
                    Only Proformas with completed Production Orders
                    are shown. Finished Product eligibility is
                    verified automatically before billing.
                  </div>

                </div>


                <button
                  type="button"
                  className="final-billing-modal-close"
                  onClick={
                    closeCreateBill
                  }
                  disabled={
                    creatingBill
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              {
                createBillError
                &&
                (
                  <div
                    className="final-billing-error"
                    style={{
                      margin:
                        "18px 20px 0",
                    }}
                  >
                    {createBillError}
                  </div>
                )
              }


              <div className="final-billing-detail-section">

                <div className="final-billing-section-header">

                  <div>

                    <div className="final-billing-section-title">
                      Available Proformas
                    </div>


                    <div className="final-billing-section-subtitle">
                      Proformas with an existing
                      original Final Bill are hidden.
                    </div>

                  </div>


                  <div className="final-billing-section-count">

                    {
                      availableProformas.length
                    }{" "}
                    available

                  </div>

                </div>


                <div className="final-billing-toolbar">

                  <div className="final-billing-search">

                    <Search
                      size={16}
                    />


                    <input
                      type="text"
                      value={
                        proformaSearch
                      }
                      onChange={
                        event =>
                          setProformaSearch(
                            event.target.value
                          )
                      }
                      placeholder="Search Proforma or customer..."
                    />

                  </div>


                  <input
                    type="date"
                    className="final-billing-select"
                    value={
                      invoiceDate
                    }
                    onChange={
                      event =>
                        setInvoiceDate(
                          event.target.value
                        )
                    }
                  />

                </div>


                {
                  proformaLoading
                    ? (
                        <div className="final-billing-loading">

                          <Loader2
                            size={22}
                            className="final-billing-spin"
                          />

                          Loading Proformas...

                        </div>
                      )
                    : availableProformas.length
                      ===
                      0
                        ? (
                            <div className="final-billing-empty">

                              <FileText
                                size={25}
                              />

                              No unbilled Proformas available.

                            </div>
                          )
                        : (
                            <>

                              <div className="final-billing-table-wrap">

                                <table className="final-billing-table">

                                  <thead>

                                    <tr>

                                      <th>
                                        Proforma
                                      </th>

                                      <th>
                                        Date
                                      </th>

                                      <th>
                                        Customer
                                      </th>

                                      <th>
                                        Status
                                      </th>

                                      <th>
                                        Items
                                      </th>

                                      <th>
                                        Value
                                      </th>

                                      <th className="align-right">
                                        Select
                                      </th>

                                    </tr>

                                  </thead>


                                  <tbody>

                                    {
                                      paginatedAvailableProformas.map(
                                        proforma => {

                                          const isSelected =
                                            selectedProformaId
                                            ===
                                            proforma.id;


                                          return (
                                            <tr
                                              key={
                                                proforma.id
                                              }
                                              style={
                                                isSelected
                                                  ? {
                                                      background:
                                                        "#f1f6ff",
                                                    }
                                                  : undefined
                                              }
                                            >

                                              <td>

                                                <div className="final-billing-invoice-number">

                                                  {
                                                    proforma.proforma_number
                                                  }

                                                </div>

                                              </td>


                                              <td>

                                                {
                                                  formatDate(
                                                    proforma.proforma_date
                                                  )
                                                }

                                              </td>


                                              <td>

                                                <div className="final-billing-company">

                                                  {
                                                    proforma.company_name
                                                  }

                                                </div>

                                              </td>


                                              <td>

                                                <span
                                                  style={{
                                                    display:
                                                      "inline-flex",

                                                    alignItems:
                                                      "center",

                                                    padding:
                                                      "5px 9px",

                                                    borderRadius:
                                                      "999px",

                                                    background:
                                                      "#eaf8f0",

                                                    color:
                                                      "#198c56",

                                                    fontSize:
                                                      "9px",

                                                    fontWeight:
                                                      800,
                                                  }}
                                                >
                                                  Production Completed
                                                </span>

                                              </td>


                                              <td>
                                                {proforma.items.length}
                                              </td>


                                              <td>

                                                <strong>

                                                  {
                                                    formatCurrency(
                                                      proforma.grand_total
                                                    )
                                                  }

                                                </strong>

                                              </td>


                                              <td className="align-right">

                                                <button
                                                  type="button"
                                                  className="final-billing-view-button"
                                                  onClick={
                                                    () =>
                                                      setSelectedProformaId(
                                                        proforma.id
                                                      )
                                                  }
                                                  style={
                                                    isSelected
                                                      ? {
                                                          background:
                                                            "#3478ed",

                                                          borderColor:
                                                            "#3478ed",

                                                          color:
                                                            "#ffffff",
                                                        }
                                                      : undefined
                                                  }
                                                >

                                                  {
                                                    isSelected
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


                              {
                                renderPagination(
                                  proformaPage,

                                  proformaTotalPages,

                                  availableProformas.length,

                                  () =>
                                    setProformaPage(
                                      page =>
                                        Math.max(
                                          1,
                                          page - 1
                                        )
                                    ),

                                  () =>
                                    setProformaPage(
                                      page =>
                                        Math.min(
                                          proformaTotalPages,
                                          page + 1
                                        )
                                    )
                                )
                              }

                            </>
                          )
                }

              </div>


              {
                selectedProforma
                &&
                (
                  <div
                    className="final-billing-info-grid"
                    style={{
                      gridTemplateColumns:
                        "1fr",
                    }}
                  >

                    <div className="final-billing-info-card">

                      <div className="final-billing-info-title">
                        Selected Proforma
                      </div>


                      <div className="final-billing-info-line">

                        <span>
                          Proforma
                        </span>

                        <strong>
                          {selectedProforma.proforma_number}
                        </strong>

                      </div>


                      <div className="final-billing-info-line">

                        <span>
                          Customer
                        </span>

                        <strong>
                          {selectedProforma.company_name}
                        </strong>

                      </div>


                      <div className="final-billing-info-line">

                        <span>
                          Finished Product
                        </span>

                        <strong>

                          {
                            selectedProforma.items[
                              0
                            ]?.description
                            ||
                            "-"
                          }

                        </strong>

                      </div>


                      <div className="final-billing-info-line">

                        <span>
                          Proforma Total
                        </span>

                        <strong>

                          {
                            formatCurrency(
                              selectedProforma.grand_total
                            )
                          }

                        </strong>

                      </div>

                    </div>

                  </div>
                )
              }


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
                    "1px solid #e8eef6",
                }}
              >

                <button
                  type="button"
                  className="final-billing-refresh"
                  onClick={
                    closeCreateBill
                  }
                  disabled={
                    creatingBill
                  }
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className="final-billing-refresh"
                  onClick={
                    () =>
                      void handleCreateBill()
                  }
                  disabled={
                    selectedProformaId
                    ===
                    null
                    ||
                    creatingBill
                  }
                  style={{
                    background:
                      "#3478ed",

                    borderColor:
                      "#3478ed",

                    color:
                      "#ffffff",
                  }}
                >

                  {
                    creatingBill
                      ? (
                          <>

                            <Loader2
                              size={16}
                              className="final-billing-spin"
                            />

                            Creating...

                          </>
                        )
                      : (
                          <>

                            <FilePlus2
                              size={16}
                            />

                            Generate Draft Bill

                          </>
                        )
                  }

                </button>

              </div>

            </div>

          </div>
        )
      }


      {/* ======================================================
          BILL DETAIL MODAL
      ====================================================== */}

      {
        selectedBill
        &&
        (
          <div className="final-billing-modal-backdrop">

            <div className="final-billing-modal">

              <div className="final-billing-modal-header">

                <div>

                  <div className="final-billing-modal-eyebrow">
                    {selectedBill.invoice_type}
                  </div>


                  <div className="final-billing-modal-title">
                    {selectedBill.invoice_number}
                  </div>


                  <div className="final-billing-modal-subtitle">

                    {selectedBill.company_name}

                    {" • "}

                    {
                      formatDate(
                        selectedBill.invoice_date
                      )
                    }

                  </div>

                </div>


                <button
                  type="button"
                  className="final-billing-modal-close"
                  onClick={
                    closeDetail
                  }
                  disabled={
                    issuingBill
                    ||
                    draftSaving
                    ||
                    revisionCreating
                    ||
                    creditNoteCreating
                    ||
                    documentBusy
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              {
                detailError
                &&
                (
                  <div
                    className="final-billing-error"
                    style={{
                      margin:
                        "18px 20px 0",
                    }}
                  >
                    {detailError}
                  </div>
                )
              }


              {
                detailMessage
                &&
                (
                  <div
                    style={{
                      margin:
                        "18px 20px 0",

                      padding:
                        "12px 14px",

                      border:
                        "1px solid #ccebdc",

                      borderRadius:
                        "9px",

                      background:
                        "#f2fbf6",

                      color:
                        "#159a5b",

                      fontSize:
                        "10px",

                      fontWeight:
                        700,
                    }}
                  >
                    {detailMessage}
                  </div>
                )
              }


              <div className="final-billing-detail-summary">

                <div>

                  <span>
                    Status
                  </span>

                  <strong>
                    {selectedBill.status}
                  </strong>

                </div>


                <div>

                  <span>
                    Revision
                  </span>

                  <strong>
                    R{selectedBill.revision_number}
                  </strong>

                </div>


                <div>

                  <span>
                    Proforma
                  </span>

                  <strong>

                    {
                      getProformaNumber(
                        selectedBill.proforma_id
                      )
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    Customer
                  </span>

                  <strong>
                    {selectedBill.company_name}
                  </strong>

                </div>


                <div>

                  <span>
                    GSTIN
                  </span>

                  <strong>
                    {selectedBill.gst_number || "-"}
                  </strong>

                </div>

              </div>


              {/* ==================================================
                  CUSTOMER / ADDRESS
              ================================================== */}

              <div className="final-billing-info-grid">

                <div className="final-billing-info-card">

                  <div className="final-billing-info-title">
                    Customer Details
                  </div>


                  <div className="final-billing-info-line">

                    <span>
                      Company
                    </span>

                    <strong>
                      {selectedBill.company_name}
                    </strong>

                  </div>


                  <div className="final-billing-info-line">

                    <span>
                      Contact
                    </span>

                    <strong>
                      {selectedBill.contact_person || "-"}
                    </strong>

                  </div>


                  <div className="final-billing-info-line">

                    <span>
                      Phone
                    </span>

                    <strong>
                      {selectedBill.phone || "-"}
                    </strong>

                  </div>


                  <div className="final-billing-info-line">

                    <span>
                      Email
                    </span>

                    <strong>
                      {selectedBill.email || "-"}
                    </strong>

                  </div>

                </div>


                <div className="final-billing-info-card">

                  <div className="final-billing-info-title">
                    Addresses
                  </div>


                  <div className="final-billing-address-block">

                    <span>
                      Billing Address
                    </span>

                    <p>
                      {selectedBill.billing_address || "-"}
                    </p>

                  </div>


                  <div className="final-billing-address-block">

                    <span>
                      Shipping Address
                    </span>

                    <p>
                      {selectedBill.shipping_address || "-"}
                    </p>

                  </div>

                </div>

              </div>


              {/* ==================================================
                  ITEMS
              ================================================== */}

              <div className="final-billing-detail-section">

                <div className="final-billing-section-header">

                  <div>

                    <div className="final-billing-section-title">
                      Invoice Items
                    </div>


                    <div className="final-billing-section-subtitle">
                      Quantity, price, discount and GST calculation.
                    </div>

                  </div>


                  <div className="final-billing-section-count">

                    {
                      selectedBill.items.length
                    }{" "}
                    items

                  </div>

                </div>


                <div className="final-billing-table-wrap">

                  <table className="final-billing-table final-billing-detail-table">

                    <thead>

                      <tr>

                        <th>
                          Description
                        </th>

                        <th>
                          HSN
                        </th>

                        <th>
                          Qty
                        </th>

                        <th>
                          Unit
                        </th>

                        <th>
                          Unit Price
                        </th>

                        <th>
                          Discount
                        </th>

                        <th>
                          Taxable
                        </th>

                        <th>
                          GST %
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
                          Total
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {
                        selectedBill.items.map(
                          item => (

                            <tr
                              key={
                                item.id
                              }
                            >

                              <td>

                                <strong>
                                  {item.description || "-"}
                                </strong>

                              </td>


                              <td>
                                {item.hsn_code || "-"}
                              </td>


                              <td>

                                {
                                  formatNumber(
                                    item.quantity
                                  )
                                }

                              </td>


                              <td>
                                {item.unit || "-"}
                              </td>


                              <td>

                                {
                                  formatCurrency(
                                    item.unit_price
                                  )
                                }

                              </td>


                              <td>

                                {
                                  formatCurrency(
                                    item.discount_amount
                                  )
                                }

                              </td>


                              <td>

                                {
                                  formatCurrency(
                                    item.taxable_amount
                                  )
                                }

                              </td>


                              <td>

                                {
                                  formatNumber(
                                    item.gst_percent
                                  )
                                }%

                              </td>


                              <td>

                                {
                                  formatCurrency(
                                    item.cgst_amount
                                  )
                                }

                              </td>


                              <td>

                                {
                                  formatCurrency(
                                    item.sgst_amount
                                  )
                                }

                              </td>


                              <td>

                                {
                                  formatCurrency(
                                    item.igst_amount
                                  )
                                }

                              </td>


                              <td>

                                <strong>

                                  {
                                    formatCurrency(
                                      item.line_total
                                    )
                                  }

                                </strong>

                              </td>

                            </tr>

                          )
                        )
                      }

                    </tbody>

                  </table>

                </div>

              </div>


              {/* ==================================================
                  TERMS / TOTALS
              ================================================== */}

              <div className="final-billing-bottom-grid">

                <div className="final-billing-terms-card">

                  <div className="final-billing-info-title">
                    Commercial Terms
                  </div>


                  <div className="final-billing-info-line">

                    <span>
                      Payment Terms
                    </span>

                    <strong>
                      {selectedBill.payment_terms || "-"}
                    </strong>

                  </div>


                  <div className="final-billing-info-line">

                    <span>
                      Delivery Terms
                    </span>

                    <strong>
                      {selectedBill.delivery_terms || "-"}
                    </strong>

                  </div>


                  <div className="final-billing-address-block">

                    <span>
                      Notes
                    </span>

                    <p>
                      {selectedBill.notes || "No notes."}
                    </p>

                  </div>

                </div>


                <div className="final-billing-totals-card">

                  <div className="final-billing-total-row">

                    <span>
                      Subtotal
                    </span>

                    <strong>

                      {
                        formatCurrency(
                          selectedBill.subtotal
                        )
                      }

                    </strong>

                  </div>


                  <div className="final-billing-total-row">

                    <span>
                      Discount
                    </span>

                    <strong>

                      {
                        formatCurrency(
                          selectedBill.discount_amount
                        )
                      }

                    </strong>

                  </div>


                  <div className="final-billing-total-row">

                    <span>
                      Taxable Amount
                    </span>

                    <strong>

                      {
                        formatCurrency(
                          selectedBill.taxable_amount
                        )
                      }

                    </strong>

                  </div>


                  <div className="final-billing-total-row">

                    <span>
                      CGST
                    </span>

                    <strong>

                      {
                        formatCurrency(
                          selectedBill.cgst_amount
                        )
                      }

                    </strong>

                  </div>


                  <div className="final-billing-total-row">

                    <span>
                      SGST
                    </span>

                    <strong>

                      {
                        formatCurrency(
                          selectedBill.sgst_amount
                        )
                      }

                    </strong>

                  </div>


                  <div className="final-billing-total-row">

                    <span>
                      IGST
                    </span>

                    <strong>

                      {
                        formatCurrency(
                          selectedBill.igst_amount
                        )
                      }

                    </strong>

                  </div>


                  <div className="final-billing-total-row final">

                    <span>
                      Grand Total
                    </span>

                    <strong>

                      {
                        formatCurrency(
                          selectedBill.grand_total
                        )
                      }

                    </strong>

                  </div>

                </div>

              </div>


              {/* ==================================================
                  PAYMENT STATUS
              ================================================== */}

              {
                selectedPaymentSummary
                &&
                selectedPaymentSummary.is_effective_invoice
                &&
                !selectedBill.invoice_type
                  .toLowerCase()
                  .includes(
                    "credit"
                  )
                &&
                (
                  <div
                    className="final-billing-detail-section"
                    style={{
                      marginTop:
                        "18px",
                    }}
                  >

                    <div className="final-billing-section-header">

                      <div>

                        <div className="final-billing-section-title">

                          <WalletCards
                            size={16}
                            style={{
                              marginRight:
                                "6px",
                            }}
                          />

                          Payment Status

                        </div>


                        <div className="final-billing-section-subtitle">
                          Advance, partial and final customer payments.
                        </div>

                      </div>


                      <strong
                        style={{
                          color:
                            getPaymentStatusColor(
                              selectedPaymentSummary.payment_status
                            ),
                        }}
                      >

                        {
                          selectedPaymentSummary.payment_status
                          ===
                          "Paid"
                            ? "Payment Received ✓"
                            : selectedPaymentSummary.payment_status
                        }

                      </strong>

                    </div>


                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "repeat(3, minmax(0, 1fr))",

                        gap:
                          "12px",

                        padding:
                          "16px",
                      }}
                    >

                      <div className="final-billing-info-card">

                        <div className="final-billing-info-title">
                          Receivable
                        </div>

                        <strong>

                          {
                            formatCurrency(
                              selectedPaymentSummary.receivable_amount
                            )
                          }

                        </strong>

                      </div>


                      <div className="final-billing-info-card">

                        <div className="final-billing-info-title">
                          Received
                        </div>

                        <strong
                          style={{
                            color:
                              "#159a5b",
                          }}
                        >

                          {
                            formatCurrency(
                              selectedPaymentSummary.paid_amount
                            )
                          }

                        </strong>

                      </div>


                      <div className="final-billing-info-card">

                        <div className="final-billing-info-title">
                          Balance
                        </div>

                        <strong
                          style={{
                            color:
                              Number(
                                selectedPaymentSummary.balance_amount
                              )
                              >
                              0
                                ? "#d66523"
                                : "#159a5b",
                          }}
                        >

                          {
                            formatCurrency(
                              selectedPaymentSummary.balance_amount
                            )
                          }

                        </strong>

                      </div>

                    </div>


                    {
                      selectedPaymentSummary.payments.length
                      >
                      0
                      &&
                      (
                        <div className="final-billing-table-wrap">

                          <table className="final-billing-table">

                            <thead>

                              <tr>

                                <th>
                                  Date
                                </th>

                                <th>
                                  Type
                                </th>

                                <th>
                                  Mode
                                </th>

                                <th>
                                  Reference
                                </th>

                                <th>
                                  Amount
                                </th>

                              </tr>

                            </thead>


                            <tbody>

                              {
                                selectedPaymentSummary.payments.map(
                                  payment => (

                                    <tr
                                      key={
                                        payment.id
                                      }
                                    >

                                      <td>

                                        {
                                          formatDateTime(
                                            payment.payment_date
                                          )
                                        }

                                      </td>


                                      <td>
                                        {payment.payment_type || "-"}
                                      </td>


                                      <td>
                                        {payment.payment_mode || "-"}
                                      </td>


                                      <td>
                                        {payment.reference_number || "-"}
                                      </td>


                                      <td>

                                        <strong>

                                          {
                                            formatCurrency(
                                              payment.amount
                                            )
                                          }

                                        </strong>

                                      </td>

                                    </tr>

                                  )
                                )
                              }

                            </tbody>

                          </table>

                        </div>
                      )
                    }

                  </div>
                )
              }


              {/* ==================================================
                  BILL ACTIONS
              ================================================== */}

              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "flex-end",

                  alignItems:
                    "center",

                  gap:
                    "10px",

                  marginTop:
                    "20px",

                  paddingTop:
                    "18px",

                  borderTop:
                    "1px solid #e8eef6",

                  flexWrap:
                    "wrap",
                }}
              >

                {/* PRINT */}

                <button
                  type="button"
                  className="final-billing-refresh"
                  onClick={
                    () =>
                      void handlePrintBill()
                  }
                  disabled={
                    documentBusy
                  }
                >

                  {
                    documentBusy
                      ? (
                          <Loader2
                            size={16}
                            className="final-billing-spin"
                          />
                        )
                      : (
                          <Printer
                            size={16}
                          />
                        )
                  }

                  Print

                </button>


                {/* DOWNLOAD */}

                <button
                  type="button"
                  className="final-billing-refresh"
                  onClick={
                    () =>
                      void handleDownloadBill()
                  }
                  disabled={
                    documentBusy
                  }
                >

                  {
                    documentBusy
                      ? (
                          <Loader2
                            size={16}
                            className="final-billing-spin"
                          />
                        )
                      : (
                          <Download
                            size={16}
                          />
                        )
                  }

                  Download Word

                </button>


                {/* EDIT DRAFT */}

                {
                  selectedBill.status
                    .toLowerCase()
                  ===
                  "draft"
                  &&
                  (
                    <button
                      type="button"
                      className="final-billing-refresh"
                      disabled={
                        issuingBill
                        ||
                        documentBusy
                      }
                      onClick={
                        openDraftEditor
                      }
                    >

                      <Edit3
                        size={16}
                      />

                      Edit Draft

                    </button>
                  )
                }


                {/* ISSUE */}

                {
                  selectedBill.status
                    .toLowerCase()
                  ===
                  "draft"
                  &&
                  (
                    <button
                      type="button"
                      className="final-billing-refresh"
                      disabled={
                        issuingBill
                        ||
                        documentBusy
                      }
                      onClick={
                        () =>
                          void handleIssueBill()
                      }
                      style={{
                        background:
                          "#159a5b",

                        borderColor:
                          "#159a5b",

                        color:
                          "#ffffff",

                        minHeight:
                          "42px",
                      }}
                    >

                      {
                        issuingBill
                          ? (
                              <>

                                <Loader2
                                  size={16}
                                  className="final-billing-spin"
                                />

                                Issuing...

                              </>
                            )
                          : (
                              <>

                                <CheckCircle2
                                  size={16}
                                />

                                {
                                  selectedBill.invoice_type
                                    .toLowerCase()
                                    .includes(
                                      "credit"
                                    )
                                    ? "Issue Credit Note"
                                    : selectedBill.invoice_type
                                        .toLowerCase()
                                      ===
                                      "revised invoice"
                                        ? "Issue Revised Invoice"
                                        : "Issue Invoice"
                                }

                              </>
                            )
                      }

                    </button>
                  )
                }


                {/* REVISION */}

                {
                  selectedBill.status
                    .toLowerCase()
                  ===
                  "issued"
                  &&
                  !selectedBill.invoice_type
                    .toLowerCase()
                    .includes(
                      "credit"
                    )
                  &&
                  selectedPaymentSummary
                    ?.is_effective_invoice
                  &&
                  (
                    getOpenDraftRevision(
                      selectedBill
                    )
                      ? (
                          <button
                            type="button"
                            className="final-billing-refresh"
                            onClick={
                              () => {

                                const draftRevision =
                                  getOpenDraftRevision(
                                    selectedBill
                                  );


                                if (
                                  draftRevision
                                ) {

                                  void openBillDetail(
                                    draftRevision
                                  );

                                }

                              }
                            }
                          >

                            <Edit3
                              size={16}
                            />

                            Open Draft Revision

                          </button>
                        )
                      : (
                          <button
                            type="button"
                            className="final-billing-refresh"
                            onClick={
                              () =>
                                openRevisionCreator(
                                  selectedBill
                                )
                            }
                            style={{
                              borderColor:
                                "#b9c9e7",

                              color:
                                "#285fae",
                            }}
                          >

                            <FilePlus2
                              size={16}
                            />

                            Create Revision

                          </button>
                        )
                  )
                }


                {/* CREDIT NOTE */}

                {
                  selectedBill.status
                    .toLowerCase()
                  ===
                  "issued"
                  &&
                  !selectedBill.invoice_type
                    .toLowerCase()
                    .includes(
                      "credit"
                    )
                  &&
                  selectedPaymentSummary
                    ?.is_effective_invoice
                  &&
                  !getOpenDraftRevision(
                    selectedBill
                  )
                  &&
                  (
                    getOpenDraftCreditNote(
                      selectedBill
                    )
                      ? (
                          <button
                            type="button"
                            className="final-billing-refresh"
                            onClick={
                              () => {

                                const draftCreditNote =
                                  getOpenDraftCreditNote(
                                    selectedBill
                                  );


                                if (
                                  draftCreditNote
                                ) {

                                  void openBillDetail(
                                    draftCreditNote
                                  );

                                }

                              }
                            }
                            style={{
                              borderColor:
                                "#f0c6cb",

                              color:
                                "#a33d4c",
                            }}
                          >

                            <Edit3
                              size={16}
                            />

                            Open Draft Credit Note

                          </button>
                        )
                      : (
                          <button
                            type="button"
                            className="final-billing-refresh"
                            onClick={
                              () =>
                                openCreditNoteCreator(
                                  selectedBill
                                )
                            }
                            style={{
                              borderColor:
                                "#f0c6cb",

                              color:
                                "#a33d4c",
                            }}
                          >

                            <ShieldCheck
                              size={16}
                            />

                            Create Credit Note

                          </button>
                        )
                  )
                }


                {/* PAYMENT */}

                {
                  selectedBill.status
                    .toLowerCase()
                  ===
                  "issued"
                  &&
                  !selectedBill.invoice_type
                    .toLowerCase()
                    .includes(
                      "credit"
                    )
                  &&
                  selectedPaymentSummary
                    ?.is_effective_invoice
                  &&
                  Number(
                    selectedPaymentSummary.balance_amount
                  )
                  >
                  0
                  &&
                  (
                    <button
                      type="button"
                      className="final-billing-refresh"
                      onClick={
                        () =>
                          void openPayment(
                            selectedBill
                          )
                      }
                      style={{
                        background:
                          "#3478ed",

                        borderColor:
                          "#3478ed",

                        color:
                          "#ffffff",
                      }}
                    >

                      <WalletCards
                        size={16}
                      />

                      Record Payment

                    </button>
                  )
                }


                {
                  selectedPaymentSummary
                    ?.is_effective_invoice
                  &&
                  selectedPaymentSummary.payment_status
                  ===
                  "Paid"
                  &&
                  (
                    <div
                      style={{
                        display:
                          "flex",

                        alignItems:
                          "center",

                        gap:
                          "6px",

                        padding:
                          "9px 13px",

                        border:
                          "1px solid #ccebdc",

                        borderRadius:
                          "9px",

                        background:
                          "#f2fbf6",

                        color:
                          "#159a5b",

                        fontSize:
                          "10px",

                        fontWeight:
                          800,
                      }}
                    >

                      <CheckCircle2
                        size={15}
                      />

                      Payment Received ✓

                    </div>
                  )
                }

              </div>

            </div>

          </div>
        )
      }


      {/* ======================================================
          DRAFT EDIT MODAL
      ====================================================== */}

      {
        draftEditOpen
        &&
        selectedBill
        &&
        (
          <div className="final-billing-modal-backdrop">

            <div className="final-billing-modal">

              <div className="final-billing-modal-header">

                <div>

                  <div className="final-billing-modal-eyebrow">

                    {
                      selectedBill.invoice_type
                        .toLowerCase()
                      ===
                      "revised invoice"
                        ? "REVISED INVOICE CORRECTION"
                        : selectedBill.invoice_type
                            .toLowerCase()
                          ===
                          "credit note"
                            ? "CREDIT NOTE CORRECTION"
                            : "DRAFT CORRECTION"
                    }

                  </div>


                  <div className="final-billing-modal-title">
                    Edit Draft Invoice
                  </div>


                  <div className="final-billing-modal-subtitle">

                    {selectedBill.invoice_number}

                    {" • "}

                    {selectedBill.company_name}

                  </div>

                </div>


                <button
                  type="button"
                  className="final-billing-modal-close"
                  onClick={
                    closeDraftEditor
                  }
                  disabled={
                    draftSaving
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              {
                draftError
                &&
                (
                  <div
                    className="final-billing-error"
                    style={{
                      margin:
                        "18px 20px 0",
                    }}
                  >
                    {draftError}
                  </div>
                )
              }


              <div className="final-billing-detail-summary">

                <div>

                  <span>
                    Invoice
                  </span>

                  <strong>
                    {selectedBill.invoice_number}
                  </strong>

                </div>


                <div>

                  <span>
                    Revision
                  </span>

                  <strong>
                    R{selectedBill.revision_number}
                  </strong>

                </div>


                <div>

                  <span>
                    Proforma
                  </span>

                  <strong>

                    {
                      getProformaNumber(
                        selectedBill.proforma_id
                      )
                    }

                  </strong>

                </div>


                <div>

                  <span>
                    Customer
                  </span>

                  <strong>
                    {selectedBill.company_name}
                  </strong>

                </div>


                <div>

                  <span>
                    GSTIN
                  </span>

                  <strong>
                    {selectedBill.gst_number || "-"}
                  </strong>

                </div>

              </div>


              <div className="final-billing-detail-section">

                <div className="final-billing-section-header">

                  <div>

                    <div className="final-billing-section-title">
                      Invoice Details
                    </div>


                    <div className="final-billing-section-subtitle">
                      Customer identity remains inherited
                      from the Enquiry. Correct only this
                      invoice's document information.
                    </div>

                  </div>

                </div>


                <div
                  style={{
                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(2, minmax(0, 1fr))",

                    gap:
                      "14px",

                    padding:
                      "16px",
                  }}
                >

                  <label>

                    <div className="final-billing-info-title">
                      Invoice Date *
                    </div>


                    <input
                      type="date"
                      className="final-billing-select"
                      style={{
                        width:
                          "100%",
                      }}
                      value={
                        draftHeader.invoice_date
                      }
                      onChange={
                        event =>
                          updateDraftHeader(
                            "invoice_date",
                            event.target.value
                          )
                      }
                    />

                  </label>


                  <label>

                    <div className="final-billing-info-title">
                      Payment Terms
                    </div>


                    <input
                      type="text"
                      className="final-billing-select"
                      style={{
                        width:
                          "100%",
                      }}
                      value={
                        draftHeader.payment_terms
                      }
                      onChange={
                        event =>
                          updateDraftHeader(
                            "payment_terms",
                            event.target.value
                          )
                      }
                    />

                  </label>


                  <label>

                    <div className="final-billing-info-title">
                      Delivery Terms
                    </div>


                    <input
                      type="text"
                      className="final-billing-select"
                      style={{
                        width:
                          "100%",
                      }}
                      value={
                        draftHeader.delivery_terms
                      }
                      onChange={
                        event =>
                          updateDraftHeader(
                            "delivery_terms",
                            event.target.value
                          )
                      }
                    />

                  </label>


                  <label>

                    <div className="final-billing-info-title">

                      {
                        selectedBill.invoice_type
                          .toLowerCase()
                        ===
                        "credit note"
                          ? "Credit Note Reason / Notes"
                          : "Notes / Revision Reason"
                      }

                    </div>


                    <input
                      type="text"
                      className="final-billing-select"
                      style={{
                        width:
                          "100%",
                      }}
                      value={
                        draftHeader.notes
                      }
                      onChange={
                        event =>
                          updateDraftHeader(
                            "notes",
                            event.target.value
                          )
                      }
                    />

                  </label>


                  <label>

                    <div className="final-billing-info-title">
                      Billing Address
                    </div>


                    <textarea
                      className="final-billing-select"
                      style={{
                        width:
                          "100%",

                        minHeight:
                          "86px",

                        padding:
                          "10px",

                        resize:
                          "vertical",
                      }}
                      value={
                        draftHeader.billing_address
                      }
                      onChange={
                        event =>
                          updateDraftHeader(
                            "billing_address",
                            event.target.value
                          )
                      }
                    />

                  </label>


                  <label>

                    <div className="final-billing-info-title">
                      Shipping Address
                    </div>


                    <textarea
                      className="final-billing-select"
                      style={{
                        width:
                          "100%",

                        minHeight:
                          "86px",

                        padding:
                          "10px",

                        resize:
                          "vertical",
                      }}
                      value={
                        draftHeader.shipping_address
                      }
                      onChange={
                        event =>
                          updateDraftHeader(
                            "shipping_address",
                            event.target.value
                          )
                      }
                    />

                  </label>

                </div>

              </div>


              <div className="final-billing-detail-section">

                <div className="final-billing-section-header">

                  <div>

                    <div className="final-billing-section-title">
                      Invoice Items
                    </div>


                    <div className="final-billing-section-subtitle">
                      Correct description, HSN, quantity,
                      unit price, discount and GST before issue.
                    </div>

                  </div>


                  <div className="final-billing-section-count">

                    {
                      draftItems.length
                    }{" "}
                    items

                  </div>

                </div>


                <div className="final-billing-table-wrap">

                  <table className="final-billing-table final-billing-detail-table">

                    <thead>

                      <tr>

                        <th>
                          Description
                        </th>

                        <th>
                          HSN
                        </th>

                        <th>
                          Qty
                        </th>

                        <th>
                          Unit
                        </th>

                        <th>
                          Unit Price
                        </th>

                        <th>
                          Discount %
                        </th>

                        <th>
                          GST %
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {
                        draftItems.map(
                          item => (

                            <tr
                              key={
                                item.id
                              }
                            >

                              <td>

                                <input
                                  type="text"
                                  className="final-billing-select"
                                  style={{
                                    width:
                                      "220px",
                                  }}
                                  value={
                                    item.description
                                  }
                                  onChange={
                                    event =>
                                      updateDraftItem(
                                        item.id,
                                        "description",
                                        event.target.value
                                      )
                                  }
                                />

                              </td>


                              <td>

                                <input
                                  type="text"
                                  className="final-billing-select"
                                  style={{
                                    width:
                                      "90px",
                                  }}
                                  value={
                                    item.hsn_code
                                  }
                                  onChange={
                                    event =>
                                      updateDraftItem(
                                        item.id,
                                        "hsn_code",
                                        event.target.value
                                      )
                                  }
                                  placeholder="HSN"
                                />

                              </td>


                              <td>

                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  className="final-billing-select"
                                  style={{
                                    width:
                                      "82px",
                                  }}
                                  value={
                                    item.quantity
                                  }
                                  onChange={
                                    event =>
                                      updateDraftItem(
                                        item.id,
                                        "quantity",
                                        event.target.value
                                      )
                                  }
                                />

                              </td>


                              <td>

                                <input
                                  type="text"
                                  className="final-billing-select"
                                  style={{
                                    width:
                                      "80px",
                                  }}
                                  value={
                                    item.unit
                                  }
                                  onChange={
                                    event =>
                                      updateDraftItem(
                                        item.id,
                                        "unit",
                                        event.target.value
                                      )
                                  }
                                />

                              </td>


                              <td>

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="final-billing-select"
                                  style={{
                                    width:
                                      "120px",
                                  }}
                                  value={
                                    item.unit_price
                                  }
                                  onChange={
                                    event =>
                                      updateDraftItem(
                                        item.id,
                                        "unit_price",
                                        event.target.value
                                      )
                                  }
                                />

                              </td>


                              <td>

                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  className="final-billing-select"
                                  style={{
                                    width:
                                      "95px",
                                  }}
                                  value={
                                    item.discount_percent
                                  }
                                  onChange={
                                    event =>
                                      updateDraftItem(
                                        item.id,
                                        "discount_percent",
                                        event.target.value
                                      )
                                  }
                                />

                              </td>


                              <td>

                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  className="final-billing-select"
                                  style={{
                                    width:
                                      "90px",
                                  }}
                                  value={
                                    item.gst_percent
                                  }
                                  onChange={
                                    event =>
                                      updateDraftItem(
                                        item.id,
                                        "gst_percent",
                                        event.target.value
                                      )
                                  }
                                />

                              </td>

                            </tr>

                          )
                        )
                      }

                    </tbody>

                  </table>

                </div>

              </div>


              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "flex-end",

                  gap:
                    "10px",

                  padding:
                    "18px 20px",

                  borderTop:
                    "1px solid #e8eef6",
                }}
              >

                <button
                  type="button"
                  className="final-billing-refresh"
                  onClick={
                    closeDraftEditor
                  }
                  disabled={
                    draftSaving
                  }
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className="final-billing-refresh"
                  onClick={
                    () =>
                      void handleSaveDraft()
                  }
                  disabled={
                    draftSaving
                  }
                  style={{
                    background:
                      "#3478ed",

                    borderColor:
                      "#3478ed",

                    color:
                      "#ffffff",
                  }}
                >

                  {
                    draftSaving
                      ? (
                          <>

                            <Loader2
                              size={16}
                              className="final-billing-spin"
                            />

                            Saving...

                          </>
                        )
                      : (
                          <>

                            <Save
                              size={16}
                            />

                            Save Draft Corrections

                          </>
                        )
                  }

                </button>

              </div>

            </div>

          </div>
        )
      }


      {/* ======================================================
          REVISION MODAL
      ====================================================== */}

      {
        revisionOpen
        &&
        revisionSource
        &&
        (
          <div className="final-billing-modal-backdrop">

            <div
              className="final-billing-modal"
              style={{
                maxWidth:
                  "680px",
              }}
            >

              <div className="final-billing-modal-header">

                <div>

                  <div className="final-billing-modal-eyebrow">
                    INVOICE REVISION
                  </div>


                  <div className="final-billing-modal-title">
                    Create Revised Invoice
                  </div>


                  <div className="final-billing-modal-subtitle">

                    Source:{" "}

                    {revisionSource.invoice_number}

                    {" • "}

                    {revisionSource.company_name}

                  </div>

                </div>


                <button
                  type="button"
                  className="final-billing-modal-close"
                  onClick={
                    closeRevisionCreator
                  }
                  disabled={
                    revisionCreating
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              {
                revisionError
                &&
                (
                  <div
                    className="final-billing-error"
                    style={{
                      margin:
                        "18px 20px 0",
                    }}
                  >
                    {revisionError}
                  </div>
                )
              }


              <div
                style={{
                  margin:
                    "18px 20px 0",

                  padding:
                    "13px 14px",

                  border:
                    "1px solid #d8e4f5",

                  borderRadius:
                    "9px",

                  background:
                    "#f7faff",

                  color:
                    "#526783",

                  fontSize:
                    "10px",

                  lineHeight:
                    1.6,
                }}
              >
                The original issued invoice remains unchanged
                for audit history. A new Draft revised invoice
                will be created. Correct that Draft, review it,
                then issue the revision.
              </div>


              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "1fr",

                  gap:
                    "14px",

                  padding:
                    "20px",
                }}
              >

                <label>

                  <div className="final-billing-info-title">
                    Revision Date *
                  </div>


                  <input
                    type="date"
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",
                    }}
                    value={
                      revisionDate
                    }
                    onChange={
                      event =>
                        setRevisionDate(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  <div className="final-billing-info-title">
                    Revision Reason / Notes
                  </div>


                  <textarea
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",

                      minHeight:
                        "90px",

                      padding:
                        "10px",

                      resize:
                        "vertical",
                    }}
                    value={
                      revisionNotes
                    }
                    onChange={
                      event =>
                        setRevisionNotes(
                          event.target.value
                        )
                    }
                    placeholder="Example: Corrected quantity / price / HSN / billing information."
                  />

                </label>

              </div>


              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "flex-end",

                  gap:
                    "10px",

                  padding:
                    "18px 20px",

                  borderTop:
                    "1px solid #e8eef6",
                }}
              >

                <button
                  type="button"
                  className="final-billing-refresh"
                  onClick={
                    closeRevisionCreator
                  }
                  disabled={
                    revisionCreating
                  }
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className="final-billing-refresh"
                  onClick={
                    () =>
                      void handleCreateRevision()
                  }
                  disabled={
                    revisionCreating
                  }
                  style={{
                    background:
                      "#3478ed",

                    borderColor:
                      "#3478ed",

                    color:
                      "#ffffff",
                  }}
                >

                  {
                    revisionCreating
                      ? (
                          <>

                            <Loader2
                              size={16}
                              className="final-billing-spin"
                            />

                            Creating...

                          </>
                        )
                      : (
                          <>

                            <FilePlus2
                              size={16}
                            />

                            Create Draft Revision

                          </>
                        )
                  }

                </button>

              </div>

            </div>

          </div>
        )
      }


      {/* ======================================================
          CREDIT NOTE MODAL
      ====================================================== */}

      {
        creditNoteOpen
        &&
        creditNoteSource
        &&
        (
          <div className="final-billing-modal-backdrop">

            <div
              className="final-billing-modal"
              style={{
                maxWidth:
                  "680px",
              }}
            >

              <div className="final-billing-modal-header">

                <div>

                  <div className="final-billing-modal-eyebrow">
                    CREDIT NOTE
                  </div>


                  <div className="final-billing-modal-title">
                    Create Credit Note
                  </div>


                  <div className="final-billing-modal-subtitle">

                    Against:{" "}

                    {creditNoteSource.invoice_number}

                    {" • "}

                    {creditNoteSource.company_name}

                  </div>

                </div>


                <button
                  type="button"
                  className="final-billing-modal-close"
                  onClick={
                    closeCreditNoteCreator
                  }
                  disabled={
                    creditNoteCreating
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              {
                creditNoteError
                &&
                (
                  <div
                    className="final-billing-error"
                    style={{
                      margin:
                        "18px 20px 0",
                    }}
                  >
                    {creditNoteError}
                  </div>
                )
              }


              <div
                style={{
                  margin:
                    "18px 20px 0",

                  padding:
                    "13px 14px",

                  border:
                    "1px solid #f0d6d9",

                  borderRadius:
                    "9px",

                  background:
                    "#fff9fa",

                  color:
                    "#74545a",

                  fontSize:
                    "10px",

                  lineHeight:
                    1.6,
                }}
              >
                A Credit Note reduces the value receivable
                against this issued invoice. The system first
                creates a Draft copy of the invoice. Use
                <strong>
                  {" Edit Draft "}
                </strong>
                to change the quantity or value to only the
                amount being credited, then issue the Credit
                Note. The original invoice remains unchanged.
              </div>


              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "1fr",

                  gap:
                    "14px",

                  padding:
                    "20px",
                }}
              >

                <label>

                  <div className="final-billing-info-title">
                    Credit Note Date *
                  </div>


                  <input
                    type="date"
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",
                    }}
                    value={
                      creditNoteDate
                    }
                    onChange={
                      event =>
                        setCreditNoteDate(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  <div className="final-billing-info-title">
                    Reason / Notes
                  </div>


                  <textarea
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",

                      minHeight:
                        "90px",

                      padding:
                        "10px",

                      resize:
                        "vertical",
                    }}
                    value={
                      creditNoteNotes
                    }
                    onChange={
                      event =>
                        setCreditNoteNotes(
                          event.target.value
                        )
                    }
                    placeholder="Example: Price reduction, returned quantity, overbilling correction."
                  />

                </label>

              </div>


              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "flex-end",

                  gap:
                    "10px",

                  padding:
                    "18px 20px",

                  borderTop:
                    "1px solid #e8eef6",
                }}
              >

                <button
                  type="button"
                  className="final-billing-refresh"
                  onClick={
                    closeCreditNoteCreator
                  }
                  disabled={
                    creditNoteCreating
                  }
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className="final-billing-refresh"
                  onClick={
                    () =>
                      void handleCreateCreditNote()
                  }
                  disabled={
                    creditNoteCreating
                  }
                  style={{
                    background:
                      "#a33d4c",

                    borderColor:
                      "#a33d4c",

                    color:
                      "#ffffff",
                  }}
                >

                  {
                    creditNoteCreating
                      ? (
                          <>

                            <Loader2
                              size={16}
                              className="final-billing-spin"
                            />

                            Creating...

                          </>
                        )
                      : (
                          <>

                            <ShieldCheck
                              size={16}
                            />

                            Create Draft Credit Note

                          </>
                        )
                  }

                </button>

              </div>

            </div>

          </div>
        )
      }


      {/* ======================================================
          PAYMENT MODAL
      ====================================================== */}

      {
        paymentOpen
        &&
        paymentBill
        &&
        paymentSummary
        &&
        (
          <div className="final-billing-modal-backdrop">

            <div
              className="final-billing-modal"
              style={{
                maxWidth:
                  "720px",
              }}
            >

              <div className="final-billing-modal-header">

                <div>

                  <div className="final-billing-modal-eyebrow">
                    CUSTOMER PAYMENT
                  </div>


                  <div className="final-billing-modal-title">
                    Record Payment
                  </div>


                  <div className="final-billing-modal-subtitle">

                    {paymentBill.invoice_number}

                    {" • "}

                    {paymentBill.company_name}

                  </div>

                </div>


                <button
                  type="button"
                  className="final-billing-modal-close"
                  onClick={
                    closePayment
                  }
                  disabled={
                    paymentSaving
                  }
                >

                  <X
                    size={18}
                  />

                </button>

              </div>


              {
                paymentError
                &&
                (
                  <div
                    className="final-billing-error"
                    style={{
                      margin:
                        "18px 20px 0",
                    }}
                  >
                    {paymentError}
                  </div>
                )
              }


              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(3, minmax(0, 1fr))",

                  gap:
                    "12px",

                  padding:
                    "20px",
                }}
              >

                <div className="final-billing-info-card">

                  <div className="final-billing-info-title">
                    Invoice Total
                  </div>

                  <strong>

                    {
                      formatCurrency(
                        paymentSummary.receivable_amount
                      )
                    }

                  </strong>

                </div>


                <div className="final-billing-info-card">

                  <div className="final-billing-info-title">
                    Received
                  </div>

                  <strong
                    style={{
                      color:
                        "#159a5b",
                    }}
                  >

                    {
                      formatCurrency(
                        paymentSummary.paid_amount
                      )
                    }

                  </strong>

                </div>


                <div className="final-billing-info-card">

                  <div className="final-billing-info-title">
                    Balance
                  </div>

                  <strong
                    style={{
                      color:
                        "#d66523",
                    }}
                  >

                    {
                      formatCurrency(
                        paymentSummary.balance_amount
                      )
                    }

                  </strong>

                </div>

              </div>


              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",

                  gap:
                    "14px",

                  padding:
                    "0 20px 20px",
                }}
              >

                <label>

                  <div className="final-billing-info-title">
                    Payment Date *
                  </div>


                  <input
                    type="datetime-local"
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",
                    }}
                    value={
                      paymentDate
                    }
                    onChange={
                      event =>
                        setPaymentDate(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  <div className="final-billing-info-title">
                    Amount *
                  </div>


                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",
                    }}
                    value={
                      paymentAmount
                    }
                    onChange={
                      event =>
                        setPaymentAmount(
                          event.target.value
                        )
                    }
                    placeholder="Amount received"
                  />

                </label>


                <label>

                  <div className="final-billing-info-title">
                    Payment Type
                  </div>


                  <select
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",
                    }}
                    value={
                      paymentType
                    }
                    onChange={
                      event =>
                        setPaymentType(
                          event.target.value
                        )
                    }
                  >

                    <option value="Advance">
                      Advance
                    </option>

                    <option value="Part Payment">
                      Part Payment
                    </option>

                    <option value="Final Payment">
                      Final Payment
                    </option>

                  </select>

                </label>


                <label>

                  <div className="final-billing-info-title">
                    Payment Mode
                  </div>


                  <select
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",
                    }}
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

                    <option value="Bank Transfer">
                      Bank Transfer
                    </option>

                    <option value="UPI">
                      UPI
                    </option>

                    <option value="Cash">
                      Cash
                    </option>

                    <option value="Cheque">
                      Cheque
                    </option>

                    <option value="Other">
                      Other
                    </option>

                  </select>

                </label>


                <label>

                  <div className="final-billing-info-title">
                    Reference / UTR
                  </div>


                  <input
                    type="text"
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",
                    }}
                    value={
                      paymentReference
                    }
                    onChange={
                      event =>
                        setPaymentReference(
                          event.target.value
                        )
                    }
                  />

                </label>


                <label>

                  <div className="final-billing-info-title">
                    Notes
                  </div>


                  <input
                    type="text"
                    className="final-billing-select"
                    style={{
                      width:
                        "100%",
                    }}
                    value={
                      paymentNotes
                    }
                    onChange={
                      event =>
                        setPaymentNotes(
                          event.target.value
                        )
                    }
                  />

                </label>

              </div>


              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  alignItems:
                    "center",

                  padding:
                    "18px 20px",

                  borderTop:
                    "1px solid #e8eef6",

                  gap:
                    "10px",

                  flexWrap:
                    "wrap",
                }}
              >

                <button
                  type="button"
                  className="final-billing-refresh"
                  onClick={
                    () => {

                      setPaymentAmount(
                        paymentSummary.balance_amount
                      );


                      setPaymentType(
                        "Final Payment"
                      );

                    }
                  }
                >

                  <CircleDollarSign
                    size={15}
                  />

                  Use Full Balance

                </button>


                <div
                  style={{
                    display:
                      "flex",

                    gap:
                      "10px",
                  }}
                >

                  <button
                    type="button"
                    className="final-billing-refresh"
                    onClick={
                      closePayment
                    }
                    disabled={
                      paymentSaving
                    }
                  >
                    Cancel
                  </button>


                  <button
                    type="button"
                    className="final-billing-refresh"
                    onClick={
                      () =>
                        void handleRecordPayment()
                    }
                    disabled={
                      paymentSaving
                    }
                    style={{
                      background:
                        "#3478ed",

                      borderColor:
                        "#3478ed",

                      color:
                        "#ffffff",
                    }}
                  >

                    {
                      paymentSaving
                        ? (
                            <>

                              <Loader2
                                size={16}
                                className="final-billing-spin"
                              />

                              Saving...

                            </>
                          )
                        : (
                            <>

                              <WalletCards
                                size={16}
                              />

                              Record Payment

                            </>
                          )
                    }

                  </button>

                </div>

              </div>

            </div>

          </div>
        )
      }

    </div>
  );

}
