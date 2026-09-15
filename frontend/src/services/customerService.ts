import axios from "axios";

import type {
  Customer,
  CustomerCreatePayload,
  CustomerUpdatePayload,
} from "../types/customer";


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


export async function getCustomers(
  search?: string
): Promise<Customer[]> {

  const response =
    await axios.get<Customer[]>(
      `${API_BASE_URL}/customers`,
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


export async function getCustomerById(
  customerId: number
): Promise<Customer> {

  const response =
    await axios.get<Customer>(
      `${API_BASE_URL}/customers/${customerId}`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function createCustomer(
  payload: CustomerCreatePayload
): Promise<Customer> {

  const response =
    await axios.post<Customer>(
      `${API_BASE_URL}/customers`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function updateCustomer(
  customerId: number,
  payload: CustomerUpdatePayload
): Promise<Customer> {

  const response =
    await axios.put<Customer>(
      `${API_BASE_URL}/customers/${customerId}`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function deactivateCustomer(
  customerId: number
): Promise<void> {

  await axios.delete(
    `${API_BASE_URL}/customers/${customerId}`,
    {
      headers: getAuthHeaders(),
    }
  );
}