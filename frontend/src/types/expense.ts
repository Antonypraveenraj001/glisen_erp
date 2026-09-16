export const EXPENSE_CATEGORIES = [
    "Salary",
    "Rent",
    "Electricity",
    "Transport",
    "Maintenance",
    "Office",
    "Purchase-related",
    "Miscellaneous",
  ] as const;
  
  
  export type ExpenseCategory =
    (typeof EXPENSE_CATEGORIES)[number];
  
  
  export interface Expense {
    id: number;
  
    expense_date: string;
  
    category: ExpenseCategory;
  
    description: string;
  
    amount: string;
  
    payment_mode: string | null;
  
    reference_number: string | null;
  
    vendor_name: string | null;
  
    notes: string | null;
  
    created_by: number | null;
  
    created_at: string;
    updated_at: string;
  }
  
  
  export interface ExpenseListResponse {
    total: number;
  
    items: Expense[];
  }
  
  
  export interface ExpenseCreatePayload {
    expense_date: string;
  
    category: ExpenseCategory;
  
    description: string;
  
    amount: number;
  
    payment_mode?: string | null;
  
    reference_number?: string | null;
  
    vendor_name?: string | null;
  
    notes?: string | null;
  }
  
  
  export interface ExpenseUpdatePayload {
    expense_date?: string | null;
  
    category?: ExpenseCategory | null;
  
    description?: string | null;
  
    amount?: number | null;
  
    payment_mode?: string | null;
  
    reference_number?: string | null;
  
    vendor_name?: string | null;
  
    notes?: string | null;
  }
  
  
  export interface ExpenseFilters {
    start_date?: string;
  
    end_date?: string;
  
    category?: ExpenseCategory | "";
  
    search?: string;
  }