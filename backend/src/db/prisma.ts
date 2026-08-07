import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Load env sebelum membuat client (cek .env.local dahulu, lalu .env).
const envLocal = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) config({ path: envLocal, quiet: true });
else config({ quiet: true });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "",
  max: 5,
});

export const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaClient;