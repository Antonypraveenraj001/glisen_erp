export interface PermissionMatrixItem {
    id: number;
  
    name: string;
    module: string;
    label: string;
  
    description: string | null;
  
    depends_on: string | null;
  
    boss_only: boolean;
  }
  
  
  export interface PermissionMatrixRole {
    id: number;
  
    name: string;
  
    description: string | null;
  
    is_active: boolean;
  
    protected: boolean;
  }
  
  
  export interface RolePermissionAssignment {
    role_id: number;
  
    permission_ids: number[];
  }
  
  
  export interface RolePermissionMatrixResponse {
    roles: PermissionMatrixRole[];
  
    permissions: PermissionMatrixItem[];
  
    assignments: RolePermissionAssignment[];
  }
  
  
  export interface UpdateRolePermissionsPayload {
    permission_ids: number[];
  }
  
  
  export interface UpdateRolePermissionsResponse {
    role_id: number;
  
    role_name: string;
  
    permission_ids: number[];
  
    message: string;
  }