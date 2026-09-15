export interface Customer {
    id: number;
  
    customer_code: string;
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
  }
  
  
  export interface CustomerCreatePayload {
    customer_code: string;
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
  
  
  export type CustomerUpdatePayload =
    CustomerCreatePayload;