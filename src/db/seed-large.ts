import { users, products, productCategories, productUnits, customers, suppliers, sales, saleLines } from './schema';

import { faker } from '@faker-js/faker';
import { sql } from 'drizzle-orm';
import db from './database';

const BATCH_SIZE = 1000;
const COUNTS = {
  USERS: 100,
  CATEGORIES: 100,
  UNITS: 100,
  SUPPLIERS: 50,
  CUSTOMERS: 500,
  PRODUCTS: 50000,
  SALES: 50000     // Will generate multiple lines per sale, easily reaching > 1M records total
};

export async function seedLarge() {
  console.log('🌱 Starting LARGE seeding...');
  const start = Date.now();

  try {
    // Disable FK checks for speed and cleanup
    db.run(sql`PRAGMA foreign_keys = OFF`);

    console.log('🧹 Clearing existing data...');
    db.delete(saleLines).run();
    db.delete(sales).run();
    db.delete(products).run();
    db.delete(productCategories).run();
    db.delete(productUnits).run();
    db.delete(customers).run();
    db.delete(suppliers).run();
    db.delete(users).run();

    db.run(sql`PRAGMA foreign_keys = ON`);

    // 1. Users
    console.log(`👤 Generating ${COUNTS.USERS} users...`);
    const usersData = [];
    // Ensure standard roles exist
    usersData.push({
      username: 'admin', name: 'Admin User', email: 'admin@pos.com', password_hash: 'admin', role: 'admin', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    });
    for (let i = 0; i < COUNTS.USERS - 1; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      usersData.push({
        username: faker.internet.username({ firstName, lastName }),
        name: `${firstName} ${lastName}`,
        email: faker.internet.email({ firstName, lastName }),
        password_hash: 'password',
        role: faker.helpers.arrayElement(['admin', 'sub_admin', 'cashier']) as 'admin' | 'sub_admin' | 'cashier',
        is_active: faker.datatype.boolean(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    // Batch insert users
    for (let i = 0; i < usersData.length; i += BATCH_SIZE) {
      await db.insert(users).values(usersData.slice(i, i + BATCH_SIZE));
    }
    // Fetch user IDs to use later
    const allUsers = await db.select({ id: users.id }).from(users);
    const userIds = allUsers.map(u => u.id);


    // 2. Categories
    console.log(`📁 Generating ${COUNTS.CATEGORIES} categories...`);
    const categoriesData = [];
    for (let i = 0; i < COUNTS.CATEGORIES; i++) {
      categoriesData.push({
        name: faker.commerce.department() + ' ' + faker.string.alpha(3), // Ensure uniqueness mostly
        description: faker.lorem.sentence(),
      });
    }
    for (let i = 0; i < categoriesData.length; i += BATCH_SIZE) {
      await db.insert(productCategories).values(categoriesData.slice(i, i + BATCH_SIZE));
    }
    const allCats = await db.select({ id: productCategories.id }).from(productCategories);
    const catIds = allCats.map(c => c.id);

    // 3. Units
    console.log(`📏 Generating ${COUNTS.UNITS} units...`);
    const unitsData = [];
    for (let i = 0; i < COUNTS.UNITS; i++) {
      unitsData.push({
        name: faker.science.unit().name,
        short_code: faker.science.unit().symbol || faker.string.alpha(2),
      });
    }
    for (let i = 0; i < unitsData.length; i += BATCH_SIZE) {
      await db.insert(productUnits).values(unitsData.slice(i, i + BATCH_SIZE));
    }
    const allUnits = await db.select({ id: productUnits.id }).from(productUnits);
    const unitIds = allUnits.map(u => u.id);

    // 4. Suppliers & Customers
    console.log(`🏭 Generating ${COUNTS.SUPPLIERS} suppliers & ${COUNTS.CUSTOMERS} customers...`);
    const retailers = [];
    for (let i = 0; i < COUNTS.SUPPLIERS; i++) {
      retailers.push({
        name: faker.company.name(),
        contact_name: faker.person.fullName(),
        phone: faker.phone.number(),
        email: faker.internet.email(),
        address: faker.location.streetAddress(),
        tax_number: faker.finance.accountNumber()
      });
    }
    await db.insert(suppliers).values(retailers);

    const custData = [];
    for (let i = 0; i < COUNTS.CUSTOMERS; i++) {
      custData.push({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        tax_number: faker.finance.accountNumber()
      });
    }
    for (let i = 0; i < custData.length; i += BATCH_SIZE) {
      await db.insert(customers).values(custData.slice(i, i + BATCH_SIZE));
    }
    const allCustomers = await db.select({ id: customers.id }).from(customers);
    const customerIds = allCustomers.map(c => c.id);


    // 5. Products
    console.log(`📦 Generating ${COUNTS.PRODUCTS} products...`);
    // Generating large array might hit memory limits, best to generate in chunks and insert
    const productIds: number[] = [];

    // We roughly need IDs to associate later. Since we just cleared, IDs assume start 1..N (except auto-inc gaps).
    // Let's just select after inserting.

    for (let i = 0; i < COUNTS.PRODUCTS; i += BATCH_SIZE) {
      const batch = [];
      for (let j = 0; j < BATCH_SIZE && (i + j) < COUNTS.PRODUCTS; j++) {
        batch.push({
          sku: faker.commerce.isbn() + '-' + faker.string.alphanumeric(4),
          barcode: faker.string.numeric(13),
          name: faker.commerce.productName() + ' ' + faker.string.alpha(2),
          category_id: faker.helpers.arrayElement(catIds),
          unit_id: faker.helpers.arrayElement(unitIds),
          stock_quantity: faker.number.int({ min: 0, max: 1000 }),
          cost_price: parseFloat(faker.commerce.price({ min: 1, max: 100 })),
          sale_price: parseFloat(faker.commerce.price({ min: 101, max: 500 })),
          is_active: true,
          created_at: faker.date.past().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      await db.insert(products).values(batch);
      if (i % 10000 === 0 && i > 0) console.log(`   ...${i} products inserted`);
    }
    // Fetch products for sales generation (only ID and price needed)
    const allProducts = await db.select({ id: products.id, name: products.name, price: products.sale_price }).from(products);


    // 6. Sales
    console.log(`💰 Generating ${COUNTS.SALES} sales...`);

    for (let i = 0; i < COUNTS.SALES; i += BATCH_SIZE) {
      const salesBatch = [];
      const linesBatch = [];

      const currentBatchSize = Math.min(BATCH_SIZE, COUNTS.SALES - i);

      // Prepare sales data
      for (let j = 0; j < currentBatchSize; j++) {
        const saleDate = faker.date.past();
        const createdByUser = faker.helpers.arrayElement(userIds);
        const customerId = faker.helpers.maybe(() => faker.helpers.arrayElement(customerIds)) || null;

        // Generate 1-5 lines per sale
        const numLines = faker.number.int({ min: 1, max: 5 });
        let subtotal = 0;
        const currentLines = [];

        for (let k = 0; k < numLines; k++) {
          const prod = faker.helpers.arrayElement(allProducts);
          const qty = faker.number.int({ min: 1, max: 5 });
          const lineTotal = prod.price * qty;
          subtotal += lineTotal;

          currentLines.push({
            // sale_id: will be set after getting IDs ?? 
            // Getting IDs for batch insert in SQLite is tricky without RETURNING * which gives array.
            // Strategy: Insert sales one by one? Too slow.
            // Strategy: Batch insert sales, then assume sequential IDs? Risky with concurrency but we are alone here.
            // Strategy: Better-sqlite3 `insert().run().lastInsertRowid` only works for single.
            // Drizzle `returning()` works for batch in SQLite? Yes with `returning`.
            product_id: prod.id,
            product_name: prod.name,
            qty,
            unit_price: prod.price,
            discount: 0,
            tax_rate: 0,
            line_total: lineTotal
          });
        }

        salesBatch.push({
          document_number: `INV-${faker.string.alphanumeric(8).toUpperCase()}`,
          type: 'pos_receipt',
          status: 'completed',
          customer_id: customerId,
          cash_session_id: null,
          subtotal: subtotal,
          discount_total: 0,
          tax_total: 0,
          grand_total: subtotal,
          paid_total: subtotal,
          change_due: 0,
          created_at: saleDate.toISOString(),
          created_by_user_id: createdByUser,
          tempLines: currentLines // Temporary holder
        });
      }

      // We need Sale IDs for the lines. 
      // Drizzle's `insert(...).values(...).returning({ id: sales.id })` should work for batch.
      const insertedSales = await db.insert(sales).values(salesBatch.map(({ tempLines, ...s }) => s)).returning({ id: sales.id });

      // Map back lines to sale IDs
      // Assuming order is preserved (Drizzle/SQLite usually preserves order in returning)
      for (let idx = 0; idx < insertedSales.length; idx++) {
        const saleId = insertedSales[idx].id;
        const saleProto = salesBatch[idx];
        for (const line of saleProto.tempLines) {
          linesBatch.push({
            sale_id: saleId,
            ...line
          });
        }
      }

      // Batch insert lines
      if (linesBatch.length > 0) {
        await db.insert(saleLines).values(linesBatch);
      }

      if (i % 5000 === 0 && i > 0) console.log(`   ...${i} sales inserted`);
    }

    const end = Date.now();
    console.log(`\n✅ Seeding completed in ${((end - start) / 1000).toFixed(2)}s`);
    console.log(`Stats:`);
    console.log(`  Users: ${COUNTS.USERS}`);
    console.log(`  Categories: ${COUNTS.CATEGORIES}`);
    console.log(`  Units: ${COUNTS.UNITS}`);
    console.log(`  Products: ${COUNTS.PRODUCTS}`);
    console.log(`  Sales: ${COUNTS.SALES}`);

  } catch (error) {
    console.error('\n❌ Error seeding:', error);
    process.exit(1);
  }
}
