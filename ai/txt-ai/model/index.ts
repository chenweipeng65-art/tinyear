import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { normalizeOpenAiCompatibleBaseUrl } from "../lib/normalizeOpenAiBaseUrl";

const rawBase =
  process.env.TXT_PROMPT_OPTIMISE_API_BASE_URL || "https://api.openai.com/v1";

export const aigcProvider = createOpenAICompatible({
  name: "txtAigcProvider",
  apiKey: process.env.TXT_PROMPT_OPTIMISE_API_KEY,
  baseURL: normalizeOpenAiCompatibleBaseUrl(rawBase),
});

export const model = aigcProvider(
  process.env.TXT_PROMPT_OPTIMISE_API_MODEL || "deepseek-v3",
);
