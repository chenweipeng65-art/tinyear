/**
 * M4：action 注册表 + Zod 入参 → handler（仅使用 prisma）。
 */
import type { ZodType } from "zod";
import { z } from "zod";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import {
  getChildById,
  listArchiveItemsForChild,
  listChildrenInClass,
  listClasses,
} from "../queries/readQueries.js";
import type { ActionFailure, ActionResult } from "./actionResponse.js";

type HandlerCtx = { prisma: PrismaClient };

type RegisteredAction = {
  input: ZodType;
  run: (ctx: HandlerCtx, input: unknown) => Promise<ActionResult<unknown>>;
};

const emptyInput = z.object({}).strict();

const classesList: RegisteredAction = {
  input: emptyInput,
  async run({ prisma }) {
    try {
      const items = await listClasses(prisma);
      return { ok: true, data: { items } };
    } catch {
      return { ok: false, error: "database_unavailable" };
    }
  },
};

const classesChildrenList: RegisteredAction = {
  input: z.object({ classId: z.number().int().positive() }).strict(),
  async run({ prisma }, input) {
    const { classId } = input as { classId: number };
    try {
      const result = await listChildrenInClass(prisma, classId);
      if (result.notFound) return { ok: false, error: "not_found", message: "class not found" };
      return { ok: true, data: { items: result.items } };
    } catch {
      return { ok: false, error: "database_unavailable" };
    }
  },
};

const childrenArchiveItemsList: RegisteredAction = {
  input: z.object({ childId: z.number().int().positive() }).strict(),
  async run({ prisma }, input) {
    const { childId } = input as { childId: number };
    try {
      const result = await listArchiveItemsForChild(prisma, childId);
      if (result.notFound) return { ok: false, error: "not_found", message: "child not found" };
      return { ok: true, data: { items: result.items } };
    } catch {
      return { ok: false, error: "database_unavailable" };
    }
  },
};

const childrenGet: RegisteredAction = {
  input: z.object({ childId: z.number().int().positive() }).strict(),
  async run({ prisma }, input) {
    const { childId } = input as { childId: number };
    try {
      const result = await getChildById(prisma, childId);
      if (result.notFound) return { ok: false, error: "not_found", message: "child not found" };
      return { ok: true, data: result.child };
    } catch {
      return { ok: false, error: "database_unavailable" };
    }
  },
};

export const ACTION_REGISTRY: Record<string, RegisteredAction> = {
  "classes.list": classesList,
  "classes.children.list": classesChildrenList,
  "children.archiveItems.list": childrenArchiveItemsList,
  "children.get": childrenGet,
};

export async function runRegisteredAction(
  ctx: HandlerCtx,
  actionName: string,
  rawInput: unknown,
): Promise<ActionResult<unknown>> {
  const def = ACTION_REGISTRY[actionName];
  if (!def) {
    const fail: ActionFailure = {
      ok: false,
      error: "unknown_action",
      message: `unknown action: ${actionName}`,
    };
    return fail;
  }

  const parsed = def.input.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation_error",
      message: "input validation failed",
      details: z.flattenError(parsed.error),
    };
  }

  return def.run(ctx, parsed.data);
}
