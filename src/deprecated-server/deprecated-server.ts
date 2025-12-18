import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { db } from '../src/db';
import { users, products, productCategories, productUnits, customers, suppliers, sales, saleLines, salePayments, cashSessions } from '../src/db/schema';
import { eq, desc, sql, and, or } from 'drizzle-orm';

const app = new Hono();

app.use('/*', cors());

app.get('/', (c) => c.text('POS API Running'));

// Logging Middleware
app.use('*', async (c, next) => {
  // 1. Log Request
  const method = c.req.method;
  const url = c.req.url;

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      // Clone the request to read body without consuming it for downstream
      const cloned = c.req.raw.clone();
      const body = await cloned.json();
      console.log(`\n➡ [REQ] ${method} ${url}:`, JSON.stringify(body, null, 2));
    } catch (e) {
      console.log(`\n➡ [REQ] ${method} ${url}: (Empty or Non-JSON Body)`);
    }
  } else {
    console.log(`\n➡ [REQ] ${method} ${url}`);
  }

  // 2. Intercept Response (c.json)
  const originalJson = c.json.bind(c);
  // @ts-ignore
  c.json = function (data: any, status?: any, headers?: any) {
    console.log(`⬅ [RES] ${method} ${url} (${status || 200}):`, JSON.stringify(data, null, 2));
    return originalJson(data, status, headers);
  };

  await next();
});

// Users
app.get('/api/users', async (c) => {
  const result = await db.select().from(users);
  return c.json(result);
});

app.post('/api/users', async (c) => {
  const body = await c.req.json();
  const result = await db.insert(users).values(body).returning();
  return c.json(result[0]);
});

app.put('/api/users/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const result = await db.update(users).set(body).where(eq(users.id, id)).returning();
  return c.json(result[0]);
});

app.delete('/api/users/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await db.delete(users).where(eq(users.id, id));
  return c.json({ success: true });
});

app.post('/api/login', async (c) => {
  const { username, password } = await c.req.json();
  const result = await db.select().from(users)
    .where(and(eq(users.username, username), eq(users.password_hash, password))).limit(1);

  if (result.length === 0) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const user = result[0];
  if (!user.is_active) {
    return c.json({ error: 'User is inactive' }, 403);
  }

  return c.json(user);
});

