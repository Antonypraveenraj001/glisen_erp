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
  supplier_id: number | null;
  match_type: string | null;
}

export interface AIPurchaseBill {
  bill_number: string;
  bill_date: string;
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
  product_id: number | null;
  match_type: string | null;
}

export interface PurchaseBillAIDataResponse {
  supplier: AISupplier;
  purchase_bill: AIPurchaseBill;
  products: AIProduct[];
}

export interface PurchaseBillAIResponse {
  status: string;
  filename: string;
  data: PurchaseBillAIDataResponse;
}

/*
==================================================
CONFIRM PURCHASE BILL REQUEST
==================================================
*/

export interface PurchaseBillConfirmRequest {
  supplier: {
    supplier_id: number | null;
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
    subtotal: number;
    total_gst: number;
    grand_total: number;
    remarks: string;
  };

  products: {
    product_id: number | null;
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

/*
==================================================
CONFIRM PURCHASE BILL RESPONSE
==================================================
*/

export interface PurchaseBillConfirmResponse {
  status: string;
  message?: string;
  purchase_bill_id?: number;
  data?: unknown;
}

/*
==================================================
PURCHASE BILL LIST / DETAILS
==================================================
*/

export interface PurchaseBill {
  id: number;
  bill_number: string;
  bill_date: string;
  supplier_name?: string | null;
  subtotal: number;
  total_gst: number;
  grand_total: number;
  status?: string | null;
}