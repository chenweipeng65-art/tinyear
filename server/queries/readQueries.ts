/**
 * M2 只读查询（与 §2.4 GET 响应体一致）；供 REST 与 M4 action 共用。
 */
import type { PrismaClient } from "../../src/generated/prisma/client.js";

/** 教师端只读：仅返回在管理端勾选「在教师端展示」的班级 */
export async function listClasses(prisma: PrismaClient) {
  return prisma.schoolClass.findMany({
    where: { teacherVisible: true },
    orderBy: [{ defaultForTeacher: "desc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      gradeBand: true,
      schoolYear: true,
      defaultForTeacher: true,
    },
  });
}

export async function listChildrenInClass(prisma: PrismaClient, classId: number) {
  const cls = await prisma.schoolClass.findFirst({
    where: { id: classId, teacherVisible: true },
  });
  if (!cls) return { notFound: true as const };

  const rows = await prisma.child.findMany({
    where: { classId },
    orderBy: { id: "asc" },
    select: {
      id: true,
      displayName: true,
      displayNameMasked: true,
      avatarUrl: true,
      _count: { select: { portfolioItems: true } },
    },
  });
  const items = rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    displayNameMasked: r.displayNameMasked,
    archiveCount: r._count.portfolioItems,
    avatarUrl: r.avatarUrl,
  }));
  return { notFound: false as const, items };
}

export async function listArchiveItemsForChild(prisma: PrismaClient, childId: number) {
  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) return { notFound: true as const };

  const rows = await prisma.portfolioArchiveItem.findMany({
    where: { childId },
    orderBy: [{ displayDate: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      displayDate: true,
      childArtImageUrl: true,
      summary: true,
      recordingTranscript: true,
      analysisInterpretation: true,
      teacherSupportStrategies: true,
      parentGuidanceAdvice: true,
      teacherReflection: true,
    },
  });
  const items = rows.map((r) => ({
    id: r.id,
    title: r.title,
    date: r.displayDate,
    image: r.childArtImageUrl ?? "",
    content: r.summary,
    educationSuggestion: r.parentGuidanceAdvice,
    recordingTranscript: r.recordingTranscript,
    analysisInterpretation: r.analysisInterpretation,
    teacherSupportStrategies: r.teacherSupportStrategies,
    parentGuidanceAdvice: r.parentGuidanceAdvice,
    teacherReflection: r.teacherReflection,
  }));
  return { notFound: false as const, items };
}

export async function getChildById(prisma: PrismaClient, childId: number) {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: {
      id: true,
      displayName: true,
      displayNameMasked: true,
      classId: true,
      ageBand: true,
      avatarUrl: true,
      schoolClass: { select: { teacherVisible: true } },
    },
  });
  if (!child || !child.schoolClass.teacherVisible) return { notFound: true as const };
  const { schoolClass: _s, ...rest } = child;
  return { notFound: false as const, child: rest };
}

/** 幼儿个别化分析（AI）历史记录，供成长档案页展示 */
export async function listIndividualAnalysesForChild(prisma: PrismaClient, childId: number) {
  const gate = await getChildById(prisma, childId);
  if (gate.notFound) return { notFound: true as const };

  const rows = await prisma.aiIndividualAnalysis.findMany({
    where: { childId },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      createdAt: true,
      contentMarkdown: true,
    },
  });
  return {
    notFound: false as const,
    items: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      contentMarkdown: r.contentMarkdown,
    })),
  };
}

/** 班级整体分析（AI）历史记录，供成长档案页未选学生时展示 */
export async function listClassAnalysesForClass(prisma: PrismaClient, classId: number) {
  const cls = await prisma.schoolClass.findFirst({
    where: { id: classId, teacherVisible: true },
    select: { id: true },
  });
  if (!cls) return { notFound: true as const };

  const rows = await prisma.aiClassAnalysis.findMany({
    where: { classId },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      createdAt: true,
      contentMarkdown: true,
    },
  });
  return {
    notFound: false as const,
    items: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      contentMarkdown: r.contentMarkdown,
    })),
  };
}
