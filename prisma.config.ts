import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL for migrations (Supabase direct connection, port 5432)
    // Falls back to DATABASE_URL for local Docker postgres
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
