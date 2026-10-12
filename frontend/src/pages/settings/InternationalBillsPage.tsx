import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Download, FilePlus2, Loader2, Plus, Printer, Save, Trash2 } from "lucide-react";

import { getBusinessSettings, getCompanySettings } from "../../services/settingsService";
import {
  createInternationalBill, getInternationalBill, getInternationalBills,
  getInternationalFinishedProducts,
} from "../../services/internationalBillService";
import { downloadPdfFromHtml } from "../../services/pdfDocumentService";
import type {
  InternationalBill, InternationalBillInput, InternationalBillItemInput,
  InternationalBillPage, InternationalFinishedProduct,
} from "../../types/internationalBill";
import { internationalBillHtml } from "./internationalBillPrint";
import "./InternationalBillsPage.css";

type Screen = "list" | "create" | "view";

function emptyItem(): InternationalBillItemInput {
  return {
    finished_product_id: null, description: "", unit: "Nos", quantity: "1",
    unit_price: "0.00", discount_percent: "0", tax_percent: "0",
    manual_unit_cost: null,
  };
}

function dateInTimezone(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString().slice(0, 10);
  }
}

function newForm(timezone: string, costCurrency: string): InternationalBillInput {
  return {
    bill_date: dateInTimezone(timezone),
    seller_name: "", seller_address: "", seller_contact: "",
    customer_name: "", customer_country: "", customer_address: "",
    customer_contact: "", currency_code: "USD", cost_currency_code: costCurrency,
    exchange_rate: costCurrency === "USD" ? "1" : "",
    tax_label: "Tax", payment_terms: "", notes: "", items: [emptyItem()],
  };
}

function amount(value: string | number, currency: string) {
  const numeric = Number(value);
  return `${currency} ${Number.isFinite(numeric)
    ? numeric.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "–"}`;
}

