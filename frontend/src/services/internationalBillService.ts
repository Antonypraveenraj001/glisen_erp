import axios from "axios";
import type {
  InternationalBill,
  InternationalBillInput,
  InternationalBillPage,
  InternationalFinishedProduct,
} from "../types/internationalBill";

const API_BASE_URL =
  import.meta.env.PROD ? "/api/v1" : "http://127.0.0.1:8000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("Authentication required.");
  return { Authorization: `Bearer ${token}` };
}

export async function getInternationalBills(page: number, pageSize: number) {
  const response = await axios.get<InternationalBillPage>(
    `${API_BASE_URL}/international-bills`,
    { headers: authHeaders(), params: { page, page_size: pageSize } },
  );
  return response.data;
}

export async function getInternationalBill(id: number) {
  const response = await axios.get<InternationalBill>(
    `${API_BASE_URL}/international-bills/${id}`,
    { headers: authHeaders() },
  );
  return response.data;
}

export async function getInternationalFinishedProducts() {
  const response = await axios.get<InternationalFinishedProduct[]>(
    `${API_BASE_URL}/international-bills/finished-products`,
    { headers: authHeaders() },
  );
  return response.data;
}

export async function createInternationalBill(payload: InternationalBillInput) {
  const response = await axios.post<InternationalBill>(
    `${API_BASE_URL}/international-bills`,
    {
      ...payload,
      items: payload.items.map((item) => ({
        ...item,
        manual_unit_cost: item.finished_product_id
          ? null
          : (item.manual_unit_cost || null),
      })),
    },
    { headers: authHeaders() },
  );
  return response.data;
}
