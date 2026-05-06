/** 截断为最多 maxChars 个 Unicode 标量（仅用于确有硬上限的场景；教师首页 AI 正文不再经此截断） */
export function limitSnippetLength(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return Array.from(t).slice(0, maxChars).join("");
}

/** 软目标字数上限参考（约 100～150 字区间）；服务端返回模型全文，不在此常量处硬截断 */
export const LISTENING_SNIPPET_MAX_CHARS = 150;
