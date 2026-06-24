import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// When prisma.config.ts is present, Prisma does NOT auto-load .env
config(); // loads .env from project root

export default defineConfig({
  datasource: {
    // Use DIRECT_URL (session pooler, port 5432) for db push.
    // Falls back to DATABASE_URL if DIRECT_URL is not set.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  },
});
