import type { User, ProductCategory, Product, Customer, Supplier, Sale, ProductUnit } from "@/types";

export const initialUsers: User[] = [
  {
    id: 1,
    name: 'Admin User',
    username: 'admin',
    email: 'admin@pos.com',
    password_hash: 'admin',
    role: 'admin',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Manager',
    username: 'manager',
    email: 'manager@pos.com',
    password_hash: 'manager',
    role: 'sub_admin',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Cashier One',
    username: 'cashier',
    email: 'cashier@pos.com',
    password_hash: 'cashier',
    role: 'cashier',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const initialCategories: ProductCategory[] = [
  { id: 1, name: 'Beverages' },
  { id: 2, name: 'Snacks' },
  { id: 3, name: 'Electronics' },
];

export const initialUnits: ProductUnit[] = [
  { id: 1, name: 'Piece', short_code: 'pcs' },
  { id: 2, name: 'Kilogram', short_code: 'kg' },
  { id: 3, name: 'Can', short_code: 'can' },
  { id: 4, name: 'Bag', short_code: 'bag' },
];

export const initialProducts: Product[] = [
  {
    id: 1,
    sku: 'BEV-001',
    barcode: '1001',
    name: 'Cola Can 330ml',
    category_id: 1,
    unit_id: 3, // Can
    cost_price: 0.5,
    sale_price: 1.5,
    stock_quantity: 50,
    // tax_rate: 0.1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    sku: 'SNK-001',
    barcode: '2001',
    name: 'Chips Salted',
    category_id: 2,
    unit_id: 4, // Bag
    cost_price: 0.8,
    sale_price: 2.0,
    stock_quantity: 30,
    // tax_rate: 0.1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    sku: 'ELE-001',
    barcode: '3001',
    name: 'USB Cable',
    category_id: 3,
    unit_id: 1, // Piece
    cost_price: 2.0,
    sale_price: 5.0,
    stock_quantity: 10,
    // tax_rate: 0.2,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const initialCustomers: Customer[] = [
  {
    id: 1,
    name: 'Walk-in Customer',
    email: '',
    phone: '',
    address: '',
    tax_number: '',
  },
  {
    id: 2,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-0101',
    address: '123 Main St',
    tax_number: '123456789',
  },
];

export const initialSuppliers: Supplier[] = [
  {
    id: 1,
    name: 'Acme Supplies',
    contact_name: 'Road Runner',
    phone: '555-beep',
    email: 'contact@acme.com',
    address: 'Desert Road 1',
    tax_number: 'TAX-001',
  },
];

export const initialSales: Sale[] = [];
