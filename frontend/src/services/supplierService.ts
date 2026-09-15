import axios from "axios";

import type {
  Supplier,
  SupplierCreatePayload,
  SupplierUpdatePayload,
} from "../types/supplier";


const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";


function getAuthHeaders() {
  const token =
    localStorage.getItem("access_token");

  if (!token) {
    throw new Error(
      "Authentication required."
    );
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}


export async function getSuppliers(
  search?: string
): Promise<Supplier[]> {

  const response =
    await axios.get<Supplier[]>(
      `${API_BASE_URL}/suppliers`,
      {
        headers: getAuthHeaders(),

        params: {
          search:
            search?.trim() ||
            undefined,
        },
      }
    );

  return response.data;
}


export async function getSupplierById(
  supplierId: number
): Promise<Supplier> {

  const response =
    await axios.get<Supplier>(
      `${API_BASE_URL}/suppliers/${supplierId}`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function createSupplier(
  payload: SupplierCreatePayload
): Promise<Supplier> {

  const response =
    await axios.post<Supplier>(
      `${API_BASE_URL}/suppliers`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function updateSupplier(
  supplierId: number,
  payload: SupplierUpdatePayload
): Promise<Supplier> {

  const response =
    await axios.put<Supplier>(
      `${API_BASE_URL}/suppliers/${supplierId}`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function deactivateSupplier(
  supplierId: number
): Promise<void> {

  await axios.delete(
    `${API_BASE_URL}/suppliers/${supplierId}`,
    {
      headers: getAuthHeaders(),
    }
  );
}