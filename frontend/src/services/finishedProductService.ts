import axios from "axios";

import type {
  FinishedProduct,
  FinishedProductTraceability,
} from "../types/finishedProduct";


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
   GET ALL FINISHED PRODUCTS
========================================================= */

export async function getFinishedProducts():
Promise<FinishedProduct[]> {

  const response =
    await axios.get<
      FinishedProduct[]
    >(
      `${API_BASE_URL}/finished-products`,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


/* =========================================================
   GET BY ID
========================================================= */

export async function getFinishedProductById(
  finishedProductId: number
): Promise<FinishedProduct> {

  const response =
    await axios.get<
      FinishedProduct
    >(
      `${API_BASE_URL}/finished-products/${finishedProductId}`,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


/* =========================================================
   GET BY NUMBER
========================================================= */

export async function getFinishedProductByNumber(
  finishedProductNumber: string
): Promise<FinishedProduct> {

  const response =
    await axios.get<
      FinishedProduct
    >(
      `${API_BASE_URL}/finished-products/number/${encodeURIComponent(
        finishedProductNumber
      )}`,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


/* =========================================================
   GET BY PRODUCTION ORDER
========================================================= */

export async function getFinishedProductByProductionOrder(
  productionOrderId: number
): Promise<FinishedProduct> {

  const response =
    await axios.get<
      FinishedProduct
    >(
      `${API_BASE_URL}/finished-products/production-orders/${productionOrderId}`,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


/* =========================================================
   TRACEABILITY BY ID
========================================================= */

export async function getFinishedProductTraceability(
  finishedProductId: number
): Promise<FinishedProductTraceability> {

  const response =
    await axios.get<
      FinishedProductTraceability
    >(
      `${API_BASE_URL}/finished-products/${finishedProductId}/traceability`,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


/* =========================================================
   TRACEABILITY BY NUMBER
========================================================= */

export async function getFinishedProductTraceabilityByNumber(
  finishedProductNumber: string
): Promise<FinishedProductTraceability> {

  const response =
    await axios.get<
      FinishedProductTraceability
    >(
      `${API_BASE_URL}/finished-products/number/${encodeURIComponent(
        finishedProductNumber
      )}/traceability`,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}