export interface ExpenseCategorySummary {
  category: string;

  amount: string;

  count: number;
}


/* =========================================================
   FINANCIAL ANALYZER RESPONSE
========================================================= */

export interface FinancialAnalyzerResponse {
  start_date:
    string | null;

  end_date:
    string | null;

  /* =======================================================
     COUNTS
  ======================================================= */

  invoice_count:
    number;

  credit_note_count:
    number;

  /*
   * Backward-compatible field.
   * Currently represents GENERAL expense records.
   */
  expense_count:
    number;

  general_expense_count:
    number;

  finished_product_count:
    number;

  snapshot_finished_product_count:
    number;

  legacy_finished_product_count:
    number;

  /* =======================================================
     SALES REVENUE
  ======================================================= */

  gross_sales:
    string;

  credit_notes:
    string;

  net_sales:
    string;

  /* =======================================================
     FINISHED PRODUCT COST
  ======================================================= */

  actual_material_cost:
    string;

  actual_operation_cost:
    string;

  direct_production_cost:
    string;

  allocated_staff_cost:
    string;

  allocated_overhead_cost:
    string;

  allocated_indirect_cost:
    string;

  /*
   * Material
   * + Operation
   * + Direct Production Expense
   */
  production_direct_cost:
    string;

  /*
   * Complete Finished Product valuation:
   *
   * Production Direct Cost
   * + Allocated Staff
   * + Allocated Overhead
   */
  total_production_cost:
    string;

  /* =======================================================
     PERIOD COMPANY EXPENSES
  ======================================================= */

  staff_salary_cost:
    string;

  company_overhead_cost:
    string;

  total_general_expenses:
    string;

  /*
   * Salary
   * + Company Overhead
   * + General Expenses
   */
  total_expenses:
    string;

  /* =======================================================
     BUSINESS COST / PROFIT
  ======================================================= */

  /*
   * Production Direct Cost
   * + Period Company Expenses
   *
   * Allocated staff and overhead are not counted again here.
   */
  total_business_cost:
    string;

  net_profit:
    string;

  /* =======================================================
     RECURRING COST PERIOD
  ======================================================= */

  recurring_cost_start_date:
    string | null;

  recurring_cost_end_date:
    string | null;

  /* =======================================================
     GENERAL EXPENSE BREAKDOWN
  ======================================================= */

  expense_breakdown:
    ExpenseCategorySummary[];
}