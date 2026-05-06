/**
 * Prisma 7 `child.create` 将可选字段 `idCardLastSixHash` 误作必填校验；用 INSERT 显式写入 NULL 绕过。
 */
import type { PrismaClient } from "../src/generated/prisma/client.js";
import { maskChildDisplayName } from "./lib/maskChildDisplayName.js";

export type InsertChildAgeBand = "small" | "medium" | "large" | null;

export async function insertChildRow(
  prisma: PrismaClient,
  input: {
    classId: number;
    displayName: string;
    ageBand: InsertChildAgeBand;
    avatarUrl?: string | null;
  },
): Promise<void> {
  const now = new Date();
  const { classId, displayName, ageBand } = input;
  const displayNameMasked = maskChildDisplayName(displayName);
  const url = input.avatarUrl;
  if (url != null && url !== "") {
    await prisma.$executeRaw`
      INSERT INTO "children" ("classId", "displayName", "displayNameMasked", "ageBand", "avatarUrl", "idCardLastSixHash", "createdAt", "updatedAt")
      VALUES (${classId}, ${displayName}, ${displayNameMasked}, ${ageBand}, ${url}, NULL, ${now}, ${now})
    `;
    return;
  }
  await prisma.$executeRaw`
    INSERT INTO "children" ("classId", "displayName", "displayNameMasked", "ageBand", "idCardLastSixHash", "createdAt", "updatedAt")
    VALUES (${classId}, ${displayName}, ${displayNameMasked}, ${ageBand}, NULL, ${now}, ${now})
  `;
}
