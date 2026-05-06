/** OpenAI 兼容 baseURL：去掉末尾 `/chat/completions`，避免与 SDK 拼接重复 */
export function normalizeOpenAiCompatibleBaseUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, "");
  const lower = u.toLowerCase();
  const suffix = "/chat/completions";
  if (lower.endsWith(suffix)) {
    u = u.slice(0, -suffix.length).replace(/\/+$/, "");
  }
  return u;
}
