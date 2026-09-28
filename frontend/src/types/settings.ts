export interface CompanySettings {
    id: number;
  
    company_name: string;
    gst_number: string;
    pan_number: string | null;
  
    state_name: string;
    state_code: string;
  
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  
    logo_path: string | null;
  
    bank_account_name: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_ifsc_code: string | null;
    bank_branch: string | null;
    upi_id: string | null;
  
    created_at: string;
    updated_at: string;
  }
  
  
  export interface CompanySettingsPayload {
    company_name: string;
    gst_number: string;
    pan_number: string | null;
  
    state_name: string;
    state_code: string;
  
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  
    bank_account_name: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_ifsc_code: string | null;
    bank_branch: string | null;
    upi_id: string | null;
  }
  
  
  export type PrintMode =
    | "company_header"
    | "letterhead";
  
  
  export interface DocumentSettings {
    id: number;
  
    default_print_mode: PrintMode;
  
    letterhead_top_space_mm: string;
  
    show_logo: boolean;
    show_gst_number: boolean;
    show_contact_details: boolean;
  
    show_bank_details_on_proforma: boolean;
    show_bank_details_on_final_bill: boolean;
  
    show_authorized_signature: boolean;
  
    authorized_signatory_name:
      string | null;
  
    authorized_signatory_designation:
      string | null;
  
    footer_text:
      string | null;
  
    proforma_validity_days:
      number;
  
    proforma_payment_terms:
      string | null;
  
    proforma_delivery_terms:
      string | null;
  
    proforma_terms_and_conditions:
      string | null;
  
    created_at: string;
    updated_at: string;
  }
  
  
  export interface DocumentSettingsPayload {
    default_print_mode: PrintMode;
  
    letterhead_top_space_mm: string;
  
    show_logo: boolean;
    show_gst_number: boolean;
    show_contact_details: boolean;
  
    show_bank_details_on_proforma: boolean;
    show_bank_details_on_final_bill: boolean;
  
    show_authorized_signature: boolean;
  
    authorized_signatory_name:
      string | null;
  
    authorized_signatory_designation:
      string | null;
  
    footer_text:
      string | null;
  
    proforma_validity_days:
      number;
  
    proforma_payment_terms:
      string | null;
  
    proforma_delivery_terms:
      string | null;
  
    proforma_terms_and_conditions:
      string | null;
  }
  
  
  export interface BusinessSettings {
    id: number;
  
    currency_code: string;
    timezone: string;
  
    default_gst_percent:
      string;
  
    default_page_size:
      number;
  
    financial_year_start_month:
      number;
  
    financial_year_start_day:
      number;
  
    enquiry_prefix: string;
    proforma_prefix: string;
    production_prefix: string;
  
    finished_goods_receipt_prefix:
      string;
  
    invoice_prefix: string;
    credit_note_prefix: string;
  
    sequence_digits:
      number;
  
    created_at: string;
    updated_at: string;
  }
  
  
  export interface BusinessSettingsPayload {
    currency_code: string;
    timezone: string;
  
    default_gst_percent:
      string;
  
    default_page_size:
      number;
  
    enquiry_prefix: string;
    proforma_prefix: string;
    production_prefix: string;
  
    finished_goods_receipt_prefix:
      string;
  
    invoice_prefix: string;
    credit_note_prefix: string;
  
    sequence_digits:
      number;
  }