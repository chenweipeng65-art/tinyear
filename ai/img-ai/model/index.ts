import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  augmentNewApiOpenAiChatBody,
  normalizeOpenAiCompatibleBaseUrl,
} from "./newApiOpenAiGeminiContents";

const rawBase =
  process.env.IMG_PROMPT_OPTIMISE_API_BASE_URL || "https://api.openai.com/v1";

export const aigcProvider = createOpenAICompatible({
  name: "aigcProvider",
  apiKey: process.env.IMG_PROMPT_OPTIMISE_API_KEY,
  baseURL: normalizeOpenAiCompatibleBaseUrl(rawBase),
  /** New API：与 messages 并行提交 Qwen `contents`（图片用 fileUri，非 base64） */
  transformRequestBody: (args) => augmentNewApiOpenAiChatBody(args),
});

export const model = aigcProvider(
  process.env.IMG_PROMPT_OPTIMISE_API_MODEL || "qwen-vl-plus",
);
