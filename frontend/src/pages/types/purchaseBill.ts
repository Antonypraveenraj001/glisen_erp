export interface SupplierAIData {
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
  
  export interface PurchaseBillAIData {
    bill_number: string;
    bill_date: string;
    subtotal: number;
    total_gst: number;
    grand_total: number;
    remarks: string;
  }
  
  export interface ProductAIData {
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
  
  export interface PurchaseBillExtractResponse {
    status: string;
    filename: string;
    data: {
      supplier: SupplierAIData;
      purchase_bill: PurchaseBillAIData;
      products: ProductAIData[];
    };
  }
  
  export interface PurchaseBillConfirmRequest {
    supplier: SupplierAIData;
    purchase_bill: PurchaseBillAIData;
    products: ProductAIData[];
  }
  
  export interface PurchaseBillSummaryResponse {
    purchase_bill_id: number;
    bill_number: string;
    supplier_name: string;
    grand_total: number;
  
    products_total: number;
    existing_products_used: number;
    new_products_created: number;
  
    supplier_created: boolean;
    stock_updated_count: number;
  
    message: string;
  }
  
  export interface PurchaseBillListItem {
    id: number;
    bill_number: string;
    bill_date: string;
  
    supplier_name: string;
  
    grand_total: number;
  
    created_at: string;
  
    is_active: boolean;
  }