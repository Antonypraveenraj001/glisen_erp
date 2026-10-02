import axios from "axios";

import type {
  Staff,
} from "../types/staff";


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


export async function reactivateStaff(
  staffId: number
): Promise<Staff> {

  const response =
    await axios.post<Staff>(
      `${API_BASE_URL}/staff-lifecycle/${staffId}/reactivate`,
      null,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


export async function deleteStaffFromMaster(
  staffId: number
): Promise<void> {

  await axios.delete(
    `${API_BASE_URL}/staff-lifecycle/${staffId}/master`,
    {
      headers:
        getAuthHeaders(),
    }
  );
}
