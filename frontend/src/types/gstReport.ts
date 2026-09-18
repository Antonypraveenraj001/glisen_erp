export interface GSTReportItem {
  document_id: number;

  document_number: string;
  document_date: string;

  document_type: string;

  reference_invoice_number:
    string | null;

  customer_id: number;

  company_name: string;

  gst_number:
    string | null;

  taxable_amount: string;

  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;

  tax_amount: string;
  grand_total: string;
}


export interface GSTReportResponse {
  start_date:
    string | null;

  end_date:
    string | null;

  invoice_count: number;
  credit_note_count: number;

  gross_taxable_amount: string;
  credit_taxable_amount: string;
  net_taxable_amount: string;

  gross_cgst_amount: string;
  credit_cgst_amount: string;
  net_cgst_amount: string;

  gross_sgst_amount: string;
  credit_sgst_amount: string;
  net_sgst_amount: string;

  gross_igst_amount: string;
  credit_igst_amount: string;
  net_igst_amount: string;

  gross_tax_amount: string;
  credit_tax_amount: string;
  net_tax_amount: string;

  gross_invoice_total: string;
  credit_note_total: string;
  net_sales_total: string;

  items:
    GSTReportItem[];
}


/* ================================================================
   PURCHASE GST
================================================================ */

export interface PurchaseGSTReportItem {
  purchase_bill_id: number;

  bill_number: string;
  bill_date: string;

  supplier_id: number;

  supplier_name: string;

  gst_number:
    string | null;

  taxable_amount: string;

  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;

  tax_amount: string;
  grand_total: string;
}


export interface PurchaseGSTReportResponse {
  start_date:
    string | null;

  end_date:
    string | null;

  purchase_bill_count:
    number;

  taxable_amount:
    string;

  cgst_amount:
    string;

  sgst_amount:
    string;

  igst_amount:
    string;

  tax_amount:
    string;

  grand_total:
    string;

  items:
    PurchaseGSTReportItem[];
}