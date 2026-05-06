/**
 * 教师端：幼儿表征图 AI 分析解读
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { analyzeChildArtImage } from "../../ai/img-ai/agent/generator.js";

const bodySchema = z
  .object({
    imageUrl: z.string().min(1).max(4096),
    /** 幼儿画语：谈话、画作描述、录音转写等，作为图像分析的补充提示 */
    transcriptNote: z.string().max(12000).optional(),
    /** 与上传画语接口返回的档案 id；成功后将录音文本与分析解读写入该条档案 */
    portfolioArchiveItemId: z.coerce.number().int().positive().optional(),
  })
  .strict();

function bad(res: Response, status: number, message: string) {
  res.status(status).json({ ok: false, message });
}

export function registerTeacherChildArtAiRoutes(app: Express, prisma: PrismaClient) {
  app.post("/api/teacher/child-art-analyze", async (req: Request, res: Response) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      bad(res, 400, "请提供 JSON：{ imageUrl: string, transcriptNote?, portfolioArchiveItemId? }");
      return;
    }

    const { imageUrl, transcriptNote, portfolioArchiveItemId } = parsed.data;
    const result = await analyzeChildArtImage(imageUrl, transcriptNote);
    if (!result.success) {
      res.status(502).json({
        ok: false,
        message: result.error ?? "分析失败",
      });
      return;
    }

    const analysis = result.analysis ?? "";
    if (portfolioArchiveItemId != null) {
      try {
        await prisma.portfolioArchiveItem.update({
          where: { id: portfolioArchiveItemId },
          data: {
            recordingTranscript: transcriptNote?.trim() ?? "",
            analysisInterpretation: analysis,
          },
        });
      } catch (e) {
        console.error("[child-art-analyze] persist portfolio fields", e);
      }
    }

    res.json({ ok: true, analysis });
  });
}
