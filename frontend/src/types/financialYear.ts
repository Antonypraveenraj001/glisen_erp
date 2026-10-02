export interface FinancialYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  opened_at: string;
  opened_by: number | null;
  closed_at: string | null;
  closed_by: number | null;
  notes: string | null;
}

export interface FinancialYearTransitionHistoryItem {
  id: number;
  from_financial_year: string;
  to_financial_year: string | null;
  backup_filename: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface FinancialYearValidation {
  current_financial_year: FinancialYear;
  today: string;
  transition_available_from: string;

  next_financial_year_name: string;
  next_financial_year_start_date: string;
  next_financial_year_end_date: string;

  calendar_ready: boolean;
  backup_infrastructure_ready: boolean;
  latest_verified_backup_at: string | null;

  fy_final_backup_verified: boolean;
  fy_final_backup_filename: string | null;
  fy_final_backup_verified_at: string | null;

  stock_items_to_carry: number;
  total_stock_quantity: number;
  live_production_orders: number;

  current_fy_purchase_bills: number;
  current_fy_issued_invoices: number;

  conflicting_active_financial_years: number;

  blockers: string[];
  carry_forward_notes: string[];

  required_confirmation: string;
  can_start_transition: boolean;
}

export interface FinancialYearOverview {
  validation: FinancialYearValidation;
  history: FinancialYear[];
  transition_history:
    FinancialYearTransitionHistoryItem[];
}

export interface FinancialYearTransitionResponse {
  success: boolean;
  message: string;

  transition_log_id: number;

  from_financial_year: FinancialYear;
  to_financial_year: FinancialYear;

  backup_filename: string;

  opening_stock_items: number;
  opening_stock_value: number;

  opening_wip_orders: number;
  opening_wip_value: number;
}
