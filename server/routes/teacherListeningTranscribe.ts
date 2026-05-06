/**
 * 教师首页：录音上传 → ElevenLabs 转写 → DeepSeek（txt-ai/model）整理为师生对话格式
 */
import type { Express, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import type { PrismaClient } from "../../src/generated/prisma/client.js";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { SpeechToTextChunkResponseModel } from "@elevenlabs/elevenlabs-js/api/types/SpeechToTextChunkResponseModel";
import { generateListeningDialogueFormat } from "../../ai/txt-ai/agent-dialogue/generator.js";
import { getElevenLabsSpeechToTextModelId } from "../lib/elevenLabsSpeechToText.js";
import { teacherFacingChildName } from "../lib/teacherFacingChildName.js";

const idParam = z.coerce.number().int().positive();

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const m = file.mimetype.toLowerCase();
    const ok =
      /^audio\//i.test(m) ||
      /^video\/webm/i.test(m) ||
      m === "application/ogg" ||
      m === "application/octet-stream";
    cb(null, ok);
  },
});

function bad(res: Response, status: number, message: string) {
  res.status(status).json({ ok: false, message });
}

export function registerTeacherListeningTranscribeRoutes(app: Express, prisma: PrismaClient) {
  app.post(
    "/api/teacher/listening-transcribe-dialogue",
    audioUpload.single("audio"),
    async (req: Request, res: Response) => {
      if (!req.file?.buffer?.length) {
        bad(res, 400, "请上传有效的音频文件");
        return;
      }
      const childParsed = idParam.safeParse(req.body.childId);
      if (!childParsed.success) {
        bad(res, 400, "请提供有效的 childId");
        return;
      }
      const childId = childParsed.data;

      const child = await prisma.child.findUnique({
        where: { id: childId },
        select: {
          displayName: true,
          displayNameMasked: true,
          schoolClass: { select: { teacherVisible: true } },
        },
      });
      if (!child || !child.schoolClass.teacherVisible) {
        res.status(404).json({ ok: false, message: "幼儿不存在或未开放" });
        return;
      }

      const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
      if (!apiKey) {
        res.status(503).json({
          ok: false,
          message: "未配置 ELEVENLABS_API_KEY，无法转写",
        });
        return;
      }

      try {
        const client = new ElevenLabsClient({ apiKey });
        const mime = req.file.mimetype || "audio/webm";
        const file = new File([req.file.buffer], req.file.originalname || "recording.webm", {
          type: mime,
        });

        const transcriptionResult = await client.speechToText.convert({
          file,
          modelId: getElevenLabsSpeechToTextModelId(),
          languageCode: "zh",
          diarize: true,
          numSpeakers: 2,
        });

        const rawText = (
          transcriptionResult as SpeechToTextChunkResponseModel
        ).text?.trim() ?? "";

        if (!rawText) {
          res.json({
            ok: true,
            rawTranscript: "",
            formattedText: "",
            message: "未识别到语音内容",
          });
          return;
        }

        const format = await generateListeningDialogueFormat({
          childDisplayName: teacherFacingChildName(child),
          teacherLabel: "老师",
          rawTranscript: rawText,
        });

        if (!format.success) {
          res.status(502).json({
            ok: false,
            message: format.error ?? "对话整理失败",
            rawTranscript: rawText,
          });
          return;
        }

        res.json({
          ok: true,
          rawTranscript: rawText,
          formattedText: format.text ?? "",
        });
      } catch (e) {
        console.error("[listening-transcribe-dialogue]", e);
        res.status(502).json({
          ok: false,
          message: e instanceof Error ? e.message : "转写失败",
        });
      }
    },
  );
}
