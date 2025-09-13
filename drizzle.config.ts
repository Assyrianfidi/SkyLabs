import { defineConfig } from "drizzle-kit";

// Direct database configuration
export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: 'localhost',
    port: 5432,
    user: 'skylabs',
    password: 'skylabs_password',
    database: 'skylabs_dev',
    ssl: false, // Disable SSL for local development
  },
});
