import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "sqlite",
	schema: './src/db/schema.ts',
	out: "./src-tauri/migrations",
	verbose: false,
	strict: true,

	// dbCredentials: {
	// 	url: 'sqlite_new.db',
	// },

});
