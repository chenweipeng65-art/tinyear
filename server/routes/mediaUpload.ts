/**
 * 教师首页画语图、家长头像：multipart 上传至 S3 并写入数据库。
 */
import type { Express, Request, Response } from "express";
import { format } from "date-fns";
import multer from "multer";
import { z } from "zod";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { uploadBufferToS3 } from "../lib/s3UploadService.js";
import { verifyParentChildCredentials } from "../parentChildVerify.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp)$/i.test(file.mimetype);
    cb(null, ok);
  },
});

const idParam = z.coerce.number().int().positive();

function bad(res: Response, status: number, message: string) {
  res.status(status).json({ error: "bad_request", message });
}

export function registerMediaUploadRoutes(app: Express, prisma: PrismaClient) {
  /** 家长：上传幼儿头像 → S3，更新 `Child.avatarUrl` */
  app.post(
    "/api/parent/avatar-upload",
    upload.single("file"),
    async (req: Request, res: Response) => {
      if (!req.file?.buffer) {
        bad(res, 400, "请选择图片文件");
        return;
      }
      const displayName = String(req.body.displayName ?? "").trim();
      const idCardLastSix = String(req.body.idCardLastSix ?? "").replace(/\D/g, "").slice(0, 6);
      const classIdParsed = idParam.safeParse(req.body.classId ?? 1);
      if (!displayName || idCardLastSix.length !== 6 || !classIdParsed.success) {
        bad(res, 400, "请提供幼儿姓名、6 位身份证后六位与班级");
        return;
      }
      const classId = classIdParsed.data;

      const verified = await verifyParentChildCredentials(prisma, {
        displayName,
        idCardLastSix,
        classId,
      });
      if (verified.ok === false) {
        res.status(verified.status).json({ error: "unauthorized", message: verified.message });
        return;
      }

      const ext =
        req.file.mimetype === "image/png" ? "png" : req.file.mimetype === "image/webp" ? "webp" : "jpg";
      const safeName = `avatar-${verified.child.id}.${ext}`;
      try {
        const url = await uploadBufferToS3(req.file.buffer, safeName, req.file.mimetype);
        await prisma.child.update({
          where: { id: verified.child.id },
          data: { avatarUrl: url },
        });
        res.json({ ok: true, avatarUrl: url });
      } catch (e) {
        console.error("[parent/avatar-upload]", e);
        res.status(503).json({ error: "upload_failed", message: e instanceof Error ? e.message : "上传失败" });
      }
    },
  );

  /** 教师首页：幼儿画语图片 → S3，并创建一条倾听会话草稿挂接图片 URL */
  app.post(
    "/api/teacher/listening-child-art-upload",
    upload.single("file"),
    async (req: Request, res: Response) => {
      if (!req.file?.buffer) {
        bad(res, 400, "请选择图片文件");
        return;
      }
      const childIdParsed = idParam.safeParse(req.body.childId);
      const classIdParsed = idParam.safeParse(req.body.classId);
      if (!childIdParsed.success || !classIdParsed.success) {
        bad(res, 400, "请提供有效的 childId 与 classId");
        return;
      }
      const childId = childIdParsed.data;
      const classId = classIdParsed.data;

      const observedRaw = String(req.body.observedAt ?? "").trim();
      let observedAt: Date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(observedRaw)) {
        observedAt = new Date(`${observedRaw}T12:00:00`);
      } else {
        observedAt = new Date();
      }

      try {
        const cls = await prisma.schoolClass.findFirst({
          where: { id: classId, teacherVisible: true },
        });
        if (!cls) {
          res.status(404).json({ error: "not_found", message: "班级不存在或未在教师端展示" });
          return;
        }

        const child = await prisma.child.findFirst({
          where: { id: childId, classId },
        });
        if (!child) {
          res.status(404).json({ error: "not_found", message: "未找到该幼儿" });
          return;
        }

        const ext =
          req.file.mimetype === "image/png" ? "png" : req.file.mimetype === "image/webp" ? "webp" : "jpg";
        const safeName = `child-art-${childId}-${Date.now()}.${ext}`;
        const url = await uploadBufferToS3(req.file.buffer, safeName, req.file.mimetype);

        const displayDate =
          observedRaw && /^\d{4}-\d{2}-\d{2}$/.test(observedRaw)
            ? observedRaw
            : format(new Date(observedAt), "yyyy-MM-dd");

        const item = await prisma.portfolioArchiveItem.create({
          data: {
            childId,
            title: "幼儿画语",
            observedAt,
            displayDate,
            status: "draft",
            childArtImageUrl: url,
          },
        });

        res.json({ ok: true, imageUrl: url, portfolioArchiveItemId: item.id });
      } catch (e) {
        console.error("[teacher/listening-child-art-upload]", e);
        res.status(503).json({ error: "upload_failed", message: e instanceof Error ? e.message : "上传失败" });
      }
    },
  );
}
