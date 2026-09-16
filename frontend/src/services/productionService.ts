import axios from "axios";

import type {
  ProductionMaterial,
  ProductionMaterialCreatePayload,
  ProductionMaterialSummary,
  ProductionMaterialUpdatePayload,
  ProductionOperation,
  ProductionOperationCreatePayload,
  ProductionOperationUpdatePayload,
  ProductionOrder,
  ProductionOrderCreatePayload,
  ProductionOrderDetail,
  ProductionOrderUpdatePayload,
} from "../types/production";


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


/* =========================================================
   PRODUCTION ORDERS
========================================================= */

export async function getProductionOrders():
Promise<ProductionOrder[]> {

  const response =
    await axios.get<ProductionOrder[]>(
      `${API_BASE_URL}/production/orders`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function getProductionOrderById(
  productionOrderId: number
): Promise<ProductionOrder> {

  const response =
    await axios.get<ProductionOrder>(
      `${API_BASE_URL}/production/orders/${productionOrderId}`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function getProductionOrderDetail(
  productionOrderId: number
): Promise<ProductionOrderDetail> {

  const response =
    await axios.get<ProductionOrderDetail>(
      `${API_BASE_URL}/production/orders/${productionOrderId}/detail`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function getProductionOrderByNumber(
  productionNumber: string
): Promise<ProductionOrder> {

  const response =
    await axios.get<ProductionOrder>(
      `${API_BASE_URL}/production/orders/number/${encodeURIComponent(
        productionNumber
      )}`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function getProductionOrdersByProforma(
  proformaId: number
): Promise<ProductionOrder[]> {

  const response =
    await axios.get<ProductionOrder[]>(
      `${API_BASE_URL}/production/orders/proforma/${proformaId}`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function createProductionOrder(
  payload: ProductionOrderCreatePayload
): Promise<ProductionOrder> {

  const response =
    await axios.post<ProductionOrder>(
      `${API_BASE_URL}/production/orders`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function createProductionOrdersFromProforma(
  proformaId: number
): Promise<ProductionOrder[]> {

  const response =
    await axios.post<ProductionOrder[]>(
      `${API_BASE_URL}/production/orders/from-proforma/${proformaId}`,
      null,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function updateProductionOrder(
  productionOrderId: number,
  payload: ProductionOrderUpdatePayload
): Promise<ProductionOrder> {

  const response =
    await axios.put<ProductionOrder>(
      `${API_BASE_URL}/production/orders/${productionOrderId}`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function updateProductionOrderStatus(
  productionOrderId: number,
  statusValue: string
): Promise<ProductionOrder> {

  const response =
    await axios.patch<ProductionOrder>(
      `${API_BASE_URL}/production/orders/${productionOrderId}/status`,
      null,
      {
        headers: getAuthHeaders(),

        params: {
          status_value:
            statusValue,
        },
      }
    );

  return response.data;
}


export async function completeProductionOrder(
  productionOrderId: number
): Promise<ProductionOrder> {

  const response =
    await axios.patch<ProductionOrder>(
      `${API_BASE_URL}/production/orders/${productionOrderId}/complete`,
      null,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function deleteProductionOrder(
  productionOrderId: number
): Promise<void> {

  await axios.delete(
    `${API_BASE_URL}/production/orders/${productionOrderId}`,
    {
      headers: getAuthHeaders(),
    }
  );
}


/* =========================================================
   PRODUCTION MATERIALS
========================================================= */

export async function getProductionMaterials(
  productionOrderId: number
): Promise<ProductionMaterial[]> {

  const response =
    await axios.get<ProductionMaterial[]>(
      `${API_BASE_URL}/production/orders/${productionOrderId}/materials`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function getProductionMaterialSummary(
  productionOrderId: number
): Promise<ProductionMaterialSummary> {

  const response =
    await axios.get<ProductionMaterialSummary>(
      `${API_BASE_URL}/production/orders/${productionOrderId}/materials/summary`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function createProductionMaterial(
  productionOrderId: number,
  payload: ProductionMaterialCreatePayload
): Promise<ProductionMaterial> {

  const response =
    await axios.post<ProductionMaterial>(
      `${API_BASE_URL}/production/orders/${productionOrderId}/materials`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function updateProductionMaterial(
  materialId: number,
  payload: ProductionMaterialUpdatePayload
): Promise<ProductionMaterial> {

  const response =
    await axios.put<ProductionMaterial>(
      `${API_BASE_URL}/production/materials/${materialId}`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function deleteProductionMaterial(
  materialId: number
): Promise<void> {

  await axios.delete(
    `${API_BASE_URL}/production/materials/${materialId}`,
    {
      headers: getAuthHeaders(),
    }
  );
}


/* =========================================================
   PRODUCTION OPERATIONS
========================================================= */

export async function getProductionOperations(
  productionOrderId: number
): Promise<ProductionOperation[]> {

  const response =
    await axios.get<ProductionOperation[]>(
      `${API_BASE_URL}/production/orders/${productionOrderId}/operations`,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function createProductionOperation(
  productionOrderId: number,
  payload: ProductionOperationCreatePayload
): Promise<ProductionOperation> {

  const response =
    await axios.post<ProductionOperation>(
      `${API_BASE_URL}/production/orders/${productionOrderId}/operations`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}


export async function updateProductionOperation(
  operationId: number,
  payload: ProductionOperationUpdatePayload
): Promise<ProductionOperation> {

  const response =
    await axios.put<ProductionOperation>(
      `${API_BASE_URL}/production/operations/${operationId}`,
      payload,
      {
        headers: getAuthHeaders(),
      }
    );

  return response.data;
}