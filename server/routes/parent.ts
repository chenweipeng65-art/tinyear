/**
 * 家长端公开接口：幼儿姓名 + 身份证后六位校验 / 首次绑定入库。
 */
import { timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { hashIdCardLastSix } from "../hashChildId.js";
import { resolveChildForParentLogin } from "../parentResolveChild.js";

function equalHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  } catch {
    return false;
  }
}

const verifyBody = z
  .object({
    displayName: z.string().min(1).max(64),
    idCardLastSix: z.string().regex(/^\d{6}$/),
    classId: z.number().int().positive().optional(),
  })
  .strict();

export function registerParentRoutes(app: Express, prisma: PrismaClient) {
  app.post("/api/parent/verify-login", async (req: Request, res: Response) => {
    const parsed = verifyBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request", message: "请输入幼儿姓名与 6 位身份证后六位" });
      return;
    }
    const { displayName, idCardLastSix } = parsed.data;
    const name = displayName.trim();

    try {
      const resolved = await resolveChildForParentLogin(prisma, name, parsed.data.classId);
      if (resolved.ok === false) {
        res.status(resolved.status).json({ error: resolved.reason, message: resolved.message });
        return;
      }
      const child = resolved.child;

      const candidate = hashIdCardLastSix(child.displayName, idCardLastSix);

      if (child.idCardLastSixHash == null) {
        await prisma.child.update({
          where: { id: child.id },
          data: { idCardLastSixHash: candidate },
        });
        res.json({ ok: true, displayName: child.displayName, classId: child.classId });
        return;
      }

      if (!equalHash(candidate, child.idCardLastSixHash)) {
        res.status(401).json({ error: "invalid_credentials", message: "身份证后六位不正确" });
        return;
      }

      res.json({ ok: true, displayName: child.displayName, classId: child.classId });
    } catch (err) {
      console.error("[parent/verify-login]", err);
      res.status(503).json({ error: "database_unavailable" });
    }
  });
}
