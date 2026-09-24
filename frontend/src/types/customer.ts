export interface Customer {
  id: number;

  customer_code: string;

  company_name: string;

  contact_person: string | null;

  email: string | null;

  phone: string | null;

  gst_number: string | null;

  address: string | null;

  city: string | null;

  state: string | null;

  pincode: string | null;

  // Internal legacy field only.
  // Not controlled from the Customer UI.
  is_active: boolean;

  created_at: string;

  updated_at: string | null;
}


export interface CustomerUpdatePayload {
  company_name: string;

  contact_person: string;

  email: string;

  phone: string;

  address: string;

  city: string;

  state: string;

  pincode: string;
}