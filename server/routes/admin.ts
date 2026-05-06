/**
 * 管理端 API：教师登录、班级 CRUD、幼儿 Excel 模板与导入。
 */
import type { Express, NextFunction, Request, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { z } from "zod";
import type { Prisma, PrismaClient } from "../../src/generated/prisma/client.js";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieValue,
  createAdminSessionToken,
  hashPassword,
  parseCookies,
  readAdminSessionToken,
  verifyPassword,
} from "../adminAuth.js";
import { hashIdCardLastSix } from "../hashChildId.js";
import { insertChildRow } from "../insertChild.js";
import { maskChildDisplayName } from "../lib/maskChildDisplayName.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const gradeBandSchema = z.enum(["small", "medium", "large"]);

function getTeacherId(req: Request): number | null {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[ADMIN_SESSION_COOKIE];
  return readAdminSessionToken(token, adminSessionCookieValue());
}

function requireAdmin(
  prisma: PrismaClient,
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req, res, next) => {
    try {
      const id = getTeacherId(req);
      if (id == null) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      const teacher = await prisma.teacher.findUnique({ where: { id } });
      if (!teacher) {
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      (req as Request & { adminTeacherId?: number }).adminTeacherId = id;
      next();
    } catch (err) {
      console.error("[admin auth]", err);
      res.status(503).json({ error: "database_unavailable" });
    }
  };
}

const idParam = z.coerce.number().int().positive();

function setSessionCookie(res: Response, teacherId: number) {
  const token = createAdminSessionToken(teacherId, adminSessionCookieValue());
  const maxAge = 7 * 24 * 60 * 60;
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  );
}

