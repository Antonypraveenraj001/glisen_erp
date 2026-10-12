import type { InternationalBill } from "../../types/internationalBill";

// Escape all user-provided text before inserting it into the print/PDF HTML.
function html(value: string | number | null | undefined) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] || char);
}

function lines(value: string | null | undefined) {
  return html(value).replace(/\r?\n/g, "<br>");
}

function amount(value: string | number, currency: string) {
  const number = Number(value);
  return `${html(currency)} ${Number.isFinite(number)
    ? new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number)
    : html(String(value))}`;
}

export function internationalBillHtml(bill: InternationalBill) {
  const content = bill.items.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${html(item.description)}${item.finished_product_number ? `<div class="muted">${html(item.finished_product_number)}</div>` : ""}</td>
      <td class="right">${html(item.quantity)} ${html(item.unit)}</td>
      <td class="right">${amount(item.unit_price, bill.currency_code)}</td>
      <td class="right">${html(item.discount_percent)}%</td>
      <td class="right">${html(item.tax_percent)}%</td>
      <td class="right">${amount(item.line_total, bill.currency_code)}</td>
    </tr>
  `).join("");

  return `<!doctype html>
  <html lang="en"><head><meta charset="utf-8"><title>${html(bill.bill_number)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 11px; margin: 0; }
    h1 { margin: 0; font-size: 23px; color: #183b75; }
    h2 { font-size: 14px; margin: 0 0 8px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #183b75; padding-bottom: 18px; gap: 24px; }
    .sender { max-width: 55%; }
    .meta { text-align: right; line-height: 1.6; }
    .section { margin-top: 22px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
    p { margin: 5px 0; line-height: 1.6; }
    table { margin-top: 20px; border-collapse: collapse; width: 100%; table-layout: auto; }
    th { background: #edf3fc; color: #193b75; text-align: left; font-size: 10px; }
    td, th { border-bottom: 1px solid #dce4f0; padding: 10px 6px; vertical-align: top; }
    .right { text-align: right; white-space: nowrap; }
    .muted { color: #64748b; font-size: 10px; margin-top: 5px; }
    .totals { margin: 22px 0 0 auto; max-width: 310px; }
    .totals div { display: flex; justify-content: space-between; padding: 7px 0; gap: 20px; }
    .totals .grand { border-top: 2px solid #183b75; font-size: 15px; font-weight: 700; }
    .footer { margin-top: 35px; border-top: 1px solid #cbd5e1; padding-top: 12px; }
    @media print { tr { break-inside: avoid; } }
  </style></head>
  <body>
    <div class="header"><div class="sender">
      <h2>${html(bill.seller_name)}</h2>
      <p>${lines(bill.seller_address)}</p><p>${html(bill.seller_contact)}</p>
    </div><div class="meta"><h1>INTERNATIONAL INVOICE</h1>
      <strong>${html(bill.bill_number)}</strong><br>
      Invoice date: ${html(bill.bill_date)}<br>
      Currency: ${html(bill.currency_code)}
    </div></div>
    <div class="section grid"><div><h2>Bill to</h2><strong>${html(bill.customer_name)}</strong>
      <p>${html(bill.customer_country)}</p><p>${lines(bill.customer_address)}</p>
      <p>${html(bill.customer_contact)}</p></div></div>
    <table><thead><tr><th>#</th><th>Description</th><th class="right">Qty</th>
      <th class="right">Unit price</th><th class="right">Discount</th>
      <th class="right">${html(bill.tax_label)} %</th><th class="right">Amount</th></tr></thead>
      <tbody>${content}</tbody></table>
    <div class="totals">
      <div><span>Subtotal</span><span>${amount(bill.subtotal, bill.currency_code)}</span></div>
      <div><span>Discount</span><span>− ${amount(bill.discount_amount, bill.currency_code)}</span></div>
      <div><span>Net before tax</span><span>${amount(bill.taxable_amount, bill.currency_code)}</span></div>
      <div><span>${html(bill.tax_label)}</span><span>${amount(bill.tax_amount, bill.currency_code)}</span></div>
      <div class="grand"><span>Total</span><span>${amount(bill.grand_total, bill.currency_code)}</span></div>
    </div>
    <div class="footer">
      ${bill.payment_terms ? `<h2>Payment terms</h2><p>${lines(bill.payment_terms)}</p>` : ""}
      ${bill.notes ? `<h2>Notes</h2><p>${lines(bill.notes)}</p>` : ""}
    </div>
  </body></html>`;
}
