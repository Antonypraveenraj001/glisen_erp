import axios from "axios";

import type {
  SystemAlert,
  SystemAlertCount,
} from "../types/systemAlert";

const API_BASE_URL = import.meta.env.PROD
  ? "/api/v1"
  : "http://127.0.0.1:8000/api/v1";

function authorization(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/** These operations must also be authorized on the backend (Boss only). */
export const systemAlertService = {
  async list(token: string): Promise<SystemAlert[]> {
    const response = await axios.get<SystemAlert[]>(
      `${API_BASE_URL}/system-alerts`,
      {
        params: { limit: 50 },
        headers: authorization(token),
        timeout: 15000,
      },
    );
    return response.data;
  },

  async unacknowledgedCount(token: string): Promise<number> {
    const response = await axios.get<SystemAlertCount>(
      `${API_BASE_URL}/system-alerts/unacknowledged-count`,
      {
        headers: authorization(token),
        timeout: 15000,
      },
    );
    return response.data.unacknowledged_count;
  },

  async acknowledge(token: string, id: number): Promise<SystemAlert> {
    const response = await axios.post<SystemAlert>(
      `${API_BASE_URL}/system-alerts/${id}/acknowledge`,
      null,
      {
        headers: authorization(token),
        timeout: 15000,
      },
    );
    return response.data;
  },
};
