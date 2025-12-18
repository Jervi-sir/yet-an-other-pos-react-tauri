import { reset } from "drizzle-seed";
import * as schema from "@/db/schema";
import db from "./database";
import { initialCategories, initialCustomers, initialProducts, initialSuppliers, initialUnits, initialUsers } from "@/lib/data";

export default async function seed() {
	// @ts-ignore
	await reset(db, schema);
	console.log('🌱 Seeding database...\n');

	try {
		// Users
		console.log('👤 Seeding users...');
		for (const user of initialUsers) {
			try {
				await db.insert(schema.users).values(user);
				console.log(`  ✓ Created user: ${user.name} (ID: ${user.id})`);
			} catch (error: any) {
				if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
					console.log(`  ⊘ User already exists: ${user.name} (ID: ${user.id})`);
				} else {
					throw error;
				}
			}
		}

		// Categories
		console.log('\n📁 Seeding categories...');
		for (const cat of initialCategories) {
			try {
				await db.insert(schema.productCategories).values(cat);
				console.log(`  ✓ Created category: ${cat.name} (ID: ${cat.id})`);
			} catch (error: any) {
				if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
					console.log(`  ⊘ Category already exists: ${cat.name} (ID: ${cat.id})`);
				} else {
					throw error;
				}
			}
		}

		// Units
		console.log('\n📏 Seeding units...');
		for (const unit of initialUnits) {
			try {
				await db.insert(schema.productUnits).values(unit);
				console.log(`  ✓ Created unit: ${unit.name} (ID: ${unit.id})`);
			} catch (error: any) {
				if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
					console.log(`  ⊘ Unit already exists: ${unit.name} (ID: ${unit.id})`);
				} else {
					throw error;
				}
			}
		}

		// Products
		console.log('\n📦 Seeding products...');
		for (const prod of initialProducts) {
			try {
				await db.insert(schema.products).values(prod);
				console.log(`  ✓ Created product: ${prod.name} (ID: ${prod.id})`);
			} catch (error: any) {
				if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
					console.log(`  ⊘ Product already exists: ${prod.name} (ID: ${prod.id})`);
				} else {
					throw error;
				}
			}
		}

		// Customers
		console.log('\n👥 Seeding customers...');
		for (const cust of initialCustomers) {
			try {
				await db.insert(schema.customers).values(cust);
				console.log(`  ✓ Created customer: ${cust.name} (ID: ${cust.id})`);
			} catch (error: any) {
				if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
					console.log(`  ⊘ Customer already exists: ${cust.name} (ID: ${cust.id})`);
				} else {
					throw error;
				}
			}
		}

		// Suppliers
		console.log('\n🏭 Seeding suppliers...');
		for (const sup of initialSuppliers) {
			try {
				await db.insert(schema.suppliers).values(sup);
				console.log(`  ✓ Created supplier: ${sup.name} (ID: ${sup.id})`);
			} catch (error: any) {
				if (error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
					console.log(`  ⊘ Supplier already exists: ${sup.name} (ID: ${sup.id})`);
				} else {
					throw error;
				}
			}
		}


		console.log('\n✅ Seeding completed successfully!');
		// process.exit(0);
	} catch (error) {
		console.error('\n❌ Error seeding:', error);
		throw error;
		// process.exit(1);
	}

}
