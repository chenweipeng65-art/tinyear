import type { PrismaClient } from "../src/generated/prisma/client.js";
import { maskChildDisplayName } from "./lib/maskChildDisplayName.js";

/** 迁移后或历史数据：按 displayName 重算 displayNameMasked（幂等） */
export async function backfillChildDisplayNameMasked(prisma: PrismaClient): Promise<void> {
  const rows = await prisma.child.findMany({
    select: { id: true, displayName: true, displayNameMasked: true },
  });
  for (const r of rows) {
    const next = maskChildDisplayName(r.displayName);
    if (r.displayNameMasked !== next) {
      await prisma.child.update({
        where: { id: r.id },
        data: { displayNameMasked: next },
      });
    }
  }
}
