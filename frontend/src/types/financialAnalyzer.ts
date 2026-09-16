export interface ExpenseCategorySummary {
  category: string;
  amount: string;
  count: number;
}


export interface FinancialAnalyzerResponse {
  start_date: string | null;
  end_date: string | null;

  // ========================================================
  // COUNTS
  // ========================================================

  invoice_count: number;
  credit_note_count: number;
  expense_count: number;

  finished_product_count: number;

  // ========================================================
  // SALES REVENUE
  // ========================================================

  gross_sales: string;
  credit_notes: string;
  net_sales: string;

  // ========================================================
  // PRODUCTION COST
  // ========================================================

  actual_material_cost: string;
  actual_operation_cost: string;
  total_production_cost: string;

  // ========================================================
  // COMPANY EXPENSES
  // ========================================================

  total_expenses: string;

  // ========================================================
  // TOTAL BUSINESS COST / PROFIT
  // ========================================================

  total_business_cost: string;
  net_profit: string;

  // ========================================================
  // BREAKDOWN
  // ========================================================

  expense_breakdown: ExpenseCategorySummary[];
}