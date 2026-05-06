import crypto from "node:crypto";

export const PORTFOLIO_EXPORT_SECTION_IDS = [
  "name",
  "drawing",
  "analysis",
  "strategy",
  "reflection",
] as const;

export type PortfolioExportSectionId = (typeof PORTFOLIO_EXPORT_SECTION_IDS)[number];

/** 解析并规范化 `sections` 参数（逗号分隔，去重排序）；非法时返回 null */
export function parsePortfolioExportSectionIds(raw: unknown): string[] | null {
  if (typeof raw !== "string") return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const allowed = new Set<string>(PORTFOLIO_EXPORT_SECTION_IDS);
  for (const p of parts) {
    if (!allowed.has(p)) return null;
  }
  return [...new Set(parts)].sort();
}

export type PortfolioPdfFingerprintSource = {
  title: string;
  displayDate: string;
  childArtImageUrl: string | null;
  summary: string;
  recordingTranscript: string;
  analysisInterpretation: string;
  teacherSupportStrategies: string;
  parentGuidanceAdvice: string;
  teacherReflection: string;
  /** 与教师端导出 PDF 中「幼儿姓名」一致，为脱敏名（`Child.displayNameMasked` 逻辑） */
  childDisplayName: string;
};

/** 与客户端勾选章节 + 当前库中正文一致时命中缓存 */
export function buildPortfolioPdfCacheKey(
  sortedSectionIds: string[],
  row: PortfolioPdfFingerprintSource,
): string {
  const sectionPart = sortedSectionIds.join(",");
  const body = [
    row.childDisplayName.trim(),
    row.title,
    row.displayDate,
    row.childArtImageUrl ?? "",
    row.summary,
    row.recordingTranscript,
    row.analysisInterpretation,
    row.teacherSupportStrategies,
    row.parentGuidanceAdvice,
    row.teacherReflection,
  ].join("\x1e");
  const fp = crypto.createHash("sha256").update(body, "utf8").digest("hex").slice(0, 40);
  return `${sectionPart}|${fp}`;
}
