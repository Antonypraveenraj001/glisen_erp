export type RecurringPaymentKind =
  | "STAFF_SALARY"
  | "OVERHEAD";


export type MoneyValue =
  string | number;


/* =========================================================
   PREVIEW
========================================================= */

export interface RepeatPaymentPreviewItem {
  source_id: number;

  source_name: string;

  secondary_text:
    string | null;

  category:
    string | null;

  amount: MoneyValue;

  already_paid: boolean;

  existing_payment_id:
    number | null;

  existing_payment_date:
    string | null;
}


export interface RepeatPaymentPreview {
  payment_kind:
    RecurringPaymentKind;

  payment_date: string;

  period_start: string;

  total_items: number;

  unpaid_items: number;

  already_paid_items: number;

  total_unpaid_amount:
    MoneyValue;

  items:
    RepeatPaymentPreviewItem[];
}


/* =========================================================
   PAYMENT HISTORY
========================================================= */

export interface RecurringPayment {
  id: number;

  payment_kind:
    RecurringPaymentKind;

  staff_id:
    number | null;

  expense_id:
    number | null;

  source_name: string;

  category:
    string | null;

  period_start: string;

  payment_date: string;

  amount: MoneyValue;

  payment_mode:
    string | null;

  reference_number:
    string | null;

  notes:
    string | null;

  created_by: number;

  created_at: string;
}


export interface RecurringPaymentListResponse {
  total: number;

  items:
    RecurringPayment[];
}


/* =========================================================
   CREATE PAYLOADS
========================================================= */

export interface RepeatPaymentBasePayload {
  payment_date: string;

  payment_mode?:
    string | null;

  reference_number?:
    string | null;

  notes?:
    string | null;
}


export interface StaffRepeatPaymentCreatePayload
  extends RepeatPaymentBasePayload {

  period_start: string;

  staff_ids: number[];
}


export interface OverheadRepeatPaymentCreatePayload
  extends RepeatPaymentBasePayload {

  expense_ids: number[];
}


/* =========================================================
   BATCH RESPONSE
========================================================= */

export interface RepeatPaymentBatchResponse {
  payment_kind:
    RecurringPaymentKind;

  payment_date: string;

  period_start: string;

  created_count: number;

  total_amount:
    MoneyValue;

  payments:
    RecurringPayment[];
}


/* =========================================================
   HISTORY FILTERS
========================================================= */

export interface RecurringPaymentHistoryFilters {
  payment_kind?:
    RecurringPaymentKind;

  start_date?: string;

  end_date?: string;
}
