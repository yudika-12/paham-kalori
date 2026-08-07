// Prisma config — memuat .env.local (untuk Next.js) atau .env sebagai fallback.
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { defineConfig } from "prisma/config";

const envLocal = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) {
  config({ path: envLocal, quiet: true });
} else {
  config({ quiet: true });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});