function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail: unknown = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg || "Invalid field").join("; ");
  }
  return error instanceof Error ? error.message : "The operation could not be completed.";
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function InternationalBillsPage() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [costCurrency, setCostCurrency] = useState("INR");
  const [listing, setListing] = useState<InternationalBillPage | null>(null);
  const [finishedProducts, setFinishedProducts] = useState<InternationalFinishedProduct[]>([]);
  const [seller, setSeller] = useState({ name: "", address: "", contact: "" });
  const [form, setForm] = useState<InternationalBillInput>(() => newForm("Asia/Kolkata", "INR"));
  const [selected, setSelected] = useState<InternationalBill | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    async function initialize() {
      try {
        const business = await getBusinessSettings();
        if (mounted) {
          setPageSize(business.default_page_size || 10);
          setTimezone(business.timezone || "Asia/Kolkata");
          setCostCurrency(business.currency_code || "INR");
        }
      } catch { /* Continue with the existing ERP defaults. */ }
      try {
        const company = await getCompanySettings();
        if (mounted) setSeller({
          name: company.company_name || "", address: company.address || "",
          contact: [company.phone, company.email].filter(Boolean).join(" | "),
        });
      } catch { /* Seller information is always editable per invoice. */ }
    }
    void initialize();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (screen !== "list") return;
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const result = await getInternationalBills(page, pageSize);
        if (mounted) { setListing(result); setNotice(""); }
      } catch (error) {
        if (mounted) setNotice(errorMessage(error));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [screen, page, pageSize]);

  const preview = useMemo(() => {
    const rows = form.items.map((item) => {
      const product = finishedProducts.find((row) => row.id === item.finished_product_id);
      const qty = Number(item.quantity) || 0;
      const gross = roundMoney(qty * (Number(item.unit_price) || 0));
      const discount = roundMoney(gross * (Number(item.discount_percent) || 0) / 100);
      const net = gross - discount;
      const tax = roundMoney(net * (Number(item.tax_percent) || 0) / 100);
      const unitCost = product ? (product.has_cost_snapshot ? Number(product.unit_cost) : NaN)
        : item.manual_unit_cost === null || item.manual_unit_cost === "" ? NaN : Number(item.manual_unit_cost);
      return { net, tax, cost: qty * unitCost, known: Number.isFinite(unitCost) };
    });
    const net = rows.reduce((sum, row) => sum + row.net, 0);
    const tax = rows.reduce((sum, row) => sum + row.tax, 0);
    const costsKnown = rows.every((row) => row.known);
    const rate = Number(form.exchange_rate);
    const profit = costsKnown && Number.isFinite(rate) && rate > 0
      ? roundMoney(net * rate) - roundMoney(rows.reduce((sum, row) => sum + roundMoney(row.cost), 0))
      : null;
    return { net, tax, total: net + tax, profit };
  }, [form, finishedProducts]);

  function updateField(field: keyof Omit<InternationalBillInput, "items">, value: string) {
    setForm((old) => ({ ...old, [field]: value }));
  }

  function updateItem(index: number, change: Partial<InternationalBillItemInput>) {
    setForm((old) => ({
      ...old,
      items: old.items.map((item, i) => i === index ? { ...item, ...change } : item),
    }));
  }

  function chooseProduct(index: number, value: string) {
    const product = finishedProducts.find((entry) => String(entry.id) === value);
    updateItem(index, product ? {
      finished_product_id: product.id,
      description: product.product_name,
      unit: product.unit,
      manual_unit_cost: null,
    } : { finished_product_id: null, description: "", unit: "Nos", manual_unit_cost: null });
  }

  async function startCreate() {
    setNotice("");
    setForm({
      ...newForm(timezone, costCurrency), seller_name: seller.name,
      seller_address: seller.address, seller_contact: seller.contact,
    });
    setScreen("create");
    try {
      setFinishedProducts(await getInternationalFinishedProducts());
    } catch (error) {
      setNotice(`Finished products could not be loaded: ${errorMessage(error)}`);
    }
  }

  async function openBill(id: number) {
    setNotice("");
    setLoading(true);
    try {
      setSelected(await getInternationalBill(id));
      setScreen("view");
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function saveBill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    if (!form.items.length) return setNotice("Add at least one invoice line.");
    if (form.items.some((item) => item.finished_product_id &&
      !finishedProducts.find((row) => row.id === item.finished_product_id)?.has_cost_snapshot)) {
      return setNotice("A selected finished product has no production-cost snapshot.");
    }
    if (!form.exchange_rate || Number(form.exchange_rate) <= 0) {
      return setNotice("Enter the exchange rate used for the profit calculation.");
    }
    if (form.currency_code.trim().toUpperCase() === form.cost_currency_code.trim().toUpperCase()
      && Number(form.exchange_rate) !== 1) {
      return setNotice("When both currencies match, the exchange rate must be 1.");
    }
    setSaving(true);
    try {
      const bill = await createInternationalBill(form);
      setSelected(bill);
      setScreen("view");
      setNotice(`Saved ${bill.bill_number} separately under International Bills.`);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function printBill() {
    if (!selected) return;
    const popup = window.open("", "_blank");
    if (!popup) return setNotice("Please allow pop-ups to print the international invoice.");
    popup.document.open();
    popup.document.write(internationalBillHtml(selected));
    popup.document.close();
    popup.addEventListener("load", () => { popup.focus(); popup.print(); }, { once: true });
  }

  async function downloadBill() {
    if (!selected) return;
    setDownloading(true);
    try {
      await downloadPdfFromHtml(internationalBillHtml(selected), `${selected.bill_number}.pdf`);
    } catch (error) {
      setNotice(`PDF download failed: ${errorMessage(error)}`);
    } finally {
      setDownloading(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil((listing?.total || 0) / pageSize));

  return (
    <div className="int-page">
      <div className="int-topbar">
        <div>
          <button type="button" className="int-link" onClick={() => screen === "list" ? navigate("/settings?tab=business") : setScreen("list")}>
            <ArrowLeft size={15} /> {screen === "list" ? "Back to Settings" : "All International Bills"}
          </button>
          <h1>International Bills</h1>
          <p>Independent overseas invoices, manual tax and currency, with finished-product costing for profit.</p>
        </div>
        {screen === "list" && <button type="button" className="int-primary" onClick={() => void startCreate()}>
          <FilePlus2 size={17} /> Create International Bill
        </button>}
      </div>

      {notice && <div className="int-notice" role="alert">{notice}</div>}

      {screen === "list" && (
        <section className="int-card">
          <div className="int-card-heading">
            <div><h2>Saved International Bills</h2><p>Separate from Final Billing, GST and the normal sales workflow.</p></div>
            <span>{listing?.total ?? 0} saved</span>
          </div>
          <div className="int-table-scroll"><table className="int-table"><thead><tr>
            <th>Invoice</th><th>Date</th><th>Customer</th><th>Country</th>
            <th>Invoice total</th><th>Gross profit</th><th></th>
          </tr></thead><tbody>
            {listing?.items.map((bill) => <tr key={bill.id}>
              <td className="int-strong">{bill.bill_number}</td>
              <td>{bill.bill_date}</td><td>{bill.customer_name}</td><td>{bill.customer_country}</td>
              <td>{amount(bill.grand_total, bill.currency_code)}</td>
              <td>{bill.gross_profit === null ? "Cost incomplete" : amount(bill.gross_profit, bill.cost_currency_code)}</td>
              <td><button type="button" className="int-secondary" disabled={loading} onClick={() => void openBill(bill.id)}>View</button></td>
            </tr>)}
            {!loading && !listing?.items.length && <tr><td colSpan={7} className="int-empty">No international bills yet. Create your first bill above.</td></tr>}
            {loading && <tr><td colSpan={7} className="int-empty">Loading saved invoices…</td></tr>}
          </tbody></table></div>
          <div className="int-pagination">
            <span>Showing page {page} of {pageCount} · {pageSize} per page (Business Defaults)</span>
            <div><button type="button" disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button type="button" disabled={page >= pageCount || loading} onClick={() => setPage((p) => p + 1)}>Next</button></div>
          </div>
        </section>
      )}

      {screen === "create" && <form onSubmit={(event) => void saveBill(event)}>
        <section className="int-card">
          <div className="int-card-heading"><div><h2>Create International Bill</h2><p>No enquiry, proforma or domestic invoice is required.</p></div></div>
          <div className="int-fields">
            <label>Date<input type="date" value={form.bill_date} required onChange={(e) => updateField("bill_date", e.target.value)} /></label>
            <label>Invoice currency (3-letter code)<input value={form.currency_code} required maxLength={3} placeholder="USD" onChange={(e) => {
              const code = e.target.value.toUpperCase();
              setForm((old) => ({ ...old, currency_code: code, exchange_rate: code === old.cost_currency_code ? "1" : "" }));
            }} /></label>
            <label>Production cost currency<input value={form.cost_currency_code} required maxLength={3} placeholder="INR" onChange={(e) => {
              const code = e.target.value.toUpperCase();
              setForm((old) => ({ ...old, cost_currency_code: code, exchange_rate: code === old.currency_code ? "1" : "" }));
            }} /></label>
            <label>Exchange rate: 1 {form.currency_code || "invoice unit"} = how many {form.cost_currency_code || "cost units"}?
              <input type="number" min="0.000001" step="any" required value={form.exchange_rate} placeholder="Enter manually" onChange={(e) => updateField("exchange_rate", e.target.value)} />
            </label>
            <label>Tax label<input value={form.tax_label} maxLength={60} placeholder="VAT, GST, Tax, Duty…" onChange={(e) => updateField("tax_label", e.target.value)} /></label>
          </div>
          <p className="int-hint">Tax rates are entered on each line. The exchange rate is used only for estimated profit; it does not convert invoice amounts or create accounting entries. The cost currency must match the currency in which your Finished Product production costs were originally recorded—changing this label does not convert those stored costs.</p>
        </section>

        <div className="int-two-cols">
          <section className="int-card"><h2>Seller (editable invoice copy)</h2>
            <label>Seller / company name<input required value={form.seller_name} maxLength={200} onChange={(e) => updateField("seller_name", e.target.value)} /></label>
            <label>Seller address<textarea value={form.seller_address} rows={3} onChange={(e) => updateField("seller_address", e.target.value)} /></label>
            <label>Seller contact<input value={form.seller_contact} onChange={(e) => updateField("seller_contact", e.target.value)} /></label>
          </section>
          <section className="int-card"><h2>Buyer (manual)</h2>
            <label>Buyer / customer name<input required maxLength={200} value={form.customer_name} onChange={(e) => updateField("customer_name", e.target.value)} /></label>
            <label>Country<input required maxLength={120} value={form.customer_country} onChange={(e) => updateField("customer_country", e.target.value)} /></label>
            <label>Billing address<textarea value={form.customer_address} rows={3} onChange={(e) => updateField("customer_address", e.target.value)} /></label>
            <label>Buyer contact<input value={form.customer_contact} onChange={(e) => updateField("customer_contact", e.target.value)} /></label>
          </section>
        </div>

        <section className="int-card">
          <div className="int-card-heading"><div><h2>Invoice items</h2><p>Select Finished Products for frozen production costs, or add a custom item manually.</p></div>
            <button type="button" className="int-secondary" onClick={() => setForm((old) => ({ ...old, items: [...old.items, emptyItem()] }))}><Plus size={15} /> Add line</button>
          </div>
          {form.items.map((item, index) => {
            const product = finishedProducts.find((p) => p.id === item.finished_product_id);
            return <div className="int-line" key={index}>
              <div className="int-line-heading"><strong>Item {index + 1}</strong>
                <button type="button" disabled={form.items.length === 1} className="int-remove" onClick={() => setForm((old) => ({ ...old, items: old.items.filter((_, i) => i !== index) }))}><Trash2 size={15} /> Remove</button>
              </div>
              <label>Finished Product (optional)
                <select value={item.finished_product_id ?? ""} onChange={(e) => chooseProduct(index, e.target.value)}>
                  <option value="">Custom/manual line</option>
                  {finishedProducts.map((entry) => <option key={entry.id} value={entry.id} disabled={!entry.has_cost_snapshot}>
                    {entry.finished_product_number} · {entry.product_name} · {entry.quantity_produced} produced {entry.has_cost_snapshot ? `· cost ${amount(entry.unit_cost, form.cost_currency_code)}/${entry.unit}` : "· cost not available"}
                  </option>)}
                </select>
              </label>
              {product && <p className="int-hint">Frozen cost: {amount(product.unit_cost, form.cost_currency_code)}/{product.unit} · Produced quantity: {product.quantity_produced}. Selection is read-only; it does not change stock or reservation.</p>}
              <div className="int-line-fields">
                <label className="int-grow">Description<input required maxLength={500} value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} /></label>
                <label>Unit<input required maxLength={50} value={item.unit} onChange={(e) => updateItem(index, { unit: e.target.value })} /></label>
                <label>Quantity<input type="number" min="0.01" step="0.01" required value={item.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })} /></label>
                <label>Unit price ({form.currency_code})<input type="number" min="0" step="0.01" required value={item.unit_price} onChange={(e) => updateItem(index, { unit_price: e.target.value })} /></label>
                <label>Discount %<input type="number" min="0" max="100" step="0.01" value={item.discount_percent} required onChange={(e) => updateItem(index, { discount_percent: e.target.value })} /></label>
                <label>{form.tax_label || "Tax"} %<input type="number" min="0" max="100" step="0.01" value={item.tax_percent} required onChange={(e) => updateItem(index, { tax_percent: e.target.value })} /></label>
                {!item.finished_product_id && <label>Manual unit cost ({form.cost_currency_code}, optional)<input type="number" min="0" step="0.01" placeholder="Unknown" value={item.manual_unit_cost ?? ""} onChange={(e) => updateItem(index, { manual_unit_cost: e.target.value || null })} /></label>}
              </div>
            </div>;
          })}
          <p className="int-hint">For a manual line with unknown cost, the bill saves normally, but gross profit will show “Cost incomplete” rather than a misleading value.</p>
        </section>

        <section className="int-card">
          <h2>Payment terms and notes</h2>
          <div className="int-two-cols int-inner"><label>Payment terms<textarea rows={3} value={form.payment_terms} onChange={(e) => updateField("payment_terms", e.target.value)} /></label>
            <label>Additional invoice notes<textarea rows={3} value={form.notes} onChange={(e) => updateField("notes", e.target.value)} /></label></div>
          <div className="int-calculation">
            <div><span>Net before tax</span><strong>{amount(preview.net, form.currency_code)}</strong></div>
            <div><span>Manual tax</span><strong>{amount(preview.tax, form.currency_code)}</strong></div>
            <div className="int-total"><span>Invoice total</span><strong>{amount(preview.total, form.currency_code)}</strong></div>
            <div><span>Estimated gross profit (before any other selling costs)</span><strong>{preview.profit === null ? "Cost/rate incomplete" : amount(preview.profit, form.cost_currency_code)}</strong></div>
          </div>
          <div className="int-actions"><button type="button" className="int-secondary" onClick={() => setScreen("list")}>Cancel</button>
            <button type="submit" className="int-primary" disabled={saving}>{saving ? <Loader2 className="int-spin" size={17} /> : <Save size={17} />} Save International Bill</button></div>
        </section>
      </form>}

      {screen === "view" && selected && <>
        <section className="int-card">
          <div className="int-card-heading"><div><h2>{selected.bill_number}</h2><p>Saved on {selected.bill_date} · {selected.customer_name}, {selected.customer_country}</p></div>
            <div className="int-actions"><button type="button" className="int-secondary" onClick={printBill}><Printer size={16} /> Print</button>
              <button type="button" className="int-primary" disabled={downloading} onClick={() => void downloadBill()}><Download size={16} /> {downloading ? "Downloading…" : "Download PDF"}</button></div>
          </div>
          <div className="int-two-cols int-inner"><div><h3>From</h3><strong>{selected.seller_name}</strong><p>{selected.seller_address}</p><p>{selected.seller_contact}</p></div>
            <div><h3>Bill to</h3><strong>{selected.customer_name}</strong><p>{selected.customer_country}</p><p>{selected.customer_address}</p><p>{selected.customer_contact}</p></div></div>
          <div className="int-table-scroll"><table className="int-table"><thead><tr>
            <th>Item</th><th>Quantity</th><th>Unit price</th><th>Discount</th><th>{selected.tax_label} %</th><th>Line total</th>
          </tr></thead><tbody>{selected.items.map((item) => <tr key={item.id}>
            <td>{item.description}{item.finished_product_number && <small className="int-item-number">{item.finished_product_number}</small>}</td>
            <td>{item.quantity} {item.unit}</td><td>{amount(item.unit_price, selected.currency_code)}</td>
            <td>{item.discount_percent}%</td><td>{item.tax_percent}%</td><td>{amount(item.line_total, selected.currency_code)}</td>
          </tr>)}</tbody></table></div>
          <div className="int-calculation">
            <div><span>Subtotal</span><strong>{amount(selected.subtotal, selected.currency_code)}</strong></div>
            <div><span>Discount</span><strong>− {amount(selected.discount_amount, selected.currency_code)}</strong></div>
            <div><span>Net before tax</span><strong>{amount(selected.taxable_amount, selected.currency_code)}</strong></div>
            <div><span>{selected.tax_label}</span><strong>{amount(selected.tax_amount, selected.currency_code)}</strong></div>
            <div className="int-total"><span>Invoice total</span><strong>{amount(selected.grand_total, selected.currency_code)}</strong></div>
          </div>
          {selected.payment_terms && <p><strong>Payment terms:</strong> {selected.payment_terms}</p>}
          {selected.notes && <p><strong>Notes:</strong> {selected.notes}</p>}
        </section>
        <section className="int-card int-internal"><h2>Internal profit analysis (not printed on customer's invoice)</h2>
          <div className="int-calculation">
            <div><span>Exchange rate at save</span><strong>1 {selected.currency_code} = {selected.exchange_rate} {selected.cost_currency_code}</strong></div>
            <div><span>Revenue excluding tax</span><strong>{amount(selected.sales_cost_currency, selected.cost_currency_code)}</strong></div>
            <div><span>Frozen / manual item costs</span><strong>{selected.cost_amount === null ? "Incomplete" : amount(selected.cost_amount, selected.cost_currency_code)}</strong></div>
            <div className="int-total"><span>Estimated gross profit</span><strong>{selected.gross_profit === null ? "Cost incomplete" : amount(selected.gross_profit, selected.cost_currency_code)}</strong></div>
          </div>
          <p className="int-hint">Only includes saved line costs and the manual conversion rate. It does not include later selling expenses, payments, currency fluctuations, stock movements, or domestic Financial Analyzer figures.</p>
        </section>
      </>}
    </div>
  );
}
