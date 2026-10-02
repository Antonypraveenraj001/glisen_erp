import axios from "axios";

import type {
  OverheadRepeatPaymentCreatePayload,
  RecurringPaymentHistoryFilters,
  RecurringPaymentListResponse,
  RepeatPaymentBatchResponse,
  RepeatPaymentPreview,
  StaffRepeatPaymentCreatePayload,
} from "../types/recurringPayment";


const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";


function getAuthHeaders() {
  const token =
    localStorage.getItem(
      "access_token"
    );

  if (!token) {
    throw new Error(
      "Authentication required."
    );
  }

  return {
    Authorization:
      `Bearer ${token}`,
  };
}


/* =========================================================
   STAFF PREVIEW
========================================================= */

export async function getStaffRepeatPaymentPreview(
  periodStart: string,
  paymentDate: string
): Promise<RepeatPaymentPreview> {

  const response =
    await axios.get<RepeatPaymentPreview>(
      `${API_BASE_URL}/staff-salary-payments/preview`,
      {
        headers:
          getAuthHeaders(),

        params: {
          period_start:
            periodStart,

          payment_date:
            paymentDate,
        },
      }
    );

  return response.data;
}


/* =========================================================
   RECORD STAFF SALARY BATCH
========================================================= */

export async function recordStaffRepeatPayments(
  payload:
    StaffRepeatPaymentCreatePayload
): Promise<RepeatPaymentBatchResponse> {

  const response =
    await axios.post<RepeatPaymentBatchResponse>(
      `${API_BASE_URL}/staff-salary-payments`,
      payload,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


/* =========================================================
   OVERHEAD PREVIEW
========================================================= */

export async function getOverheadRepeatPaymentPreview(
  paymentDate: string
): Promise<RepeatPaymentPreview> {

  const response =
    await axios.get<RepeatPaymentPreview>(
      `${API_BASE_URL}/recurring-payments/overheads/preview`,
      {
        headers:
          getAuthHeaders(),

        params: {
          payment_date:
            paymentDate,
        },
      }
    );

  return response.data;
}


/* =========================================================
   RECORD OVERHEAD BATCH
========================================================= */

export async function recordOverheadRepeatPayments(
  payload:
    OverheadRepeatPaymentCreatePayload
): Promise<RepeatPaymentBatchResponse> {

  const response =
    await axios.post<RepeatPaymentBatchResponse>(
      `${API_BASE_URL}/recurring-payments/overheads`,
      payload,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


/* =========================================================
   PAYMENT HISTORY
========================================================= */

export async function getRecurringPaymentHistory(
  filters:
    RecurringPaymentHistoryFilters = {}
): Promise<RecurringPaymentListResponse> {

  const response =
    await axios.get<RecurringPaymentListResponse>(
      `${API_BASE_URL}/recurring-payments`,
      {
        headers:
          getAuthHeaders(),

        params: {
          payment_kind:
            filters.payment_kind
            || undefined,

          start_date:
            filters.start_date
            || undefined,

          end_date:
            filters.end_date
            || undefined,
        },
      }
    );

  return response.data;
}
