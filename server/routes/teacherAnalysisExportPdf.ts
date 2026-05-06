/**
 * 个别化分析 / 班级整体分析：PDF 导出 S3 缓存（GET 查库，POST 上传）
 */
import type { Express, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { uploadBufferToS3 } from "../lib/s3UploadService.js";
import { buildAnalysisMarkdownPdfCacheKey } from "../lib/analysisExportPdfCacheKey.js";

const idParam = z.coerce.number().int().positive();

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

function bad(res: Response, status: number, message: string) {
  res.status(status).json({ error: "bad_request", message });
}

export function registerTeacherAnalysisExportPdfRoutes(app: Express, prisma: PrismaClient) {
  app.get("/api/teacher/ai-individual-analyses/:id/export-pdf", async (req: Request, res: Response) => {
    const idParsed = idParam.safeParse(req.params.id);
    if (!idParsed.success) {
      bad(res, 400, "无效的 id");
      return;
    }
    const id = idParsed.data;
    try {
      const row = await prisma.aiIndividualAnalysis.findUnique({
        where: { id },
        select: {
          contentMarkdown: true,
          modelName: true,
          promptVersion: true,
          exportPdfUrl: true,
          exportPdfCacheKey: true,
          child: { select: { schoolClass: { select: { teacherVisible: true } } } },
        },
      });
      if (!row || !row.child.schoolClass.teacherVisible) {
        res.status(404).json({ error: "not_found", message: "记录不存在" });
        return;
      }
      const cacheKey = buildAnalysisMarkdownPdfCacheKey(row);
      const url =
        row.exportPdfUrl && row.exportPdfCacheKey === cacheKey ? row.exportPdfUrl : null;
      res.json({ ok: true, url });
    } catch (e) {
      console.error("[ai-individual-analyses export-pdf GET]", e);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  app.post(
    "/api/teacher/ai-individual-analyses/:id/export-pdf",
    pdfUpload.single("file"),
    async (req: Request, res: Response) => {
      const idParsed = idParam.safeParse(req.params.id);
      if (!idParsed.success) {
        bad(res, 400, "无效的 id");
        return;
      }
      if (!req.file?.buffer?.length) {
        bad(res, 400, "请上传 PDF 文件（字段名 file）");
        return;
      }
      const id = idParsed.data;
      try {
        const row = await prisma.aiIndividualAnalysis.findUnique({
          where: { id },
          select: {
            contentMarkdown: true,
            modelName: true,
            promptVersion: true,
            child: { select: { schoolClass: { select: { teacherVisible: true } } } },
          },
        });
        if (!row || !row.child.schoolClass.teacherVisible) {
          res.status(404).json({ error: "not_found", message: "记录不存在" });
          return;
        }
        const cacheKey = buildAnalysisMarkdownPdfCacheKey(row);
        let publicUrl: string;
        try {
          publicUrl = await uploadBufferToS3(
            req.file.buffer,
            `ai-individual-${id}.pdf`,
            "application/pdf",
          );
        } catch (e) {
          console.error("[ai-individual-analyses export-pdf S3]", e);
          const msg = e instanceof Error ? e.message : "S3 上传失败";
          res.status(503).json({ ok: false, error: "s3_upload_failed", message: msg });
          return;
        }
        await prisma.aiIndividualAnalysis.update({
          where: { id },
          data: { exportPdfUrl: publicUrl, exportPdfCacheKey: cacheKey },
        });
        res.json({ ok: true, url: publicUrl });
      } catch (e) {
        console.error("[ai-individual-analyses export-pdf POST]", e);
        res.status(503).json({ error: "database_unavailable" });
      }
    },
  );

  app.get("/api/teacher/ai-class-analyses/:id/export-pdf", async (req: Request, res: Response) => {
    const idParsed = idParam.safeParse(req.params.id);
    if (!idParsed.success) {
      bad(res, 400, "无效的 id");
      return;
    }
    const id = idParsed.data;
    try {
      const row = await prisma.aiClassAnalysis.findUnique({
        where: { id },
        select: {
          contentMarkdown: true,
          modelName: true,
          promptVersion: true,
          exportPdfUrl: true,
          exportPdfCacheKey: true,
          schoolClass: { select: { teacherVisible: true } },
        },
      });
      if (!row || !row.schoolClass.teacherVisible) {
        res.status(404).json({ error: "not_found", message: "记录不存在" });
        return;
      }
      const cacheKey = buildAnalysisMarkdownPdfCacheKey(row);
      const url =
        row.exportPdfUrl && row.exportPdfCacheKey === cacheKey ? row.exportPdfUrl : null;
      res.json({ ok: true, url });
    } catch (e) {
      console.error("[ai-class-analyses export-pdf GET]", e);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  app.post(
    "/api/teacher/ai-class-analyses/:id/export-pdf",
    pdfUpload.single("file"),
    async (req: Request, res: Response) => {
      const idParsed = idParam.safeParse(req.params.id);
      if (!idParsed.success) {
        bad(res, 400, "无效的 id");
        return;
      }
      if (!req.file?.buffer?.length) {
        bad(res, 400, "请上传 PDF 文件（字段名 file）");
        return;
      }
      const id = idParsed.data;
      try {
        const row = await prisma.aiClassAnalysis.findUnique({
          where: { id },
          select: {
            contentMarkdown: true,
            modelName: true,
            promptVersion: true,
            schoolClass: { select: { teacherVisible: true } },
          },
        });
        if (!row || !row.schoolClass.teacherVisible) {
          res.status(404).json({ error: "not_found", message: "记录不存在" });
          return;
        }
        const cacheKey = buildAnalysisMarkdownPdfCacheKey(row);
        let publicUrl: string;
        try {
          publicUrl = await uploadBufferToS3(
            req.file.buffer,
            `ai-class-${id}.pdf`,
            "application/pdf",
          );
        } catch (e) {
          console.error("[ai-class-analyses export-pdf S3]", e);
          const msg = e instanceof Error ? e.message : "S3 上传失败";
          res.status(503).json({ ok: false, error: "s3_upload_failed", message: msg });
          return;
        }
        await prisma.aiClassAnalysis.update({
          where: { id },
          data: { exportPdfUrl: publicUrl, exportPdfCacheKey: cacheKey },
        });
        res.json({ ok: true, url: publicUrl });
      } catch (e) {
        console.error("[ai-class-analyses export-pdf POST]", e);
        res.status(503).json({ error: "database_unavailable" });
      }
    },
  );
}