// Products
app.get('/api/products', async (c) => {
  const { page, limit, search } = c.req.query();

  if (page && limit) {
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    // Base query
    let query = db.select().from(products);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(products);

    if (search) {
      const searchLower = search.toLowerCase();
      const whereClause = or(
        sql`lower(${products.name}) LIKE ${`%${searchLower}%`}`,
        sql`lower(${products.barcode}) LIKE ${`%${searchLower}%`}`
      );
      // @ts-ignore
      query = query.where(whereClause);
      // @ts-ignore
      countQuery = countQuery.where(whereClause);
    }

    // @ts-ignore
    const data = await query.limit(limitNum).offset(offset);
    const totalResult = await countQuery;
    const total = totalResult[0].count;

    return c.json({
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  }

  // Legacy/Full load (careful with 50k records)
  // If search is present but no pagination (e.g. for POS search if adapted later)
  if (search) {
    const searchLower = search.toLowerCase();
    return c.json(await db.select().from(products).where(
      or(
        sql`lower(${products.name}) LIKE ${`%${searchLower}%`}`,
        sql`lower(${products.barcode}) LIKE ${`%${searchLower}%`}`
      )
    ));
  }

  const result = await db.select().from(products);
  return c.json(result);
});

app.post('/api/products', async (c) => {
  const body = await c.req.json();
  const result = await db.insert(products).values(body).returning();
  return c.json(result[0]);
});

app.put('/api/products/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    const body = await c.req.json();
    const result = await db.update(products).set(body).where(eq(products.id, id)).returning();
    return c.json(result[0]);
  } catch (error) {
    console.error('Error in PUT /api/products/:id:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Categories
app.get('/api/categories', async (c) => {
  const result = await db.select({
    id: productCategories.id,
    name: productCategories.name,
    parent_id: productCategories.parent_id,
    // Add other fields if needed or simply spread if supported, but explicit is safer with group by
    product_count: sql<number>`count(${products.id})`
  })
    .from(productCategories)
    .leftJoin(products, eq(productCategories.id, products.category_id))
    .groupBy(productCategories.id);

  return c.json(result);
});

app.post('/api/categories', async (c) => {
  const body = await c.req.json();
  const result = await db.insert(productCategories).values(body).returning();
  return c.json(result[0]);
});

app.put('/api/categories/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const result = await db.update(productCategories).set(body).where(eq(productCategories.id, id)).returning();
  return c.json(result[0]);
});

app.delete('/api/categories/:id', async (c) => {
  const id = Number(c.req.param('id'));
  // Check for products using this category
  const linkedProducts = await db.select().from(products).where(eq(products.category_id, id)).limit(1);
  if (linkedProducts.length > 0) {
    return c.json({ error: 'Cannot delete category with associated products' }, 400);
  }
  await db.delete(productCategories).where(eq(productCategories.id, id));
  return c.json({ success: true });
});

// Units
app.get('/api/units', async (c) => {
  const result = await db.select({
    id: productUnits.id,
    name: productUnits.name,
    short_code: productUnits.short_code,
    product_count: sql<number>`count(${products.id})`
  })
    .from(productUnits)
    .leftJoin(products, eq(productUnits.id, products.unit_id))
    .groupBy(productUnits.id);

  return c.json(result);
});

app.post('/api/units', async (c) => {
  const body = await c.req.json();
  const result = await db.insert(productUnits).values(body).returning();
  return c.json(result[0]);
});

app.put('/api/units/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const result = await db.update(productUnits).set(body).where(eq(productUnits.id, id)).returning();
  return c.json(result[0]);
});

app.delete('/api/units/:id', async (c) => {
  const id = Number(c.req.param('id'));
  // Check for products using this unit
  const linkedProducts = await db.select().from(products).where(eq(products.unit_id, id)).limit(1);
  if (linkedProducts.length > 0) {
    return c.json({ error: 'Cannot delete unit with associated products' }, 400);
  }
  await db.delete(productUnits).where(eq(productUnits.id, id));
  return c.json({ success: true });
});

// Customers
app.get('/api/customers', async (c) => {
  const result = await db.select().from(customers);
  return c.json(result);
});

app.post('/api/customers', async (c) => {
  const body = await c.req.json();
  const result = await db.insert(customers).values(body).returning();
  return c.json(result[0]);
});

app.put('/api/customers/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const result = await db.update(customers).set(body).where(eq(customers.id, id)).returning();
  return c.json(result[0]);
});

// Suppliers
app.get('/api/suppliers', async (c) => {
  const result = await db.select().from(suppliers);
  return c.json(result);
});

app.post('/api/suppliers', async (c) => {
  const body = await c.req.json();
  const result = await db.insert(suppliers).values(body).returning();
  return c.json(result[0]);
});

// Sales
app.get('/api/sales', async (c) => {
  const { page, limit, date, user_id, search } = c.req.query();

  if (page && limit) {
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];

    // Date filter (YYYY-MM-DD)
    if (date) {
      conditions.push(sql`substr(${sales.created_at}, 1, 10) = ${date}`);
    }

    // User filter
    if (user_id && user_id !== 'all') {
      conditions.push(eq(sales.created_by_user_id, Number(user_id)));
    }

    // Search filter (Document Number)
    // Deeper search (customer name, product name) would require joins here.
    // For performance, we limit to doc number.
    if (search) {
      conditions.push(sql`lower(${sales.document_number}) LIKE ${`%${search.toLowerCase()}%`}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.select()
      .from(sales)
      // @ts-ignore
      .where(whereClause)
      .orderBy(desc(sales.created_at))
      .limit(limitNum)
      .offset(offset);

    const countRes = await db.select({ count: sql<number>`count(*)` })
      .from(sales)
      // @ts-ignore
      .where(whereClause);

    const total = countRes[0].count;

    return c.json({
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  }

  const result = await db.select().from(sales).orderBy(desc(sales.created_at));
  return c.json(result);
});

app.get('/api/sale-lines', async (c) => {
  const { sale_id, page, limit, search, date, user_id } = c.req.query();

  // 1. Fetch by specific Sale ID (Details View)
  if (sale_id) {
    const result = await db.select().from(saleLines).where(eq(saleLines.sale_id, Number(sale_id)));
    return c.json(result);
  }

  // 2. Pagination for ProductSales Page (Flattened View)
  if (page && limit) {
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    // Join with Sales to filter by date/user, and Products to filter by barcode if needed
    let query = db.select({
      id: saleLines.id,
      sale_id: saleLines.sale_id,
      product_id: saleLines.product_id,
      product_name: saleLines.product_name,
      qty: saleLines.qty,
      unit_price: saleLines.unit_price,
      discount: saleLines.discount,
      tax_rate: saleLines.tax_rate,
      line_total: saleLines.line_total,
      // Joined fields for display/filtering
      document_number: sales.document_number,
      created_at: sales.created_at,
      created_by_user_id: sales.created_by_user_id
    })
      .from(saleLines)
      .leftJoin(sales, eq(saleLines.sale_id, sales.id));

    const conditions = [];

    if (date) {
      conditions.push(sql`substr(${sales.created_at}, 1, 10) = ${date}`);
    }

    if (user_id && user_id !== 'all') {
      conditions.push(eq(sales.created_by_user_id, Number(user_id)));
    }

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      conditions.push(or(
        sql`lower(${saleLines.product_name}) LIKE ${term}`,
        sql`lower(${sales.document_number}) LIKE ${term}`
      ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // @ts-ignore
    const data = await query.where(whereClause)
      .orderBy(desc(sales.created_at))
      .limit(limitNum)
      .offset(offset);

    // Count query
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(saleLines)
      .leftJoin(sales, eq(saleLines.sale_id, sales.id))
      // @ts-ignore
      .where(whereClause);

    const countRes = await countQuery;
    const total = countRes[0].count;

    return c.json({
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  }

  // Fallback (fetch all - dangerous for 150k lines, but keeping for legacy compatibility if any)
  const result = await db.select().from(saleLines);
  return c.json(result);
});

app.post('/api/sales', async (c) => {
  try {
    const { sale, lines, payments } = await c.req.json();

    // Transaction (Synchronous for better-sqlite3)
    const result = db.transaction((tx) => {
      // 1. Insert Sale and get ID
      // 1. Insert Sale and get ID
      const info = tx.insert(sales).values(sale).run();
      const saleId = Number(info.lastInsertRowid);

      // 2. Insert Lines
      for (const line of lines) {
        // Validation: product_id should be number or null
        const isCustom = line.product_id === null;

        const finalLine = {
          // Remove client-side ID if present
          sale_id: saleId,
          product_id: isCustom ? null : line.product_id,
          product_name: line.product_name || 'Unknown Product',
          qty: line.qty,
          unit_price: line.unit_price,
          discount: line.discount,
          tax_rate: line.tax_rate,
          line_total: line.line_total
        };

        // Use .run() for inserts that don't need returning
        tx.insert(saleLines).values(finalLine).run();

        // Update stock quantity
        if (!isCustom && finalLine.product_id) {
          tx.update(products)
            .set({
              stock_quantity: sql`${products.stock_quantity} - ${finalLine.qty}`
            })
            .where(eq(products.id, finalLine.product_id))
            .run();
        }
      }

      // 3. Insert Payments
      for (const payment of payments) {
        tx.insert(salePayments).values({
          ...payment,
          sale_id: saleId
        }).run();
      }

      return { success: true, saleId };
    });

    return c.json(result);
  } catch (error) {
    console.error('Error in POST /api/sales:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Cash Sessions
app.get('/api/sessions', async (c) => {
  const result = await db.select().from(cashSessions).orderBy(desc(cashSessions.start_time));
  return c.json(result);
});

app.post('/api/sessions', async (c) => {
  try {
    const body = await c.req.json();
    console.log('Creating session with data:', JSON.stringify(body, null, 2));

    // Validate that user_id exists
    const user = await db.select().from(users).where(eq(users.id, body.user_id)).limit(1);
    if (user.length === 0) {
      console.error(`User with ID ${body.user_id} not found`);
      return c.json({ error: `User with ID ${body.user_id} not found` }, 400);
    }

    // Check for existing open session
    const existingSession = await db.select().from(cashSessions).where(and(eq(cashSessions.user_id, body.user_id), eq(cashSessions.status, 'open'))).limit(1);
    if (existingSession.length > 0) {
      console.log('Returning existing open session:', existingSession[0]);
      return c.json(existingSession[0]);
    }

    const result = await db.insert(cashSessions).values(body).returning();
    console.log('Session created successfully:', result[0]);
    return c.json(result[0]);
  } catch (error) {
    console.error('Error creating session:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.put('/api/sessions/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  const result = await db.update(cashSessions).set(body).where(eq(cashSessions.id, id)).returning();
  return c.json(result[0]);
});


// Dashboard Stats
app.get('/api/stats/dashboard', async (c) => {
  try {
    const { start, end } = c.req.query();

    // Base filter for sales
    const conditions = [eq(sales.status, 'completed')];
    if (start) conditions.push(sql`${sales.created_at} >= ${start}`);
    if (end) conditions.push(sql`${sales.created_at} <= ${end}`);

    const salesWhere = and(...conditions);

    // 1. Summary Cards (Revenue and Sales Count depend on filter)
    const totalRevenueResult = await db.select({ value: sql<number>`sum(${sales.grand_total})` })
      .from(sales).where(salesWhere);
    const totalRevenue = totalRevenueResult[0]?.value || 0;

    const totalSalesResult = await db.select({ value: sql<number>`count(*)` })
      .from(sales).where(salesWhere);
    const totalSales = totalSalesResult[0]?.value || 0;

    // Static counts (Total database size)
    const totalProductsResult = await db.select({ value: sql<number>`count(*)` }).from(products);
    const totalProducts = totalProductsResult[0]?.value || 0;

    const totalCustomersResult = await db.select({ value: sql<number>`count(*)` }).from(customers);
    const totalCustomers = totalCustomersResult[0]?.value || 0;

    // 2. Sales Over Time
    const salesOverTime = await db.select({
      date: sql<string>`substr(${sales.created_at}, 1, 10)`,
      revenue: sql<number>`sum(${sales.grand_total})`
    })
      .from(sales)
      .where(salesWhere)
      .groupBy(sql`substr(${sales.created_at}, 1, 10)`)
      .orderBy(sql`substr(${sales.created_at}, 1, 10)`);

    // 3. Sales By Hour (Distribution 00-23)
    // This answers "stats of sales on each hour of the day"
    const salesByHour = await db.select({
      hour: sql<string>`strftime('%H', ${sales.created_at})`,
      value: sql<number>`sum(${sales.grand_total})`
    })
      .from(sales)
      .where(salesWhere)
      .groupBy(sql`strftime('%H', ${sales.created_at})`)
      .orderBy(sql`strftime('%H', ${sales.created_at})`);

    // 4. Top Products
    const topProducts = await db.select({
      name: saleLines.product_name,
      value: sql<number>`sum(${saleLines.line_total})`
    })
      .from(saleLines)
      .leftJoin(sales, eq(saleLines.sale_id, sales.id))
      .where(salesWhere)
      .groupBy(saleLines.product_name)
      .orderBy(desc(sql`sum(${saleLines.line_total})`))
      .limit(5);

    // 5. Sales by Category
    const salesByCategory = await db.select({
      name: productCategories.name,
      value: sql<number>`sum(${saleLines.line_total})`
    })
      .from(saleLines)
      .leftJoin(products, eq(saleLines.product_id, products.id))
      .leftJoin(productCategories, eq(products.category_id, productCategories.id))
      .leftJoin(sales, eq(saleLines.sale_id, sales.id))
      .where(and(
        sql`${productCategories.name} IS NOT NULL`,
        salesWhere
      ))
      .groupBy(productCategories.name);

    return c.json({
      summary: {
        totalRevenue,
        totalSales,
        totalProducts,
        totalCustomers
      },
      salesOverTime,
      salesByHour,
      topProducts,
      salesByCategory
    });
  } catch (error) {
    console.error('Error in stats:', error);
    return c.json({ error: String(error) }, 500);
  }
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
