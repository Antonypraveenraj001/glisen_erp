import type {
  FinalBill,
} from "./finalBill";

import type {
  ProductionMaterial,
  ProductionOperation,
  ProductionOrder,
} from "./production";


export interface FinishedProduct {
  id: number;

  finished_product_number: string;

  product_name: string;

  unit: string;

  product_master_id: number | null;

  production_order_id: number;

  finished_goods_receipt_id: number;

  created_by: number;

  created_at: string;
}


export interface FinishedProductMaster {
  id: number;

  product_code: string;

  product_name: string;

  description: string | null;

  category: string;

  unit: string;

  hsn_code: string;

  gst_percentage: string;
}


export interface FinishedProductCustomer {
  id: number;

  customer_code: string;

  company_name: string;

  contact_person: string | null;

  email: string | null;

  phone: string | null;

  gst_number: string | null;

  address: string | null;

  city: string | null;

  state: string | null;

  pincode: string | null;
}


export interface FinishedProductEnquiry {
  id: number;

  enquiry_number: string;

  enquiry_date: string;

  customer_id: number;

  company_name: string;

  contact_person: string | null;

  phone: string | null;

  email: string | null;

  gst_number: string | null;

  address: string | null;

  city: string | null;

  state: string | null;

  pincode: string | null;

  machine_name: string | null;

  machine_model: string | null;

  application: string | null;

  quantity: number | null;

  requirements: string | null;

  remarks: string | null;

  status: string;
}


export interface FinishedProductProforma {
  id: number;

  proforma_number: string;

  proforma_date: string;

  enquiry_id: number;

  customer_id: number;

  company_name: string;

  subtotal: string;

  discount_amount: string;

  taxable_amount: string;

  tax_amount: string;

  grand_total: string;

  status: string;
}


export interface FinishedProductShopFloorIssue {
  id: number;

  issue_number: string;

  production_order_id: number;

  production_material_id: number;

  product_id: number;

  quantity_issued: string;

  unit_cost: string;

  total_cost: string;

  stock_before: string;

  stock_after: string;

  issued_by: number;

  issued_at: string;

  remarks: string | null;
}


export interface FinishedProductGoodsReceipt {
  id: number;

  receipt_number: string;

  production_order_id: number;

  product_id: number | null;

  quantity_received: string;

  stock_before: string;

  stock_after: string;

  received_by: number;

  received_at: string;

  remarks: string | null;
}


export interface FinishedProductCostSummary {
  actual_material_cost: string;

  actual_operation_cost: string;

  actual_production_cost: string;

  finished_quantity: string;

  cost_per_unit: string;
}


export interface FinishedProductBilling {
  original_invoice: FinalBill | null;

  effective_invoice: FinalBill | null;

  revisions: FinalBill[];

  credit_notes: FinalBill[];
}


export interface FinishedProductTraceability {
  finished_product: FinishedProduct;

  /*
   * Legacy only.
   * New custom-manufactured products normally have null here.
   */
  product_master: FinishedProductMaster | null;

  customer: FinishedProductCustomer;

  enquiry: FinishedProductEnquiry;

  proforma: FinishedProductProforma;

  production_order: ProductionOrder;

  production_materials: ProductionMaterial[];

  shop_floor_issues:
    FinishedProductShopFloorIssue[];

  production_operations:
    ProductionOperation[];

  finished_goods_receipt:
    FinishedProductGoodsReceipt;

  cost_summary:
    FinishedProductCostSummary;

  billing:
    FinishedProductBilling;
}