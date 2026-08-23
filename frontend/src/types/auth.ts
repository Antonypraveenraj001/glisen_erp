export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  full_name: string;
  username: string;
  email: string;
  role: string;
  role_id: number;
  is_active: boolean;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;

  login: (token: string, user: User) => void;

  logout: () => void;

  isAuthenticated: boolean;

  isAuthLoading: boolean;
}