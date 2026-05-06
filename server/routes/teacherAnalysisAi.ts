/**
 * 教师端「AI 分析」：个别化分析（agent-one）、班级整体分析（agent-all）
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { generateChildIndividualAnalysis } from "../../ai/txt-ai/agent-one/generator.js";
import { generateClassOverallAnalysis } from "../../ai/txt-ai/agent-all/generator.js";
import type { StudentLatestIndividualSlot } from "../../ai/txt-ai/agent-all/generator.js";
import type { ClassOverallAnalysisJson, IndividualAnalysisJson } from "../../ai/txt-ai/lib/aiAnalysisReports.js";
import {
  compactIndividualChartsForOverallPrompt,
  hasCompleteIndividualRadarScores,
  splitIndividualAnalysisOutput,
} from "../../ai/txt-ai/lib/aiAnalysisReports.js";
import { teacherFacingChildName } from "../lib/teacherFacingChildName.js";

const bodyIndividual = z.object({ childId: z.coerce.number().int().positive() }).strict();
const bodyClass = z.object({ classId: z.coerce.number().int().positive() }).strict();

const PROMPT_VERSION_ONE = "agent-one-v1";
const PROMPT_VERSION_ALL = "agent-all-v2";

/** 每批并发生成个别化分析的人数 */
const INDIVIDUAL_CONCURRENCY = 8;

export type ClassOverallPipelineProgress =
  | {
      type: "individual_progress";
      completed: number;
      total: number;
      batchIndex: number;
      batchCount: number;
    }
  | { type: "overall_start" }
  | { type: "overall_done" };

function bad(res: Response, status: number, message: string) {
  res.status(status).json({ ok: false, error: "bad_request", message });
}

async function loadLatestIndividualMarkdownByChildId(
  prisma: PrismaClient,
  childIds: number[],
): Promise<Map<number, string | null>> {
  const map = new Map<number, string | null>();
  if (childIds.length === 0) return map;
  const rows = await prisma.aiIndividualAnalysis.findMany({
    where: { childId: { in: childIds } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { childId: true, contentMarkdown: true },
  });
  for (const row of rows) {
    if (!map.has(row.childId)) {
      map.set(row.childId, row.contentMarkdown);
    }
  }
  return map;
}

function childNeedsIndividualChartRefresh(
  portfolioItemCount: number,
  contentMarkdown: string | null | undefined,
): boolean {
  if (portfolioItemCount <= 0) return false;
  const t = contentMarkdown?.trim();
  if (!t) return true;
  const { json } = splitIndividualAnalysisOutput(t);
  return !hasCompleteIndividualRadarScores(json);
}

function buildOverallStudentSlots(
  children: {
    id: number;
    displayName: string;
    displayNameMasked: string;
    _count: { portfolioItems: number };
  }[],
  latestMarkdownByChildId: Map<number, string | null>,
): StudentLatestIndividualSlot[] {
  return children.map((c) => {
    const raw = latestMarkdownByChildId.get(c.id)?.trim() ?? "";
    const split = raw ? splitIndividualAnalysisOutput(raw) : { markdown: "", json: null };
    const hasCharts = hasCompleteIndividualRadarScores(split.json);
    return {
      displayName: teacherFacingChildName(c),
      hasPortfolioArchive: c._count.portfolioItems > 0,
      hasIndividualAnalysis: hasCharts,
      individualChartsJson:
        hasCharts && split.json ? compactIndividualChartsForOverallPrompt(split.json) : null,
    };
  });
}

async function persistChildIndividualAnalysis(
  prisma: PrismaClient,
  childId: number,
): Promise<
  | { ok: true; id: number; markdown: string; structured: IndividualAnalysisJson | null; raw: string }
  | { ok: false; message: string }
> {
  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: {
      displayName: true,
      displayNameMasked: true,
      schoolClass: { select: { teacherVisible: true } },
    },
  });
  if (!child || !child.schoolClass.teacherVisible) {
    return { ok: false, message: "幼儿不存在或未开放" };
  }

  const recent = await prisma.portfolioArchiveItem.findMany({
    where: { childId },
    orderBy: [{ observedAt: "desc" }, { id: "desc" }],
    take: 3,
    select: {
      id: true,
      displayDate: true,
      title: true,
      developmentAnalysisSnippet: true,
    },
  });

  const result = await generateChildIndividualAnalysis({
    childDisplayName: teacherFacingChildName(child),
    recentPortfolioItems: recent.map((r) => ({
      displayDate: r.displayDate,
      title: r.title,
      developmentAnalysisSnippet: r.developmentAnalysisSnippet,
    })),
  });

  if (!result.success) {
    return { ok: false, message: result.error ?? "生成失败" };
  }

  const raw = result.raw ?? "";
  const portfolioArchiveItemId = recent[0]?.id ?? null;

  const row = await prisma.aiIndividualAnalysis.create({
    data: {
      childId,
      portfolioArchiveItemId,
      contentMarkdown: raw,
      modelName: process.env.TXT_PROMPT_OPTIMISE_API_MODEL?.trim() || null,
      promptVersion: PROMPT_VERSION_ONE,
    },
  });

  return {
    ok: true,
    id: row.id,
    markdown: result.markdown ?? "",
    structured: result.structured ?? null,
    raw,
  };
}

async function runTeacherClassOverallAnalysis(
  prisma: PrismaClient,
  classId: number,
  onProgress?: (e: ClassOverallPipelineProgress) => void,
): Promise<
  | {
      ok: true;
      id: number;
      markdown: string;
      structured: ClassOverallAnalysisJson | null;
      raw: string;
    }
  | { ok: false; status: number; message: string }
