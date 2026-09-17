export type MoneyValue =
  string | number;


/* ================================================================
   AI EXTRACTION
================================================================ */

export interface AISupplier {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  gst_number: string;
  address: string;
  city: string;
  state: string;
  pincode: string;

  existing_supplier: boolean;

  supplier_id:
    number | null;

  match_type:
    string | null;
}


export interface AIPurchaseBill {
  bill_number: string;
  bill_date: string;

  credit_days: number;

  subtotal: number;
  total_gst: number;
  grand_total: number;

  remarks: string;
}


export interface AIProduct {
  product_name: string;
  description: string;
  hsn_code: string;
  unit: string;

  quantity: number;
  purchase_price: number;
  gst_percentage: number;
  line_total: number;

  existing_product: boolean;

  product_id:
    number | null;

  match_type:
    string | null;
}


export interface PurchaseBillAIDataResponse {
  supplier: AISupplier;

  purchase_bill:
    AIPurchaseBill;

  products:
    AIProduct[];
}


export interface PurchaseBillAIResponse {
  status: string;
  filename: string;

  data:
    PurchaseBillAIDataResponse;
}


/* ================================================================
   CONFIRM PURCHASE BILL REQUEST
================================================================ */

export interface PurchaseBillConfirmRequest {

  supplier: {
    supplier_id:
      number | null;

    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
    gst_number: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };


  purchase_bill: {
    bill_number: string;
    bill_date: string;

    credit_days: number;

    subtotal: number;
    total_gst: number;
    grand_total: number;

    remarks: string;
  };


  products: {
    product_id:
      number | null;

    product_name: string;
    description: string;
    hsn_code: string;
    unit: string;

    quantity: number;
    purchase_price: number;
    gst_percentage: number;
    line_total: number;
  }[];
}


/* ================================================================
   CONFIRM PURCHASE BILL RESPONSE
================================================================ */

export interface PurchaseBillConfirmResponse {
  status: string;

  message?: string;

  purchase_bill_id?:
    number;

  data?:
    unknown;
}


/* ================================================================
   PURCHASE BILL ITEM
================================================================ */

export interface PurchaseBillItem {
  id: number;

  product_id: number;

  quantity:
    MoneyValue;

  purchase_price:
    MoneyValue;

  gst_percentage:
    MoneyValue;

  line_total:
    MoneyValue;
}


/* ================================================================
   PURCHASE BILL
================================================================ */

export interface PurchaseBill {
  id: number;

  bill_number: string;

  supplier_id: number;

  supplier_name?:
    string | null;

  bill_date: string;

  credit_days: number;

  due_date:
    string | null;

  subtotal:
    MoneyValue;

  total_gst:
    MoneyValue;

  grand_total:
    MoneyValue;

  remarks:
    string | null;

  created_by:
    number;

  created_at:
    string;

  items:
    PurchaseBillItem[];
}


/* ================================================================
   PURCHASE BILL UPDATE
================================================================ */

export interface PurchaseBillUpdateRequest {
  bill_date: string;

  credit_days?:
    number | null;

  subtotal:
    MoneyValue;

  total_gst:
    MoneyValue;

  grand_total:
    MoneyValue;

  remarks?:
    string | null;
}


/* ================================================================
   PURCHASE BILL STATISTICS
================================================================ */

export interface PurchaseBillStatistics {
  total_purchase_bills:
    number;

  active_purchase_bills:
    number;

  total_purchase_value:
    MoneyValue;

  total_quantity_purchased:
    MoneyValue;
}


/* ================================================================
   PAYMENT STATUS
================================================================ */

export type PurchaseBillPaymentStatus =
  | "Untracked"
  | "Unpaid"
  | "Partially Paid"
  | "Paid";


/* ================================================================
   RECORD PAYMENT REQUEST
================================================================ */

export interface PurchaseBillPaymentCreate {
  payment_date: string;

  amount:
    MoneyValue;

  payment_mode?:
    string | null;

  reference_number?:
    string | null;

  notes?:
    string | null;
}


/* ================================================================
   PAYMENT RECORD
================================================================ */

export interface PurchaseBillPayment {
  id: number;

  purchase_bill_id:
    number;

  payment_date:
    string;

  amount:
    MoneyValue;

  payment_mode:
    string | null;

  reference_number:
    string | null;

  notes:
    string | null;

  created_by:
    number;

  created_at:
    string;
}


/* ================================================================
   PAYMENT SUMMARY
================================================================ */

export interface PurchaseBillPaymentSummary {
  purchase_bill_id:
    number;

  bill_number:
    string;

  grand_total:
    MoneyValue;

  paid_amount:
    MoneyValue;

  balance_amount:
    MoneyValue;

  payment_status:
    PurchaseBillPaymentStatus;

  credit_days:
    number;

  due_date:
    string | null;

  payments:
    PurchaseBillPayment[];
}


/* ================================================================
   UNPAID PURCHASE BILL AGING
================================================================ */

export interface PurchaseBillUnpaidAging {
  purchase_bill_id:
    number;

  bill_number:
    string;

  supplier_id:
    number;

  supplier_name:
    string;

  bill_date:
    string;

  grand_total:
    MoneyValue;

  paid_amount:
    MoneyValue;

  balance_amount:
    MoneyValue;

  payment_status:
    PurchaseBillPaymentStatus;

  credit_days:
    number;

  due_date:
    string;

  days_unpaid:
    number;

  overdue_days:
    number;

  is_overdue:
    boolean;
}