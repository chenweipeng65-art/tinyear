/**
 * M2 只读 API（§2.4）：班级、班内幼儿、幼儿档案列表。
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import {
  getChildById,
  listArchiveItemsForChild,
  listChildrenInClass,
  listClassAnalysesForClass,
  listClasses,
  listIndividualAnalysesForChild,
} from "../queries/readQueries.js";

const idParam = z.coerce.number().int().positive();

function badRequest(res: Response, message: string) {
  res.status(400).json({ error: "bad_request", message });
}

function notFound(res: Response) {
  res.status(404).json({ error: "not_found" });
}

function dbError(res: Response, err: unknown) {
  console.error("[api/read]", err);
  res.status(503).json({ error: "database_unavailable" });
}

export function registerReadRoutes(app: Express, prisma: PrismaClient) {
  app.get("/api/classes", async (_req, res) => {
    try {
      const items = await listClasses(prisma);
      res.json({ items });
    } catch (err) {
      dbError(res, err);
    }
  });

  app.get("/api/classes/:classId/children", async (req: Request, res: Response) => {
    const parsed = idParam.safeParse(req.params.classId);
    if (!parsed.success) {
      badRequest(res, "invalid classId");
      return;
    }
    const classId = parsed.data;
    try {
      const result = await listChildrenInClass(prisma, classId);
      if (result.notFound) {
        notFound(res);
        return;
      }
      res.json({ items: result.items });
    } catch (err) {
      dbError(res, err);
    }
  });

  app.get("/api/classes/:classId/class-analyses", async (req: Request, res: Response) => {
    const parsed = idParam.safeParse(req.params.classId);
    if (!parsed.success) {
      badRequest(res, "invalid classId");
      return;
    }
    const classId = parsed.data;
    try {
      const result = await listClassAnalysesForClass(prisma, classId);
      if (result.notFound) {
        notFound(res);
        return;
      }
      res.json({ items: result.items });
    } catch (err) {
      dbError(res, err);
    }
  });

  app.get("/api/children/:childId/individual-analyses", async (req: Request, res: Response) => {
    const parsed = idParam.safeParse(req.params.childId);
    if (!parsed.success) {
      badRequest(res, "invalid childId");
      return;
    }
    const childId = parsed.data;
    try {
      const result = await listIndividualAnalysesForChild(prisma, childId);
      if (result.notFound) {
        notFound(res);
        return;
      }
      res.json({ items: result.items });
    } catch (err) {
      dbError(res, err);
    }
  });

  app.get("/api/children/:childId/archive-items", async (req: Request, res: Response) => {
    const parsed = idParam.safeParse(req.params.childId);
    if (!parsed.success) {
      badRequest(res, "invalid childId");
      return;
    }
    const childId = parsed.data;
    try {
      const result = await listArchiveItemsForChild(prisma, childId);
      if (result.notFound) {
        notFound(res);
        return;
      }
      res.json({ items: result.items });
    } catch (err) {
      dbError(res, err);
    }
  });

  app.get("/api/children/:childId", async (req: Request, res: Response) => {
    const parsed = idParam.safeParse(req.params.childId);
    if (!parsed.success) {
      badRequest(res, "invalid childId");
      return;
    }
    const childId = parsed.data;
    try {
      const result = await getChildById(prisma, childId);
      if (result.notFound) {
        notFound(res);
        return;
      }
      res.json(result.child);
    } catch (err) {
      dbError(res, err);
    }
  });
}
