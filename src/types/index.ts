export type UserRole = 'admin' | 'sub_admin' | 'cashier';

export interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  product_count?: number;
}

export interface ProductUnit {
  id: number;
  name: string;
  short_code: string;
  product_count?: number;
}

export interface Product {
  id: number;
  sku?: string;
  barcode: string;
  name: string;
  category_id: number;
  unit_id: number;
  stock_quantity: number;
  cost_price: number;
  sale_price: number;
  last_purchase_at?: string;
  // tax_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SaleType = 'pos_receipt' | 'invoice';
export type SaleStatus = 'draft' | 'completed' | 'cancelled';

export interface Sale {
  id: number;
  document_number: string;
  type: SaleType;
  customer_id?: number;
  cash_session_id?: number;
  status: SaleStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  paid_total: number;
  change_due: number;
  created_at: string;
  completed_at?: string;
  created_by_user_id: number;
}

export interface SaleLine {
  id: number;
  sale_id: number;
  product_id: number | null;
  product_name: string;
  qty: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  line_total: number;
}

export interface SalePayment {
  id: number;
  sale_id: number;
  method: string; // 'cash', 'card', etc.
  amount: number;
  paid_at: string;
  reference?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  tax_number: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  tax_number: string;
}

export type PurchaseStatus = 'draft' | 'completed';

export interface Purchase {
  id: number;
  supplier_id: number;
  status: PurchaseStatus;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  invoice_number: string;
  delivery_date: string;
  created_at: string;
  completed_at?: string;
  created_by_user_id: number;
}

export interface PurchaseLine {
  id: number;
  purchase_id: number;
  product_id: number;
  qty: number;
  unit_cost: number;
  tax_rate: number;
  line_total: number;
}

export type SessionStatus = 'open' | 'closed';

export interface CashSession {
  id: number;
  user_id: number;
  start_time: string;
  end_time?: string;
  opening_balance: number;
  expected_cash_balance?: number;
  actual_cash_balance?: number;
  difference?: number;
  status: SessionStatus;
}
