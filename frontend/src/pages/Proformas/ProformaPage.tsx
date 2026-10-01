import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import axios from "axios";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Download,
  Eye,
  FilePlus2,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";

import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  createProformaAdvancePayment,
  createProformaAdvanceRefund,
  deleteProforma,
  getProformaAdvanceSummary,
  getProformaById,
  getProformas,
  updateProforma,
  updateProformaStatus,
} from "../../services/proformaService";

import {
  downloadPdfFromHtml,
} from "../../services/pdfDocumentService";

import {
  getBusinessSettings,
  getCompanyLogoBlob,
  getCompanySettings,
  getDocumentSettings,
} from "../../services/settingsService";

import type {
  Proforma,
  ProformaCreate,
  ProformaItemCreate,
  ProformaPaymentSummary,
} from "../../types/proforma";

import type {
  CompanySettings,
  DocumentSettings,
} from "../../types/settings";

import {
  usePermissions,
} from "../../hooks/usePermissions";

import "./ProformaPage.css";


/* ================================================================
   TYPES
================================================================ */

interface EnquiryLite {
  id: number;

  enquiry_number: string;

  company_name: string;

  contact_person?: string | null;

  phone?: string | null;

  email?: string | null;

  gst_number?: string | null;

  address?: string | null;

  city?: string | null;

  state?: string | null;

  pincode?: string | null;

  machine_name?: string | null;

  machine_model?: string | null;

  status: string;
}


interface PrintAssets {
  company:
    CompanySettings;

  document:
    DocumentSettings;

  logoDataUrl:
    string | null;
}


interface AdvanceTransaction {
  key: string;

  date: string;

  transactionType:
    "Advance Received"
    |
    "Advance Refund";

  mode: string | null;

  reference: string | null;

  notes: string | null;

  amount: number;

  direction:
    "credit"
    |
    "refund";
}


/* ================================================================
   CONSTANTS
================================================================ */

const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";


const FALLBACK_PAGE_SIZE =
  10;


const USER_STATUS_OPTIONS = [
  "Draft",
  "Sent",
  "Order Confirmed",
  "Rejected",
  "Cancelled",
];


const PRODUCTION_LOCKED_STATUSES =
  new Set([
    "production started",
    "production completed",
    "final bill generated",
    "payment pending",
    "payment received",
    "completed",
  ]);


const PRODUCTION_OR_CLOSED_STATUSES =
  new Set([
    "production started",
    "production completed",
    "final bill generated",
    "payment pending",
    "payment received",
    "completed",
    "rejected",
    "cancelled",
  ]);


const EMPTY_ITEM:
ProformaItemCreate = {

  product_id:
    null,

  description:
    "",

  quantity:
    1,

  unit:
    "Nos",

  unit_price:
    0,

  discount_percent:
    0,

  tax_percent:
    18,
};


/* ================================================================
   GENERAL HELPERS
================================================================ */

function getAuthHeaders() {

  const token =
    localStorage.getItem(
      "access_token"
    );


  if (!token) {

    throw new Error(
      "Authentication required."
    );

  }


  return {
    Authorization:
      `Bearer ${token}`,
  };
}


function money(
  value:
    string |
    number
) {

  const amount =
    Number(
      value
      ||
      0
    );


  return amount.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  );

}


