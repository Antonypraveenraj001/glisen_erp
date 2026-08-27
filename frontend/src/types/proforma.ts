export interface ProformaItem {
    id: number;
    proforma_id: number;
    product_id: number | null;
    description: string | null;
    quantity: string | number;
    unit: string | null;
    unit_price: string | number;
    discount_percent: string | number;
    tax_percent: string | number;
    discount_amount: string | number;
    taxable_amount: string | number;
    tax_amount: string | number;
    line_total: string | number;
  }
  
  export interface Proforma {
    id: number;
    proforma_number: string;
    proforma_date: string;
  
    enquiry_id: number;
    customer_id: number;
  
    company_name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
  
    billing_address: string | null;
    shipping_address: string | null;
  
    validity_days: number | null;
  
    payment_terms: string | null;
    delivery_terms: string | null;
  
    notes: string | null;
    terms_and_conditions: string | null;
  
    status: string;
  
    subtotal: string | number;
    discount_amount: string | number;
    taxable_amount: string | number;
    tax_amount: string | number;
    grand_total: string | number;
  
    created_at: string;
    updated_at: string;
  
    items: ProformaItem[];
  }
  
  export interface ProformaItemCreate {
    product_id: number | null;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    discount_percent: number;
    tax_percent: number;
  }
  
  export interface ProformaCreate {
    proforma_date: string;
    enquiry_id: number;
    customer_id: number;
  
    company_name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
  
    billing_address: string | null;
    shipping_address: string | null;
  
    validity_days: number | null;
  
    payment_terms: string | null;
    delivery_terms: string | null;
  
    notes: string | null;
    terms_and_conditions: string | null;
  
    status: string;
  
    items: ProformaItemCreate[];
  }
  
  export type ProformaUpdate = Partial<ProformaCreate>;
  
  export interface ProformaFilters {
    search?: string;
    status?: string;
    customer_id?: number;
    enquiry_id?: number;
  }