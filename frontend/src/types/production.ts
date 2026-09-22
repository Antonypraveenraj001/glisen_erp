export interface ProductionOrder {
  id: number;

  production_number: string;

  proforma_id: number;

  proforma_item_id: number | null;

  /*
   * Manufactured output source of truth.
   */
  product_name: string;

  unit: string;

  /*
   * Legacy purchased Product link only.
   * New manufactured jobs will normally be null.
   */
  product_id: number | null;

  quantity: number;

  status: string;

  planned_start_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;

  notes: string | null;

  created_at: string;
  updated_at: string;
}


export interface ProductionMaterial {
  id: number;

  production_order_id: number;

  /*
   * Materials may reference purchased Stock products.
   */
  product_id: number | null;

  material_name: string;

  unit: string | null;

  quantity_required: string;
  quantity_issued: string;

  unit_cost: string;
  material_cost: string;
}


export interface ProductionOperation {
  id: number;

  production_order_id: number;

  operation_name: string;

  machine_name: string | null;

  hourly_rate: string;

  planned_hours: string;
  actual_hours: string;

  operation_cost: string;

  status: string;

  started_at: string | null;
  completed_at: string | null;
}


export interface ProductionOrderDetail
  extends ProductionOrder {

  materials: ProductionMaterial[];

  operations: ProductionOperation[];
}


export interface ProductionMaterialSummary {
  production_order_id: number;

  total_materials: number;

  total_quantity_required: string;
  total_quantity_issued: string;
  total_quantity_remaining: string;

  total_material_cost: string;
}


export interface ProductionOperationSummary {
  production_order_id: number;

  total_operations: number;

  pending_operations: number;
  in_progress_operations: number;
  completed_operations: number;

  total_planned_hours: string;
  total_actual_hours: string;

  total_operation_cost: string;
}


/* =========================================================
   PRODUCTION ORDER PAYLOADS
========================================================= */

export interface ProductionOrderCreatePayload {
  proforma_id: number;

  proforma_item_id: number | null;

  product_name: string;

  unit: string;

  product_id: number | null;

  quantity: number;

  planned_start_date: string | null;

  notes: string | null;
}


export interface ProductionOrderUpdatePayload {
  product_name?: string;

  unit?: string;

  product_id?: number | null;

  quantity?: number;

  planned_start_date?: string | null;

  notes?: string | null;
}


/* =========================================================
   MATERIAL PAYLOADS
========================================================= */

export interface ProductionMaterialCreatePayload {
  product_id: number | null;

  material_name: string;

  unit: string | null;

  quantity_required: number;

  unit_cost: number;
}


export interface ProductionMaterialUpdatePayload {
  product_id?: number | null;

  material_name?: string;

  unit?: string | null;

  quantity_required?: number;

  unit_cost?: number;
}


/* =========================================================
   OPERATION PAYLOADS
========================================================= */

export interface ProductionOperationCreatePayload {
  operation_name: string;

  machine_name: string | null;

  hourly_rate: number;

  planned_hours: number;
}


export interface ProductionOperationUpdatePayload {
  operation_name?: string;

  machine_name?: string | null;

  hourly_rate?: number;

  planned_hours?: number;
}


export interface ProductionOperationCompletePayload {
  actual_hours: number;
}