> {
  const cls = await prisma.schoolClass.findFirst({
    where: { id: classId, teacherVisible: true },
    select: { id: true, name: true },
  });
  if (!cls) {
    return { ok: false, status: 404, message: "班级不存在或未开放" };
  }

  const children = await prisma.child.findMany({
    where: { classId },
    orderBy: { id: "asc" },
    select: {
      id: true,
      displayName: true,
      displayNameMasked: true,
      _count: { select: { portfolioItems: true } },
    },
  });

  const childIds = children.map((c) => c.id);
  let latestMarkdownByChildId = await loadLatestIndividualMarkdownByChildId(prisma, childIds);

  const toRefresh = children.filter((c) =>
    childNeedsIndividualChartRefresh(
      c._count.portfolioItems,
      latestMarkdownByChildId.get(c.id) ?? null,
    ),
  );

  const total = toRefresh.length;
  const batchCount = total === 0 ? 0 : Math.ceil(total / INDIVIDUAL_CONCURRENCY);

  onProgress?.({
    type: "individual_progress",
    completed: 0,
    total,
    batchIndex: 0,
    batchCount,
  });

  for (let i = 0; i < toRefresh.length; i += INDIVIDUAL_CONCURRENCY) {
    const batch = toRefresh.slice(i, i + INDIVIDUAL_CONCURRENCY);
    const batchIndex = Math.floor(i / INDIVIDUAL_CONCURRENCY);
    await Promise.all(
      batch.map(async (c) => {
        const r = await persistChildIndividualAnalysis(prisma, c.id);
        if (r.ok === false) {
          console.error(`[analysis-class-overall] individual refresh failed child=${c.id}`, r.message);
        }
      }),
    );
    const completed = Math.min(i + batch.length, total);
    onProgress?.({
      type: "individual_progress",
      completed,
      total,
      batchIndex,
      batchCount,
    });
  }

  latestMarkdownByChildId = await loadLatestIndividualMarkdownByChildId(prisma, childIds);

  onProgress?.({ type: "overall_start" });
  const students = buildOverallStudentSlots(children, latestMarkdownByChildId);
  const result = await generateClassOverallAnalysis({
    classDisplayLabel: cls.name,
    students,
  });

  if (!result.success) {
    return { ok: false, status: 502, message: result.error ?? "生成失败" };
  }

  onProgress?.({ type: "overall_done" });

  const raw = result.raw ?? "";
  const created = await prisma.aiClassAnalysis.create({
    data: {
      classId,
      title: null,
      periodNote: null,
      contentMarkdown: raw,
      modelName: process.env.TXT_PROMPT_OPTIMISE_API_MODEL?.trim() || null,
      promptVersion: PROMPT_VERSION_ALL,
    },
  });

  return {
    ok: true,
    id: created.id,
    markdown: result.markdown ?? "",
    structured: result.structured ?? null,
    raw,
  };
}

export function registerTeacherAnalysisAiRoutes(app: Express, prisma: PrismaClient) {
  app.post("/api/teacher/analysis-individual", async (req: Request, res: Response) => {
    const parsed = bodyIndividual.safeParse(req.body);
    if (!parsed.success) {
      bad(res, 400, "请提供 JSON：{ childId: number }");
      return;
    }
    const { childId } = parsed.data;
    try {
      const saved = await persistChildIndividualAnalysis(prisma, childId);
      if (saved.ok === false) {
        const is404 = saved.message === "幼儿不存在或未开放";
        res.status(is404 ? 404 : 502).json({ ok: false, message: saved.message });
        return;
      }
      res.json({
        ok: true,
        id: saved.id,
        markdown: saved.markdown,
        structured: saved.structured,
        raw: saved.raw,
      });
    } catch (e) {
      console.error("[analysis-individual]", e);
      res.status(503).json({ ok: false, error: "server_error", message: "服务暂不可用" });
    }
  });

  app.post("/api/teacher/analysis-class-overall", async (req: Request, res: Response) => {
    const parsed = bodyClass.safeParse(req.body);
    if (!parsed.success) {
      bad(res, 400, "请提供 JSON：{ classId: number }");
      return;
    }
    const { classId } = parsed.data;
    try {
      const out = await runTeacherClassOverallAnalysis(prisma, classId);
      if (out.ok === false) {
        res.status(out.status).json({ ok: false, message: out.message });
        return;
      }
      res.json({
        ok: true,
        id: out.id,
        markdown: out.markdown,
        structured: out.structured,
        raw: out.raw,
      });
    } catch (e) {
      console.error("[analysis-class-overall]", e);
      res.status(503).json({ ok: false, error: "server_error", message: "服务暂不可用" });
    }
  });

  app.post("/api/teacher/analysis-class-overall-stream", async (req: Request, res: Response) => {
    const parsed = bodyClass.safeParse(req.body);
    if (!parsed.success) {
      bad(res, 400, "请提供 JSON：{ classId: number }");
      return;
    }
    const { classId } = parsed.data;

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const writeLine = (obj: unknown) => {
      res.write(`${JSON.stringify(obj)}\n`);
    };

    try {
      const out = await runTeacherClassOverallAnalysis(prisma, classId, (e) => writeLine(e));
      if (out.ok === false) {
        writeLine({ type: "error", status: out.status, message: out.message });
        res.end();
        return;
      }
      writeLine({
        type: "complete",
        ok: true,
        id: out.id,
        markdown: out.markdown,
        structured: out.structured,
        raw: out.raw,
      });
      res.end();
    } catch (e) {
      console.error("[analysis-class-overall-stream]", e);
      writeLine({ type: "error", status: 503, message: "服务暂不可用" });
      res.end();
    }
  });
}
