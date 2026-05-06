"use server";

import { streamText } from "ai";
import { model } from "../model/index";
import { childArtImageAnalystSystemPrompt } from "./schema";

/** 设为 "1" 时打印解读过程；未设置时仅在非 production 打印 */
const CHILD_ART_ANALYST_DEBUG =
  process.env.AI_CHILD_ART_ANALYST_DEBUG === "1" ||
  process.env.NODE_ENV !== "production";

const LOG = "[child-art-analyst]";

function debugLog(...args: unknown[]) {
  if (!CHILD_ART_ANALYST_DEBUG) return;
  console.log(LOG, ...args);
}

function debugError(message: string, err?: unknown) {
  if (err instanceof Error) {
    console.error(LOG, message, err.message, err.stack ?? "");
  } else {
    console.error(LOG, message, err);
  }
}

function parseImageUrl(imageUrl: string): URL | null {
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

/** OpenAI 兼容层只把 `file` + image/* 转成 image_url，不支持 `type: 'image'` */
function guessImageMediaType(url: URL): string {
  const p = url.pathname.toLowerCase();
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

/**
 * 根据已上传的幼儿画作图片 URL，生成「分析解读」正文（多模态：图文）。
 * New API 要求见 `docs/图像ai.md`：`messages` + `contents`；图片以公网 URL 写入
 * `contents[].parts[].fileData.fileUri`（由 `model/index` 的 transform 注入），不做 base64。
 */
export async function analyzeChildArtImage(
  imageUrl: string,
  transcriptNote?: string,
): Promise<{
  success: boolean;
  analysis?: string;
  error?: string;
}> {
  const imageRef = parseImageUrl(imageUrl);
  if (!imageRef) {
    return { success: false, error: "无效的图片地址" };
  }

  try {
    debugLog("start", { host: imageRef.host });

    const userInstruction =
      "请阅读这张幼儿画作图片，按你的角色设定完成「分析解读」。直接输出正文；篇幅以约 100～150 字（含标点）为宜，可略短或略长，勿截断关键观察。";

    const note = transcriptNote?.trim();
    const userParts: Array<
      | { type: "text"; text: string }
      | { type: "file"; data: URL; mediaType: string }
    > = [{ type: "text", text: userInstruction }];
    if (note) {
      userParts.push({
        type: "text",
        text: `【幼儿画语 / 谈话或录音转写参考】（请结合画面与下文参考来理解，勿逐句复述原文）\n${note}`,
      });
    }
    userParts.push({
      type: "file",
      data: imageRef,
      mediaType: guessImageMediaType(imageRef),
    });

    const { textStream } = streamText({
      model,
      system: childArtImageAnalystSystemPrompt,
      messages: [
        {
          role: "user",
          content: userParts,
        },
      ],
    });

    let analysis = "";
    for await (const chunk of textStream) {
      analysis += chunk;
    }

    debugLog("done", { analysisChars: analysis.length });

    return {
      success: true,
      analysis: analysis.trim(),
    };
  } catch (error) {
    debugError("analyzeChildArtImage failed", error);

    let errorMessage = "未知错误";
    const err = error as Record<string, unknown>;

    if (error instanceof Error && error.message) {
      errorMessage = error.message;
    } else if (err.responseBody) {
      try {
        const responseBody =
          typeof err.responseBody === "string"
            ? JSON.parse(err.responseBody)
            : err.responseBody;
        if (
          responseBody &&
          typeof responseBody === "object" &&
          "error" in responseBody &&
          responseBody.error &&
          typeof (responseBody.error as { message?: string }).message ===
            "string"
        ) {
          errorMessage = (responseBody.error as { message: string }).message;
        } else if (typeof err.responseBody === "string") {
          errorMessage = err.responseBody;
        }
      } catch {
        errorMessage = String(err.responseBody);
      }
    } else if (typeof err.message === "string") {
      errorMessage = err.message;
    } else if (
      err.error &&
      typeof err.error === "object" &&
      "message" in err.error &&
      typeof (err.error as { message?: string }).message === "string"
    ) {
      errorMessage = (err.error as { message: string }).message;
    } else if (error instanceof Error) {
      errorMessage = error.toString();
    } else {
      errorMessage = String(error);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
