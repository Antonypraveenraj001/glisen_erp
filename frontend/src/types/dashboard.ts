export interface DashboardLiveProductionItem {
    production_order_id: number;
    production_number: string;
  
    proforma_id: number;
    proforma_number: string;
  
    company_name: string;
  
    product_id: number;
    product_code: string;
    product_name: string;
  
    quantity: number;
    status: string;
  
    planned_start_date: string | null;
    actual_start_date: string | null;
    actual_end_date: string | null;
  
    current_operation: string | null;
    machine_name: string | null;
    operation_status: string | null;
  }
  
  
  export interface DashboardQuarterPerformance {
    label: string;
  
    start_date: string;
    end_date: string;
  
    net_sales: string;
    production_cost: string;
    company_expenses: string;
    net_profit: string;
  }
  
  
  export interface DashboardMonthlySalesItem {
    month_key: string;
    month_label: string;
  
    start_date: string;
    end_date: string;
  
    net_sales: string;
    is_future: boolean;
  }
  
  
  export interface DashboardUnpaidPurchaseBill {
    purchase_bill_id: number;
    bill_number: string;
  
    supplier_id: number;
    supplier_name: string;
  
    bill_date: string;
  
    grand_total: string;
    paid_amount: string;
    balance_amount: string;
  
    payment_status: string;
  
    credit_days: number;
    due_date: string;
  
    days_unpaid: number;
    overdue_days: number;
  
    is_overdue: boolean;
  }
  
  
  export interface DashboardSummary {
    as_of: string;
  
    financial_year_label: string;
    financial_year_start: string;
    financial_year_end: string;
  
    /*
     * Boss only.
     *
     * Backend returns null for non-Boss users.
     */
    open_enquiries: number | null;
  
    /*
     * Boss only.
     */
    current_fy_net_profit: string | null;
  
    /*
     * Operational information.
     */
    live_production: DashboardLiveProductionItem[];
  
    /*
     * Boss only.
     */
    current_quarter: DashboardQuarterPerformance | null;
    previous_quarter: DashboardQuarterPerformance | null;
  
    /*
     * Boss only.
     *
     * Backend returns [] for non-Boss users.
     */
    monthly_sales: DashboardMonthlySalesItem[];
  
    /*
     * Boss / Accounts / Purchase.
     *
     * Backend returns [] for other roles.
     */
    unpaid_purchase_bills: DashboardUnpaidPurchaseBill[];
  }