function formatDate(
  value:
    string
) {

  if (!value) {
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
    string
) {

  if (!value) {
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
    "en-IN",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );

}


function getLocalDateTime() {

  const now =
    new Date();


  const local =
    new Date(
      now.getTime()
      -
      now.getTimezoneOffset()
      *
      60_000
    );


  return local
    .toISOString()
    .slice(
      0,
      16
    );

}


function statusClass(
  status:
    string
) {

  return status
    .toLowerCase()
    .replace(
      /\s+/g,
      "-"
    );

}


function normalizeStatus(
  value:
    string |
    null |
    undefined
) {

  return (
    value
    ||
    ""
  )
    .trim()
    .toLowerCase();

}


function getApiError(
  error:
    unknown
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


  return (
    "Something went wrong. "
    +
    "Please try again."
  );

}


function calculateItem(
  item:
    ProformaItemCreate
) {

  const quantity =
    Number(
      item.quantity
    )
    ||
    0;


  const unitPrice =
    Number(
      item.unit_price
    )
    ||
    0;


  const discountPercent =
    Number(
      item.discount_percent
    )
    ||
    0;


  const taxPercent =
    Number(
      item.tax_percent
    )
    ||
    0;


  const gross =
    quantity
    *
    unitPrice;


  const discount =
    gross
    *
    (
      discountPercent
      /
      100
    );


  const taxable =
    gross
    -
    discount;


  const tax =
    taxable
    *
    (
      taxPercent
      /
      100
    );


  const total =
    taxable
    +
    tax;


  return {
    gross,
    discount,
    taxable,
    tax,
    total,
  };

}


function buildAddress(
  enquiry:
    EnquiryLite |
    null
) {

  if (!enquiry) {
    return "";
  }


  return [
    enquiry.address,
    enquiry.city,
    enquiry.state,
    enquiry.pincode,
  ]
    .filter(
      Boolean
    )
    .join(
      ", "
    );

}


function formFromProforma(
  proforma:
    Proforma
):
ProformaCreate {

  return {

    proforma_date:
      proforma.proforma_date,

    enquiry_id:
      proforma.enquiry_id,

    customer_id:
      proforma.customer_id,

    company_name:
      proforma.company_name,

    contact_person:
      proforma.contact_person
      ||
      "",

    phone:
      proforma.phone
      ||
      "",

    email:
      proforma.email
      ||
      "",

    billing_address:
      proforma.billing_address
      ||
      "",

    shipping_address:
      proforma.shipping_address
      ||
      "",

    validity_days:
      proforma.validity_days,

    payment_terms:
      proforma.payment_terms
      ||
      "",

    delivery_terms:
      proforma.delivery_terms
      ||
      "",

    notes:
      proforma.notes
      ||
      "",

    terms_and_conditions:
      proforma.terms_and_conditions
      ||
      "",

    status:
      proforma.status,

    items:
      proforma.items.map(
        item => ({

          product_id:
            null,

          description:
            item.description
            ||
            "",

          quantity:
            Number(
              item.quantity
            ),

          unit:
            item.unit
            ||
            "Nos",

          unit_price:
            Number(
              item.unit_price
            ),

          discount_percent:
            Number(
              item.discount_percent
            ),

          tax_percent:
            Number(
              item.tax_percent
            ),
        })
      ),
  };

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
              "Unable to read logo."
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


/* ================================================================
   PROFORMA DOCUMENT

   IMPORTANT:
   Both Print and Download PDF use this exact same HTML.
================================================================ */

function buildProformaDocumentHtml(
  proforma:
    Proforma,

  enquiry:
    EnquiryLite |
    null,

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
    document.default_print_mode
    ===
    "letterhead";


  const topSpace =
    Math.max(
      0,
      Number(
        document.letterhead_top_space_mm
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


  const customerGst =
    enquiry?.gst_number
    ||
    "";


  const rows =
    proforma.items
      .map(
        (
          item,
          index
        ) => `
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

            <td class="right">
              ${escapeHtml(
                item.quantity
              )}
            </td>

            <td>
              ${escapeHtml(
                item.unit
                ||
                "Nos"
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
              ${escapeHtml(
                item.tax_percent
              )}%
            </td>

            <td class="right">
              ₹${money(
                item.line_total
              )}
            </td>

          </tr>
        `
      )
      .join(
        ""
      );


  const header =
    letterheadMode
      ? `
          <div
            class="letterhead-space"
            style="
              height:${topSpace}mm;
            "
          ></div>
        `
      : `
          <div class="company-header">

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

          </div>
        `;


  const bankSection =
    document.show_bank_details_on_proforma
      ? `
          <section class="block">

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
                  Account No.
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
                  UPI
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


  const signature =
    document.show_authorized_signature
      ? `
          <section class="signature">

            <div></div>

            <div class="signature-box">

              <div class="signature-space"></div>

              <strong>
                ${escapeHtml(
                  document.authorized_signatory_name
                  ||
                  "Authorized Signatory"
                )}
              </strong>

              ${
                document.authorized_signatory_designation
                  ? `
                      <span>
                        ${escapeHtml(
                          document.authorized_signatory_designation
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


  return `
<!DOCTYPE html>

<html>

<head>

  <meta charset="UTF-8" />

  <title>
    ${escapeHtml(
      proforma.proforma_number
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

    .title-row {
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

    .title-row h2 {
      margin:
        0;

      color:
        #111827;

      font-size:
        20px;

      letter-spacing:
        0.04em;
    }

    .document-eyebrow {
      margin-bottom:
        4px;

      color:
        #1d4ed8;

      font-size:
        8px;

      font-weight:
        700;

      letter-spacing:
        0.1em;
    }

    .meta {
      min-width:
        225px;

      overflow:
        hidden;

      border:
        1px solid #cbd5e1;

      border-radius:
        5px;
    }

    .meta-row {
      display:
        grid;

      grid-template-columns:
        90px
        1fr;

      border-bottom:
        1px solid #e2e8f0;
    }

    .meta-row:last-child {
      border-bottom:
        0;
    }

    .meta-row span,
    .meta-row strong {
      padding:
        6px 8px;
    }

    .meta-row span {
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
        36mm;

      padding:
        4mm;

      border:
        1px solid #cbd5e1;

      border-radius:
        5px;
    }

    .party-card h3,
    .block h3 {
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

    .party-card strong {
      font-size:
        12px;
    }

    .party-card div {
      margin-top:
        1mm;
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

      text-transform:
        uppercase;
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

    .bottom-grid {
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

    .terms-title {
      margin-bottom:
        3mm;

      color:
        #1d4ed8;

      font-size:
        10px;

      font-weight:
        700;

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

    .block {
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

    ${header}


    <section class="title-row">

      <div>

        <div class="document-eyebrow">
          SALES DOCUMENT
        </div>

        <h2>
          PROFORMA INVOICE
        </h2>

      </div>


      <div class="meta">

        <div class="meta-row">

          <span>
            Proforma
          </span>

          <strong>
            ${escapeHtml(
              proforma.proforma_number
            )}
          </strong>

        </div>


        <div class="meta-row">

          <span>
            Date
          </span>

          <strong>
            ${escapeHtml(
              formatDate(
                proforma.proforma_date
              )
            )}
          </strong>

        </div>


        <div class="meta-row">

          <span>
            Enquiry
          </span>

          <strong>
            ${escapeHtml(
              enquiry?.enquiry_number
              ||
              "-"
            )}
          </strong>

        </div>


        <div class="meta-row">

          <span>
            Status
          </span>

          <strong>
            ${escapeHtml(
              proforma.status
            )}
          </strong>

        </div>

      </div>

    </section>


    <section class="party-grid">

      <div class="party-card">

        <h3>
          Bill To
        </h3>

        <strong>
          ${escapeHtml(
            proforma.company_name
          )}
        </strong>

        ${
          proforma.contact_person
            ? `
                <div>
                  ${escapeHtml(
                    proforma.contact_person
                  )}
                </div>
              `
            : ""
        }

        ${
          proforma.phone
            ? `
                <div>
                  ${escapeHtml(
                    proforma.phone
                  )}
                </div>
              `
            : ""
        }

        ${
          proforma.email
            ? `
                <div>
                  ${escapeHtml(
                    proforma.email
                  )}
                </div>
              `
            : ""
        }

        ${
          proforma.billing_address
            ? `
                <div>
                  ${htmlText(
                    proforma.billing_address
                  )}
                </div>
              `
            : ""
        }

        ${
          customerGst
            ? `
                <div>

                  GSTIN:

                  <strong>
                    ${escapeHtml(
                      customerGst
                    )}
                  </strong>

                </div>
              `
            : ""
        }

      </div>


      <div class="party-card">

        <h3>
          Ship To
        </h3>

        <strong>
          ${escapeHtml(
            proforma.company_name
          )}
        </strong>

        <div>
          ${htmlText(
            proforma.shipping_address
            ||
            proforma.billing_address
            ||
            "-"
          )}
        </div>

      </div>

    </section>


    <table>

      <thead>

        <tr>

          <th>#</th>

          <th>
            Description
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
            Disc.
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
        ${rows}
      </tbody>

    </table>


    <section class="bottom-grid">

      <div class="terms">

        <div class="terms-title">
          Commercial Terms
        </div>


        <div class="term-row">

          <span>
            Payment
          </span>

          ${htmlText(
            proforma.payment_terms
            ||
            "-"
          )}

        </div>


        <div class="term-row">

          <span>
            Delivery
          </span>

          ${htmlText(
            proforma.delivery_terms
            ||
            "-"
          )}

        </div>


        ${
          proforma.validity_days
            ? `
                <div class="term-row">

                  <span>
                    Validity
                  </span>

                  ${escapeHtml(
                    proforma.validity_days
                  )}
                  days

                </div>
              `
            : ""
        }


        ${
          proforma.notes
            ? `
                <div class="term-row">

                  <span>
                    Notes
                  </span>

                  ${htmlText(
                    proforma.notes
                  )}

                </div>
              `
            : ""
        }


        ${
          proforma.terms_and_conditions
            ? `
                <div class="term-row">

                  <span>
                    Terms & Conditions
                  </span>

                  ${htmlText(
                    proforma.terms_and_conditions
                  )}

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
              proforma.subtotal
            )}
          </strong>

        </div>


        <div class="total-row">

          <span>
            Discount
          </span>

          <strong>
            − ₹${money(
              proforma.discount_amount
            )}
          </strong>

        </div>


        <div class="total-row">

          <span>
            GST / Tax
          </span>

          <strong>
            ₹${money(
              proforma.tax_amount
            )}
          </strong>

        </div>


        <div class="total-row grand">

          <span>
            Grand Total
          </span>

          <strong>
            ₹${money(
              proforma.grand_total
            )}
          </strong>

        </div>

      </div>

    </section>


    ${bankSection}

    ${signature}

    ${footer}

  </div>

</body>

</html>
  `;

}


/* ================================================================
   PAGE
================================================================ */

export default function ProformaPage() {

  const navigate =
    useNavigate();


  const {
    id,
  } =
    useParams<{
      id:
        string;
    }>();


  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams();


  const {
    hasPermission,
  } =
    usePermissions();


  const canCreateProforma =
    hasPermission(
      "proformas.create"
    );


  const canEditProforma =
    hasPermission(
      "proformas.edit"
    );


  const canConfirmProforma =
    hasPermission(
      "proformas.confirm"
    );


  const canCancelProforma =
    hasPermission(
      "proformas.cancel"
    );


  const canDeleteProforma =
    hasPermission(
      "proformas.delete"
    );


  const canChangeProformaStatus =
    canEditProforma
    ||
    canConfirmProforma
    ||
    canCancelProforma;


  const isDetails =
    Boolean(
      id
    );


  /* ==============================================================
     CORE STATE
  ============================================================== */

  const [
    proformas,
    setProformas,
  ] =
    useState<
      Proforma[]
    >([]);


  const [
    selectedProforma,
    setSelectedProforma,
  ] =
    useState<
      Proforma |
      null
    >(
      null
    );


  const [
    selectedEnquiry,
    setSelectedEnquiry,
  ] =
    useState<
      EnquiryLite |
      null
    >(
      null
    );


  const [
    form,
    setForm,
  ] =
    useState<
      ProformaCreate |
      null
    >(
      null
    );


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
    salesPage,
    setSalesPage,
  ] =
    useState(
      1
    );


  const [
    productionPage,
    setProductionPage,
  ] =
    useState(
      1
    );


  const [
    pageSize,
    setPageSize,
  ] =
    useState(
      FALLBACK_PAGE_SIZE
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );


  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );


  const [
    deleting,
    setDeleting,
  ] =
    useState(
      false
    );


  const [
    documentBusy,
    setDocumentBusy,
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


  const [
    formError,
    setFormError,
  ] =
    useState(
      ""
    );


  /* ==============================================================
     ADVANCE STATE
  ============================================================== */

  const [
    advanceSummary,
    setAdvanceSummary,
  ] =
    useState<
      ProformaPaymentSummary |
      null
    >(
      null
    );


  const [
    advanceLoading,
    setAdvanceLoading,
  ] =
    useState(
      false
    );


  const [
    advanceError,
    setAdvanceError,
  ] =
    useState(
      ""
    );


  const [
    advanceModalOpen,
    setAdvanceModalOpen,
  ] =
    useState(
      false
    );


  const [
    advanceSaving,
    setAdvanceSaving,
  ] =
    useState(
      false
    );


  const [
    advanceDate,
    setAdvanceDate,
  ] =
    useState(
      getLocalDateTime()
    );


  const [
    advanceAmount,
    setAdvanceAmount,
  ] =
    useState(
      ""
    );


  const [
    advanceMode,
    setAdvanceMode,
  ] =
    useState(
      "Bank Transfer"
    );


  const [
    advanceReference,
    setAdvanceReference,
  ] =
    useState(
      ""
    );


  const [
    advanceNotes,
    setAdvanceNotes,
  ] =
    useState(
      ""
    );


  /* ==============================================================
     REFUND STATE
  ============================================================== */

  const [
    refundModalOpen,
    setRefundModalOpen,
  ] =
    useState(
      false
    );


  const [
    refundSaving,
    setRefundSaving,
  ] =
    useState(
      false
    );


  const [
    refundError,
    setRefundError,
  ] =
    useState(
      ""
    );


  const [
    refundDate,
    setRefundDate,
  ] =
    useState(
      getLocalDateTime()
    );


  const [
    refundAmount,
    setRefundAmount,
  ] =
    useState(
      ""
    );


  const [
    refundMode,
    setRefundMode,
  ] =
    useState(
      "Bank Transfer"
    );


  const [
    refundReference,
    setRefundReference,
  ] =
    useState(
      ""
    );


  const [
    refundNotes,
    setRefundNotes,
  ] =
    useState(
      ""
    );


  const editingRequested =
    searchParams.get(
      "edit"
    )
    ===
    "true";


  /* ==============================================================
     PAGE SIZE
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

        } catch {

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
     ADVANCE SUMMARY
  ============================================================== */

  async function loadAdvanceSummary(
    proformaId:
      number
  ) {

    try {

      setAdvanceLoading(
        true
      );


      setAdvanceError(
        ""
      );


      const summary =
        await getProformaAdvanceSummary(
          proformaId
        );


      setAdvanceSummary(
        summary
      );


      return summary;

    } catch (
      err
    ) {

      setAdvanceError(
        getApiError(
          err
        )
      );


      return null;

    } finally {

      setAdvanceLoading(
        false
      );

    }

  }


  /* ==============================================================
     LOAD LIST
  ============================================================== */

  async function loadProformas() {

    try {

      setLoading(
        true
      );


      setError(
        ""
      );


      const data =
        await getProformas();


      setProformas(
        data
      );

    } catch (
      err
    ) {

      setError(
        getApiError(
          err
        )
      );

    } finally {

      setLoading(
        false
      );

    }

  }


  /* ==============================================================
     LOAD DETAIL
  ============================================================== */

  async function loadDetails(
    proformaId:
      number
  ) {

    try {

      setLoading(
        true
      );


      setError(
        ""
      );


      const [
        proformaData,
        paymentSummary,
      ] =
        await Promise.all([
          getProformaById(
            proformaId
          ),

          getProformaAdvanceSummary(
            proformaId
          ),
        ]);


      setSelectedProforma(
        proformaData
      );


      setForm(
        formFromProforma(
          proformaData
        )
      );


      setAdvanceSummary(
        paymentSummary
      );


      try {

        const response =
          await axios.get<
            EnquiryLite
          >(
            `${API_BASE_URL}/enquiries/${proformaData.enquiry_id}`,
            {
              headers:
                getAuthHeaders(),
            }
          );


        setSelectedEnquiry(
          response.data
        );

      } catch {

        setSelectedEnquiry(
          null
        );

      }

    } catch (
      err
    ) {

      setError(
        getApiError(
          err
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

      if (
        isDetails
        &&
        id
      ) {

        void loadDetails(
          Number(
            id
          )
        );


        return;

      }


      void loadProformas();

    },
    [
      isDetails,
      id,
    ]
  );


  /* ==============================================================
     FILTER
  ============================================================== */

  const filteredProformas =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        return proformas.filter(
          proforma => {

            if (
              statusFilter
              &&
              normalizeStatus(
                proforma.status
              )
              !==
              normalizeStatus(
                statusFilter
              )
            ) {
              return false;
            }


            if (!query) {
              return true;
            }


            const firstItem =
              proforma.items[
                0
              ]?.description
              ||
              "";


            return [
              proforma.proforma_number,
              proforma.company_name,
              proforma.contact_person,
              proforma.phone,
              proforma.email,
              firstItem,
              proforma.status,
            ]
              .filter(
                Boolean
              )
              .some(
                value =>
                  String(
                    value
                  )
                    .toLowerCase()
                    .includes(
                      query
                    )
              );

          }
        );

      },
      [
        proformas,
        search,
        statusFilter,
      ]
    );


  /* ==============================================================
     TRACKING GROUPS
  ============================================================== */

  const salesTrackingProformas =
    useMemo(
      () =>
        filteredProformas.filter(
          proforma =>
            !PRODUCTION_OR_CLOSED_STATUSES
              .has(
                normalizeStatus(
                  proforma.status
                )
              )
        ),
      [
        filteredProformas,
      ]
    );


  const productionTrackingProformas =
    useMemo(
      () =>
        filteredProformas.filter(
          proforma =>
            PRODUCTION_OR_CLOSED_STATUSES
              .has(
                normalizeStatus(
                  proforma.status
                )
              )
        ),
      [
        filteredProformas,
      ]
    );


  useEffect(
    () => {

      setSalesPage(
        1
      );


      setProductionPage(
        1
      );

    },
    [
      search,
      statusFilter,
      pageSize,
    ]
  );


  const salesTotalPages =
    Math.max(
      1,
      Math.ceil(
        salesTrackingProformas.length
        /
        pageSize
      )
    );


  const productionTotalPages =
    Math.max(
      1,
      Math.ceil(
        productionTrackingProformas.length
        /
        pageSize
      )
    );


  useEffect(
    () => {

      if (
        salesPage
        >
        salesTotalPages
      ) {

        setSalesPage(
          salesTotalPages
        );

      }

    },
    [
      salesPage,
      salesTotalPages,
    ]
  );


  useEffect(
    () => {

      if (
        productionPage
        >
        productionTotalPages
      ) {

        setProductionPage(
          productionTotalPages
        );

      }

    },
    [
      productionPage,
      productionTotalPages,
    ]
  );


  const paginatedSalesProformas =
    useMemo(
      () => {

        const start =
          (
            salesPage
            -
            1
          )
          *
          pageSize;


        return salesTrackingProformas.slice(
          start,
          start
          +
          pageSize
        );

      },
      [
        salesTrackingProformas,
        salesPage,
        pageSize,
      ]
    );


  const paginatedProductionProformas =
    useMemo(
      () => {

        const start =
          (
            productionPage
            -
            1
          )
          *
          pageSize;


        return productionTrackingProformas.slice(
          start,
          start
          +
          pageSize
        );

      },
      [
        productionTrackingProformas,
        productionPage,
        pageSize,
      ]
    );


  /* ==============================================================
     TOTALS
  ============================================================== */

  const totals =
    useMemo(
      () => {

        if (!form) {

          return {
            subtotal:
              0,

            discount:
              0,

            taxable:
              0,

            tax:
              0,

            total:
              0,
          };

        }


        return form.items.reduce(
          (
            result,
            item
          ) => {

            const calculated =
              calculateItem(
                item
              );


            result.subtotal +=
              calculated.gross;

            result.discount +=
              calculated.discount;

            result.taxable +=
              calculated.taxable;

            result.tax +=
              calculated.tax;

            result.total +=
              calculated.total;


            return result;

          },
          {
            subtotal:
              0,

            discount:
              0,

            taxable:
              0,

            tax:
              0,

            total:
              0,
          }
        );

      },
      [
        form,
      ]
    );


  /* ==============================================================
     ADVANCE TRANSACTION HISTORY
  ============================================================== */

  const advanceTransactions =
    useMemo<
      AdvanceTransaction[]
    >(
      () => {

        if (
          !advanceSummary
        ) {
          return [];
        }


        const received:
          AdvanceTransaction[] =
          advanceSummary.payments.map(
            payment => ({
              key:
                `payment-${payment.id}`,

              date:
                payment.payment_date,

              transactionType:
                "Advance Received",

              mode:
                payment.payment_mode,

              reference:
                payment.reference_number,

              notes:
                payment.notes,

              amount:
                Number(
                  payment.amount
                ),

              direction:
                "credit",
            })
          );


        const refunded:
          AdvanceTransaction[] =
          advanceSummary.refunds.map(
            refund => ({
              key:
                `refund-${refund.id}`,

              date:
                refund.refund_date,

              transactionType:
                "Advance Refund",

              mode:
                refund.refund_mode,

              reference:
                refund.reference_number,

              notes:
                refund.notes,

              amount:
                Number(
                  refund.amount
                ),

              direction:
                "refund",
            })
          );


        return [
          ...received,
          ...refunded,
        ].sort(
          (
            left,
            right
          ) =>
            new Date(
              left.date
            ).getTime()
            -
            new Date(
              right.date
            ).getTime()
        );

      },
      [
        advanceSummary,
      ]
    );


  /* ==============================================================
     LOCK / MONEY STATE
  ============================================================== */

  const workflowLocked =
    useMemo(
      () =>
        PRODUCTION_LOCKED_STATUSES
          .has(
            normalizeStatus(
              selectedProforma
                ?.status
            )
          ),
      [
        selectedProforma,
      ]
    );


  const grossAdvanceReceived =
    Number(
      advanceSummary
        ?.advance_received
      ||
      0
    );


  const advanceRefunded =
    Number(
      advanceSummary
        ?.advance_refunded
      ||
      0
    );


  const netAdvanceHeld =
    Number(
      advanceSummary
        ?.net_advance_held
      ||
      0
    );


  const hasNetAdvance =
    netAdvanceHeld
    >
    0;


  const hasFinancialHistory =
    (
      advanceSummary
        ?.payment_count
      ||
      0
    )
    >
    0
    ||
    (
      advanceSummary
        ?.refund_count
      ||
      0
    )
    >
    0;


  const deleteLocked =
    workflowLocked
    ||
    [
      "confirmed",
      "order confirmed",
    ].includes(
      normalizeStatus(
        selectedProforma
          ?.status
      )
    )
    ||
    hasFinancialHistory;


  const editing =
    editingRequested
    &&
    canEditProforma
    &&
    !workflowLocked;


  /* ==============================================================
     FORM UPDATE
  ============================================================== */

  function updateField<
    K extends keyof ProformaCreate
  >(
    field:
      K,

    value:
      ProformaCreate[K]
  ) {

    setForm(
      current =>
        current
          ? {
              ...current,

              [field]:
                value,
            }
          : current
    );

  }


  function updateItem(
    index:
      number,

    field:
      keyof ProformaItemCreate,

    value:
      string |
      number |
      null
  ) {

    setForm(
      current => {

        if (!current) {
          return current;
        }


        return {
          ...current,

          items:
            current.items.map(
              (
                item,
                itemIndex
              ) =>
                itemIndex
                ===
                index
                  ? {
                      ...item,

                      [field]:
                        value,
                    }
                  : item
            ),
        };

      }
    );

  }


  function addItem() {

    setForm(
      current =>
        current
          ? {
              ...current,

              items: [
                ...current.items,

                {
                  ...EMPTY_ITEM,
                },
              ],
            }
          : current
    );

  }


  function removeItem(
    index:
      number
  ) {

    setForm(
      current => {

        if (
          !current
          ||
          current.items.length
          ===
          1
        ) {
          return current;
        }


        return {
          ...current,

          items:
            current.items.filter(
              (
                _,
                itemIndex
              ) =>
                itemIndex
                !==
                index
            ),
        };

      }
    );

  }


  /* ==============================================================
     VALIDATE
  ============================================================== */

  function validateForm() {

    if (!form) {
      return "Proforma is not loaded.";
    }


    if (!form.proforma_date) {
      return "Proforma date is required.";
    }


    if (!form.items.length) {
      return "At least one item is required.";
    }


    for (
      let index = 0;
      index < form.items.length;
      index += 1
    ) {

      const item =
        form.items[
          index
        ];


      if (
        !item.description
          .trim()
      ) {

        return (
          `Item ${index + 1}: `
          +
          "Finished Product / Machine name is required."
        );

      }


      if (
        Number(
          item.quantity
        )
        <=
        0
      ) {

        return (
          `Item ${index + 1}: `
          +
          "Quantity must be greater than zero."
        );

      }


      if (
        Number(
          item.unit_price
        )
        <
        0
      ) {

        return (
          `Item ${index + 1}: `
          +
          "Unit price cannot be negative."
        );

      }

    }


    if (
      netAdvanceHeld
      >
      0
      &&
      totals.total
      <
      netAdvanceHeld
    ) {

      return (
        "The Proforma total cannot be reduced below "
        +
        `the net advance still held (₹${money(
          netAdvanceHeld
        )}).`
      );

    }


    return "";

  }


  /* ==============================================================
     SAVE
  ============================================================== */

  async function handleSave(
    event:
      FormEvent
  ) {

    event.preventDefault();


    if (
      !selectedProforma
      ||
      !form
    ) {
      return;
    }


    if (
      workflowLocked
    ) {

      setFormError(
        "Production has already started. "
        +
        "This Proforma is locked."
      );

      return;

    }


    const validation =
      validateForm();


    if (
      validation
    ) {

      setFormError(
        validation
      );

      return;

    }


    try {

      setSaving(
        true
      );


      setFormError(
        ""
      );


      const updated =
        await updateProforma(
          selectedProforma.id,
          {
            ...form,

            enquiry_id:
              selectedProforma.enquiry_id,

            customer_id:
              selectedProforma.customer_id,

            company_name:
              selectedProforma.company_name,

            contact_person:
              selectedProforma.contact_person,

            phone:
              selectedProforma.phone,

            email:
              selectedProforma.email,

            items:
              form.items.map(
                item => ({

                  product_id:
                    null,

                  description:
                    item.description
                      .trim(),

                  quantity:
                    Number(
                      item.quantity
                    ),

                  unit:
                    (
                      item.unit
                      ||
                      "Nos"
                    ).trim(),

                  unit_price:
                    Number(
                      item.unit_price
                    ),

                  discount_percent:
                    Number(
                      item.discount_percent
                    ),

                  tax_percent:
                    Number(
                      item.tax_percent
                    ),
                })
              ),
          }
        );


      setSelectedProforma(
        updated
      );


      setForm(
        formFromProforma(
          updated
        )
      );


      await loadAdvanceSummary(
        updated.id
      );


      setSearchParams(
        {}
      );

    } catch (
      err
    ) {

      setFormError(
        getApiError(
          err
        )
      );

    } finally {

      setSaving(
        false
      );

    }

  }


  /* ==============================================================
     STATUS
  ============================================================== */

  async function handleStatusChange(
    newStatus:
      string
  ) {

    if (
      !selectedProforma
    ) {
      return;
    }


    if (
      workflowLocked
    ) {

      setError(
        "Production has already started. "
        +
        "This Proforma workflow is locked."
      );

      return;

    }


    const next =
      normalizeStatus(
        newStatus
      );


    const current =
      normalizeStatus(
        selectedProforma.status
      );


    if (
      next
      ===
      current
    ) {
      return;
    }


    if (
      next
      ===
      "order confirmed"
      &&
      !canConfirmProforma
    ) {

      setError(
        "You do not have permission to confirm Proformas."
      );

      return;

    }


    if (
      next
      ===
      "cancelled"
      &&
      !canCancelProforma
    ) {

      setError(
        "You do not have permission to cancel Proformas."
      );

      return;

    }


    if (
      ![
        "order confirmed",
        "cancelled",
      ].includes(
        next
      )
      &&
      !canEditProforma
    ) {

      setError(
        "You do not have permission to change Proforma status."
      );

      return;

    }


    if (
      hasNetAdvance
      &&
      [
        "draft",
        "sent",
        "rejected",
        "cancelled",
      ].includes(
        next
      )
    ) {

      const isCancelling =
        next
        ===
        "cancelled";


      const confirmed =
        window.confirm(
          `₹${money(
            netAdvanceHeld
          )} of customer advance is still held against this Proforma.\n\n`
          +
          (
            isCancelling
              ? (
                  "After cancellation you can use Refund Advance "
                  +
                  "to settle the customer money."
                )
              : (
                  "Changing the workflow status will NOT delete "
                  +
                  "the payment record."
                )
          )
          +
          "\n\nContinue?"
        );


      if (
        !confirmed
      ) {
        return;
      }

    }


    try {

      setSaving(
        true
      );


      setError(
        ""
      );


      const updated =
        await updateProformaStatus(
          selectedProforma.id,
          newStatus
        );


      setSelectedProforma(
        updated
      );


      setForm(
        formFromProforma(
          updated
        )
      );


      await loadAdvanceSummary(
        updated.id
      );

    } catch (
      err
    ) {

      setError(
        getApiError(
          err
        )
      );

    } finally {

      setSaving(
        false
      );

    }

  }


  /* ==============================================================
     DELETE
  ============================================================== */

  async function handleDelete() {

    if (
      !selectedProforma
    ) {
      return;
    }


    if (
      hasFinancialHistory
    ) {

      setError(
        "This Proforma contains customer payment history "
        +
        "and cannot be deleted."
      );

      return;

    }


    if (
      deleteLocked
    ) {

      setError(
        "A confirmed or production Proforma cannot be deleted."
      );

      return;

    }


    if (
      !window.confirm(
        `Delete ${selectedProforma.proforma_number}?`
      )
    ) {
      return;
    }


    try {

      setDeleting(
        true
      );


      await deleteProforma(
        selectedProforma.id
      );


      navigate(
        "/proformas"
      );

    } catch (
      err
    ) {

      setError(
        getApiError(
          err
        )
      );

    } finally {

      setDeleting(
        false
      );

    }

  }


  /* ==============================================================
     RECORD ADVANCE
  ============================================================== */

  function openAdvanceModal() {

    if (
      !selectedProforma
      ||
      !advanceSummary
    ) {
      return;
    }


    if (
      !advanceSummary.can_record_advance
    ) {

      setAdvanceError(
        advanceSummary.advance_recording_message
        ||
        "Advance cannot be recorded at this stage."
      );

      return;

    }


    setAdvanceDate(
      getLocalDateTime()
    );


    setAdvanceAmount(
      ""
    );


    setAdvanceMode(
      "Bank Transfer"
    );


    setAdvanceReference(
      ""
    );


    setAdvanceNotes(
      ""
    );


    setAdvanceError(
      ""
    );


    setAdvanceModalOpen(
      true
    );

  }


  function closeAdvanceModal() {

    if (
      advanceSaving
    ) {
      return;
    }


    setAdvanceModalOpen(
      false
    );


    setAdvanceError(
      ""
    );

  }


  async function handleRecordAdvance() {

    if (
      !selectedProforma
      ||
      !advanceSummary
    ) {
      return;
    }


    const amount =
      Number(
        advanceAmount
      );


    const balance =
      Number(
        advanceSummary.balance_after_advance
      );


    if (
      Number.isNaN(
        amount
      )
      ||
      amount <= 0
    ) {

      setAdvanceError(
        "Enter an advance amount greater than zero."
      );

      return;

    }


    if (
      amount
      >
      balance
    ) {

      setAdvanceError(
        `Advance cannot exceed ₹${money(
          balance
        )}.`
      );

      return;

    }


    try {

      setAdvanceSaving(
        true
      );


      setAdvanceError(
        ""
      );


      await createProformaAdvancePayment(
        selectedProforma.id,
        {
          payment_date:
            advanceDate,

          amount,

          payment_mode:
            advanceMode
              .trim()
            ||
            null,

          reference_number:
            advanceReference
              .trim()
            ||
            null,

          notes:
            advanceNotes
              .trim()
            ||
            null,
        }
      );


      await loadAdvanceSummary(
        selectedProforma.id
      );


      setAdvanceModalOpen(
        false
      );

    } catch (
      err
    ) {

      setAdvanceError(
        getApiError(
          err
        )
      );

    } finally {

      setAdvanceSaving(
        false
      );

    }

  }


  /* ==============================================================
     REFUND ADVANCE
  ============================================================== */

  function openRefundModal() {

    if (
      !selectedProforma
      ||
      !advanceSummary
    ) {
      return;
    }


    if (
      !canCancelProforma
    ) {

      setRefundError(
        "You do not have permission to refund cancelled Proforma advances."
      );

      return;

    }


    if (
      !advanceSummary.can_record_refund
    ) {

      setRefundError(
        advanceSummary.refund_recording_message
        ||
        "Advance refund cannot be recorded at this stage."
      );

      return;

    }


    setRefundDate(
      getLocalDateTime()
    );


    setRefundAmount(
      ""
    );


    setRefundMode(
      "Bank Transfer"
    );


    setRefundReference(
      ""
    );


    setRefundNotes(
      ""
    );


    setRefundError(
      ""
    );


    setRefundModalOpen(
      true
    );

  }


  function closeRefundModal() {

    if (
      refundSaving
    ) {
      return;
    }


    setRefundModalOpen(
      false
    );


    setRefundError(
      ""
    );

  }


  async function handleRecordRefund() {

    if (
      !selectedProforma
      ||
      !advanceSummary
    ) {
      return;
    }


    const amount =
      Number(
        refundAmount
      );


    const refundable =
      Number(
        advanceSummary.net_advance_held
      );


    if (
      Number.isNaN(
        amount
      )
      ||
      amount <= 0
    ) {

      setRefundError(
        "Enter a refund amount greater than zero."
      );

      return;

    }


    if (
      amount
      >
      refundable
    ) {

      setRefundError(
        `Refund cannot exceed the available advance balance of ₹${money(
          refundable
        )}.`
      );

      return;

    }


    if (
      !refundDate
    ) {

      setRefundError(
        "Refund date is required."
      );

      return;

    }


    try {

      setRefundSaving(
        true
      );


      setRefundError(
        ""
      );


      await createProformaAdvanceRefund(
        selectedProforma.id,
        {
          refund_date:
            refundDate,

          amount,

          refund_mode:
            refundMode
              .trim()
            ||
            null,

          reference_number:
            refundReference
              .trim()
            ||
            null,

          notes:
            refundNotes
              .trim()
            ||
            null,
        }
      );


      await loadAdvanceSummary(
        selectedProforma.id
      );


      setRefundModalOpen(
        false
      );

    } catch (
      err
    ) {

      setRefundError(
        getApiError(
          err
        )
      );

    } finally {

      setRefundSaving(
        false
      );

    }

  }


  /* ==============================================================
     DOCUMENT SETTINGS
  ============================================================== */

  async function loadPrintAssets():
  Promise<PrintAssets> {

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

        logoDataUrl =
          await blobToDataUrl(
            await getCompanyLogoBlob()
          );

      } catch {

        logoDataUrl =
          null;

      }

    }


    return {
      company,
      document,
      logoDataUrl,
    };

  }


  /* ==============================================================
     PRINT

     Uses:
     - Company Header mode
     - Letterhead mode
     - Letterhead top spacing
     - Logo
     - GST / contact options
     - Proforma bank-detail option
     - Signature
     - Footer
  ============================================================== */

  async function handlePrint() {

    if (
      !selectedProforma
    ) {
      return;
    }


    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1000,height=800"
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
            Preparing Proforma...
          </body>
        </html>
      `
    );


    try {

      setDocumentBusy(
        true
      );


      setError(
        ""
      );


      const assets =
        await loadPrintAssets();


      const html =
        buildProformaDocumentHtml(
          selectedProforma,
          selectedEnquiry,
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


      setError(
        getApiError(
          err
        )
      );

    } finally {

      setDocumentBusy(
        false
      );

    }

  }


  /* ==============================================================
     DOWNLOAD PDF

     IMPORTANT:
     The PDF is generated from the SAME HTML as Print.

     Therefore:
     - Company Header mode matches Print
     - Letterhead mode matches Print
     - Blank top space matches Print
     - Logo matches Print
     - Bank details match Print
     - Signature matches Print
     - Footer matches Print
  ============================================================== */

  async function handleDownload() {

    if (
      !selectedProforma
    ) {
      return;
    }


    try {

      setDocumentBusy(
        true
      );


      setError(
        ""
      );


      const assets =
        await loadPrintAssets();


      const html =
        buildProformaDocumentHtml(
          selectedProforma,
          selectedEnquiry,
          assets
        );


      await downloadPdfFromHtml(
        html,
        `${selectedProforma.proforma_number}.pdf`
      );

    } catch (
      err
    ) {

      setError(
        getApiError(
          err
        )
      );

    } finally {

      setDocumentBusy(
        false
      );

    }

  }


  /* ==============================================================
     PAGINATION
  ============================================================== */

  function renderPagination(
    currentPage:
      number,

    totalPages:
      number,

    totalRecords:
      number,

    onPrevious:
      () => void,

    onNext:
      () => void
  ) {

    const first =
      totalRecords
      >
      0
        ? (
            (
              currentPage
              -
              1
            )
            *
            pageSize
          )
          +
          1
        : 0;


    const last =
      Math.min(
        currentPage
        *
        pageSize,

        totalRecords
      );


    return (
      <div
        style={{
          display:
            "flex",

          justifyContent:
            "space-between",

          alignItems:
            "center",

          gap:
            "12px",

          padding:
            "14px 18px",

          borderTop:
            "1px solid #edf1f5",

          flexWrap:
            "wrap",
        }}
      >

        <div className="record-secondary">

          Showing{" "}

          <strong>
            {first}
          </strong>

          {"–"}

          <strong>
            {last}
          </strong>

          {" of "}

          <strong>
            {totalRecords}
          </strong>

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
              "9px",
          }}
        >

          <button
            type="button"
            className="secondary-button"
            disabled={
              currentPage
              <=
              1
            }
            onClick={
              onPrevious
            }
          >
            Previous
          </button>


          <span className="record-secondary">

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
            className="secondary-button"
            disabled={
              currentPage
              >=
              totalPages
            }
            onClick={
              onNext
            }
          >
            Next
          </button>

        </div>

      </div>
    );

  }


  /* ==============================================================
     TRACKING TABLE

     Only VIEW is intentionally provided here.

     Edit remains available inside the Proforma detail page.
  ============================================================== */

  function renderTrackingTable(
    records:
      Proforma[]
  ) {

    if (
      records.length
      ===
      0
    ) {

      return (
        <div className="table-state">

          <FileText
            size={24}
          />

          <h3>
            No Proformas in this section
          </h3>

        </div>
      );

    }


    return (
      <div className="proforma-table-wrapper">

        <table className="proforma-table">

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
                Finished Product / Machine
              </th>

              <th>
                Items
              </th>

              <th>
                Amount
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
              records.map(
                proforma => {

                  const firstItem =
                    proforma.items[
                      0
                    ]?.description
                    ||
                    "-";


                  return (
                    <tr
                      key={
                        proforma.id
                      }
                    >

                      <td>

                        <div className="record-primary">
                          {proforma.proforma_number}
                        </div>

                      </td>


                      <td>
                        {formatDate(proforma.proforma_date)}
                      </td>


                      <td>

                        <div className="customer-name">
                          {proforma.company_name}
                        </div>


                        {
                          proforma.contact_person
                          &&
                          (
                            <div className="record-secondary">
                              {proforma.contact_person}
                            </div>
                          )
                        }

                      </td>


                      <td>

                        <div className="record-primary">
                          {firstItem}
                        </div>


                        {
                          proforma.items.length
                          >
                          1
                          &&
                          (
                            <div className="record-secondary">

                              +
                              {
                                proforma.items.length
                                -
                                1
                              }

                              {" more"}

                            </div>
                          )
                        }

                      </td>


                      <td>
                        {proforma.items.length}
                      </td>


                      <td>

                        <strong className="amount">

                          ₹
                          {
                            money(
                              proforma.grand_total
                            )
                          }

                        </strong>

                      </td>


                      <td>

                        <span
                          className={
                            `status-badge ${statusClass(
                              proforma.status
                            )}`
                          }
                        >

                          {proforma.status}

                        </span>

                      </td>


                      <td>

                        <div className="row-actions">

                          <button
                            type="button"
                            title="View"
                            onClick={
                              () =>
                                navigate(
                                  `/proformas/${proforma.id}`
                                )
                            }
                          >

                            <Eye
                              size={16}
                            />

                          </button>

                        </div>

                      </td>

                    </tr>
                  );

                }
              )
            }

          </tbody>

        </table>

      </div>
    );

  }


  /* ==============================================================
     ADVANCE / REFUND CARD
  ============================================================== */

  function renderAdvanceCard() {

    if (
      !selectedProforma
    ) {
      return null;
    }


    return (
      <section className="form-card">

        <div className="form-card-heading">

          <div>

            <h2>
              Customer Advance & Settlement
            </h2>


            <p>
              Tracks advance money received before Final Billing,
              including refunds when an order is cancelled.
            </p>

          </div>


          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap:
                "8px",

              flexWrap:
                "wrap",
            }}
          >

            {
              canConfirmProforma
              &&
              advanceSummary
                ?.can_record_advance
              &&
              Number(
                advanceSummary.balance_after_advance
              )
              >
              0
              &&
              (
                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    openAdvanceModal
                  }
                >

                  <WalletCards
                    size={16}
                  />

                  Record Advance

                </button>
              )
            }


            {
              canCancelProforma
              &&
              advanceSummary
                ?.can_record_refund
              &&
              Number(
                advanceSummary.net_advance_held
              )
              >
              0
              &&
              (
                <button
                  type="button"
                  className="danger-outline-button"
                  onClick={
                    openRefundModal
                  }
                >

                  <RefreshCw
                    size={16}
                  />

                  Refund Advance

                </button>
              )
            }

          </div>

        </div>


        {
          advanceLoading
            ? (
                <div className="table-state">

                  <Loader2
                    size={20}
                    className="spin"
                  />

                  Loading advance settlement...

                </div>
              )
            : advanceSummary
              ? (
                  <>

                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(160px, 1fr))",

                        gap:
                          "12px",

                        marginBottom:
                          "16px",
                      }}
                    >

                      <div className="proforma-kpi">

                        <div>

                          <span>
                            Proforma Value
                          </span>

                          <strong>
                            ₹{money(advanceSummary.proforma_total)}
                          </strong>

                        </div>

                      </div>


                      <div className="proforma-kpi">

                        <div>

                          <span>
                            Advance Received
                          </span>

                          <strong
                            style={{
                              color:
                                "#159a5b",
                            }}
                          >
                            ₹{money(advanceSummary.advance_received)}
                          </strong>

                        </div>

                      </div>


                      <div className="proforma-kpi">

                        <div>

                          <span>
                            Refunded
                          </span>

                          <strong
                            style={{
                              color:
                                "#c84655",
                            }}
                          >
                            ₹{money(advanceSummary.advance_refunded)}
                          </strong>

                        </div>

                      </div>


                      <div className="proforma-kpi">

                        <div>

                          <span>
                            Net Advance Held
                          </span>

                          <strong
                            style={{
                              color:
                                Number(
                                  advanceSummary.net_advance_held
                                )
                                >
                                0
                                  ? "#c36a1c"
                                  : "#159a5b",
                            }}
                          >
                            ₹{money(advanceSummary.net_advance_held)}
                          </strong>

                        </div>

                      </div>


                      <div className="proforma-kpi">

                        <div>

                          <span>
                            Settlement Status
                          </span>

                          <strong>
                            {advanceSummary.settlement_status}
                          </strong>

                        </div>

                      </div>

                    </div>


                    {
                      advanceSummary.advance_recording_message
                      &&
                      !advanceSummary.can_record_advance
                      &&
                      normalizeStatus(
                        selectedProforma.status
                      )
                      !==
                      "cancelled"
                      &&
                      (
                        <div
                          style={{
                            marginBottom:
                              "12px",

                            padding:
                              "11px 12px",

                            border:
                              "1px solid #dce5f0",

                            borderRadius:
                              "9px",

                            background:
                              "#f8fafc",

                            color:
                              "#6f809a",

                            fontSize:
                              "10px",
                          }}
                        >
                          {advanceSummary.advance_recording_message}
                        </div>
                      )
                    }


                    {
                      normalizeStatus(
                        selectedProforma.status
                      )
                      ===
                      "cancelled"
                      &&
                      advanceSummary.refund_recording_message
                      &&
                      !advanceSummary.can_record_refund
                      &&
                      (
                        <div
                          style={{
                            marginBottom:
                              "12px",

                            padding:
                              "11px 12px",

                            border:
                              "1px solid #dce5f0",

                            borderRadius:
                              "9px",

                            background:
                              "#f8fafc",

                            color:
                              "#6f809a",

                            fontSize:
                              "10px",
                          }}
                        >
                          {advanceSummary.refund_recording_message}
                        </div>
                      )
                    }


                    {
                      advanceError
                      &&
                      (
                        <div className="proforma-alert error">
                          {advanceError}
                        </div>
                      )
                    }


                    {
                      refundError
                      &&
                      !refundModalOpen
                      &&
                      (
                        <div className="proforma-alert error">
                          {refundError}
                        </div>
                      )
                    }


                    {
                      advanceTransactions.length
                      ===
                      0
                        ? (
                            <div className="table-state">

                              <WalletCards
                                size={23}
                              />

                              <h3>
                                No advance transactions
                              </h3>

                            </div>
                          )
                        : (
                            <>

                              <div
                                style={{
                                  marginBottom:
                                    "10px",

                                  color:
                                    "#273f62",

                                  fontSize:
                                    "11px",

                                  fontWeight:
                                    800,
                                }}
                              >
                                Advance Transaction History
                              </div>


                              <div className="proforma-table-wrapper">

                                <table className="proforma-table">

                                  <thead>

                                    <tr>

                                      <th>
                                        Date
                                      </th>

                                      <th>
                                        Transaction
                                      </th>

                                      <th>
                                        Mode
                                      </th>

                                      <th>
                                        Reference
                                      </th>

                                      <th>
                                        Notes
                                      </th>

                                      <th>
                                        Amount
                                      </th>

                                    </tr>

                                  </thead>


                                  <tbody>

                                    {
                                      advanceTransactions.map(
                                        transaction => (

                                          <tr
                                            key={
                                              transaction.key
                                            }
                                          >

                                            <td>
                                              {formatDateTime(transaction.date)}
                                            </td>


                                            <td>

                                              <span
                                                style={{
                                                  display:
                                                    "inline-flex",

                                                  padding:
                                                    "4px 8px",

                                                  borderRadius:
                                                    "999px",

                                                  background:
                                                    transaction.direction
                                                    ===
                                                    "credit"
                                                      ? "#eaf8f0"
                                                      : "#fff0f1",

                                                  color:
                                                    transaction.direction
                                                    ===
                                                    "credit"
                                                      ? "#168653"
                                                      : "#b94150",

                                                  fontSize:
                                                    "9px",

                                                  fontWeight:
                                                    800,
                                                }}
                                              >
                                                {transaction.transactionType}
                                              </span>

                                            </td>


                                            <td>
                                              {transaction.mode || "-"}
                                            </td>


                                            <td>
                                              {transaction.reference || "-"}
                                            </td>


                                            <td>
                                              {transaction.notes || "-"}
                                            </td>


                                            <td>

                                              <strong
                                                style={{
                                                  color:
                                                    transaction.direction
                                                    ===
                                                    "credit"
                                                      ? "#159a5b"
                                                      : "#c84655",
                                                }}
                                              >

                                                {
                                                  transaction.direction
                                                  ===
                                                  "credit"
                                                    ? "+"
                                                    : "-"
                                                }

                                                ₹{money(transaction.amount)}

                                              </strong>

                                            </td>

                                          </tr>

                                        )
                                      )
                                    }

                                  </tbody>

                                </table>

                              </div>

                            </>
                          )
                    }

                  </>
                )
              : null
        }

      </section>
    );

  }


  /* ==============================================================
     DETAIL PAGE
  ============================================================== */

  if (
    isDetails
  ) {

    if (
      loading
      ||
      !selectedProforma
      ||
      !form
    ) {

      return (
        <div className="proforma-page">

          <div className="table-state">

            <Loader2
              size={28}
              className="spin"
            />

            <h3>
              Loading Proforma...
            </h3>

          </div>

        </div>
      );

    }


    const address =
      buildAddress(
        selectedEnquiry
      );


    const permittedStatusOptions =
      USER_STATUS_OPTIONS.filter(
        option => {

          const next =
            normalizeStatus(
              option
            );


          if (
            next
            ===
            normalizeStatus(
              selectedProforma.status
            )
          ) {
            return true;
          }


          if (
            next
            ===
            "order confirmed"
          ) {
            return canConfirmProforma;
          }


          if (
            next
            ===
            "cancelled"
          ) {
            return canCancelProforma;
          }


          return canEditProforma;

        }
      );


    const statusOptions =
      Array.from(
        new Set([
          selectedProforma.status,
          ...permittedStatusOptions,
        ])
      );


    return (
      <div className="proforma-page">

        <div className="proforma-breadcrumb">

          <button
            type="button"
            className="breadcrumb-back"
            onClick={
              () =>
                navigate(
                  "/proformas"
                )
            }
          >

            <ArrowLeft
              size={16}
            />

            Proformas

          </button>


          <ChevronRight
            size={15}
          />


          <span>
            {selectedProforma.proforma_number}
          </span>

        </div>


        {
          error
          &&
          (
            <div className="proforma-alert error">

              <span>
                {error}
              </span>


              <button
                type="button"
                onClick={
                  () =>
                    setError(
                      ""
                    )
                }
              >
                <X size={16} />
              </button>

            </div>
          )
        }


        <section className="proforma-page-header">

          <div className="page-heading">

            <div className="page-heading-icon">
              <FileText size={23} />
            </div>


            <div>

              <div className="page-eyebrow">
                SALES DOCUMENT
              </div>


              <h1>
                {selectedProforma.proforma_number}
              </h1>


              <p>
                {selectedProforma.company_name}
              </p>

            </div>

          </div>


          <div className="page-actions">

            <button
              type="button"
              className="secondary-button"
              disabled={
                documentBusy
              }
              onClick={
                () =>
                  void handlePrint()
              }
            >

              {
                documentBusy
                  ? (
                      <Loader2
                        size={17}
                        className="spin"
                      />
                    )
                  : (
                      <Printer size={17} />
                    )
              }

              Print

            </button>


            <button
              type="button"
              className="secondary-button"
              disabled={
                documentBusy
              }
              onClick={
                () =>
                  void handleDownload()
              }
            >

              {
                documentBusy
                  ? (
                      <Loader2
                        size={17}
                        className="spin"
                      />
                    )
                  : (
                      <Download size={17} />
                    )
              }

              Download PDF

            </button>


            {
              canEditProforma
              &&
              !editing
              &&
              !workflowLocked
              &&
              (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    () =>
                      setSearchParams({
                        edit:
                          "true",
                      })
                  }
                >

                  <Pencil size={17} />

                  Edit

                </button>
              )
            }


            {
              canDeleteProforma
              &&
              !deleteLocked
              &&
              (
                <button
                  type="button"
                  className="danger-outline-button"
                  onClick={
                    () =>
                      void handleDelete()
                  }
                  disabled={
                    deleting
                  }
                >

                  {
                    deleting
                      ? (
                          <Loader2
                            size={17}
                            className="spin"
                          />
                        )
                      : (
                          <Trash2 size={17} />
                        )
                  }

                  Delete

                </button>
              )
            }

          </div>

        </section>


        {
          !editing
            ? (
                <div className="proforma-workspace">

                  <div className="proforma-form">

                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>

                          <h2>
                            Business Origin
                          </h2>

                          <p>
                            Customer and Enquiry details inherited automatically.
                          </p>

                        </div>


                        <span
                          className={
                            `status-badge ${statusClass(
                              selectedProforma.status
                            )}`
                          }
                        >
                          {selectedProforma.status}
                        </span>

                      </div>


                      <div className="form-grid three">

                        <div>

                          <span className="record-secondary">
                            Enquiry
                          </span>

                          <strong>
                            {selectedEnquiry?.enquiry_number || "-"}
                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Proforma Date
                          </span>

                          <strong>
                            {formatDate(selectedProforma.proforma_date)}
                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Customer
                          </span>

                          <strong>
                            {selectedProforma.company_name}
                          </strong>

                        </div>

                      </div>

                    </section>


                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>
                          <h2>
                            Customer Details
                          </h2>
                        </div>

                      </div>


                      <div className="form-grid two">

                        <div>

                          <span className="record-secondary">
                            Contact
                          </span>

                          <strong>
                            {selectedProforma.contact_person || "-"}
                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Phone
                          </span>

                          <strong>
                            {selectedProforma.phone || "-"}
                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Email
                          </span>

                          <strong>
                            {selectedProforma.email || "-"}
                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            GSTIN
                          </span>

                          <strong>
                            {selectedEnquiry?.gst_number || "-"}
                          </strong>

                        </div>


                        <div className="span-two">

                          <span className="record-secondary">
                            Original Address
                          </span>

                          <strong>
                            {address || "-"}
                          </strong>

                        </div>

                      </div>

                    </section>


                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>
                          <h2>
                            Finished Product / Machine
                          </h2>
                        </div>

                      </div>


                      <div className="items-table-wrapper">

                        <table className="items-table">

                          <thead>

                            <tr>

                              <th>
                                Finished Product / Machine
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

                              <th>
                                Total
                              </th>

                            </tr>

                          </thead>


                          <tbody>

                            {
                              form.items.map(
                                (
                                  item,
                                  index
                                ) => {

                                  const calculated =
                                    calculateItem(
                                      item
                                    );


                                  return (
                                    <tr
                                      key={
                                        index
                                      }
                                    >

                                      <td>
                                        <strong>
                                          {item.description}
                                        </strong>
                                      </td>

                                      <td>
                                        {item.quantity}
                                      </td>

                                      <td>
                                        {item.unit}
                                      </td>

                                      <td>
                                        ₹{money(item.unit_price)}
                                      </td>

                                      <td>
                                        {item.discount_percent}%
                                      </td>

                                      <td>
                                        {item.tax_percent}%
                                      </td>

                                      <td>
                                        <strong>
                                          ₹{money(calculated.total)}
                                        </strong>
                                      </td>

                                    </tr>
                                  );

                                }
                              )
                            }

                          </tbody>

                        </table>

                      </div>

                    </section>


                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>
                          <h2>
                            Addresses
                          </h2>
                        </div>

                      </div>


                      <div className="form-grid two">

                        <div>

                          <span className="record-secondary">
                            Billing Address
                          </span>

                          <strong>
                            {selectedProforma.billing_address || "-"}
                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Shipping Address
                          </span>

                          <strong>
                            {selectedProforma.shipping_address || "-"}
                          </strong>

                        </div>

                      </div>

                    </section>


                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>
                          <h2>
                            Commercial Terms
                          </h2>
                        </div>

                      </div>


                      <div className="form-grid two">

                        <div>

                          <span className="record-secondary">
                            Validity
                          </span>

                          <strong>

                            {
                              selectedProforma.validity_days
                                ? `${selectedProforma.validity_days} days`
                                : "-"
                            }

                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Payment Terms
                          </span>

                          <strong>
                            {selectedProforma.payment_terms || "-"}
                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Delivery Terms
                          </span>

                          <strong>
                            {selectedProforma.delivery_terms || "-"}
                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Notes
                          </span>

                          <strong>
                            {selectedProforma.notes || "-"}
                          </strong>

                        </div>

                      </div>

                    </section>


                    {renderAdvanceCard()}

                  </div>


                  <aside className="proforma-summary">

                    <div className="summary-card">

                      <div className="summary-card-header">

                        <div>

                          <span>
                            DOCUMENT SUMMARY
                          </span>

                          <h3>
                            {selectedProforma.proforma_number}
                          </h3>

                        </div>


                        <CircleDollarSign size={21} />

                      </div>


                      <div className="summary-total">

                        <span>
                          Grand Total
                        </span>

                        <strong>
                          ₹{money(selectedProforma.grand_total)}
                        </strong>

                      </div>


                      <div className="summary-lines">

                        <div>

                          <span>
                            Subtotal
                          </span>

                          <strong>
                            ₹{money(selectedProforma.subtotal)}
                          </strong>

                        </div>


                        <div>

                          <span>
                            Discount
                          </span>

                          <strong>
                            − ₹{money(selectedProforma.discount_amount)}
                          </strong>

                        </div>


                        <div>

                          <span>
                            GST / Tax
                          </span>

                          <strong>
                            ₹{money(selectedProforma.tax_amount)}
                          </strong>

                        </div>

                      </div>


                      {
                        hasFinancialHistory
                        &&
                        (
                          <>

                            <div className="summary-divider" />


                            <div className="summary-lines">

                              <div>

                                <span>
                                  Advance Received
                                </span>

                                <strong
                                  style={{
                                    color:
                                      "#159a5b",
                                  }}
                                >
                                  ₹{money(grossAdvanceReceived)}
                                </strong>

                              </div>


                              <div>

                                <span>
                                  Refunded
                                </span>

                                <strong
                                  style={{
                                    color:
                                      "#c84655",
                                  }}
                                >
                                  ₹{money(advanceRefunded)}
                                </strong>

                              </div>


                              <div>

                                <span>
                                  Net Advance Held
                                </span>

                                <strong>
                                  ₹{money(netAdvanceHeld)}
                                </strong>

                              </div>


                              <div>

                                <span>
                                  Settlement
                                </span>

                                <strong>
                                  {advanceSummary?.settlement_status}
                                </strong>

                              </div>

                            </div>

                          </>
                        )
                      }

                    </div>


                    <div className="status-card">

                      <div className="status-card-title">

                        <span>
                          WORKFLOW STATUS
                        </span>

                        <CheckCircle2 size={17} />

                      </div>


                      {
                        workflowLocked
                        ||
                        !canChangeProformaStatus
                          ? (
                              <div
                                className={
                                  `status-badge ${statusClass(
                                    selectedProforma.status
                                  )}`
                                }
                              >
                                {selectedProforma.status}
                              </div>
                            )
                          : (
                              <select
                                value={
                                  selectedProforma.status
                                }
                                disabled={
                                  saving
                                }
                                onChange={
                                  event =>
                                    void handleStatusChange(
                                      event.target.value
                                    )
                                }
                              >

                                {
                                  statusOptions.map(
                                    option => (

                                      <option
                                        key={
                                          option
                                        }
                                        value={
                                          option
                                        }
                                      >
                                        {option}
                                      </option>

                                    )
                                  )
                                }

                              </select>
                            )
                      }


                      <p>

                        {
                          workflowLocked
                            ? (
                                "Production has started. "
                                +
                                "The Proforma is locked to protect "
                                +
                                "Production and billing traceability."
                              )
                            : normalizeStatus(
                                selectedProforma.status
                              )
                              ===
                              "cancelled"
                                ? (
                                    hasNetAdvance
                                      ? (
                                          "This order is cancelled and "
                                          +
                                          "customer advance is still held. "
                                          +
                                          "Use Refund Advance to settle it."
                                        )
                                      : (
                                          "This order is cancelled. "
                                          +
                                          "Any advance settlement history "
                                          +
                                          "remains preserved."
                                        )
                                  )
                                : (
                                    "Order Confirmed prepares the Proforma "
                                    +
                                    "for Production. It can still be edited "
                                    +
                                    "or reverted until Production starts."
                                  )
                        }

                      </p>

                    </div>

                  </aside>

                </div>
              )
            : (
                <div className="proforma-workspace">

                  <form
                    className="proforma-form"
                    onSubmit={
                      handleSave
                    }
                  >

                    {
                      formError
                      &&
                      (
                        <div className="proforma-alert error">
                          {formError}
                        </div>
                      )
                    }


                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>

                          <h2>
                            Business Origin
                          </h2>

                          <p>
                            Customer identity remains inherited from Enquiry.
                          </p>

                        </div>

                      </div>


                      <div className="form-grid three">

                        <div>

                          <span className="record-secondary">
                            Enquiry
                          </span>

                          <strong>
                            {selectedEnquiry?.enquiry_number || "-"}
                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Customer
                          </span>

                          <strong>
                            {selectedProforma.company_name}
                          </strong>

                        </div>


                        <label>

                          <span>
                            Proforma Date *
                          </span>

                          <input
                            type="date"
                            value={
                              form.proforma_date
                            }
                            onChange={
                              event =>
                                updateField(
                                  "proforma_date",
                                  event.target.value
                                )
                            }
                          />

                        </label>

                      </div>

                    </section>


                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>
                          <h2>
                            Addresses
                          </h2>
                        </div>

                      </div>


                      <div className="form-grid two">

                        <label>

                          <span>
                            Billing Address
                          </span>

                          <textarea
                            rows={3}
                            value={
                              form.billing_address
                              ||
                              ""
                            }
                            onChange={
                              event =>
                                updateField(
                                  "billing_address",
                                  event.target.value
                                )
                            }
                          />

                        </label>


                        <label>

                          <span>
                            Shipping Address
                          </span>

                          <textarea
                            rows={3}
                            value={
                              form.shipping_address
                              ||
                              ""
                            }
                            onChange={
                              event =>
                                updateField(
                                  "shipping_address",
                                  event.target.value
                                )
                            }
                          />

                        </label>

                      </div>

                    </section>


                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>
                          <h2>
                            Finished Product / Machine
                          </h2>
                        </div>


                        <button
                          type="button"
                          className="secondary-button"
                          onClick={
                            addItem
                          }
                        >

                          <Plus size={16} />

                          Add Item

                        </button>

                      </div>


                      <div className="items-table-wrapper">

                        <table className="items-table">

                          <thead>

                            <tr>

                              <th>
                                Finished Product / Machine
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

                              <th>
                                Total
                              </th>

                              <th />

                            </tr>

                          </thead>


                          <tbody>

                            {
                              form.items.map(
                                (
                                  item,
                                  index
                                ) => {

                                  const calculated =
                                    calculateItem(
                                      item
                                    );


                                  return (
                                    <tr
                                      key={
                                        index
                                      }
                                    >

                                      <td>

                                        <input
                                          value={
                                            item.description
                                          }
                                          onChange={
                                            event =>
                                              updateItem(
                                                index,
                                                "description",
                                                event.target.value
                                              )
                                          }
                                        />

                                      </td>


                                      <td>

                                        <input
                                          type="number"
                                          min="0.01"
                                          step="0.01"
                                          value={
                                            item.quantity
                                          }
                                          onChange={
                                            event =>
                                              updateItem(
                                                index,
                                                "quantity",
                                                Number(
                                                  event.target.value
                                                )
                                              )
                                          }
                                        />

                                      </td>


                                      <td>

                                        <input
                                          value={
                                            item.unit
                                          }
                                          onChange={
                                            event =>
                                              updateItem(
                                                index,
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
                                          value={
                                            item.unit_price
                                          }
                                          onChange={
                                            event =>
                                              updateItem(
                                                index,
                                                "unit_price",
                                                Number(
                                                  event.target.value
                                                )
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
                                          value={
                                            item.discount_percent
                                          }
                                          onChange={
                                            event =>
                                              updateItem(
                                                index,
                                                "discount_percent",
                                                Number(
                                                  event.target.value
                                                )
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
                                          value={
                                            item.tax_percent
                                          }
                                          onChange={
                                            event =>
                                              updateItem(
                                                index,
                                                "tax_percent",
                                                Number(
                                                  event.target.value
                                                )
                                              )
                                          }
                                        />

                                      </td>


                                      <td>
                                        ₹{money(calculated.total)}
                                      </td>


                                      <td>

                                        <button
                                          type="button"
                                          className="icon-danger-button"
                                          disabled={
                                            form.items.length
                                            ===
                                            1
                                          }
                                          onClick={
                                            () =>
                                              removeItem(
                                                index
                                              )
                                          }
                                        >

                                          <Trash2 size={15} />

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

                    </section>


                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>
                          <h2>
                            Commercial Terms
                          </h2>
                        </div>

                      </div>


                      {
                        hasNetAdvance
                        &&
                        (
                          <div
                            style={{
                              marginBottom:
                                "14px",

                              padding:
                                "11px 12px",

                              border:
                                "1px solid #f0dec5",

                              borderRadius:
                                "9px",

                              background:
                                "#fffbf5",

                              color:
                                "#9b621d",

                              fontSize:
                                "10px",
                            }}
                          >

                            Net customer advance still held:
                            {" ₹"}
                            {money(netAdvanceHeld)}.
                            The Proforma total cannot be reduced below this amount.

                          </div>
                        )
                      }


                      <div className="form-grid two">

                        <label>

                          <span>
                            Validity Days
                          </span>

                          <input
                            type="number"
                            min="1"
                            value={
                              form.validity_days
                              ??
                              ""
                            }
                            onChange={
                              event =>
                                updateField(
                                  "validity_days",
                                  event.target.value
                                    ? Number(
                                        event.target.value
                                      )
                                    : null
                                )
                            }
                          />

                        </label>


                        <label>

                          <span>
                            Payment Terms
                          </span>

                          <textarea
                            rows={3}
                            value={
                              form.payment_terms
                              ||
                              ""
                            }
                            onChange={
                              event =>
                                updateField(
                                  "payment_terms",
                                  event.target.value
                                )
                            }
                          />

                        </label>


                        <label>

                          <span>
                            Delivery Terms
                          </span>

                          <textarea
                            rows={3}
                            value={
                              form.delivery_terms
                              ||
                              ""
                            }
                            onChange={
                              event =>
                                updateField(
                                  "delivery_terms",
                                  event.target.value
                                )
                            }
                          />

                        </label>


                        <label>

                          <span>
                            Notes
                          </span>

                          <textarea
                            rows={3}
                            value={
                              form.notes
                              ||
                              ""
                            }
                            onChange={
                              event =>
                                updateField(
                                  "notes",
                                  event.target.value
                                )
                            }
                          />

                        </label>


                        <label className="span-two">

                          <span>
                            Terms & Conditions
                          </span>

                          <textarea
                            rows={4}
                            value={
                              form.terms_and_conditions
                              ||
                              ""
                            }
                            onChange={
                              event =>
                                updateField(
                                  "terms_and_conditions",
                                  event.target.value
                                )
                            }
                          />

                        </label>

                      </div>

                    </section>


                    <div className="form-bottom-bar">

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={
                          () => {

                            setForm(
                              formFromProforma(
                                selectedProforma
                              )
                            );


                            setSearchParams(
                              {}
                            );

                          }
                        }
                      >
                        Cancel
                      </button>


                      <button
                        type="submit"
                        className="primary-button"
                        disabled={
                          saving
                        }
                      >

                        {
                          saving
                            ? (
                                <Loader2
                                  size={16}
                                  className="spin"
                                />
                              )
                            : (
                                <Save
                                  size={16}
                                />
                              )
                        }

                        Save Changes

                      </button>

                    </div>

                  </form>


                  <aside className="proforma-summary">

                    <div className="summary-card">

                      <div className="summary-total">

                        <span>
                          Grand Total
                        </span>

                        <strong>
                          ₹{money(totals.total)}
                        </strong>

                      </div>


                      {
                        hasFinancialHistory
                        &&
                        (
                          <div className="summary-lines">

                            <div>

                              <span>
                                Advance Received
                              </span>

                              <strong>
                                ₹{money(grossAdvanceReceived)}
                              </strong>

                            </div>


                            <div>

                              <span>
                                Refunded
                              </span>

                              <strong>
                                ₹{money(advanceRefunded)}
                              </strong>

                            </div>


                            <div>

                              <span>
                                Net Advance Held
                              </span>

                              <strong>
                                ₹{money(netAdvanceHeld)}
                              </strong>

                            </div>

                          </div>
                        )
                      }

                    </div>

                  </aside>

                </div>
              )
        }


        {/* ======================================================
            ADVANCE MODAL
        ====================================================== */}

        {
          advanceModalOpen
          &&
          advanceSummary
          &&
          (
            <div
              style={{
                position:
                  "fixed",

                inset:
                  0,

                zIndex:
                  10000,

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                padding:
                  "24px",

                background:
                  "rgba(22,39,66,.58)",
              }}
            >

              <div
                style={{
                  width:
                    "100%",

                  maxWidth:
                    "660px",

                  background:
                    "#ffffff",

                  borderRadius:
                    "16px",

                  boxShadow:
                    "0 24px 70px rgba(15,34,64,.24)",
                }}
              >

                <div
                  style={{
                    display:
                      "flex",

                    justifyContent:
                      "space-between",

                    alignItems:
                      "flex-start",

                    gap:
                      "14px",

                    padding:
                      "20px",

                    borderBottom:
                      "1px solid #e8eef6",
                  }}
                >

                  <div>

                    <div className="page-eyebrow">
                      CUSTOMER PAYMENT
                    </div>

                    <h2>
                      Record Advance Payment
                    </h2>

                    <p className="record-secondary">

                      {selectedProforma.proforma_number}

                      {" • "}

                      {selectedProforma.company_name}

                    </p>

                  </div>


                  <button
                    type="button"
                    className="secondary-button"
                    onClick={
                      closeAdvanceModal
                    }
                    disabled={
                      advanceSaving
                    }
                  >
                    <X size={16} />
                  </button>

                </div>


                {
                  advanceError
                  &&
                  (
                    <div
                      className="proforma-alert error"
                      style={{
                        margin:
                          "16px 20px 0",
                      }}
                    >
                      {advanceError}
                    </div>
                  )
                }


                <div
                  className="form-grid two"
                  style={{
                    padding:
                      "20px",
                  }}
                >

                  <label>

                    <span>
                      Payment Date *
                    </span>

                    <input
                      type="datetime-local"
                      value={
                        advanceDate
                      }
                      onChange={
                        event =>
                          setAdvanceDate(
                            event.target.value
                          )
                      }
                    />

                  </label>


                  <label>

                    <span>
                      Advance Amount *
                    </span>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={
                        Number(
                          advanceSummary.balance_after_advance
                        )
                      }
                      value={
                        advanceAmount
                      }
                      onChange={
                        event =>
                          setAdvanceAmount(
                            event.target.value
                          )
                      }
                    />

                  </label>


                  <label>

                    <span>
                      Payment Mode
                    </span>

                    <select
                      value={
                        advanceMode
                      }
                      onChange={
                        event =>
                          setAdvanceMode(
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

                    <span>
                      Reference / UTR
                    </span>

                    <input
                      value={
                        advanceReference
                      }
                      onChange={
                        event =>
                          setAdvanceReference(
                            event.target.value
                          )
                      }
                    />

                  </label>


                  <label className="span-two">

                    <span>
                      Notes
                    </span>

                    <textarea
                      rows={3}
                      value={
                        advanceNotes
                      }
                      onChange={
                        event =>
                          setAdvanceNotes(
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

                    gap:
                      "10px",

                    padding:
                      "16px 20px",

                    borderTop:
                      "1px solid #e8eef6",

                    flexWrap:
                      "wrap",
                  }}
                >

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={
                      () =>
                        setAdvanceAmount(
                          String(
                            advanceSummary.balance_after_advance
                          )
                        )
                    }
                    disabled={
                      advanceSaving
                    }
                  >
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
                      className="secondary-button"
                      onClick={
                        closeAdvanceModal
                      }
                      disabled={
                        advanceSaving
                      }
                    >
                      Cancel
                    </button>


                    <button
                      type="button"
                      className="primary-button"
                      disabled={
                        advanceSaving
                      }
                      onClick={
                        () =>
                          void handleRecordAdvance()
                      }
                    >

                      {
                        advanceSaving
                          ? (
                              <Loader2
                                size={16}
                                className="spin"
                              />
                            )
                          : (
                              <WalletCards
                                size={16}
                              />
                            )
                      }

                      Record Advance

                    </button>

                  </div>

                </div>

              </div>

            </div>
          )
        }


        {/* ======================================================
            REFUND MODAL
        ====================================================== */}

        {
          refundModalOpen
          &&
          advanceSummary
          &&
          (
            <div
              style={{
                position:
                  "fixed",

                inset:
                  0,

                zIndex:
                  10000,

                display:
                  "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                padding:
                  "24px",

                background:
                  "rgba(22,39,66,.58)",
              }}
            >

              <div
                style={{
                  width:
                    "100%",

                  maxWidth:
                    "680px",

                  background:
                    "#ffffff",

                  borderRadius:
                    "16px",

                  boxShadow:
                    "0 24px 70px rgba(15,34,64,.24)",
                }}
              >

                <div
                  style={{
                    display:
                      "flex",

                    justifyContent:
                      "space-between",

                    alignItems:
                      "flex-start",

                    gap:
                      "14px",

                    padding:
                      "20px",

                    borderBottom:
                      "1px solid #e8eef6",
                  }}
                >

                  <div>

                    <div
                      style={{
                        color:
                          "#b94150",

                        fontSize:
                          "9px",

                        fontWeight:
                          800,

                        letterSpacing:
                          ".08em",
                      }}
                    >
                      CANCELLED ORDER SETTLEMENT
                    </div>


                    <h2
                      style={{
                        margin:
                          "5px 0 0",
                      }}
                    >
                      Refund Customer Advance
                    </h2>


                    <p className="record-secondary">

                      {selectedProforma.proforma_number}

                      {" • "}

                      {selectedProforma.company_name}

                    </p>

                  </div>


                  <button
                    type="button"
                    className="secondary-button"
                    onClick={
                      closeRefundModal
                    }
                    disabled={
                      refundSaving
                    }
                  >
                    <X size={16} />
                  </button>

                </div>


                {
                  refundError
                  &&
                  (
                    <div
                      className="proforma-alert error"
                      style={{
                        margin:
                          "16px 20px 0",
                      }}
                    >
                      {refundError}
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
                      "10px",

                    padding:
                      "18px 20px 0",
                  }}
                >

                  <div className="proforma-kpi">

                    <div>

                      <span>
                        Advance Received
                      </span>

                      <strong
                        style={{
                          color:
                            "#159a5b",
                        }}
                      >
                        ₹{money(advanceSummary.advance_received)}
                      </strong>

                    </div>

                  </div>


                  <div className="proforma-kpi">

                    <div>

                      <span>
                        Already Refunded
                      </span>

                      <strong
                        style={{
                          color:
                            "#c84655",
                        }}
                      >
                        ₹{money(advanceSummary.advance_refunded)}
                      </strong>

                    </div>

                  </div>


                  <div className="proforma-kpi">

                    <div>

                      <span>
                        Refundable Balance
                      </span>

                      <strong>
                        ₹{money(advanceSummary.net_advance_held)}
                      </strong>

                    </div>

                  </div>

                </div>


                <div
                  className="form-grid two"
                  style={{
                    padding:
                      "20px",
                  }}
                >

                  <label>

                    <span>
                      Refund Date *
                    </span>

                    <input
                      type="datetime-local"
                      value={
                        refundDate
                      }
                      onChange={
                        event =>
                          setRefundDate(
                            event.target.value
                          )
                      }
                    />

                  </label>


                  <label>

                    <span>
                      Refund Amount *
                    </span>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={
                        Number(
                          advanceSummary.net_advance_held
                        )
                      }
                      value={
                        refundAmount
                      }
                      onChange={
                        event =>
                          setRefundAmount(
                            event.target.value
                          )
                      }
                    />

                  </label>


                  <label>

                    <span>
                      Refund Mode
                    </span>

                    <select
                      value={
                        refundMode
                      }
                      onChange={
                        event =>
                          setRefundMode(
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

                    <span>
                      Reference / UTR
                    </span>

                    <input
                      value={
                        refundReference
                      }
                      onChange={
                        event =>
                          setRefundReference(
                            event.target.value
                          )
                      }
                    />

                  </label>


                  <label className="span-two">

                    <span>
                      Refund Notes
                    </span>

                    <textarea
                      rows={3}
                      value={
                        refundNotes
                      }
                      onChange={
                        event =>
                          setRefundNotes(
                            event.target.value
                          )
                      }
                      placeholder="Reason or settlement note"
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

                    gap:
                      "10px",

                    padding:
                      "16px 20px",

                    borderTop:
                      "1px solid #e8eef6",

                    flexWrap:
                      "wrap",
                  }}
                >

                  <button
                    type="button"
                    className="secondary-button"
                    disabled={
                      refundSaving
                    }
                    onClick={
                      () =>
                        setRefundAmount(
                          String(
                            advanceSummary.net_advance_held
                          )
                        )
                    }
                  >
                    Use Full Refundable Balance
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
                      className="secondary-button"
                      onClick={
                        closeRefundModal
                      }
                      disabled={
                        refundSaving
                      }
                    >
                      Cancel
                    </button>


                    <button
                      type="button"
                      className="danger-outline-button"
                      disabled={
                        refundSaving
                      }
                      onClick={
                        () =>
                          void handleRecordRefund()
                      }
                    >

                      {
                        refundSaving
                          ? (
                              <Loader2
                                size={16}
                                className="spin"
                              />
                            )
                          : (
                              <RefreshCw
                                size={16}
                              />
                            )
                      }

                      Record Refund

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


  /* ==============================================================
     LIST PAGE
  ============================================================== */

  return (
    <div className="proforma-page">

      <section className="proforma-page-header">

        <div className="page-heading">

          <div className="page-heading-icon">
            <FileText size={23} />
          </div>


          <div>

            <div className="page-eyebrow">
              SALES WORKFLOW
            </div>

            <h1>
              Proformas
            </h1>

            <p>
              Clear tracking from quotation through Production.
            </p>

          </div>

        </div>


        <div className="page-actions">

          <button
            type="button"
            className="secondary-button"
            onClick={
              () =>
                void loadProformas()
            }
          >

            <RefreshCw size={17} />

            Refresh

          </button>


          {
            canCreateProforma
            &&
            (
              <button
                type="button"
                className="primary-button"
                onClick={
                  () =>
                    navigate(
                      "/proformas/new"
                    )
                }
              >

                <FilePlus2 size={17} />

                New Proforma

              </button>
            )
          }

        </div>

      </section>


      <section className="proforma-kpi-grid">

        <div className="proforma-kpi">

          <div className="kpi-icon">
            <FileText size={19} />
          </div>

          <div>

            <span>
              Total
            </span>

            <strong>
              {proformas.length}
            </strong>

            <small>
              All Proformas
            </small>

          </div>

        </div>


        <div className="proforma-kpi">

          <div className="kpi-icon">
            <ClipboardList size={19} />
          </div>

          <div>

            <span>
              Sales / Awaiting Production
            </span>

            <strong>
              {salesTrackingProformas.length}
            </strong>

            <small>
              Draft, Sent, Order Confirmed
            </small>

          </div>

        </div>


        <div className="proforma-kpi">

          <div className="kpi-icon">
            <CheckCircle2 size={19} />
          </div>

          <div>

            <span>
              Production / Closed
            </span>

            <strong>
              {productionTrackingProformas.length}
            </strong>

            <small>
              Production and closed records
            </small>

          </div>

        </div>


        <div className="proforma-kpi highlight">

          <div className="kpi-icon">
            <CircleDollarSign size={19} />
          </div>

          <div>

            <span>
              Total Value
            </span>

            <strong>

              ₹
              {
                money(
                  proformas.reduce(
                    (
                      total,
                      item
                    ) =>
                      total
                      +
                      Number(
                        item.grand_total
                      ),
                    0
                  )
                )
              }

            </strong>

            <small>
              Recorded Proforma value
            </small>

          </div>

        </div>

      </section>


      <section className="filter-card">

        <div className="search-box">

          <Search size={18} />

          <input
            value={
              search
            }
            onChange={
              event =>
                setSearch(
                  event.target.value
                )
            }
            placeholder="Search Proforma, customer or finished product..."
          />

          {
            search
            &&
            (
              <button
                type="button"
                onClick={
                  () =>
                    setSearch(
                      ""
                    )
                }
              >
                <X size={16} />
              </button>
            )
          }

        </div>


        <select
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
            All Statuses
          </option>

          <option value="Draft">
            Draft
          </option>

          <option value="Sent">
            Sent
          </option>

          <option value="Order Confirmed">
            Order Confirmed
          </option>

          <option value="Production Started">
            Production Started
          </option>

          <option value="Production Completed">
            Production Completed
          </option>

          <option value="Rejected">
            Rejected
          </option>

          <option value="Cancelled">
            Cancelled
          </option>

        </select>

      </section>


      {
        error
        &&
        (
          <div className="proforma-alert error">
            {error}
          </div>
        )
      }


      {
        loading
          ? (
              <section className="table-card">

                <div className="table-state">

                  <Loader2
                    size={28}
                    className="spin"
                  />

                  <h3>
                    Loading Proformas...
                  </h3>

                </div>

              </section>
            )
          : (
              <>

                <section
                  className="table-card"
                  style={{
                    marginBottom:
                      "22px",
                  }}
                >

                  <div className="table-card-header">

                    <div>

                      <div
                        style={{
                          marginBottom:
                            "5px",

                          color:
                            "#3478ed",

                          fontSize:
                            "9px",

                          fontWeight:
                            800,

                          letterSpacing:
                            ".08em",
                        }}
                      >
                        ACTIVE SALES WORKFLOW
                      </div>


                      <h2>
                        Sales / Awaiting Production
                      </h2>


                      <p>
                        Draft, Sent and Order Confirmed Proformas.
                        Order Confirmed remains editable until
                        Production actually starts.
                      </p>

                    </div>


                    <span className="table-meta">

                      {
                        salesTrackingProformas.length
                      }{" "}
                      active

                    </span>

                  </div>


                  {
                    renderTrackingTable(
                      paginatedSalesProformas
                    )
                  }


                  {
                    salesTrackingProformas.length
                    >
                    0
                    &&
                    renderPagination(
                      salesPage,

                      salesTotalPages,

                      salesTrackingProformas.length,

                      () =>
                        setSalesPage(
                          current =>
                            Math.max(
                              1,
                              current - 1
                            )
                        ),

                      () =>
                        setSalesPage(
                          current =>
                            Math.min(
                              salesTotalPages,
                              current + 1
                            )
                        )
                    )
                  }

                </section>


                <section className="table-card">

                  <div className="table-card-header">

                    <div>

                      <div
                        style={{
                          marginBottom:
                            "5px",

                          color:
                            "#6c5ce7",

                          fontSize:
                            "9px",

                          fontWeight:
                            800,

                          letterSpacing:
                            ".08em",
                        }}
                      >
                        DOWNSTREAM WORKFLOW
                      </div>


                      <h2>
                        Production / Closed Proformas
                      </h2>


                      <p>
                        Production Started, Production Completed,
                        Rejected and Cancelled records are tracked
                        separately from active quotations.
                      </p>

                    </div>


                    <span className="table-meta">

                      {
                        productionTrackingProformas.length
                      }{" "}
                      records

                    </span>

                  </div>


                  {
                    renderTrackingTable(
                      paginatedProductionProformas
                    )
                  }


                  {
                    productionTrackingProformas.length
                    >
                    0
                    &&
                    renderPagination(
                      productionPage,

                      productionTotalPages,

                      productionTrackingProformas.length,

                      () =>
                        setProductionPage(
                          current =>
                            Math.max(
                              1,
                              current - 1
                            )
                        ),

                      () =>
                        setProductionPage(
                          current =>
                            Math.min(
                              productionTotalPages,
                              current + 1
                            )
                        )
                    )
                  }

                </section>

              </>
            )
      }

    </div>
  );

}