/**
 * New API「OpenAI 聊天格式」要求与 `messages` 同时提交 Qwen 原生 `contents`
 * @see docs/图像ai.md（model、stream、messages、contents）
 * 图片使用 `fileData.fileUri` 传公网 URL，不做 base64。
 */

type OpenAIImageUrlPart = {
  type: "image_url";
  image_url: { url: string };
};

type OpenAITextPart = { type: "text"; text: string };

type OpenAIUserContentPart = OpenAITextPart | OpenAIImageUrlPart | Record<string, unknown>;

type OpenAIChatMessage = {
  role: string;
  content: string | OpenAIUserContentPart[];
};

function guessMimeFromUrl(url: string): string {
  try {
    const p = new URL(url).pathname.toLowerCase();
    if (p.endsWith(".png")) return "image/png";
    if (p.endsWith(".webp")) return "image/webp";
    if (p.endsWith(".gif")) return "image/gif";
  } catch {
    /* ignore */
  }
  return "image/jpeg";
}

function toGeminiParts(content: OpenAIChatMessage["content"]): Record<string, unknown>[] {
  if (typeof content === "string") {
    return content ? [{ text: content }] : [];
  }
  const parts: Record<string, unknown>[] = [];
  for (const p of content) {
    if (!p || typeof p !== "object") continue;
    if (p.type === "text" && "text" in p && typeof p.text === "string") {
      parts.push({ text: p.text });
      continue;
    }
    if (p.type === "image_url" && "image_url" in p) {
      const url = (p as OpenAIImageUrlPart).image_url?.url;
      if (typeof url === "string" && url.trim()) {
        parts.push({
          fileData: {
            mimeType: guessMimeFromUrl(url),
            fileUri: url.trim(),
          },
        });
      }
    }
  }
  return parts;
}

/**
 * 在 OpenAI 兼容请求体上追加 `contents`（及可选的 `systemInstruction`），供 New API Qwen 转发。
 */
export function augmentNewApiOpenAiChatBody(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const messages = body.messages as OpenAIChatMessage[] | undefined;
  if (!messages?.length) return body;

  const systemTexts: string[] = [];
  const contents: { role: string; parts: Record<string, unknown>[] }[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      if (typeof msg.content === "string" && msg.content) {
        systemTexts.push(msg.content);
      }
      continue;
    }

    const geminiRole = msg.role === "assistant" ? "model" : msg.role;
    if (geminiRole !== "user" && geminiRole !== "model") continue;

    const parts = toGeminiParts(msg.content);
    if (parts.length === 0) continue;

    contents.push({ role: geminiRole, parts });
  }

  const out: Record<string, unknown> = { ...body, contents };

  if (systemTexts.length > 0) {
    out.systemInstruction = {
      parts: [{ text: systemTexts.join("\n\n") }],
    };
  }

  return out;
}

/** 供 createOpenAICompatible：baseURL 应仅为前缀，由 SDK 拼接 `/chat/completions`，这里使用 Qwen 的 baseURL */
export function normalizeOpenAiCompatibleBaseUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, "");
  const lower = u.toLowerCase();
  const suffix = "/chat/completions";
  if (lower.endsWith(suffix)) {
    u = u.slice(0, -suffix.length).replace(/\/+$/, "");
  }
  return u;
}
