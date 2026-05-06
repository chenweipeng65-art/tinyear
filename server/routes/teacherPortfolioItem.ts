/**
 * 教师端：更新单条成长档案（倾听合并记录）的文本字段；保存记录时合并落库并触发个性发展摘要 AI
 */
import type { Express, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { generateChildDevelopmentAnalysis } from "../../ai/txt-ai/agent3/generator.js";
import type { ListeningTextAgentInput } from "../../ai/txt-ai/lib/listeningAgentTypes";
import { uploadBufferToS3 } from "../lib/s3UploadService.js";
import {
  buildPortfolioPdfCacheKey,
  parsePortfolioExportSectionIds,
} from "../lib/portfolioExportPdfCacheKey.js";
import { teacherFacingChildName } from "../lib/teacherFacingChildName.js";

const idParam = z.coerce.number().int().positive();

const patchBody = z
  .object({
    teacherReflection: z.string().max(24000).optional(),
    recordingTranscript: z.string().max(24000).optional(),
  })
  .strict();

const saveRecordBody = z
  .object({
    teacherReflection: z.string().max(24000).default(""),
    recordingTranscript: z.string().max(24000).default(""),
    analysisInterpretation: z.string().max(8000).default(""),
    teacherSupportStrategies: z.string().max(12000).default(""),
    parentGuidanceAdvice: z.string().max(12000).default(""),
    /** 与首页日期选择一致时传入，用于回写 observedAt / displayDate */
    observedDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict();

function bad(res: Response, status: number, message: string) {
  res.status(status).json({ error: "bad_request", message });
}

const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 28 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/x-pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");
    cb(null, ok);
  },
});

async function loadPortfolioItemForExport(prisma: PrismaClient, id: number) {
  return prisma.portfolioArchiveItem.findUnique({
    where: { id },
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
      exportPdfUrl: true,
      exportPdfCacheKey: true,
      child: {
        select: {
          displayName: true,
          displayNameMasked: true,
          schoolClass: { select: { teacherVisible: true } },
        },
      },
    },
  });
}

function buildDevelopmentAnalysisInput(fields: {
  transcriptNote: string;
  analysisInterpretation: string;
  teacherSupportStrategies: string;
  parentGuidanceAdvice: string;
  teacherReflection: string;
}): ListeningTextAgentInput {
  const hints: string[] = [];
  const ts = fields.teacherSupportStrategies.trim();
  const pg = fields.parentGuidanceAdvice.trim();
  const rf = fields.teacherReflection.trim();
  if (ts) hints.push(`【教师支持策略】${ts.slice(0, 600)}`);
  if (pg) hints.push(`【家长指导建议】${pg.slice(0, 600)}`);
  if (rf) hints.push(`【教师反思】${rf.slice(0, 600)}`);
  return {
    transcriptNote: fields.transcriptNote,
    analysisInterpretation: fields.analysisInterpretation,
    sectionHint: hints.length > 0 ? hints.join("\n\n") : undefined,
  };
}

