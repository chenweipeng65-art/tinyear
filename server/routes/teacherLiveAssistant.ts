/**
 * 实时辅助回应：每约 10 秒音频块 → ElevenLabs 转写 → agent-live-hint 极短建议
 */
import type { Express, Request, Response } from "express";
import multer from "multer";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { SpeechToTextChunkResponseModel } from "@elevenlabs/elevenlabs-js/api/types/SpeechToTextChunkResponseModel";
import { generateLiveListeningHint } from "../../ai/txt-ai/agent-live-hint/generator.js";
import { getElevenLabsSpeechToTextModelId } from "../lib/elevenLabsSpeechToText.js";

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
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

function normalizeSuggestion(raw: string): string {
  let t = raw.replace(/[\s\n\r`#*【】\[\]()（）]/g, "").trim();
  t = t.replace(/^建议[:：]?/i, "").trim();
  if (!t) return "多听少说";
  if (t.length > 10) return t.slice(0, 10);
  return t;
}

function bad(res: Response, status: number, message: string) {
  res.status(status).json({ ok: false, message });
}

export function registerTeacherLiveAssistantRoutes(app: Express) {
  app.post(
    "/api/teacher/live-assistant-chunk",
    audioUpload.single("audio"),
    async (req: Request, res: Response) => {
      if (!req.file?.buffer?.length) {
        bad(res, 400, "请上传有效的音频片段");
        return;
      }
      if (req.file.buffer.length < 256) {
        res.json({ ok: true, transcript: "", suggestion: "" });
        return;
      }

      const childDisplayName = String(req.body.childDisplayName ?? "").trim().slice(0, 32);

      const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
      if (!apiKey) {
        res.status(503).json({ ok: false, message: "未配置 ELEVENLABS_API_KEY" });
        return;
      }

      try {
        const client = new ElevenLabsClient({ apiKey });
        const mime = req.file.mimetype || "audio/webm";
        const file = new File([req.file.buffer], "chunk.webm", { type: mime });

        const transcriptionResult = await client.speechToText.convert({
          file,
          modelId: getElevenLabsSpeechToTextModelId(),
          languageCode: "zh",
        });

        const transcript = (
          transcriptionResult as SpeechToTextChunkResponseModel
        ).text?.trim() ?? "";

        if (!transcript || transcript.length < 2) {
          res.json({ ok: true, transcript, suggestion: "" });
          return;
        }

        const hint = await generateLiveListeningHint({
          transcript,
          childDisplayName: childDisplayName || undefined,
        });

        if (!hint.success) {
          res.status(502).json({
            ok: false,
            message: hint.error ?? "生成建议失败",
            transcript,
          });
          return;
        }

        const suggestion = normalizeSuggestion(hint.text ?? "");

        res.json({
          ok: true,
          transcript,
          suggestion,
        });
      } catch (e) {
        console.error("[live-assistant-chunk]", e);
        res.status(502).json({
          ok: false,
          message: e instanceof Error ? e.message : "转写失败",
        });
      }
    },
  );
}
