import {
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
  X,
} from "lucide-react";

import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  deleteProforma,
  getProformaById,
  getProformas,
  updateProforma,
  updateProformaStatus,
} from "../../services/proformaService";

import {
  getCompanyLogoBlob,
  getCompanySettings,
  getDocumentSettings,
} from "../../services/settingsService";

import type {
  Proforma,
  ProformaCreate,
  ProformaItemCreate,
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


/* ================================================================
   CONSTANTS
================================================================ */

const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";


const PAGE_SIZE =
  10;


const USER_STATUS_OPTIONS = [
  "Draft",
  "Sent",
  "Order Confirmed",
  "Rejected",
  "Cancelled",
];


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
    string
    | number
) {

  const amount =
    Number(
      value || 0
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
      === "string"
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
    || 0;


  const unitPrice =
    Number(
      item.unit_price
    )
    || 0;


  const discountPercent =
    Number(
      item.discount_percent
    )
    || 0;


  const taxPercent =
    Number(
      item.tax_percent
    )
    || 0;


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
    EnquiryLite
    | null
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
      || "",

    phone:
      proforma.phone
      || "",

    email:
      proforma.email
      || "",

    billing_address:
      proforma.billing_address
      || "",

    shipping_address:
      proforma.shipping_address
      || "",

    validity_days:
      proforma.validity_days,

    payment_terms:
      proforma.payment_terms
      || "",

    delivery_terms:
      proforma.delivery_terms
      || "",

    notes:
      proforma.notes
      || "",

    terms_and_conditions:
      proforma
        .terms_and_conditions
      || "",

    status:
      proforma.status,

    items:
      proforma.items.map(
        item => ({

          product_id:
            null,

          description:
            item.description
            || "",

          quantity:
            Number(
              item.quantity
            ),

          unit:
            item.unit
            || "Nos",

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
   PRINT / DOWNLOAD HELPERS
================================================================ */

function escapeHtml(
  value:
    unknown
) {

  return String(
    value ?? ""
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
  )
    .replace(
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


function buildProformaDocumentHtml(
  proforma:
    Proforma,

  enquiry:
    EnquiryLite
    | null,

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
      || 0
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
    enquiry
      ?.gst_number
    || "";


  const itemRows =
    proforma.items
      .map(
        (
          item,
          index
        ) => {

          return `
            <tr>
              <td class="center">${index + 1}</td>

              <td>
                ${htmlText(
                  item.description
                  || "-"
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
                  || "Nos"
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
            style="height: ${topSpace}mm;"
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
      .show_bank_details_on_proforma
      ? `
          <section class="bottom-block">

            <h3>
              Bank Details
            </h3>

            <div class="bank-grid">

              <div>
                <span>Account Name</span>
                <strong>
                  ${escapeHtml(
                    company.bank_account_name
                    || "-"
                  )}
                </strong>
              </div>

              <div>
                <span>Bank</span>
                <strong>
                  ${escapeHtml(
                    company.bank_name
                    || "-"
                  )}
                </strong>
              </div>

              <div>
                <span>Account Number</span>
                <strong>
                  ${escapeHtml(
                    company.bank_account_number
                    || "-"
                  )}
                </strong>
              </div>

              <div>
                <span>IFSC</span>
                <strong>
                  ${escapeHtml(
                    company.bank_ifsc_code
                    || "-"
                  )}
                </strong>
              </div>

              <div>
                <span>Branch</span>
                <strong>
                  ${escapeHtml(
                    company.bank_branch
                    || "-"
                  )}
                </strong>
              </div>

              <div>
                <span>UPI ID</span>
                <strong>
                  ${escapeHtml(
                    company.upi_id
                    || "-"
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
                  || "Authorized Signatory"
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

    .document-meta {
      min-width:
        220px;

      border:
        1px solid #cbd5e1;

      border-radius:
        5px;

      overflow:
        hidden;
    }

    .document-meta-row {
      display:
        grid;

      grid-template-columns:
        90px
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
        38mm;

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

      text-transform:
        uppercase;

      letter-spacing:
        0.08em;
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

      table-layout:
        fixed;
    }

    th {
      padding:
        6px;

      border:
        1px solid #cbd5e1;

      background:
        #eff6ff;

      color:
        #1e3a8a;

      font-size:
        8px;

      text-transform:
        uppercase;
    }

    td {
      padding:
        7px
        6px;

      border:
        1px solid #dbe3ed;

      vertical-align:
        top;
    }

    th:nth-child(1) {
      width:
        5%;
    }

    th:nth-child(2) {
      width:
        31%;
    }

    th:nth-child(3) {
      width:
        8%;
    }

    th:nth-child(4) {
      width:
        8%;
    }

    th:nth-child(5) {
      width:
        14%;
    }

    th:nth-child(6) {
      width:
        10%;
    }

    th:nth-child(7) {
      width:
        9%;
    }

    th:nth-child(8) {
      width:
        15%;
    }

    .right {
      text-align:
        right;
    }

    .center {
      text-align:
        center;
    }

    .totals-layout {
      display:
        grid;

      grid-template-columns:
        minmax(
          0,
          1fr
        )
        260px;

      gap:
        7mm;

      margin-top:
        5mm;
    }

    .terms-box {
      padding:
        4mm;

      border:
        1px solid #dbe3ed;

      border-radius:
        5px;
    }

    .terms-box h3 {
      margin:
        0 0 3mm;

      color:
        #1d4ed8;

      font-size:
        10px;
    }

    .terms-row {
      display:
        grid;

      grid-template-columns:
        100px
        1fr;

      gap:
        8px;

      margin-top:
        2mm;
    }

    .terms-row span {
      color:
        #64748b;
    }

    .totals-table td {
      padding:
        6px
        8px;
    }

    .totals-table td:first-child {
      color:
        #64748b;
    }

    .grand-total td {
      background:
        #eff6ff;

      color:
        #111827 !important;

      font-size:
        12px;

      font-weight:
        700;
    }

    .bottom-block {
      margin-top:
        6mm;

      padding:
        4mm;

      border:
        1px solid #dbe3ed;

      border-radius:
        5px;

      break-inside:
        avoid;
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

    .bank-grid > div {
      display:
        flex;

      flex-direction:
        column;

      gap:
        2px;
    }

    .bank-grid span {
      color:
        #64748b;

      font-size:
        8px;
    }

    .signature {
      display:
        grid;

      grid-template-columns:
        1fr
        65mm;

      margin-top:
        10mm;

      break-inside:
        avoid;
    }

    .signature-box {
      text-align:
        center;
    }

    .signature-space {
      height:
        18mm;
    }

    .signature-box strong,
    .signature-box span {
      display:
        block;

      margin-top:
        2px;
    }

    footer {
      margin-top:
        8mm;

      padding-top:
        3mm;

      border-top:
        1px solid #cbd5e1;

      color:
        #64748b;

      text-align:
        center;

      font-size:
        8px;
    }

    tr {
      page-break-inside:
        avoid;
    }

  </style>

</head>

<body>

  <main class="document">

    ${companyHeader}


    <section class="document-title-row">

      <div>

        <div
          style="
            color:#1d4ed8;
            font-size:8px;
            font-weight:700;
            letter-spacing:.1em;
            margin-bottom:4px;
          "
        >
          SALES DOCUMENT
        </div>

        <h2 class="document-title">
          PROFORMA INVOICE
        </h2>

      </div>


      <div class="document-meta">

        <div class="document-meta-row">

          <span>
            Proforma No.
          </span>

          <strong>
            ${escapeHtml(
              proforma.proforma_number
            )}
          </strong>

        </div>


        <div class="document-meta-row">

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


        <div class="document-meta-row">

          <span>
            Enquiry
          </span>

          <strong>
            ${escapeHtml(
              enquiry
                ?.enquiry_number
              || "-"
            )}
          </strong>

        </div>


        <div class="document-meta-row">

          <span>
            Validity
          </span>

          <strong>
            ${escapeHtml(
              proforma.validity_days
              ?? "-"
            )}
            ${
              proforma.validity_days
              ? " days"
              : ""
            }
          </strong>

        </div>

      </div>

    </section>


    <section class="party-grid">

      <div class="party-card">

        <h3>
          Bill To
        </h3>

        <div class="party-company">
          <strong>
            ${escapeHtml(
              proforma.company_name
            )}
          </strong>
        </div>

        ${
          proforma.contact_person
            ? `
                <div class="party-line">
                  Contact:
                  ${escapeHtml(
                    proforma.contact_person
                  )}
                </div>
              `
            : ""
        }

        ${
          proforma.billing_address
            ? `
                <div class="party-line">
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
                <div class="party-line">
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

        ${
          proforma.phone
            ? `
                <div class="party-line">
                  Phone:
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
                <div class="party-line">
                  Email:
                  ${escapeHtml(
                    proforma.email
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
              proforma.company_name
            )}
          </strong>
        </div>

        <div class="party-line">
          ${
            htmlText(
              proforma.shipping_address
              ||
              proforma.billing_address
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
          <th>#</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Unit Price</th>
          <th>Disc.</th>
          <th>GST</th>
          <th>Amount</th>
        </tr>

      </thead>

      <tbody>
        ${itemRows}
      </tbody>

    </table>


    <section class="totals-layout">

      <div class="terms-box">

        <h3>
          Commercial Terms
        </h3>

        <div class="terms-row">

          <span>
            Payment
          </span>

          <strong>
            ${htmlText(
              proforma.payment_terms
              || "-"
            )}
          </strong>

        </div>


        <div class="terms-row">

          <span>
            Delivery
          </span>

          <strong>
            ${htmlText(
              proforma.delivery_terms
              || "-"
            )}
          </strong>

        </div>


        ${
          proforma.notes
            ? `
                <div class="terms-row">

                  <span>
                    Notes
                  </span>

                  <strong>
                    ${htmlText(
                      proforma.notes
                    )}
                  </strong>

                </div>
              `
            : ""
        }


        ${
          proforma.terms_and_conditions
            ? `
                <div class="terms-row">

                  <span>
                    Terms
                  </span>

                  <strong>
                    ${htmlText(
                      proforma
                        .terms_and_conditions
                    )}
                  </strong>

                </div>
              `
            : ""
        }

      </div>


      <table class="totals-table">

        <tbody>

          <tr>

            <td>
              Subtotal
            </td>

            <td class="right">
              ₹${money(
                proforma.subtotal
              )}
            </td>

          </tr>


          <tr>

            <td>
              Discount
            </td>

            <td class="right">
              − ₹${money(
                proforma.discount_amount
              )}
            </td>

          </tr>


          <tr>

            <td>
              Taxable Amount
            </td>

            <td class="right">
              ₹${money(
                proforma.taxable_amount
              )}
            </td>

          </tr>


          <tr>

            <td>
              GST / Tax
            </td>

            <td class="right">
              ₹${money(
                proforma.tax_amount
              )}
            </td>

          </tr>


          <tr class="grand-total">

            <td>
              Grand Total
            </td>

            <td class="right">
              ₹${money(
                proforma.grand_total
              )}
            </td>

          </tr>

        </tbody>

      </table>

    </section>


    ${bankSection}

    ${signatureSection}

    ${footer}

  </main>

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


  /* ==============================================================
     PERMISSIONS
  ============================================================== */

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
     STATE
  ============================================================== */

  const [
    proformas,
    setProformas,
  ] =
    useState<
      Proforma[]
    >(
      []
    );


  const [
    selectedProforma,
    setSelectedProforma,
  ] =
    useState<
      Proforma
      | null
    >(
      null
    );


  const [
    selectedEnquiry,
    setSelectedEnquiry,
  ] =
    useState<
      EnquiryLite
      | null
    >(
      null
    );


  const [
    form,
    setForm,
  ] =
    useState<
      ProformaCreate
      | null
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
    page,
    setPage,
  ] =
    useState(
      1
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
     EDIT MODE
  ============================================================== */

  const editingRequested =
    searchParams.get(
      "edit"
    )
    ===
    "true";


  const editing =
    editingRequested
    &&
    canEditProforma;


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
        await getProformas({
          status:
            statusFilter
            ||
            undefined,
        });


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
     LOAD DETAILS
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


      const data =
        await getProformaById(
          proformaId
        );


      setSelectedProforma(
        data
      );


      setForm(
        formFromProforma(
          data
        )
      );


      if (
        data.enquiry_id
      ) {

        try {

          const response =
            await axios.get<
              EnquiryLite
            >(
              `${API_BASE_URL}/enquiries/${data.enquiry_id}`,
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

      } else {

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
      statusFilter,
    ]
  );


  /* ==============================================================
     FILTER + PAGINATION
  ============================================================== */

  const filteredProformas =
    useMemo(
      () => {

        const query =
          search
            .trim()
            .toLowerCase();


        if (!query) {
          return proformas;
        }


        return proformas.filter(
          proforma => {

            const firstItem =
              proforma.items[
                0
              ]?.description
              || "";


            return [
              proforma
                .proforma_number,

              proforma
                .company_name,

              proforma
                .contact_person,

              proforma.phone,

              proforma.email,

              firstItem,
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
      ]
    );


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredProformas.length
        /
        PAGE_SIZE
      )
    );


  const paginatedProformas =
    useMemo(
      () => {

        const start =
          (
            page
            -
            1
          )
          *
          PAGE_SIZE;


        return filteredProformas.slice(
          start,
          start
          +
          PAGE_SIZE
        );

      },
      [
        filteredProformas,
        page,
      ]
    );


  useEffect(
    () => {

      setPage(
        1
      );

    },
    [
      search,
      statusFilter,
    ]
  );


  useEffect(
    () => {

      if (
        page
        >
        totalPages
      ) {

        setPage(
          totalPages
        );

      }

    },
    [
      page,
      totalPages,
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


        let subtotal = 0;
        let discount = 0;
        let taxable = 0;
        let tax = 0;
        let total = 0;


        form.items.forEach(
          item => {

            const result =
              calculateItem(
                item
              );


            subtotal +=
              result.gross;

            discount +=
              result.discount;

            taxable +=
              result.taxable;

            tax +=
              result.tax;

            total +=
              result.total;

          }
        );


        return {
          subtotal,
          discount,
          taxable,
          tax,
          total,
        };

      },
      [
        form,
      ]
    );


  /* ==============================================================
     WORKFLOW LOCK
  ============================================================== */

  const workflowLocked =
    useMemo(
      () => {

        const status =
          (
            selectedProforma
              ?.status
            || ""
          )
            .trim()
            .toLowerCase();


        return [
          "order confirmed",
          "confirmed",
          "production started",
          "production completed",
          "final bill generated",
          "payment pending",
          "payment received",
          "completed",
        ].includes(
          status
        );

      },
      [
        selectedProforma,
      ]
    );


  /* ==============================================================
     FORM
  ============================================================== */

  function updateField<
    K extends keyof
      ProformaCreate
  >(
    field:
      K,

    value:
      ProformaCreate[K]
  ) {

    setForm(
      current => {

        if (!current) {
          return current;
        }


        return {
          ...current,

          [field]:
            value,
        };

      }
    );

  }


  function updateItem(
    index:
      number,

    field:
      keyof
        ProformaItemCreate,

    value:
      string
      |
      number
      |
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
                === index
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
      current => {

        if (!current) {
          return current;
        }


        return {
          ...current,

          items: [
            ...current.items,

            {
              ...EMPTY_ITEM,
            },
          ],
        };

      }
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
          === 1
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
                !== index
            ),
        };

      }
    );

  }


  function validateForm() {

    if (!form) {
      return (
        "Proforma data is not loaded."
      );
    }


    if (
      !form.proforma_date
    ) {
      return (
        "Proforma date is required."
      );
    }


    if (
      !form.items.length
    ) {
      return (
        "At least one item is required."
      );
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
          "Finished Product / Machine "
          +
          "name is required."
        );

      }


      if (
        Number(
          item.quantity
        )
        <= 0
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
        < 0
      ) {

        return (
          `Item ${index + 1}: `
          +
          "Unit price cannot be negative."
        );

      }


      if (
        Number(
          item.discount_percent
        )
        < 0
        ||
        Number(
          item.discount_percent
        )
        > 100
      ) {

        return (
          `Item ${index + 1}: `
          +
          "Discount must be between 0 and 100."
        );

      }


      if (
        Number(
          item.tax_percent
        )
        < 0
        ||
        Number(
          item.tax_percent
        )
        > 100
      ) {

        return (
          `Item ${index + 1}: `
          +
          "GST must be between 0 and 100."
        );

      }

    }


    return "";

  }


  /* ==============================================================
     SAVE
  ============================================================== */

  async function handleSave(
    event:
      React.FormEvent
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
      !canEditProforma
    ) {

      setFormError(
        "You do not have permission to edit Proformas."
      );

      return;

    }


    if (
      workflowLocked
    ) {

      setFormError(
        "This Proforma has already entered "
        +
        "the confirmed production workflow "
        +
        "and can no longer be edited."
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


      const payload:
        ProformaCreate = {

        ...form,

        enquiry_id:
          selectedProforma
            .enquiry_id,

        customer_id:
          selectedProforma
            .customer_id,

        company_name:
          selectedProforma
            .company_name,

        contact_person:
          selectedProforma
            .contact_person,

        phone:
          selectedProforma
            .phone,

        email:
          selectedProforma
            .email,

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
                  || "Nos"
                )
                  .trim(),

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


      const updated =
        await updateProforma(
          selectedProforma.id,
          payload
        );


      setSelectedProforma(
        updated
      );


      setForm(
        formFromProforma(
          updated
        )
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


    const normalizedStatus =
      (
        newStatus
        || ""
      )
        .trim()
        .toLowerCase();


    const currentStatus =
      (
        selectedProforma
          .status
        || ""
      )
        .trim()
        .toLowerCase();


    if (
      normalizedStatus
      !== currentStatus
    ) {

      if (
        [
          "confirmed",
          "order confirmed",
        ].includes(
          normalizedStatus
        )
        &&
        !canConfirmProforma
      ) {

        setError(
          "You do not have permission to confirm Proformas."
        );

        return;

      }


      if (
        normalizedStatus
        === "cancelled"
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
          "confirmed",
          "order confirmed",
          "cancelled",
        ].includes(
          normalizedStatus
        )
        &&
        !canEditProforma
      ) {

        setError(
          "You do not have permission to change Proforma status."
        );

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
      !canDeleteProforma
    ) {

      setError(
        "You do not have permission to delete Proformas."
      );

      return;

    }


    if (
      workflowLocked
    ) {

      setError(
        "A confirmed/production Proforma cannot be deleted."
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Delete ${selectedProforma.proforma_number}? `
        +
        "This action cannot be undone."
      );


    if (!confirmed) {
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
      string | null =
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
  ============================================================== */

  async function handlePrint() {

    if (
      !selectedProforma
    ) {
      return;
    }


    /*
     * Open immediately before awaiting API calls.
     * This prevents browsers from blocking the new window.
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
        === "complete"
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
     DOWNLOAD

     Downloads a Word-compatible document.
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
        `${selectedProforma.proforma_number}.doc`;


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
     DETAILS PAGE
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


    const addressFromEnquiry =
      buildAddress(
        selectedEnquiry
      );


    const currentStatusNormalized =
      (
        selectedProforma
          .status
        || ""
      )
        .trim()
        .toLowerCase();


    const permittedStatusOptions =
      USER_STATUS_OPTIONS.filter(
        statusOption => {

          const normalizedStatus =
            statusOption
              .trim()
              .toLowerCase();


          if (
            normalizedStatus
            === currentStatusNormalized
          ) {
            return true;
          }


          if (
            [
              "confirmed",
              "order confirmed",
            ].includes(
              normalizedStatus
            )
          ) {
            return canConfirmProforma;
          }


          if (
            normalizedStatus
            === "cancelled"
          ) {
            return canCancelProforma;
          }


          return canEditProforma;

        }
      );


    const currentStatusOptions =
      Array.from(
        new Set([
          selectedProforma.status,
          ...permittedStatusOptions,
        ])
      );


    return (
      <div className="proforma-page">

        {/* ======================================================
            BREADCRUMB
        ====================================================== */}

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

            {
              selectedProforma
                .proforma_number
            }

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

                <X
                  size={16}
                />

              </button>

            </div>
          )
        }


        {/* ======================================================
            HEADER
        ====================================================== */}

        <section className="proforma-page-header">

          <div className="page-heading">

            <div className="page-heading-icon">

              <FileText
                size={23}
              />

            </div>


            <div>

              <div className="page-eyebrow">
                SALES DOCUMENT
              </div>


              <h1>

                {
                  selectedProforma
                    .proforma_number
                }

              </h1>


              <p>

                {
                  selectedProforma
                    .company_name
                }


                {
                  form.items[
                    0
                  ]?.description
                    ? (
                        <>
                          {" • "}

                          {
                            form.items[
                              0
                            ].description
                          }

                        </>
                      )
                    : null
                }

              </p>

            </div>

          </div>


          <div className="page-actions">

            <button
              type="button"
              className="secondary-button"
              onClick={
                () =>
                  void handlePrint()
              }
              disabled={
                documentBusy
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
                      <Printer
                        size={17}
                      />
                    )
              }

              Print

            </button>


            <button
              type="button"
              className="secondary-button"
              onClick={
                () =>
                  void handleDownload()
              }
              disabled={
                documentBusy
              }
            >

              <Download
                size={17}
              />

              Download

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

                  <Pencil
                    size={17}
                  />

                  Edit

                </button>
              )
            }


            {
              canDeleteProforma
              &&
              !workflowLocked
              &&
              (
                <button
                  type="button"
                  className="danger-outline-button"
                  onClick={
                    handleDelete
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
                          <Trash2
                            size={17}
                          />
                        )
                  }

                  Delete

                </button>
              )
            }

          </div>

        </section>


        {/* ======================================================
            VIEW MODE
        ====================================================== */}

        {
          !editing
            ? (
                <div className="proforma-workspace">

                  <div className="proforma-form">

                    {/* ==========================================
                        BUSINESS ORIGIN
                    =========================================== */}

                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>

                          <h2>
                            Business Origin
                          </h2>


                          <p>
                            Customer and Enquiry details
                            inherited automatically.
                          </p>

                        </div>


                        <span
                          className={
                            `status-badge ${statusClass(
                              selectedProforma.status
                            )}`
                          }
                        >

                          {
                            selectedProforma
                              .status
                          }

                        </span>

                      </div>


                      <div className="form-grid three">

                        <div>

                          <span className="record-secondary">
                            Enquiry
                          </span>


                          <strong>

                            {
                              selectedEnquiry
                                ?.enquiry_number
                              ||
                              "Linked Enquiry"
                            }

                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Proforma Date
                          </span>


                          <strong>

                            {
                              formatDate(
                                selectedProforma
                                  .proforma_date
                              )
                            }

                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Customer
                          </span>


                          <strong>

                            {
                              selectedProforma
                                .company_name
                            }

                          </strong>

                        </div>

                      </div>

                    </section>


                    {/* ==========================================
                        CUSTOMER DETAILS
                    =========================================== */}

                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>

                          <h2>
                            Customer Details
                          </h2>


                          <p>
                            Captured from the original Enquiry.
                          </p>

                        </div>

                      </div>


                      <div className="form-grid two">

                        <div>

                          <span className="record-secondary">
                            Company
                          </span>


                          <strong>

                            {
                              selectedProforma
                                .company_name
                            }

                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Contact Person
                          </span>


                          <strong>

                            {
                              selectedProforma
                                .contact_person
                              || "-"
                            }

                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Phone
                          </span>


                          <strong>

                            {
                              selectedProforma
                                .phone
                              || "-"
                            }

                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Email
                          </span>


                          <strong>

                            {
                              selectedProforma
                                .email
                              || "-"
                            }

                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            GSTIN
                          </span>


                          <strong>

                            {
                              selectedEnquiry
                                ?.gst_number
                              || "-"
                            }

                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Enquiry Address
                          </span>


                          <strong>

                            {
                              addressFromEnquiry
                              || "-"
                            }

                          </strong>

                        </div>

                      </div>

                    </section>


                    {/* ==========================================
                        FINISHED PRODUCT / MACHINE
                    =========================================== */}

                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>

                          <h2>
                            Finished Product / Machine
                          </h2>


                          <p>
                            Manufactured output quoted
                            to the customer.
                          </p>

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

                                          {
                                            item
                                              .description
                                          }

                                        </strong>

                                      </td>


                                      <td>
                                        {item.quantity}
                                      </td>


                                      <td>

                                        {
                                          item.unit
                                          || "Nos"
                                        }

                                      </td>


                                      <td>

                                        ₹
                                        {
                                          money(
                                            item.unit_price
                                          )
                                        }

                                      </td>


                                      <td>

                                        {
                                          item
                                            .discount_percent
                                        }
                                        %

                                      </td>


                                      <td>

                                        {
                                          item
                                            .tax_percent
                                        }
                                        %

                                      </td>


                                      <td>

                                        <strong className="amount">

                                          ₹
                                          {
                                            money(
                                              calculated
                                                .total
                                            )
                                          }

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


                    {/* ==========================================
                        ADDRESSES
                    =========================================== */}

                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>

                          <h2>
                            Document Addresses
                          </h2>

                        </div>

                      </div>


                      <div className="form-grid two">

                        <div>

                          <span className="record-secondary">
                            Billing Address
                          </span>


                          <strong>

                            {
                              selectedProforma
                                .billing_address
                              || "-"
                            }

                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Shipping Address
                          </span>


                          <strong>

                            {
                              selectedProforma
                                .shipping_address
                              || "-"
                            }

                          </strong>

                        </div>

                      </div>

                    </section>


                    {/* ==========================================
                        COMMERCIAL TERMS
                    =========================================== */}

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
                              selectedProforma
                                .validity_days
                              ?? "-"
                            }

                            {
                              selectedProforma
                                .validity_days
                                ? " days"
                                : ""
                            }

                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Payment Terms
                          </span>


                          <strong>

                            {
                              selectedProforma
                                .payment_terms
                              || "-"
                            }

                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Delivery Terms
                          </span>


                          <strong>

                            {
                              selectedProforma
                                .delivery_terms
                              || "-"
                            }

                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Notes
                          </span>


                          <strong>

                            {
                              selectedProforma
                                .notes
                              || "-"
                            }

                          </strong>

                        </div>


                        <div className="span-two">

                          <span className="record-secondary">
                            Terms & Conditions
                          </span>


                          <strong>

                            {
                              selectedProforma
                                .terms_and_conditions
                              || "-"
                            }

                          </strong>

                        </div>

                      </div>

                    </section>

                  </div>


                  {/* ==============================================
                      SUMMARY
                  ============================================== */}

                  <aside className="proforma-summary">

                    <div className="summary-card">

                      <div className="summary-card-header">

                        <div>

                          <span>
                            DOCUMENT SUMMARY
                          </span>


                          <h3>

                            {
                              selectedProforma
                                .proforma_number
                            }

                          </h3>

                        </div>


                        <CircleDollarSign
                          size={21}
                        />

                      </div>


                      <div className="summary-total">

                        <span>
                          Grand Total
                        </span>


                        <strong>

                          ₹
                          {
                            money(
                              selectedProforma
                                .grand_total
                            )
                          }

                        </strong>

                      </div>


                      <div className="summary-lines">

                        <div>

                          <span>
                            Subtotal
                          </span>


                          <strong>

                            ₹
                            {
                              money(
                                selectedProforma
                                  .subtotal
                              )
                            }

                          </strong>

                        </div>


                        <div>

                          <span>
                            Discount
                          </span>


                          <strong>

                            − ₹
                            {
                              money(
                                selectedProforma
                                  .discount_amount
                              )
                            }

                          </strong>

                        </div>


                        <div>

                          <span>
                            Taxable Amount
                          </span>


                          <strong>

                            ₹
                            {
                              money(
                                selectedProforma
                                  .taxable_amount
                              )
                            }

                          </strong>

                        </div>


                        <div>

                          <span>
                            GST / Tax
                          </span>


                          <strong>

                            ₹
                            {
                              money(
                                selectedProforma
                                  .tax_amount
                              )
                            }

                          </strong>

                        </div>

                      </div>

                    </div>


                    <div className="status-card">

                      <div className="status-card-title">

                        <span>
                          WORKFLOW STATUS
                        </span>


                        <CheckCircle2
                          size={17}
                        />

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

                                {
                                  selectedProforma
                                    .status
                                }

                              </div>
                            )
                          : (
                              <select
                                value={
                                  selectedProforma
                                    .status
                                }
                                onChange={
                                  event =>
                                    void handleStatusChange(
                                      event
                                        .target
                                        .value
                                    )
                                }
                                disabled={
                                  saving
                                }
                              >

                                {
                                  currentStatusOptions.map(
                                    statusValue => (

                                      <option
                                        key={
                                          statusValue
                                        }
                                        value={
                                          statusValue
                                        }
                                      >

                                        {
                                          statusValue
                                        }

                                      </option>

                                    )
                                  )
                                }

                              </select>
                            )
                      }


                      <p>
                        Order Confirmed moves the
                        Enquiry into the production workflow.
                      </p>

                    </div>

                  </aside>

                </div>
              )
            : (
                /* ==================================================
                   EDIT MODE
                ================================================== */

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

                          <span>
                            {formError}
                          </span>

                        </div>
                      )
                    }


                    {/* ==========================================
                        BUSINESS ORIGIN
                    =========================================== */}

                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>

                          <h2>
                            Business Origin
                          </h2>


                          <p>
                            Customer identity is inherited
                            from Enquiry and cannot be changed here.
                          </p>

                        </div>

                      </div>


                      <div className="form-grid three">

                        <div>

                          <span className="record-secondary">
                            Enquiry
                          </span>


                          <strong>

                            {
                              selectedEnquiry
                                ?.enquiry_number
                              ||
                              "Linked Enquiry"
                            }

                          </strong>

                        </div>


                        <div>

                          <span className="record-secondary">
                            Customer
                          </span>


                          <strong>

                            {
                              selectedProforma
                                .company_name
                            }

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
                                  event
                                    .target
                                    .value
                                )
                            }
                          />

                        </label>

                      </div>

                    </section>


                    {/* ==========================================
                        ADDRESSES
                    =========================================== */}

                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>

                          <h2>
                            Document Addresses
                          </h2>


                          <p>
                            Defaulted from Enquiry but
                            editable for this quotation.
                          </p>

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
                              || ""
                            }
                            onChange={
                              event =>
                                updateField(
                                  "billing_address",
                                  event
                                    .target
                                    .value
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
                              || ""
                            }
                            onChange={
                              event =>
                                updateField(
                                  "shipping_address",
                                  event
                                    .target
                                    .value
                                )
                            }
                          />

                        </label>

                      </div>

                    </section>


                    {/* ==========================================
                        ITEMS
                    =========================================== */}

                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>

                          <h2>
                            Finished Product / Machine
                          </h2>


                          <p>
                            Enter the manufactured output.
                            No purchased Product ID is used.
                          </p>

                        </div>


                        <button
                          type="button"
                          className="secondary-button"
                          onClick={
                            addItem
                          }
                        >

                          <Plus
                            size={17}
                          />

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
                                          type="text"
                                          value={
                                            item.description
                                          }
                                          onChange={
                                            event =>
                                              updateItem(
                                                index,
                                                "description",
                                                event
                                                  .target
                                                  .value
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
                                                  event
                                                    .target
                                                    .value
                                                )
                                              )
                                          }
                                        />

                                      </td>


                                      <td>

                                        <input
                                          type="text"
                                          value={
                                            item.unit
                                          }
                                          onChange={
                                            event =>
                                              updateItem(
                                                index,
                                                "unit",
                                                event
                                                  .target
                                                  .value
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
                                            Number(
                                              item.unit_price
                                            )
                                            === 0
                                              ? ""
                                              : item
                                                  .unit_price
                                          }
                                          onChange={
                                            event =>
                                              updateItem(
                                                index,
                                                "unit_price",
                                                Number(
                                                  event
                                                    .target
                                                    .value
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
                                            Number(
                                              item
                                                .discount_percent
                                            )
                                            === 0
                                              ? ""
                                              : item
                                                  .discount_percent
                                          }
                                          onChange={
                                            event =>
                                              updateItem(
                                                index,
                                                "discount_percent",
                                                Number(
                                                  event
                                                    .target
                                                    .value
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
                                                  event
                                                    .target
                                                    .value
                                                )
                                              )
                                          }
                                        />

                                      </td>


                                      <td>

                                        <strong className="amount">

                                          ₹
                                          {
                                            money(
                                              calculated.total
                                            )
                                          }

                                        </strong>

                                      </td>


                                      <td>

                                        <button
                                          type="button"
                                          className="icon-danger-button"
                                          disabled={
                                            form.items.length
                                            === 1
                                          }
                                          onClick={
                                            () =>
                                              removeItem(
                                                index
                                              )
                                          }
                                        >

                                          <Trash2
                                            size={15}
                                          />

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


                    {/* ==========================================
                        COMMERCIAL TERMS
                    =========================================== */}

                    <section className="form-card">

                      <div className="form-card-heading">

                        <div>

                          <h2>
                            Commercial Terms
                          </h2>

                        </div>

                      </div>


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
                              ?? ""
                            }
                            onChange={
                              event =>
                                updateField(
                                  "validity_days",
                                  event
                                    .target
                                    .value
                                    ? Number(
                                        event
                                          .target
                                          .value
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
                              || ""
                            }
                            onChange={
                              event =>
                                updateField(
                                  "payment_terms",
                                  event
                                    .target
                                    .value
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
                              || ""
                            }
                            onChange={
                              event =>
                                updateField(
                                  "delivery_terms",
                                  event
                                    .target
                                    .value
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
                              || ""
                            }
                            onChange={
                              event =>
                                updateField(
                                  "notes",
                                  event
                                    .target
                                    .value
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
                              form
                                .terms_and_conditions
                              || ""
                            }
                            onChange={
                              event =>
                                updateField(
                                  "terms_and_conditions",
                                  event
                                    .target
                                    .value
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
                        disabled={
                          saving
                        }
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
                                  size={17}
                                  className="spin"
                                />
                              )
                            : (
                                <Save
                                  size={17}
                                />
                              )
                        }

                        {
                          saving
                            ? "Saving..."
                            : "Save Changes"
                        }

                      </button>

                    </div>

                  </form>


                  <aside className="proforma-summary">

                    <div className="summary-card">

                      <div className="summary-card-header">

                        <div>

                          <span>
                            DOCUMENT SUMMARY
                          </span>


                          <h3>

                            {
                              selectedProforma
                                .proforma_number
                            }

                          </h3>

                        </div>


                        <CircleDollarSign
                          size={21}
                        />

                      </div>


                      <div className="summary-total">

                        <span>
                          Grand Total
                        </span>


                        <strong>

                          ₹
                          {
                            money(
                              totals.total
                            )
                          }

                        </strong>

                      </div>


                      <div className="summary-lines">

                        <div>

                          <span>
                            Subtotal
                          </span>


                          <strong>

                            ₹
                            {
                              money(
                                totals.subtotal
                              )
                            }

                          </strong>

                        </div>


                        <div>

                          <span>
                            Discount
                          </span>


                          <strong>

                            − ₹
                            {
                              money(
                                totals.discount
                              )
                            }

                          </strong>

                        </div>


                        <div>

                          <span>
                            Taxable Amount
                          </span>


                          <strong>

                            ₹
                            {
                              money(
                                totals.taxable
                              )
                            }

                          </strong>

                        </div>


                        <div>

                          <span>
                            GST / Tax
                          </span>


                          <strong>

                            ₹
                            {
                              money(
                                totals.tax
                              )
                            }

                          </strong>

                        </div>

                      </div>

                    </div>

                  </aside>

                </div>
              )
        }

      </div>
    );

  }


  /* ==============================================================
     LIST PAGE
  ============================================================== */

  const firstRecord =
    filteredProformas.length
      ? (
          (
            page
            -
            1
          )
          *
          PAGE_SIZE
        )
        +
        1
      : 0;


  const lastRecord =
    Math.min(
      page
      *
      PAGE_SIZE,

      filteredProformas.length
    );


  return (
    <div className="proforma-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <section className="proforma-page-header">

        <div className="page-heading">

          <div className="page-heading-icon">

            <FileText
              size={23}
            />

          </div>


          <div>

            <div className="page-eyebrow">
              SALES WORKFLOW
            </div>


            <h1>
              Proformas
            </h1>


            <p>
              Create, manage and track
              customer quotations.
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
            disabled={
              loading
            }
          >

            <RefreshCw
              size={17}
              className={
                loading
                  ? "spin"
                  : ""
              }
            />

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

                <FilePlus2
                  size={18}
                />

                New Proforma

              </button>
            )
          }

        </div>

      </section>


      {/* ======================================================
          KPI
      ====================================================== */}

      <section className="proforma-kpi-grid">

        <div className="proforma-kpi">

          <div className="kpi-icon">

            <FileText
              size={19}
            />

          </div>


          <div>

            <span>
              Total Proformas
            </span>


            <strong>
              {proformas.length}
            </strong>


            <small>
              All recorded documents
            </small>

          </div>

        </div>


        <div className="proforma-kpi">

          <div className="kpi-icon">

            <ClipboardList
              size={19}
            />

          </div>


          <div>

            <span>
              Drafts
            </span>


            <strong>

              {
                proformas.filter(
                  item =>
                    item.status
                    === "Draft"
                ).length
              }

            </strong>


            <small>
              Still being prepared
            </small>

          </div>

        </div>


        <div className="proforma-kpi">

          <div className="kpi-icon">

            <CheckCircle2
              size={19}
            />

          </div>


          <div>

            <span>
              Order Confirmed
            </span>


            <strong>

              {
                proformas.filter(
                  item =>
                    [
                      "Confirmed",
                      "Order Confirmed",
                      "Production Started",
                      "Production Completed",
                    ].includes(
                      item.status
                    )
                ).length
              }

            </strong>


            <small>
              Accepted customer orders
            </small>

          </div>

        </div>


        <div className="proforma-kpi highlight">

          <div className="kpi-icon">

            <CircleDollarSign
              size={19}
            />

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
              Current records
            </small>

          </div>

        </div>

      </section>


      {/* ======================================================
          FILTER
      ====================================================== */}

      <section className="filter-card">

        <div className="search-box">

          <Search
            size={18}
          />


          <input
            value={
              search
            }
            onChange={
              event =>
                setSearch(
                  event
                    .target
                    .value
                )
            }
            placeholder="Search proforma, customer or finished product..."
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

                <X
                  size={16}
                />

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
                event
                  .target
                  .value
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

              <X
                size={16}
              />

            </button>

          </div>
        )
      }


      {/* ======================================================
          TABLE
      ====================================================== */}

      <section className="table-card">

        <div className="table-card-header">

          <div>

            <h2>
              Proforma Records
            </h2>


            <p>

              {
                filteredProformas.length
              }

              {" records shown"}

            </p>

          </div>


          <span className="table-meta">
            Enquiry → Proforma
          </span>

        </div>


        {
          loading
            ? (
                <div className="table-state">

                  <Loader2
                    size={28}
                    className="spin"
                  />


                  <h3>
                    Loading Proformas...
                  </h3>

                </div>
              )
            : filteredProformas.length
              === 0
                ? (
                    <div className="table-state">

                      <div className="empty-state-icon">

                        <FileText
                          size={27}
                        />

                      </div>


                      <h3>
                        No Proformas found
                      </h3>


                      <p>
                        Try changing the search or status filter.
                      </p>

                    </div>
                  )
                : (
                    <>

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
                              paginatedProformas.map(
                                proforma => {

                                  const firstItem =
                                    proforma.items[
                                      0
                                    ]?.description
                                    || "-";


                                  const recordLocked =
                                    [
                                      "Order Confirmed",
                                      "Confirmed",
                                      "Production Started",
                                      "Production Completed",
                                      "Final Bill Generated",
                                      "Payment Pending",
                                      "Payment Received",
                                      "Completed",
                                    ].includes(
                                      proforma.status
                                    );


                                  return (
                                    <tr
                                      key={
                                        proforma.id
                                      }
                                    >

                                      <td>

                                        <div className="record-primary">

                                          {
                                            proforma
                                              .proforma_number
                                          }

                                        </div>

                                      </td>


                                      <td>

                                        {
                                          formatDate(
                                            proforma
                                              .proforma_date
                                          )
                                        }

                                      </td>


                                      <td>

                                        <div className="customer-name">

                                          {
                                            proforma
                                              .company_name
                                          }

                                        </div>


                                        {
                                          proforma
                                            .contact_person
                                          &&
                                          (
                                            <div className="record-secondary">

                                              {
                                                proforma
                                                  .contact_person
                                              }

                                            </div>
                                          )
                                        }

                                      </td>


                                      <td>

                                        <div className="record-primary">

                                          {
                                            firstItem
                                          }

                                        </div>


                                        {
                                          proforma.items.length
                                          > 1
                                          &&
                                          (
                                            <div className="record-secondary">

                                              +
                                              {
                                                proforma
                                                  .items
                                                  .length
                                                -
                                                1
                                              }

                                              {" more"}

                                            </div>
                                          )
                                        }

                                      </td>


                                      <td>

                                        {
                                          proforma
                                            .items
                                            .length
                                        }

                                      </td>


                                      <td>

                                        <strong className="amount">

                                          ₹
                                          {
                                            money(
                                              proforma
                                                .grand_total
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

                                          {
                                            proforma
                                              .status
                                          }

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


                                          {
                                            canEditProforma
                                            &&
                                            !recordLocked
                                            &&
                                            (
                                              <button
                                                type="button"
                                                title="Edit"
                                                onClick={
                                                  () =>
                                                    navigate(
                                                      `/proformas/${proforma.id}?edit=true`
                                                    )
                                                }
                                              >

                                                <Pencil
                                                  size={16}
                                                />

                                              </button>
                                            )
                                          }

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


                      {/* ==========================================
                          PAGINATION
                      =========================================== */}

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
                            "16px 18px",

                          borderTop:
                            "1px solid #edf1f5",
                        }}
                      >

                        <div className="record-secondary">

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
                            {
                              filteredProformas
                                .length
                            }
                          </strong>

                          {" records"}

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
                            className="secondary-button"
                            disabled={
                              page
                              <= 1
                            }
                            onClick={
                              () =>
                                setPage(
                                  current =>
                                    Math.max(
                                      1,
                                      current
                                      -
                                      1
                                    )
                                )
                            }
                          >

                            Previous

                          </button>


                          <span className="record-secondary">

                            Page{" "}

                            <strong>
                              {page}
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
                              page
                              >= totalPages
                            }
                            onClick={
                              () =>
                                setPage(
                                  current =>
                                    Math.min(
                                      totalPages,
                                      current
                                      +
                                      1
                                    )
                                )
                            }
                          >

                            Next

                          </button>

                        </div>

                      </div>

                    </>
                  )
        }

      </section>

    </div>
  );
}