import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "./generated/prisma/client";

neonConfig.poolQueryViaFetch = true;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const trimmedConnectionString = rawConnectionString.trim();
const connectionString =
  (trimmedConnectionString.startsWith('"') && trimmedConnectionString.endsWith('"')) ||
  (trimmedConnectionString.startsWith("'") && trimmedConnectionString.endsWith("'"))
    ? trimmedConnectionString.slice(1, -1).trim()
    : trimmedConnectionString;

try {
  new URL(connectionString);
} catch {
  throw new Error("DATABASE_URL is not a valid database URL.");
}

const adapter = new PrismaNeon({
  connectionString,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
