export interface FinalBillItem {
    id: number;
    final_bill_id: number;
  
    product_id: number | null;
    description: string | null;
    hsn_code: string | null;
  
    quantity: string;
    unit: string | null;
  
    unit_price: string;
  
    discount_percent: string;
    discount_amount: string;
  
    taxable_amount: string;
  
    gst_percent: string;
  
    cgst_amount: string;
    sgst_amount: string;
    igst_amount: string;
    tax_amount: string;
  
    line_total: string;
  }
  
  
  export interface FinalBill {
    id: number;
  
    invoice_number: string;
    invoice_date: string;
  
    proforma_id: number;
    customer_id: number;
  
    company_name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    gst_number: string | null;
  
    billing_address: string | null;
    shipping_address: string | null;
  
    payment_terms: string | null;
    delivery_terms: string | null;
    notes: string | null;
  
    subtotal: string;
    discount_amount: string;
    taxable_amount: string;
  
    cgst_amount: string;
    sgst_amount: string;
    igst_amount: string;
    tax_amount: string;
  
    grand_total: string;
  
    invoice_type: string;
    status: string;
  
    revision_number: number;
  
    parent_invoice_id: number | null;
  
    created_by: number;
  
    created_at: string;
    updated_at: string;
  
    items: FinalBillItem[];
  }
  
  
  export interface FinalBillCreateFromProformaPayload {
    invoice_date?: string | null;
    notes?: string | null;
  }
  
  
  export interface FinalBillRevisionCreatePayload {
    invoice_date?: string | null;
    notes?: string | null;
  }
  
  
  export interface FinalBillCreditNoteCreatePayload {
    invoice_date?: string | null;
    notes?: string | null;
  }
  
  
  export interface FinalBillUpdatePayload {
    invoice_date?: string | null;
  
    company_name?: string | null;
    contact_person?: string | null;
  
    phone?: string | null;
    email?: string | null;
  
    gst_number?: string | null;
  
    billing_address?: string | null;
    shipping_address?: string | null;
  
    payment_terms?: string | null;
    delivery_terms?: string | null;
  
    notes?: string | null;
  }
  
  
  export interface FinalBillItemUpdatePayload {
    description?: string | null;
    hsn_code?: string | null;
  
    quantity?: number;
  
    unit?: string | null;
  
    unit_price?: number;
  
    discount_percent?: number;
  
    gst_percent?: number;
  }