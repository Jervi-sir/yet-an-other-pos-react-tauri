import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  email: text('email'), // Made optional as we use username for login
  password_hash: text('password_hash').notNull(),
  role: text('role').notNull(), // admin, sub_admin, cashier
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const productCategories = sqliteTable('product_categories', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  parent_id: integer('parent_id', { mode: 'number' }),
});

export const productUnits = sqliteTable('product_units', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  short_code: text('short_code').notNull(),
});

export const products = sqliteTable('products', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  sku: text('sku'),
  barcode: text('barcode').notNull().unique(),
  name: text('name').notNull(),
  category_id: integer('category_id', { mode: 'number' }).references(() => productCategories.id),
  unit_id: integer('unit_id', { mode: 'number' }).references(() => productUnits.id),
  stock_quantity: real('stock_quantity').notNull().default(0),
  cost_price: real('cost_price').notNull(),
  sale_price: real('sale_price').notNull(),
  last_purchase_at: text('last_purchase_at'),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
});

export const customers = sqliteTable('customers', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  tax_number: text('tax_number'),
});

export const suppliers = sqliteTable('suppliers', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  contact_name: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  tax_number: text('tax_number'),
});

export const sales = sqliteTable('sales', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  document_number: text('document_number').notNull(),
  type: text('type').notNull(), // pos_receipt, invoice
  customer_id: integer('customer_id', { mode: 'number' }).references(() => customers.id),
  cash_session_id: integer('cash_session_id', { mode: 'number' }).references(() => cashSessions.id),
  status: text('status').notNull(),
  subtotal: real('subtotal').notNull(),
  discount_total: real('discount_total').notNull(),
  tax_total: real('tax_total').notNull(),
  grand_total: real('grand_total').notNull(),
  paid_total: real('paid_total').notNull(),
  change_due: real('change_due').notNull(),
  created_at: text('created_at').notNull(),
  completed_at: text('completed_at'),
  created_by_user_id: integer('created_by_user_id', { mode: 'number' }).references(() => users.id),
});

export const saleLines = sqliteTable('sale_lines', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  sale_id: integer('sale_id', { mode: 'number' }).notNull().references(() => sales.id),
  product_id: integer('product_id', { mode: 'number' }).references(() => products.id),
  product_name: text('product_name').notNull(),
  qty: real('qty').notNull(),
  unit_price: real('unit_price').notNull(),
  discount: real('discount').notNull(),
  tax_rate: real('tax_rate').notNull(),
  line_total: real('line_total').notNull(),
});

export const salePayments = sqliteTable('sale_payments', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  sale_id: integer('sale_id', { mode: 'number' }).notNull().references(() => sales.id),
  method: text('method').notNull(),
  amount: real('amount').notNull(),
  paid_at: text('paid_at').notNull(),
  reference: text('reference'),
});

export const purchases = sqliteTable('purchases', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  supplier_id: integer('supplier_id', { mode: 'number' }).notNull().references(() => suppliers.id),
  status: text('status').notNull(),
  subtotal: real('subtotal').notNull(),
  discount_total: real('discount_total').notNull(),
  tax_total: real('tax_total').notNull(),
  grand_total: real('grand_total').notNull(),
  invoice_number: text('invoice_number').notNull(),
  delivery_date: text('delivery_date').notNull(),
  created_at: text('created_at').notNull(),
  completed_at: text('completed_at'),
  created_by_user_id: integer('created_by_user_id', { mode: 'number' }).references(() => users.id),
});

export const purchaseLines = sqliteTable('purchase_lines', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  purchase_id: integer('purchase_id', { mode: 'number' }).notNull().references(() => purchases.id),
  product_id: integer('product_id', { mode: 'number' }).notNull().references(() => products.id),
  qty: real('qty').notNull(),
  unit_cost: real('unit_cost').notNull(),
  tax_rate: real('tax_rate').notNull(),
  line_total: real('line_total').notNull(),
});

export const cashSessions = sqliteTable('cash_sessions', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  user_id: integer('user_id', { mode: 'number' }).notNull().references(() => users.id),
  start_time: text('start_time').notNull(),
  end_time: text('end_time'),
  opening_balance: real('opening_balance').notNull(),
  expected_cash_balance: real('expected_cash_balance'),
  actual_cash_balance: real('actual_cash_balance'),
  difference: real('difference'),
  status: text('status').notNull(), // open, closed
});
