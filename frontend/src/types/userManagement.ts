export interface ManagedRole {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
  }
  
  
  export interface ManagedUser {
    id: number;
  
    full_name: string;
    username: string;
    email: string;
  
    role_id: number;
    role: string;
  
    is_active: boolean;
  
    last_login: string | null;
    created_at: string;
    created_by: number | null;
  }
  
  
  export interface CreateManagedUserPayload {
    full_name: string;
    username: string;
    email: string;
    password: string;
    role_id: number;
  }
  
  
  export interface UpdateManagedUserPayload {
    full_name: string;
    username: string;
    email: string;
    role_id: number;
  }
  
  
  export interface ChangePasswordPayload {
    current_password: string;
    new_password: string;
  }
  
  
  export interface ResetPasswordPayload {
    new_password: string;
  }
  
  
  export interface PasswordActionResponse {
    message: string;
  }