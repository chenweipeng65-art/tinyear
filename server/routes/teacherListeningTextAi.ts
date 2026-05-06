/**
 * 教师首页：教师支持策略 / 家长指导（文本 AI）。
 * 「个性发展分析」摘要由首页「保存记录」接口在落库全文后统一调用 agent3 写入；本接口仅生成并回显文案（可选同步写入策略/家长栏）。
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { generateTeacherSupportStrategies } from "../../ai/txt-ai/agent1/generator.js";
import { generateParentGuidanceAdvice } from "../../ai/txt-ai/agent2/generator.js";
import type { ListeningTextAgentInput } from "../../ai/txt-ai/lib/listeningAgentTypes";

const kindSchema = z.enum(["teacher_support", "parent_guidance"]);

const bodySchema = z
  .object({
    kind: kindSchema,
    transcriptNote: z.string().max(12000).optional().default(""),
    analysisInterpretation: z.string().max(8000).optional().default(""),
    sectionHint: z.string().max(8000).optional(),
    /** 上传表征图时返回的档案记录 id；有则把本接口生成结果写入对应栏位 */
    portfolioArchiveItemId: z.coerce.number().int().positive().optional(),
  })
  .strict();

function bad(res: Response, status: number, message: string) {
  res.status(status).json({ ok: false, message });
}

export function registerTeacherListeningTextAiRoutes(
  app: Express,
  prisma: PrismaClient,
) {
  app.post("/api/teacher/listening-text-ai", async (req: Request, res: Response) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      bad(
        res,
        400,
        "请提供 JSON：{ kind, transcriptNote?, analysisInterpretation?, sectionHint?, portfolioArchiveItemId? }",
      );
      return;
    }

    const {
      kind,
      transcriptNote,
      analysisInterpretation,
      sectionHint,
      portfolioArchiveItemId,
    } = parsed.data;
    const payload: ListeningTextAgentInput = {
      transcriptNote,
      analysisInterpretation,
      sectionHint,
    };

    let result: { success: boolean; text?: string; error?: string };
    switch (kind) {
      case "teacher_support":
        result = await generateTeacherSupportStrategies(payload);
        break;
      case "parent_guidance":
        result = await generateParentGuidanceAdvice(payload);
        break;
    }

    if (!result.success) {
      res.status(502).json({
        ok: false,
        message: result.error ?? "生成失败",
      });
      return;
    }

    const text = result.text ?? "";

    if (portfolioArchiveItemId != null) {
      try {
        if (kind === "teacher_support") {
          await prisma.portfolioArchiveItem.update({
            where: { id: portfolioArchiveItemId },
            data: { teacherSupportStrategies: text },
          });
        } else {
          await prisma.portfolioArchiveItem.update({
            where: { id: portfolioArchiveItemId },
            data: { parentGuidanceAdvice: text },
          });
        }
      } catch (e) {
        console.error("[listening-text-ai] persist portfolio fields", e);
      }
    }

    res.json({ ok: true, text });
  });
}