export function registerTeacherPortfolioItemRoutes(app: Express, prisma: PrismaClient) {
  /**
   * 成长档案 PDF：先查库中是否已有与当前章节+内容一致的 S3 地址；无则客户端生成后 POST 上传。
   */
  app.get("/api/teacher/portfolio-archive-items/:id/export-pdf", async (req: Request, res: Response) => {
    const idParsed = idParam.safeParse(req.params.id);
    if (!idParsed.success) {
      bad(res, 400, "无效的 id");
      return;
    }
    const sections = parsePortfolioExportSectionIds(req.query.sections);
    if (!sections) {
      bad(res, 400, "请提供 sections 查询参数，如 ?sections=name,drawing,analysis");
      return;
    }
    const id = idParsed.data;
    try {
      const row = await loadPortfolioItemForExport(prisma, id);
      if (!row || !row.child.schoolClass.teacherVisible) {
        res.status(404).json({ error: "not_found", message: "记录不存在" });
        return;
      }
      const cacheKey = buildPortfolioPdfCacheKey(sections, {
        title: row.title,
        displayDate: row.displayDate,
        childArtImageUrl: row.childArtImageUrl,
        summary: row.summary,
        recordingTranscript: row.recordingTranscript,
        analysisInterpretation: row.analysisInterpretation,
        teacherSupportStrategies: row.teacherSupportStrategies,
        parentGuidanceAdvice: row.parentGuidanceAdvice,
        teacherReflection: row.teacherReflection,
        childDisplayName: teacherFacingChildName(row.child),
      });
      const url =
        row.exportPdfUrl && row.exportPdfCacheKey === cacheKey ? row.exportPdfUrl : null;
      res.json({ ok: true, url });
    } catch (e) {
      console.error("[teacher/portfolio-archive-items export-pdf GET]", e);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  app.post(
    "/api/teacher/portfolio-archive-items/:id/export-pdf",
    pdfUpload.single("file"),
    async (req: Request, res: Response) => {
      const idParsed = idParam.safeParse(req.params.id);
      if (!idParsed.success) {
        bad(res, 400, "无效的 id");
        return;
      }
      const sectionsRaw =
        typeof req.body?.sections === "string" ? req.body.sections : req.query.sections;
      const sections = parsePortfolioExportSectionIds(sectionsRaw);
      if (!sections) {
        bad(res, 400, "请随表单提供 sections（逗号分隔的章节 id）");
        return;
      }
      if (!req.file?.buffer?.length) {
        bad(res, 400, "请上传 PDF 文件（字段名 file）");
        return;
      }
      const id = idParsed.data;
      try {
        const row = await loadPortfolioItemForExport(prisma, id);
        if (!row || !row.child.schoolClass.teacherVisible) {
          res.status(404).json({ error: "not_found", message: "记录不存在" });
          return;
        }
        const cacheKey = buildPortfolioPdfCacheKey(sections, {
          title: row.title,
          displayDate: row.displayDate,
          childArtImageUrl: row.childArtImageUrl,
          summary: row.summary,
          recordingTranscript: row.recordingTranscript,
          analysisInterpretation: row.analysisInterpretation,
          teacherSupportStrategies: row.teacherSupportStrategies,
          parentGuidanceAdvice: row.parentGuidanceAdvice,
          teacherReflection: row.teacherReflection,
          childDisplayName: teacherFacingChildName(row.child),
        });

        let publicUrl: string;
        try {
          const safeTitle = row.title.replace(/[/\\:*?"<>|]/g, "_").slice(0, 60) || "archive";
          const originalName = `portfolio-${id}-${safeTitle}.pdf`;
          publicUrl = await uploadBufferToS3(req.file.buffer, originalName, "application/pdf");
        } catch (e) {
          console.error("[teacher/portfolio-archive-items export-pdf S3]", e);
          const msg = e instanceof Error ? e.message : "S3 上传失败";
          res.status(503).json({ ok: false, error: "s3_upload_failed", message: msg });
          return;
        }

        await prisma.portfolioArchiveItem.update({
          where: { id },
          data: { exportPdfUrl: publicUrl, exportPdfCacheKey: cacheKey },
        });

        res.json({ ok: true, url: publicUrl });
      } catch (e) {
        console.error("[teacher/portfolio-archive-items export-pdf POST]", e);
        res.status(503).json({ error: "database_unavailable" });
      }
    },
  );

  /** 首页「保存记录」：一次写入各栏正文，并基于完整材料生成个性发展摘要写入 developmentAnalysisSnippet */
  app.post("/api/teacher/portfolio-archive-items/:id/save-record", async (req: Request, res: Response) => {
    const idParsed = idParam.safeParse(req.params.id);
    if (!idParsed.success) {
      bad(res, 400, "无效的 id");
      return;
    }
    const parsed = saveRecordBody.safeParse(req.body);
    if (!parsed.success) {
      bad(res, 400, "请求体格式不正确");
      return;
    }
    const id = idParsed.data;
    const b = parsed.data;
    try {
      const row = await prisma.portfolioArchiveItem.findUnique({
        where: { id },
        select: { id: true, child: { select: { schoolClass: { select: { teacherVisible: true } } } } },
      });
      if (!row || !row.child.schoolClass.teacherVisible) {
        res.status(404).json({ error: "not_found", message: "记录不存在" });
        return;
      }

      const devInput = buildDevelopmentAnalysisInput({
        transcriptNote: b.recordingTranscript,
        analysisInterpretation: b.analysisInterpretation,
        teacherSupportStrategies: b.teacherSupportStrategies,
        parentGuidanceAdvice: b.parentGuidanceAdvice,
        teacherReflection: b.teacherReflection,
      });
      const dev = await generateChildDevelopmentAnalysis(devInput);

      const dateUpdate =
        b.observedDay != null
          ? {
              displayDate: b.observedDay,
              observedAt: new Date(`${b.observedDay}T12:00:00`),
            }
          : {};

      await prisma.portfolioArchiveItem.update({
        where: { id },
        data: {
          teacherReflection: b.teacherReflection,
          recordingTranscript: b.recordingTranscript,
          analysisInterpretation: b.analysisInterpretation,
          teacherSupportStrategies: b.teacherSupportStrategies,
          parentGuidanceAdvice: b.parentGuidanceAdvice,
          ...dateUpdate,
          ...(dev.success && dev.text ? { developmentAnalysisSnippet: dev.text } : {}),
        },
      });

      res.json({
        ok: true,
        snippetGenerated: !!(dev.success && dev.text),
        ...(dev.success ? {} : { snippetMessage: dev.error ?? "个性发展摘要未生成" }),
      });
    } catch (e) {
      console.error("[teacher/portfolio-archive-items save-record]", e);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  app.patch("/api/teacher/portfolio-archive-items/:id", async (req: Request, res: Response) => {
    const idParsed = idParam.safeParse(req.params.id);
    if (!idParsed.success) {
      bad(res, 400, "无效的 id");
      return;
    }
    const parsed = patchBody.safeParse(req.body);
    if (!parsed.success) {
      bad(res, 400, "请求体仅支持 teacherReflection、recordingTranscript（可选）");
      return;
    }
    if (Object.keys(parsed.data).length === 0) {
      bad(res, 400, "至少提供一个要更新的字段");
      return;
    }
    const id = idParsed.data;
    try {
      const row = await prisma.portfolioArchiveItem.findUnique({
        where: { id },
        select: { id: true, child: { select: { schoolClass: { select: { teacherVisible: true } } } } },
      });
      if (!row || !row.child.schoolClass.teacherVisible) {
        res.status(404).json({ error: "not_found", message: "记录不存在" });
        return;
      }
      await prisma.portfolioArchiveItem.update({
        where: { id },
        data: parsed.data,
      });
      res.json({ ok: true });
    } catch (e) {
      console.error("[teacher/portfolio-archive-items patch]", e);
      res.status(503).json({ error: "database_unavailable" });
    }
  });
}
