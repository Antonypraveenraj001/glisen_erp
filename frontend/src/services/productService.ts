import axios from "axios";

import type {
  Product,
  ProductCreatePayload,
  ProductUpdatePayload,
} from "../types/product";


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


export async function getProducts(
  search?: string
): Promise<Product[]> {

  const response =
    await axios.get<Product[]>(
      `${API_BASE_URL}/products`,
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


export async function getProductById(
  productId: number
): Promise<Product> {

  const response =
    await axios.get<Product>(
      `${API_BASE_URL}/products/${productId}`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function createProduct(
  payload: ProductCreatePayload
): Promise<Product> {

  const response =
    await axios.post<Product>(
      `${API_BASE_URL}/products`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function updateProduct(
  productId: number,
  payload: ProductUpdatePayload
): Promise<Product> {

  const response =
    await axios.put<Product>(
      `${API_BASE_URL}/products/${productId}`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function deactivateProduct(
  productId: number
): Promise<void> {

  await axios.delete(
    `${API_BASE_URL}/products/${productId}`,
    {
      headers: getAuthHeaders(),
    }
  );
}