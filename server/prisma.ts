/**
 * Prisma 7 + SQLite：通过 @prisma/adapter-better-sqlite3 连接（见 Prisma 文档 driver adapters）。
 */
import "dotenv/config";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";

function resolveSqliteFilePath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const withoutProtocol = url.startsWith("file:") ? url.slice("file:".length) : url;
  return path.isAbsolute(withoutProtocol)
    ? withoutProtocol
    : path.resolve(process.cwd(), withoutProtocol);
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: resolveSqliteFilePath() }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
