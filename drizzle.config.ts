import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load env for CLI (generate, migrate, push, studio). Next.js loads these at runtime separately.
config({ path: ".env" });
config({ path: ".env.local", override: true });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Required for db:migrate, db:push, db:studio. db:generate only needs schema files.
    url: process.env.DATABASE_URL ?? "",
  },
});
