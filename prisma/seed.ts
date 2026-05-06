/**
 * 演示数据：班级 / 教师 / 幼儿 / 档案正文等，均来自本目录 `seed-archive-data.ts`（前端不再保留 mock 文件）。
 */
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { hashPassword } from "../server/adminAuth.js";
import { insertChildRow } from "../server/insertChild.js";
import { maskChildDisplayName } from "../server/lib/maskChildDisplayName.js";
import { prisma } from "../server/prisma.js";
import { SEED_ARCHIVES_BY_STUDENT_NAME, SEED_DEMO_STUDENT_NAMES } from "./seed-archive-data.ts";

function isExecutedAsCli(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    const entryUrl = pathToFileURL(path.resolve(entry)).href;
    const selfUrl = pathToFileURL(path.resolve(fileURLToPath(import.meta.url))).href;
    return entryUrl === selfUrl;
  } catch {
    return false;
  }
}

export type SeedDatabaseOptions = {
  /**
   * true（默认）：先清空本演示班级的档案与 AI 再写入，便于本地反复 `prisma db seed`。
   * false：不 delete，供生产 `ensureSeedOnBoot` 使用，避免误连到有数据的库时抹掉业务数据。
   */
  destructive?: boolean;
};

/** 供 `prisma db seed` 与生产环境启动时按需调用；不在 import 时自动执行。 */
export async function seedDatabase(opts?: SeedDatabaseOptions): Promise<void> {
  const destructive = opts?.destructive ?? true;
  const schoolClass = await prisma.schoolClass.upsert({
    where: { id: 1 },
    update: { defaultForTeacher: true, teacherVisible: true },
    create: {
      id: 1,
      name: "中一班",
      gradeBand: "medium",
      schoolYear: "2025-2026",
      teacherVisible: true,
      defaultForTeacher: true,
    },
  });

  const teacher = await prisma.teacher.upsert({
    where: { id: 1 },
    update: {
      displayName: "演示教师",
      loginIdentifier: null,
      passwordHash: hashPassword(randomBytes(32).toString("hex")),
    },
    create: {
      id: 1,
      displayName: "演示教师",
      passwordHash: hashPassword(randomBytes(32).toString("hex")),
    },
  });

  await prisma.teacher.upsert({
    where: { loginIdentifier: "admin" },
    update: {
      displayName: "系统管理员",
      passwordHash: hashPassword("admin123"),
    },
    create: {
      loginIdentifier: "admin",
      displayName: "系统管理员",
      passwordHash: hashPassword("admin123"),
    },
  });

  for (const displayName of SEED_DEMO_STUDENT_NAMES) {
    const existing = await prisma.child.findUnique({
      where: {
        classId_displayName: { classId: schoolClass.id, displayName },
      },
    });
    if (existing) {
      await prisma.child.update({
        where: { id: existing.id },
        data: {
          ageBand: "medium",
          avatarUrl: null,
          displayNameMasked: maskChildDisplayName(displayName),
        },
      });
    } else {
      await insertChildRow(prisma, {
        classId: schoolClass.id,
        displayName,
        ageBand: "medium",
      });
    }
  }

  if (destructive) {
    await prisma.aiIndividualAnalysis.deleteMany({
      where: { child: { classId: schoolClass.id } },
    });
    await prisma.aiClassAnalysis.deleteMany({ where: { classId: schoolClass.id } });
    await prisma.portfolioArchiveItem.deleteMany({
      where: { child: { classId: schoolClass.id } },
    });
  }

  let archiveCount = 0;
  const existingPortfolioCount = await prisma.portfolioArchiveItem.count({
    where: { child: { classId: schoolClass.id } },
  });

  if (destructive || existingPortfolioCount === 0) {
    for (const displayName of SEED_DEMO_STUDENT_NAMES) {
      const child = await prisma.child.findFirstOrThrow({
        where: { classId: schoolClass.id, displayName },
      });
      const records = SEED_ARCHIVES_BY_STUDENT_NAME[displayName] ?? [];
      if (records.length === 0) continue;
      await prisma.portfolioArchiveItem.createMany({
        data: records.map((r) => ({
          childId: child.id,
          status: "completed" as const,
          title: r.title,
          displayDate: r.date,
          observedAt: new Date(`${r.date}T12:00:00`),
          childArtImageUrl: r.image,
          summary: r.content,
          parentGuidanceAdvice: r.educationSuggestion,
        })),
      });
      archiveCount += records.length;
    }

    // 小明首条档案：标为已完成倾听流示例（与首页画语/AI 演示一致）
    const demoChild = await prisma.child.findFirst({
      where: { classId: schoolClass.id, displayName: "小明" },
    });
    const demoArchive = demoChild
      ? await prisma.portfolioArchiveItem.findFirst({
          where: { childId: demoChild.id },
          orderBy: { id: "asc" },
        })
      : null;
    if (demoChild && demoArchive) {
      const observedAt = new Date(`${demoArchive.displayDate}T12:00:00`);
      await prisma.portfolioArchiveItem.update({
        where: { id: demoArchive.id },
        data: {
          status: "completed",
          observedAt,
          ageBandAtSession: "medium",
          summarySnippet: demoArchive.summary.slice(0, 160),
        },
      });

      const existingIndiv = await prisma.aiIndividualAnalysis.findFirst({
        where: { portfolioArchiveItemId: demoArchive.id, modelName: "seed-demo" },
      });
      if (!existingIndiv) {
        await prisma.aiIndividualAnalysis.create({
          data: {
            childId: demoChild.id,
            portfolioArchiveItemId: demoArchive.id,
            contentMarkdown: `## 个体发展解读（演示）\n\n${demoArchive.summary.slice(0, 500)}…`,
            modelName: "seed-demo",
            promptVersion: "m2-preview",
          },
        });
      }
    }
  } else {
    archiveCount = existingPortfolioCount;
    console.log(
      "[seed] non-destructive: 本班已有档案记录，跳过演示档案批量写入与个体 AI 创建（避免覆盖业务数据）",
    );
  }

  const existingClassAi = await prisma.aiClassAnalysis.findFirst({
    where: { classId: schoolClass.id, modelName: "seed-demo" },
  });
  if (!existingClassAi) {
    await prisma.aiClassAnalysis.create({
      data: {
        classId: schoolClass.id,
        title: `${schoolClass.name} · 班级整体发展（演示）`,
        periodNote: "种子数据，非真实统计窗口",
        contentMarkdown:
          "本班幼儿在语言表达、社会交往等方面呈现多样化表现（演示占位，后续由真实数据聚合与模型生成）。",
        modelName: "seed-demo",
        promptVersion: "m2-preview",
      },
    });
  }

  const individualAiCount = await prisma.aiIndividualAnalysis.count({
    where: { child: { classId: schoolClass.id } },
  });
  const classAiCount = await prisma.aiClassAnalysis.count({ where: { classId: schoolClass.id } });

  console.log(
    `[seed] SchoolClass id=${schoolClass.id}, Teacher id=${teacher.id}, children=${SEED_DEMO_STUDENT_NAMES.length}, portfolioArchiveItems=${archiveCount}, aiIndividual=${individualAiCount}, aiClass=${classAiCount}（演示幼儿证件后六位由家长端首次登录写入）`,
  );
}

async function runSeedCli(): Promise<void> {
  try {
    await seedDatabase();
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (isExecutedAsCli()) {
  void runSeedCli();
}
