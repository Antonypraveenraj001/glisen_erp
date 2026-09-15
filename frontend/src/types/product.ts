export interface Product {
    id: number;
  
    product_code: string;
    product_name: string;
  
    description: string | null;
  
    category: string;
    unit: string;
    hsn_code: string;
  
    gst_percentage: string;
    purchase_price: string;
    selling_price: string;
  
    minimum_stock: string;
    maximum_stock: string;
    current_stock: string;
  
    is_active: boolean;
  
    created_at: string;
    updated_at: string;
  }
  
  
  export interface ProductCreatePayload {
    product_code: string;
    product_name: string;
  
    description: string | null;
  
    category: string;
    unit: string;
    hsn_code: string;
  
    gst_percentage: number;
    purchase_price: number;
    selling_price: number;
  
    minimum_stock: number;
    maximum_stock: number;
    current_stock: number;
  
    is_active: boolean;
  }
  
  
  export type ProductUpdatePayload =
    ProductCreatePayload;