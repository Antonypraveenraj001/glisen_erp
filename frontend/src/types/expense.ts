export const EXPENSE_TYPES = [
  "GENERAL",
  "OVERHEAD",
  "DIRECT_PRODUCTION",
] as const;


export type ExpenseType =
  (typeof EXPENSE_TYPES)[number];


export const EXPENSE_CATEGORIES = [
  "Salary",
  "Rent",
  "Electricity",
  "Cleaning",
  "Maintenance",
  "Office",
  "Internet / Telephone",
  "Security",
  "Transport",
  "Outside Machining",
  "Special Labour",
  "Crane / Loading",
  "Painting",
  "Installation",
  "Job Travel",
  "Testing",
  "Packing",
  "Purchase-related",
  "Other Overhead",
  "Other Direct",
  "Miscellaneous",
] as const;


export type ExpenseCategory =
  (typeof EXPENSE_CATEGORIES)[number];


/* =========================================================
   EXPENSE
========================================================= */

export interface Expense {
  id: number;

  expense_date: string;

  expense_type: ExpenseType;

  category: ExpenseCategory;

  description: string;

  amount: string;

  /*
   * Internal Production Order relationship.
   *
   * Null for GENERAL / OVERHEAD.
   *
   * DIRECT_PRODUCTION expenses contain a Production Order ID,
   * but the user-facing UI will show the production number and
   * manufactured product name instead of the database ID.
   */
  production_order_id:
    number | null;

  payment_mode:
    string | null;

  reference_number:
    string | null;

  vendor_name:
    string | null;

  notes:
    string | null;

  created_by:
    number | null;

  created_at:
    string;

  updated_at:
    string;
}


/* =========================================================
   LIST RESPONSE
========================================================= */

export interface ExpenseListResponse {
  total: number;

  items: Expense[];
}


/* =========================================================
   CREATE
========================================================= */

export interface ExpenseCreatePayload {
  expense_date: string;

  /*
   * Optional temporarily so the existing Expense page
   * continues to work until we replace it.
   *
   * Backend defaults missing values to GENERAL.
   */
  expense_type?: ExpenseType;

  category: ExpenseCategory;

  description: string;

  amount: number;

  production_order_id?:
    number | null;

  payment_mode?:
    string | null;

  reference_number?:
    string | null;

  vendor_name?:
    string | null;

  notes?:
    string | null;
}


/* =========================================================
   UPDATE
========================================================= */

export interface ExpenseUpdatePayload {
  expense_date?:
    string | null;

  expense_type?:
    ExpenseType | null;

  category?:
    ExpenseCategory | null;

  description?:
    string | null;

  amount?:
    number | null;

  production_order_id?:
    number | null;

  payment_mode?:
    string | null;

  reference_number?:
    string | null;

  vendor_name?:
    string | null;

  notes?:
    string | null;
}


/* =========================================================
   FILTERS
========================================================= */

export interface ExpenseFilters {
  start_date?: string;

  end_date?: string;

  expense_type?:
    ExpenseType | "";

  category?:
    ExpenseCategory | "";

  production_order_id?:
    number | null;

  search?: string;
}