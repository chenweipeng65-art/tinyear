/**
 * 生产环境首次部署：库中无任何班级时自动执行 prisma seed 等价逻辑。
 * 设置 SKIP_AUTO_SEED=1 可关闭（例如仅跑迁移、数据由别处导入）。
 */
import { prisma } from "./prisma.js";

export async function ensureSeedOnBoot(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;
  const skip = process.env.SKIP_AUTO_SEED?.trim();
  if (skip === "1" || skip?.toLowerCase() === "true") {
    console.log("[boot] SKIP_AUTO_SEED 已设置，跳过自动 seed 检查");
    return;
  }

  const dbUrl = process.env.DATABASE_URL?.trim() || "(未设置，使用 Prisma 默认 file:./dev.db)";
  console.log(`[boot] DATABASE_URL=${dbUrl}`);

  const classCount = await prisma.schoolClass.count();
  if (classCount > 0) {
    console.log("[boot] 已有班级数据，跳过自动 seed");
    return;
  }

  console.log(
    "[boot] 无班级数据，正在执行 seed…（若你确信库中应有数据：请检查 DATABASE_URL 是否指向持久化目录，例如 Docker 卷挂载到 /app/data 时须使用 file:/app/data/xxx.db）",
  );
  const { seedDatabase } = await import("../prisma/seed.js");
  await seedDatabase({ destructive: false });
  console.log("[boot] seed 完成（非破坏性：未执行演示数据 deleteMany）");
}