function clearSessionCookie(res: Response) {
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

export function registerAdminRoutes(app: Express, prisma: PrismaClient) {
  const auth = requireAdmin(prisma);

  app.post("/api/admin/login", async (req: Request, res: Response) => {
    const body = z
      .object({
        loginIdentifier: z.string().min(1).max(64),
        password: z.string().min(1).max(128),
      })
      .safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "bad_request", message: "invalid body" });
      return;
    }
    const { loginIdentifier, password } = body.data;
    try {
      const teacher = await prisma.teacher.findFirst({
        where: { loginIdentifier },
      });
      if (!teacher?.passwordHash || !verifyPassword(password, teacher.passwordHash)) {
        res.status(401).json({ error: "invalid_credentials" });
        return;
      }
      setSessionCookie(res, teacher.id);
      res.json({
        id: teacher.id,
        displayName: teacher.displayName,
        loginIdentifier: teacher.loginIdentifier,
      });
    } catch (err) {
      console.error("[admin/login]", err);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  app.post("/api/admin/logout", (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.get("/api/admin/me", auth, async (req: Request, res: Response) => {
    const id = (req as Request & { adminTeacherId: number }).adminTeacherId;
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { id },
        select: { id: true, displayName: true, loginIdentifier: true },
      });
      if (!teacher) {
        clearSessionCookie(res);
        res.status(401).json({ error: "unauthorized" });
        return;
      }
      res.json(teacher);
    } catch (err) {
      console.error("[admin/me]", err);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  app.get("/api/admin/classes", auth, async (_req, res) => {
    try {
      const rows = await prisma.schoolClass.findMany({
        orderBy: { id: "asc" },
        include: { _count: { select: { children: true } } },
      });
      res.json({
        items: rows.map((r) => ({
          id: r.id,
          name: r.name,
          gradeBand: r.gradeBand,
          schoolYear: r.schoolYear,
          teacherVisible: r.teacherVisible,
          defaultForTeacher: r.defaultForTeacher,
          childCount: r._count.children,
        })),
      });
    } catch (err) {
      console.error("[admin/classes]", err);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  const createClassBody = z
    .object({
      name: z.string().min(1).max(64),
      gradeBand: gradeBandSchema,
      schoolYear: z.string().max(32).optional().nullable(),
      teacherVisible: z.boolean().optional(),
      /** 为 true 时将该班设为全园唯一「教师端默认」，并自动勾选在教师端展示 */
      defaultForTeacher: z.boolean().optional(),
    })
    .strict();

  app.post("/api/admin/classes", auth, async (req, res) => {
    const parsed = createClassBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request", message: "invalid body" });
      return;
    }
    const { name, gradeBand, schoolYear, teacherVisible, defaultForTeacher } = parsed.data;
    try {
      if (defaultForTeacher === true) {
        await prisma.schoolClass.updateMany({ data: { defaultForTeacher: false } });
      }
      const created = await prisma.schoolClass.create({
        data: {
          name,
          gradeBand,
          schoolYear: schoolYear ?? undefined,
          ...(teacherVisible !== undefined && { teacherVisible }),
          ...(defaultForTeacher === true ? { defaultForTeacher: true, teacherVisible: true } : {}),
        },
      });
      const after = await prisma.schoolClass.findUniqueOrThrow({
        where: { id: created.id },
        include: { _count: { select: { children: true } } },
      });
      res.status(201).json({
        id: after.id,
        name: after.name,
        gradeBand: after.gradeBand,
        schoolYear: after.schoolYear,
        teacherVisible: after.teacherVisible,
        defaultForTeacher: after.defaultForTeacher,
        childCount: after._count.children,
      });
    } catch (err) {
      console.error("[admin/classes POST]", err);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  app.get("/api/admin/classes/:classId", auth, async (req, res) => {
    const pid = idParam.safeParse(req.params.classId);
    if (!pid.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const classId = pid.data;
    try {
      const cls = await prisma.schoolClass.findUnique({
        where: { id: classId },
        include: {
          children: {
            orderBy: { id: "asc" },
            select: {
              id: true,
              displayName: true,
              ageBand: true,
              createdAt: true,
              idCardLastSixHash: true,
            },
          },
        },
      });
      if (!cls) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json({
        id: cls.id,
        name: cls.name,
        gradeBand: cls.gradeBand,
        schoolYear: cls.schoolYear,
        teacherVisible: cls.teacherVisible,
        defaultForTeacher: cls.defaultForTeacher,
        children: cls.children.map(({ idCardLastSixHash, ...rest }) => ({
          ...rest,
          idCardLastSixBound: idCardLastSixHash != null,
        })),
      });
    } catch (err) {
      console.error("[admin/class detail]", err);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  const patchClassBody = z
    .object({
      name: z.string().min(1).max(64).optional(),
      gradeBand: gradeBandSchema.optional(),
      schoolYear: z.union([z.string().max(32), z.null()]).optional(),
      teacherVisible: z.boolean().optional(),
      defaultForTeacher: z.boolean().optional(),
    })
    .strict();

  app.patch("/api/admin/classes/:classId", auth, async (req, res) => {
    const pid = idParam.safeParse(req.params.classId);
    if (!pid.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const classId = pid.data;
    const parsed = patchClassBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request", message: "invalid body" });
      return;
    }
    if (
      parsed.data.name === undefined &&
      parsed.data.gradeBand === undefined &&
      parsed.data.schoolYear === undefined &&
      parsed.data.teacherVisible === undefined &&
      parsed.data.defaultForTeacher === undefined
    ) {
      res.status(400).json({ error: "bad_request", message: "no fields to update" });
      return;
    }
    try {
      const exists = await prisma.schoolClass.findUnique({ where: { id: classId } });
      if (!exists) {
        res.status(404).json({ error: "not_found" });
        return;
      }

      const baseData: Prisma.SchoolClassUpdateInput = {};
      if (parsed.data.name !== undefined) baseData.name = parsed.data.name.trim();
      if (parsed.data.gradeBand !== undefined) baseData.gradeBand = parsed.data.gradeBand;
      if (parsed.data.schoolYear !== undefined) {
        baseData.schoolYear =
          parsed.data.schoolYear === null ? null : parsed.data.schoolYear || null;
      }
      if (parsed.data.teacherVisible !== undefined) {
        baseData.teacherVisible = parsed.data.teacherVisible;
        if (parsed.data.teacherVisible === false) {
          baseData.defaultForTeacher = false;
        }
      }
      if (parsed.data.defaultForTeacher === false) {
        baseData.defaultForTeacher = false;
      }

      if (parsed.data.defaultForTeacher === true) {
        await prisma.$transaction(async (tx) => {
          await tx.schoolClass.updateMany({ data: { defaultForTeacher: false } });
          await tx.schoolClass.update({
            where: { id: classId },
            data: {
              ...baseData,
              defaultForTeacher: true,
              teacherVisible: true,
            },
          });
        });
      } else {
        await prisma.schoolClass.update({
          where: { id: classId },
          data: baseData,
        });
      }

      const updated = await prisma.schoolClass.findUniqueOrThrow({
        where: { id: classId },
        include: { _count: { select: { children: true } } },
      });
      res.json({
        id: updated.id,
        name: updated.name,
        gradeBand: updated.gradeBand,
        schoolYear: updated.schoolYear,
        teacherVisible: updated.teacherVisible,
        defaultForTeacher: updated.defaultForTeacher,
        childCount: updated._count.children,
      });
    } catch (err) {
      console.error("[admin/patch class]", err);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  app.delete("/api/admin/classes/:classId", auth, async (req, res) => {
    const pid = idParam.safeParse(req.params.classId);
    if (!pid.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const classId = pid.data;
    try {
      const exists = await prisma.schoolClass.findUnique({ where: { id: classId } });
      if (!exists) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      await prisma.$transaction(async (tx) => {
        const children = await tx.child.findMany({
          where: { classId },
          select: { id: true },
        });
        for (const ch of children) {
          await tx.child.delete({ where: { id: ch.id } });
        }
        await tx.schoolClass.delete({ where: { id: classId } });
      });
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/delete class]", err);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  const createChildBody = z
    .object({
      displayName: z.string().min(1).max(64),
      /** `null` 表示未指定年龄段，与编辑幼儿一致 */
      ageBand: z.union([gradeBandSchema, z.null()]),
    })
    .strict();

  app.post("/api/admin/classes/:classId/children", auth, async (req, res) => {
    const pid = idParam.safeParse(req.params.classId);
    if (!pid.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const classId = pid.data;
    const parsed = createChildBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request", message: "invalid body" });
      return;
    }
    try {
      const cls = await prisma.schoolClass.findUnique({ where: { id: classId } });
      if (!cls) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const displayName = parsed.data.displayName.trim();
      const clash = await prisma.child.findFirst({ where: { classId, displayName } });
      if (clash) {
        res.status(409).json({ error: "duplicate_name", message: "本班已有同名幼儿" });
        return;
      }
      const { ageBand } = parsed.data;
      await insertChildRow(prisma, { classId, displayName, ageBand });
      const created = await prisma.child.findUnique({
        where: { classId_displayName: { classId, displayName } },
        select: {
          id: true,
          displayName: true,
          ageBand: true,
          createdAt: true,
        },
      });
      if (!created) {
        res.status(503).json({ error: "database_unavailable" });
        return;
      }
      res.status(201).json({ ...created, idCardLastSixBound: false });
    } catch (err) {
      console.error("[admin/create child]", err);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  const patchChildBody = z
    .object({
      displayName: z.string().min(1).max(64).optional(),
      idCardLastSix: z.string().regex(/^\d{6}$/).optional(),
      ageBand: z.union([gradeBandSchema, z.null()]).optional(),
    })
    .strict();

  app.patch("/api/admin/classes/:classId/children/:childId", auth, async (req, res) => {
    const cid = idParam.safeParse(req.params.classId);
    const kid = idParam.safeParse(req.params.childId);
    if (!cid.success || !kid.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const classId = cid.data;
    const childId = kid.data;
    const parsed = patchChildBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request", message: "invalid body" });
      return;
    }
    if (
      parsed.data.displayName === undefined &&
      parsed.data.idCardLastSix === undefined &&
      parsed.data.ageBand === undefined
    ) {
      res.status(400).json({ error: "bad_request", message: "no fields to update" });
      return;
    }
    try {
      const child = await prisma.child.findFirst({
        where: { id: childId, classId },
      });
      if (!child) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const nextName =
        parsed.data.displayName !== undefined ? parsed.data.displayName.trim() : child.displayName;
      const nameChanged = nextName !== child.displayName;
      if (
        nameChanged &&
        parsed.data.idCardLastSix === undefined &&
        child.idCardLastSixHash != null
      ) {
        res.status(400).json({
          error: "bad_request",
          message: "该幼儿已绑定证件后六位，修改姓名时需同时提供新的身份证后六位",
        });
        return;
      }
      if (nameChanged) {
        const clash = await prisma.child.findFirst({
          where: { classId, displayName: nextName, NOT: { id: childId } },
        });
        if (clash) {
          res.status(409).json({ error: "duplicate_name", message: "本班已有同名幼儿" });
          return;
        }
      }
      const updated = await prisma.child.update({
        where: { id: childId },
        data: {
          ...(parsed.data.displayName !== undefined && {
            displayName: nextName,
            displayNameMasked: maskChildDisplayName(nextName),
          }),
          ...(parsed.data.idCardLastSix !== undefined && {
            idCardLastSixHash: hashIdCardLastSix(nextName, parsed.data.idCardLastSix),
          }),
          ...(parsed.data.ageBand !== undefined && { ageBand: parsed.data.ageBand }),
        },
        select: {
          id: true,
          displayName: true,
          ageBand: true,
          createdAt: true,
          idCardLastSixHash: true,
        },
      });
      const { idCardLastSixHash, ...rest } = updated;
      res.json({ ...rest, idCardLastSixBound: idCardLastSixHash != null });
    } catch (err) {
      console.error("[admin/patch child]", err);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  app.delete("/api/admin/classes/:classId/children/:childId", auth, async (req, res) => {
    const cid = idParam.safeParse(req.params.classId);
    const kid = idParam.safeParse(req.params.childId);
    if (!cid.success || !kid.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const classId = cid.data;
    const childId = kid.data;
    try {
      const child = await prisma.child.findFirst({
        where: { id: childId, classId },
      });
      if (!child) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      await prisma.child.delete({ where: { id: childId } });
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/delete child]", err);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  app.get("/api/admin/classes/:classId/import-template", auth, async (req, res) => {
    const pid = idParam.safeParse(req.params.classId);
    if (!pid.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const classId = pid.data;
    try {
      const cls = await prisma.schoolClass.findUnique({ where: { id: classId } });
      if (!cls) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      const ws = XLSX.utils.aoa_to_sheet([
        ["幼儿姓名"],
        ["示例幼儿"],
        [],
        ["说明：仅需「幼儿姓名」；身份证后六位由家长首次登录时填写并入库。"],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "学生导入");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      const body = Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
      const filename = encodeURIComponent(`学生导入模板_${cls.name}.xlsx`);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${filename}`);
      res.send(body);
    } catch (err) {
      console.error("[admin/template]", err);
      res.status(503).json({ error: "database_unavailable" });
    }
  });

  app.post(
    "/api/admin/classes/:classId/children/import",
    auth,
    upload.single("file"),
    async (req, res) => {
      const pid = idParam.safeParse(req.params.classId);
      if (!pid.success) {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      const classId = pid.data;
      if (!req.file?.buffer) {
        res.status(400).json({ error: "bad_request", message: "missing file" });
        return;
      }
      try {
        const cls = await prisma.schoolClass.findUnique({ where: { id: classId } });
        if (!cls) {
          res.status(404).json({ error: "not_found" });
          return;
        }
        const wb = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) {
          res.status(400).json({ error: "bad_request", message: "empty workbook" });
          return;
        }
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
          raw: false,
        });

        const nameKeys = ["幼儿姓名", "姓名", "displayName", "学生姓名"];

        function cellName(row: Record<string, unknown>): string {
          for (const k of nameKeys) {
            if (k in row && row[k] !== undefined && row[k] !== "") {
              return String(row[k]).trim();
            }
          }
          for (const [k, v] of Object.entries(row)) {
            const nk = k.replace(/\s/g, "");
            if (nameKeys.some((x) => x.replace(/\s/g, "") === nk) && v !== "")
              return String(v).trim();
          }
          return "";
        }

        let imported = 0;
        let skipped = 0;
        for (const row of rows) {
          const displayName = cellName(row);
          if (!displayName || displayName === "示例幼儿") {
            skipped++;
            continue;
          }
          const existing = await prisma.child.findUnique({
            where: { classId_displayName: { classId, displayName } },
          });
          if (existing) {
            await prisma.child.update({
              where: { id: existing.id },
              data: {
                ageBand: cls.gradeBand,
                displayNameMasked: maskChildDisplayName(existing.displayName),
              },
            });
          } else {
            await insertChildRow(prisma, {
              classId,
              displayName,
              ageBand: cls.gradeBand,
            });
          }
          imported++;
        }
        res.json({ ok: true, imported, skipped });
      } catch (err) {
        console.error("[admin/import]", err);
        res.status(503).json({ error: "database_unavailable" });
      }
    },
  );
}
