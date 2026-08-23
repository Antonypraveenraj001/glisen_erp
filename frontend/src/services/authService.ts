import axios from "axios";
import type {
  LoginRequest,
  LoginResponse,
  User,
} from "../types/auth";

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const formData = new URLSearchParams();

    formData.append("username", data.username);
    formData.append("password", data.password);

    const response = await axios.post<LoginResponse>(
      `${API_BASE_URL}/auth/login`,
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  },

  async getCurrentUser(token: string): Promise<User> {
    const response = await axios.get<User>(
      `${API_BASE_URL}/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  },

  logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  },
};