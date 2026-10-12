export interface InternationalFinishedProduct {
  id: number;
  finished_product_number: string;
  product_name: string;
  unit: string;
  quantity_produced: string;
  unit_cost: string;
  has_cost_snapshot: boolean;
}

export interface InternationalBillItemInput {
  finished_product_id: number | null;
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  tax_percent: string;
  manual_unit_cost: string | null;
}

export interface InternationalBillInput {
  bill_date: string;
  seller_name: string;
  seller_address: string;
  seller_contact: string;
  customer_name: string;
  customer_country: string;
  customer_address: string;
  customer_contact: string;
  currency_code: string;
  cost_currency_code: string;
  exchange_rate: string;
  tax_label: string;
  payment_terms: string;
  notes: string;
  items: InternationalBillItemInput[];
}

export interface InternationalBillItem {
  id: number;
  finished_product_id: number | null;
  finished_product_number: string | null;
  description: string;
  unit: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  tax_percent: string;
  line_subtotal: string;
  discount_amount: string;
  taxable_amount: string;
  tax_amount: string;
  line_total: string;
  unit_cost: string | null;
  cost_amount: string | null;
  cost_source: string;
}

export interface InternationalBillSummary {
  id: number;
  bill_number: string;
  bill_date: string;
  customer_name: string;
  customer_country: string;
  currency_code: string;
  cost_currency_code: string;
  grand_total: string;
  gross_profit: string | null;
  created_at: string;
}

export interface InternationalBill extends InternationalBillSummary {
  seller_name: string;
  seller_address: string | null;
  seller_contact: string | null;
  customer_address: string | null;
  customer_contact: string | null;
  exchange_rate: string;
  tax_label: string;
  payment_terms: string | null;
  notes: string | null;
  subtotal: string;
  discount_amount: string;
  taxable_amount: string;
  tax_amount: string;
  sales_cost_currency: string;
  cost_amount: string | null;
  created_by: number;
  items: InternationalBillItem[];
}

export interface InternationalBillPage {
  items: InternationalBillSummary[];
  total: number;
  page: number;
  page_size: number;
}
