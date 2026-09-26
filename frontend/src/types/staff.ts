export interface Staff {
    id: number;
  
    staff_name: string;
  
    designation:
      string | null;
  
    monthly_salary:
      string;
  
    joining_date:
      string | null;
  
    relieving_date:
      string | null;
  
    is_active:
      boolean;
  
    notes:
      string | null;
  
    created_at:
      string;
  
    updated_at:
      string;
  }
  
  
  export interface StaffListResponse {
    total: number;
  
    items: Staff[];
  }
  
  
  export interface StaffCreatePayload {
    staff_name: string;
  
    designation?:
      string | null;
  
    monthly_salary:
      number;
  
    joining_date?:
      string | null;
  
    relieving_date?:
      string | null;
  
    notes?:
      string | null;
  }
  
  
  export interface StaffUpdatePayload {
    staff_name?:
      string | null;
  
    designation?:
      string | null;
  
    monthly_salary?:
      number | null;
  
    joining_date?:
      string | null;
  
    relieving_date?:
      string | null;
  
    is_active?:
      boolean | null;
  
    notes?:
      string | null;
  }
  
  
  export interface StaffFilters {
    active_only?:
      boolean;
  
    search?:
      string;
  }