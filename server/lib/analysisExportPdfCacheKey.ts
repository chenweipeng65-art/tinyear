import crypto from "node:crypto";

/** 个别化 / 班级整体分析 PDF：正文与元数据一致即可命中缓存（图表由正文解析，不单独存库） */
export function buildAnalysisMarkdownPdfCacheKey(row: {
  contentMarkdown: string;
  modelName: string | null;
  promptVersion: string | null;
}): string {
  const meta = [row.modelName ?? "", row.promptVersion ?? ""].join("\x1e");
  const h = crypto
    .createHash("sha256")
    .update(row.contentMarkdown, "utf8")
    .update("\x00", "utf8")
    .update(meta, "utf8")
    .digest("hex")
    .slice(0, 40);
  return `md|${h}`;
}
