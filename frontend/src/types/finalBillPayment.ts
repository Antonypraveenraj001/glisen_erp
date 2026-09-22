export type FinalBillPaymentStatus =
  | "Not Issued"
  | "Pending"
  | "Partially Paid"
  | "Paid"
  | "N/A";


export interface FinalBillPayment {
  id: number;

  final_bill_id: number;

  payment_date: string;

  amount: string;

  payment_type: string | null;

  payment_mode: string | null;

  reference_number: string | null;

  notes: string | null;

  created_by: number;

  created_at: string;
}


export interface FinalBillPaymentCreatePayload {
  payment_date: string;

  amount: number;

  payment_type?: string | null;

  payment_mode?: string | null;

  reference_number?: string | null;

  notes?: string | null;
}


export interface FinalBillPaymentSummary {
  final_bill_id: number;

  invoice_number: string;

  effective_invoice_id: number | null;

  effective_invoice_number: string | null;

  is_effective_invoice: boolean;

  grand_total: string;

  credit_note_total: string;

  receivable_amount: string;

  paid_amount: string;

  balance_amount: string;

  payment_status:
    FinalBillPaymentStatus;

  payments: FinalBillPayment[];
}