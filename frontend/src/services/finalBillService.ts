import axios from "axios";

import type {
  FinalBill,
  FinalBillCreateFromProformaPayload,
  FinalBillCreditNoteCreatePayload,
  FinalBillItemUpdatePayload,
  FinalBillRevisionCreatePayload,
  FinalBillUpdatePayload,
} from "../types/finalBill";

import type {
  FinalBillPayment,
  FinalBillPaymentCreatePayload,
  FinalBillPaymentSummary,
} from "../types/finalBillPayment";


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
   GET FINAL BILLS
========================================================= */

export async function getFinalBills():
Promise<FinalBill[]> {

  const response =
    await axios.get<
      FinalBill[]
    >(
      `${API_BASE_URL}/final-bills`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


/* =========================================================
   GET FINAL BILL
========================================================= */

export async function getFinalBillById(
  finalBillId: number
): Promise<FinalBill> {

  const response =
    await axios.get<
      FinalBill
    >(
      `${API_BASE_URL}/final-bills/${finalBillId}`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


/* =========================================================
   CREATE FROM PROFORMA
========================================================= */

export async function createFinalBillFromProforma(
  proformaId: number,
  payload:
    FinalBillCreateFromProformaPayload
): Promise<FinalBill> {

  const response =
    await axios.post<
      FinalBill
    >(
      `${API_BASE_URL}/final-bills/from-proforma/${proformaId}`,
      payload,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


/* =========================================================
   UPDATE DRAFT BILL
========================================================= */

export async function updateFinalBill(
  finalBillId: number,
  payload:
    FinalBillUpdatePayload
): Promise<FinalBill> {

  const response =
    await axios.put<
      FinalBill
    >(
      `${API_BASE_URL}/final-bills/${finalBillId}`,
      payload,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


/* =========================================================
   UPDATE DRAFT ITEM
========================================================= */

export async function updateFinalBillItem(
  finalBillId: number,
  itemId: number,
  payload:
    FinalBillItemUpdatePayload
): Promise<FinalBill> {

  const response =
    await axios.put<
      FinalBill
    >(
      `${API_BASE_URL}/final-bills/${finalBillId}/items/${itemId}`,
      payload,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


/* =========================================================
   ISSUE BILL
========================================================= */

export async function issueFinalBill(
  finalBillId: number
): Promise<FinalBill> {

  const response =
    await axios.patch<
      FinalBill
    >(
      `${API_BASE_URL}/final-bills/${finalBillId}/issue`,
      null,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


/* =========================================================
   REVISED INVOICE
========================================================= */

export async function createFinalBillRevision(
  finalBillId: number,
  payload:
    FinalBillRevisionCreatePayload
): Promise<FinalBill> {

  const response =
    await axios.post<
      FinalBill
    >(
      `${API_BASE_URL}/final-bills/${finalBillId}/revise`,
      payload,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


/* =========================================================
   CREDIT NOTE
========================================================= */

export async function createFinalBillCreditNote(
  finalBillId: number,
  payload:
    FinalBillCreditNoteCreatePayload
): Promise<FinalBill> {

  const response =
    await axios.post<
      FinalBill
    >(
      `${API_BASE_URL}/final-bills/${finalBillId}/credit-note`,
      payload,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


/* =========================================================
   PAYMENT SUMMARY
========================================================= */

export async function getFinalBillPaymentSummary(
  finalBillId: number
): Promise<FinalBillPaymentSummary> {

  const response =
    await axios.get<
      FinalBillPaymentSummary
    >(
      `${API_BASE_URL}/final-bills/${finalBillId}/payment-summary`,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}


/* =========================================================
   RECORD CUSTOMER PAYMENT
========================================================= */

export async function createFinalBillPayment(
  finalBillId: number,
  payload:
    FinalBillPaymentCreatePayload
): Promise<FinalBillPayment> {

  const response =
    await axios.post<
      FinalBillPayment
    >(
      `${API_BASE_URL}/final-bills/${finalBillId}/payments`,
      payload,
      {
        headers:
          getAuthHeaders(),
      }
    );


  return response.data;
}