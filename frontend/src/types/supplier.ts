export interface Supplier {
    id: number;
  
    supplier_code: string;
    company_name: string;
    contact_person: string;
  
    email: string;
    phone: string;
  
    gst_number: string;
  
    address: string;
    city: string;
    state: string;
    pincode: string;
  
    is_active: boolean;
  
    created_at: string;
    updated_at: string;
  }
  
  
  export interface SupplierCreatePayload {
    supplier_code: string;
    company_name: string;
    contact_person: string;
  
    email: string;
    phone: string;
  
    gst_number: string;
  
    address: string;
    city: string;
    state: string;
    pincode: string;
  
    is_active: boolean;
  }
  
  
  export type SupplierUpdatePayload =
    SupplierCreatePayload;