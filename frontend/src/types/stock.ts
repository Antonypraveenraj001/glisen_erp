export interface StockSummaryItem {
  product_id: number;
  product_code: string;
  product_name: string;
  category: string | null;
  unit: string;

  current_stock: string;
  minimum_stock: string;
  maximum_stock: string;

  purchase_price: string;
  stock_value: string;

  stock_status: string;
}


export interface StockSummaryResponse {
  total_products: number;

  total_stock_quantity: string;
  total_stock_value: string;

  low_stock_products: number;
  out_of_stock_products: number;

  items: StockSummaryItem[];
}


export interface StockMovementItem {
  movement_type: string;

  reference_id: number;
  reference_number: string;

  product_id: number;
  product_code: string;
  product_name: string;

  quantity_in: string;
  quantity_out: string;

  stock_before: string | null;
  stock_after: string | null;

  unit_cost: string;
  movement_value: string;

  movement_date: string;

  remarks: string | null;
}


export interface StockMovementResponse {
  total_movements: number;

  total_quantity_in: string;
  total_quantity_out: string;

  total_in_value: string;
  total_out_value: string;

  items: StockMovementItem[];
}


export interface StockSummaryFilters {
  search?: string;
  stock_status?: string;
}


export interface StockMovementFilters {
  product_id?: number;
  movement_type?: string;
  start_date?: string;
  end_date?: string;
}


/* =========================================================
   DIRECT STOCK ISSUE
========================================================= */

export interface DirectStockIssuePayload {
  product_id: number;
  quantity: number;
  remarks?: string | null;
}


export interface DirectStockIssueResponse {
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