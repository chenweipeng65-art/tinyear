/**
 * M4：`POST /api/action`（§9.2）。
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { runRegisteredAction } from "../actions/registry.js";

const actionBodySchema = z
  .object({
    action: z.string().min(1),
    input: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

function statusForResult(result: { ok: boolean; error?: string }): number {
  if (result.ok) return 200;
  switch (result.error) {
    case "unknown_action":
      return 400;
    case "invalid_body":
    case "validation_error":
    case "bad_request":
      return 400;
    case "not_found":
      return 404;
    case "database_unavailable":
      return 503;
    default:
      return 500;
  }
}

export function registerActionRoutes(app: Express, prisma: PrismaClient) {
  app.post("/api/action", async (req: Request, res: Response) => {
    const bodyParsed = actionBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({
        ok: false,
        error: "invalid_body",
        message: "expected JSON { action: string, input?: object }",
        details: z.flattenError(bodyParsed.error),
      });
      return;
    }

    const { action, input } = bodyParsed.data;
    const result = await runRegisteredAction({ prisma }, action, input ?? {});
    res.status(statusForResult(result)).json(result);
  });
}
