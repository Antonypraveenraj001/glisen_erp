export interface ExpenseCategorySummary {
    category: string;
    amount: string;
    count: number;
  }
  
  export interface FinancialAnalyzerResponse {
    start_date: string | null;
    end_date: string | null;
  
    invoice_count: number;
    credit_note_count: number;
    expense_count: number;
  
    gross_sales: string;
    credit_notes: string;
    net_sales: string;
  
    total_expenses: string;
    net_profit: string;
  
    expense_breakdown: ExpenseCategorySummary[];
  }