import { useState, useEffect } from "react";
import { format, parseISO, isValid } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Share2, ChevronLeft, Download, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArchiveRecord } from "@/types/archiveRecord";
import { useArchiveRecordsForStudent, useChildDropdownOptions } from "@/lib/hooks/useReadApi";
import { fetchClassAnalysesForClass, fetchIndividualAnalysesForChild } from "@/lib/api/readData";
import type { ClassAnalysisListItemDto, IndividualAnalysisListItemDto } from "@/lib/api/types";
import { AnalysisReportDrawer } from "@/components/teacher/AnalysisReportDrawer";
import {
  splitClassOverallAnalysisOutput,
  splitIndividualAnalysisOutput,
  type ClassOverallAnalysisJson,
  type IndividualAnalysisJson,
} from "../../../ai/txt-ai/lib/aiAnalysisReports";
import { useTeacherClass } from "@/lib/teacher/TeacherClassContext";
import { getParentLoginShareUrl } from "@/lib/shareUrls";
import { addCanvasSlicesToPdf } from "@/lib/pdfCanvasSlices";
import {
  getPortfolioExportPdfCachedUrl,
  postPortfolioExportPdf,
} from "@/lib/api/teacherPortfolioExportPdf";
import {
  closePdfExportPlaceholder,
  openBlankTabForPdfExport,
  openPdfFromPublicUrl,
} from "@/lib/openPdfFromUrl";
import { snapdomRasterizeExportFragment } from "@/lib/snapdomPdfRaster";

const EXPORT_SECTIONS = [
  { id: "name", label: "幼儿姓名" },
  { id: "drawing", label: "幼儿画语" },
  { id: "analysis", label: "分析解读" },
  { id: "strategy", label: "支持策略" },
  { id: "reflection", label: "教师反思" },
] as const;

function initialExportSelection() {
  return Object.fromEntries(EXPORT_SECTIONS.map((s) => [s.id, true])) as Record<
    (typeof EXPORT_SECTIONS)[number]["id"],
    boolean
  >;
}

function formatDisplayDate(iso: string) {
  try {
    return format(parseISO(iso), "yyyy年M月d日");
  } catch {
    return iso;
  }
}

const frameBorder = "rounded-xl border border-[rgb(182_199_234)] bg-white shadow-sm";
const frameInner = "flex items-center justify-center rounded-lg bg-[rgb(248_250_252)]";

const portfolioSelectTrigger = cn(
  "rounded-lg border border-[rgb(74_107_174)] bg-[rgb(238_242_250)]",
  "focus-visible:border-[rgb(74_107_174)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgb(74_107_174)]/25",
  "!h-10 !min-h-10 shadow-none"
);

const shellCard =
  "rounded-2xl border border-[rgb(182_199_234/0.45)] bg-white shadow-sm";

/** 未选学生时外层浅底，贴近设计稿 */
const portfolioEmptyShell =
  "rounded-2xl bg-[rgb(236_241_250)] p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.6)]";

const sharePrimaryBtn =
  "h-12 w-full gap-2 rounded-xl border-0 bg-[rgb(145_172_224)] text-white shadow-sm hover:bg-[rgb(125_155_210)] hover:text-white focus-visible:ring-[rgb(145_172_224/0.45)]";

function sanitizeFilename(name: string) {
  return name.replace(/[/\\:*?"<>|]/g, "_").slice(0, 80) || "档案";
}

function copyToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return Promise.resolve(false);
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
}

function copyToClipboardFallback(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getExportSectionHeadingAndBody(
  student: string,
  record: ArchiveRecord,
  id: (typeof EXPORT_SECTIONS)[number]["id"]
): { heading: string; body: string } {
  switch (id) {
    case "name":
      return { heading: "幼儿姓名", body: student };
    case "drawing":
      return {
        heading: "幼儿画语",
        body: `作品：${record.title}\n日期：${formatDisplayDate(record.date)}\n\n${record.recordingTranscript || record.content}`,
      };
    case "analysis":
      return {
        heading: "分析解读",
        body:
          record.analysisInterpretation?.trim() ||
          `基于《${record.title}》的作品与谈话记录，幼儿能够围绕主题进行叙述，并联系生活经验展开联想。以下为记录摘要：\n${record.content}`,
      };
    case "strategy":
      return {
        heading: "支持策略",
        body:
          record.teacherSupportStrategies?.trim() ||
          "（尚未生成，可在教师首页使用 AI 生成支持策略）",
      };
    case "reflection":
      return {
        heading: "教师反思",
        body:
          record.teacherReflection?.trim() ||
          `在与 ${student} 围绕《${record.title}》开展的一对一倾听中，教师以倾听与复述为主，鼓励其补充细节。后续将在活动区与一日生活中持续观察，并给予适时支持。`,
      };
    default:
      return { heading: "", body: "" };
  }
}

function buildArchiveExportHtml(
  student: string,
  record: ArchiveRecord,
  pickedSectionIds: (typeof EXPORT_SECTIONS)[number]["id"][],
  /** 本地 blob: 画语图内联展示 */
  drawingImageBlobUrl: string | null
) {
  const parts = [
    `<div style="box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI','Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif;font-size:11px;line-height:1.55;color:#1e293b;padding:4px 2px;">`,
    `<h1 style="font-size:15px;font-weight:700;margin:0 0 6px;color:#0f172a;">幼儿一对一倾听系统 · 成长档案</h1>`,
    `<p style="margin:0 0 14px;font-size:10px;color:#64748b;">档案日期：${escapeHtml(formatDisplayDate(record.date))}</p>`,
    `<hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 12px;" />`,
  ];
  for (const id of pickedSectionIds) {
    const { heading, body } = getExportSectionHeadingAndBody(student, record, id);
    parts.push(
      `<h2 style="font-size:12px;font-weight:600;margin:12px 0 6px;color:#5a7399;">${escapeHtml(heading)}</h2>`
    );
    if (id === "drawing" && drawingImageBlobUrl) {
      parts.push(
        `<div style="margin:0 0 8px;"><img src="${drawingImageBlobUrl}" alt="" style="display:block;max-width:100%;max-height:120px;object-fit:contain;border:1px solid #e2e8f0;border-radius:6px;background:#f8fafc;" /></div>`
      );
    }
    parts.push(
      `<p style="margin:0;white-space:pre-wrap;word-break:break-word;">${escapeHtml(body)}</p>`
    );
  }
  parts.push(`</div>`);
  return parts.join("");
}

async function fetchImageAsBlobUrl(imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { mode: "cors", cache: "no-store" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

const EXPORT_IFRAME_WIDTH_PX = 680;

async function rasterizeExportRootToPdfBytes(
  student: string,
  record: ArchiveRecord,
  pickedSectionIds: (typeof EXPORT_SECTIONS)[number]["id"][],
  drawingImageBlobUrl: string | null,
): Promise<ArrayBuffer> {
  const { jsPDF } = await import("jspdf");

  const innerHtml = buildArchiveExportHtml(student, record, pickedSectionIds, drawingImageBlobUrl);
  const canvas = await snapdomRasterizeExportFragment(innerHtml, EXPORT_IFRAME_WIDTH_PX);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  addCanvasSlicesToPdf(pdf, canvas);
  return pdf.output("arraybuffer") as ArrayBuffer;
}

async function buildArchivePdfBytes(
  student: string,
  record: ArchiveRecord,
  pickedSectionIds: (typeof EXPORT_SECTIONS)[number]["id"][],
): Promise<ArrayBuffer> {
  let drawingBlobUrl: string | null = null;
  if (pickedSectionIds.includes("drawing")) {
    drawingBlobUrl = await fetchImageAsBlobUrl(record.image);
  }
  try {
    try {
      return await rasterizeExportRootToPdfBytes(student, record, pickedSectionIds, drawingBlobUrl);
    } catch {
      return await rasterizeExportRootToPdfBytes(student, record, pickedSectionIds, null);
    }
  } finally {
    if (drawingBlobUrl) URL.revokeObjectURL(drawingBlobUrl);
  }
}

export default function TeacherPortfolio() {
  const { selectedClassId } = useTeacherClass();
  const { options: portfolioSelectOptions, loading: optionsLoading } = useChildDropdownOptions();
  const [student, setStudent] = useState("");
  const [viewingRecord, setViewingRecord] = useState<ArchiveRecord | null>(null);
  const [exportPick, setExportPick] = useState(initialExportSelection);
  const [shareHint, setShareHint] = useState<"ok" | "fail" | null>(null);
  const [exportHint, setExportHint] = useState<"ok" | "fail" | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [iaList, setIaList] = useState<IndividualAnalysisListItemDto[]>([]);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaDrawerOpen, setIaDrawerOpen] = useState(false);
  const [iaDrawerAnalysisId, setIaDrawerAnalysisId] = useState<number | null>(null);
  const [iaDrawerTitle, setIaDrawerTitle] = useState("");
  const [iaDrawerMarkdown, setIaDrawerMarkdown] = useState("");
  const [iaDrawerJson, setIaDrawerJson] = useState<IndividualAnalysisJson | null>(null);
  const [iaExportBase, setIaExportBase] = useState("");

  const [caList, setCaList] = useState<ClassAnalysisListItemDto[]>([]);
  const [caLoading, setCaLoading] = useState(false);
  const [caDrawerOpen, setCaDrawerOpen] = useState(false);
  const [caDrawerAnalysisId, setCaDrawerAnalysisId] = useState<number | null>(null);
  const [caTitle, setCaTitle] = useState("");
  const [caExportBase, setCaExportBase] = useState("");
  const [caMarkdown, setCaMarkdown] = useState("");
  const [caStructured, setCaStructured] = useState<ClassOverallAnalysisJson | null>(null);

  const { records: recordsForStudent, loading: recordsLoading, matchedChild } =
    useArchiveRecordsForStudent(student);
  const studentDisplayName = matchedChild?.displayName ?? "";

  useEffect(() => {
    if (!matchedChild?.id) {
      setIaList([]);
      setIaDrawerOpen(false);
      return;
    }
    let cancelled = false;
    setIaLoading(true);
    void fetchIndividualAnalysesForChild(matchedChild.id)
      .then((r) => {
        if (!cancelled) setIaList(r.items);
      })
      .catch(() => {
        if (!cancelled) setIaList([]);
      })
      .finally(() => {
        if (!cancelled) setIaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchedChild?.id]);

  useEffect(() => {
    if (student) {
      setCaList([]);
      setCaDrawerOpen(false);
      return;
    }
    if (selectedClassId == null) {
      setCaList([]);
      return;
    }
    let cancelled = false;
    setCaLoading(true);
    void fetchClassAnalysesForClass(selectedClassId)
      .then((r) => {
        if (!cancelled) setCaList(r.items);
      })
      .catch(() => {
        if (!cancelled) setCaList([]);
      })
      .finally(() => {
        if (!cancelled) setCaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [student, selectedClassId]);

  const openClassAnalysis = (row: ClassAnalysisListItemDto) => {
    const { markdown, json } = splitClassOverallAnalysisOutput(row.contentMarkdown);
    const d = parseISO(row.createdAt);
    const label = isValid(d) ? format(d, "yyyy-MM-dd HH:mm") : row.createdAt;
    setCaMarkdown(markdown);
    setCaStructured(json);
    setCaTitle(`班级整体分析 · ${label}`);
    setCaExportBase(`班级整体分析-${label.replace(/[: ]/g, "-")}-${row.id}`);
    setCaDrawerAnalysisId(row.id);
    setCaDrawerOpen(true);
  };

  const openIndividualAnalysis = (row: IndividualAnalysisListItemDto) => {
    const { markdown, json } = splitIndividualAnalysisOutput(row.contentMarkdown);
    const d = parseISO(row.createdAt);
    const titleSuffix = isValid(d) ? format(d, "yyyy-MM-dd HH:mm") : row.createdAt;
    setIaDrawerMarkdown(markdown);
    setIaDrawerJson(json);
    setIaDrawerTitle(`个别化分析 · ${titleSuffix}`);
    setIaExportBase(`个别化分析-${studentDisplayName || "幼儿"}-${row.id}`);
    setIaDrawerAnalysisId(row.id);
    setIaDrawerOpen(true);
  };

  const rawStudentAvatar =
    portfolioSelectOptions.find((o) => o.value === student)?.avatarUrl ?? null;
  const studentAvatarUrl =
    rawStudentAvatar != null && rawStudentAvatar.trim() !== "" ? rawStudentAvatar : null;

  useEffect(() => {
    if (viewingRecord) setExportPick(initialExportSelection());
  }, [viewingRecord?.id]);

  const toggleExportSection = (id: (typeof EXPORT_SECTIONS)[number]["id"]) => {
    setExportPick((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExportDownload = async () => {
    if (!viewingRecord) return;
    const pickedIds = EXPORT_SECTIONS.filter((s) => exportPick[s.id]).map((s) => s.id);
    if (pickedIds.length === 0) {
      alert("请至少选择一项要导出的内容");
      return;
    }
    const filename = `${sanitizeFilename(`${studentDisplayName}-${viewingRecord.title}`)}-档案.pdf`;
    setExportBusy(true);
    setExportHint(null);
    const placeholder = openBlankTabForPdfExport();
    try {
      const cached = await getPortfolioExportPdfCachedUrl(viewingRecord.id, pickedIds);
      if (cached) {
        openPdfFromPublicUrl(cached, placeholder);
        setExportHint("ok");
        window.setTimeout(() => setExportHint(null), 3200);
        return;
      }
      const pdfBytes = await buildArchivePdfBytes(studentDisplayName, viewingRecord, pickedIds);
      const url = await postPortfolioExportPdf(viewingRecord.id, pickedIds, pdfBytes, filename);
      openPdfFromPublicUrl(url, placeholder);
      setExportHint("ok");
      window.setTimeout(() => setExportHint(null), 3200);
    } catch {
      closePdfExportPlaceholder(placeholder);
      setExportHint("fail");
      window.setTimeout(() => setExportHint(null), 5000);
    } finally {
      setExportBusy(false);
    }
  };

  const handleShare = async () => {
    const url = getParentLoginShareUrl();
    let ok = await copyToClipboard(url);
    if (!ok) ok = copyToClipboardFallback(url);
    setShareHint(ok ? "ok" : "fail");
    window.setTimeout(() => setShareHint(null), ok ? 3200 : 5000);
  };

  return (
    <div className="relative mx-auto max-w-lg space-y-4 pb-28 md:max-w-2xl">
      <div className={cn(!student && portfolioEmptyShell, "space-y-4")}>
        <Card className={shellCard}>
          <CardHeader className="space-y-1.5 pb-3">
            <CardTitle className="text-lg font-semibold text-[rgb(74_107_174)]">
              选择学生
            </CardTitle>
            <p className="text-sm leading-relaxed text-slate-500">
              选择要查看和导出成长档案的学生
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {!student ? (
              <Select
                value={student}
                onValueChange={(v) => {
                  setStudent(v);
                  setViewingRecord(null);
                }}
                options={portfolioSelectOptions}
                placeholder="选择幼儿"
                aria-label="选择幼儿"
                className="w-full"
                triggerClassName={portfolioSelectTrigger}
                disabled={optionsLoading}
              />
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <Select
                  value={student}
                  onValueChange={(v) => {
                    setStudent(v);
                    setViewingRecord(null);
                  }}
                  options={portfolioSelectOptions}
                  placeholder="选择幼儿"
                  aria-label="选择幼儿"
                  className="min-w-0 flex-1"
                  triggerClassName={portfolioSelectTrigger}
                  disabled={optionsLoading}
                />
                <Button
                  variant="outline"
                  className="h-10 shrink-0 gap-2 rounded-lg border-[rgb(182_199_234)] px-3 text-[rgb(58_74_128)] hover:bg-[rgb(182_199_234/0.22)] sm:px-4"
                  onClick={handleShare}
                  type="button"
                >
                  <Share2 size={16} aria-hidden />
                  分享给家长
                </Button>
              </div>
            )}
            {student ? (
              <>
                {shareHint === "ok" && (
                  <p className="text-xs text-emerald-600" role="status">
                    家长端链接已复制到剪贴板：{getParentLoginShareUrl()}
                  </p>
                )}
                {shareHint === "fail" && (
                  <p className="text-xs text-amber-700" role="alert">
                    无法自动复制，请手动复制链接：{getParentLoginShareUrl()}
                  </p>
                )}
              </>
            ) : null}
            {optionsLoading ? <p className="text-xs text-slate-500">正在加载幼儿列表…</p> : null}
          </CardContent>
        </Card>

        {!student ? (
          <>
            <Button
              type="button"
              className={sharePrimaryBtn}
              onClick={handleShare}
            >
              <Share2 size={18} strokeWidth={2} aria-hidden />
              分享家长
            </Button>
            {shareHint === "ok" && (
              <p className="text-xs text-emerald-600" role="status">
                家长端链接已复制到剪贴板：{getParentLoginShareUrl()}
              </p>
            )}
            {shareHint === "fail" && (
              <p className="text-xs text-amber-700" role="alert">
                无法自动复制，请手动复制链接：{getParentLoginShareUrl()}
              </p>
            )}

            <Card className={shellCard}>
              <CardHeader className="space-y-1 pb-2">
                <CardTitle className="text-base font-semibold text-[rgb(58_74_128)]">
                  整体分析记录
                </CardTitle>
                <p className="text-xs leading-relaxed text-slate-500">
                  在「AI 分析」中为本班生成的班级整体报告，可查看或导出 PDF
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {selectedClassId == null ? (
                  <p className="py-4 text-center text-sm text-slate-500">请先在顶部选择班级</p>
                ) : caLoading ? (
                  <p className="py-4 text-center text-sm text-slate-500">加载中…</p>
                ) : caList.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">暂无整体分析记录</p>
                ) : (
                  <ul className="space-y-2">
                    {caList.map((row) => {
                      const d = parseISO(row.createdAt);
                      const timeLabel = isValid(d) ? format(d, "yyyy-MM-dd HH:mm") : row.createdAt;
                      return (
                        <li key={row.id}>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-auto w-full justify-between gap-2 rounded-xl border-[rgb(182_199_234)] py-2.5 text-left text-sm text-[rgb(58_74_128)] hover:bg-[rgb(248_250_252)]"
                            onClick={() => openClassAnalysis(row)}
                          >
                            <span className="min-w-0 truncate font-medium">班级整体分析报告</span>
                            <span className="shrink-0 tabular-nums text-xs text-slate-500">{timeLabel}</span>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {student ? (
        viewingRecord ? (
          // 查看单条记录详情
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Button 
              variant="ghost" 
              className="gap-2 -ml-4 text-slate-500 hover:text-slate-800"
              onClick={() => setViewingRecord(null)}
            >
              <ChevronLeft size={20} />
              返回档案列表
            </Button>
            
            <div className="overflow-hidden rounded-xl border border-slate-100 bg-[rgb(236_240_250)] shadow-sm">
              <div className="px-3 pt-4 pb-1 sm:px-6 sm:pt-5">
                <div className={cn("mx-auto w-full max-w-lg p-3 sm:p-4", frameBorder)}>
                  <div className={cn("min-h-48 sm:min-h-64", frameInner)}>
                    <img
                      src={viewingRecord.image}
                      alt={viewingRecord.title}
                      className="max-h-52 w-full object-contain sm:max-h-72"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                <h3 className="mt-4 text-center text-lg font-semibold text-slate-800 sm:text-xl">
                  {viewingRecord.title}
                </h3>
                <p className="mt-1.5 text-center text-sm text-[rgb(90_115_170)]">
                  {formatDisplayDate(viewingRecord.date)}
                </p>
              </div>

              <div className="space-y-2 px-3 pb-4 pt-2 sm:px-6 sm:pb-5 sm:pt-3">
                {EXPORT_SECTIONS.map((section) => {
                  const on = exportPick[section.id];
                  return (
                    <button
                      key={section.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggleExportSection(section.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-[rgb(182_199_234/0.35)] bg-white px-4 py-3.5 text-left shadow-sm transition-colors hover:bg-[rgb(248_249_252)]"
                    >
                      <span className="text-sm font-medium text-[rgb(100_125_175)]">{section.label}</span>
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          on
                            ? "border-[rgb(125_142_198)] bg-[rgb(125_142_198)]"
                            : "border-[rgb(160_178_220)] bg-white"
                        )}
                        aria-hidden
                      >
                        {on ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
                      </span>
                    </button>
                  );
                })}

                <Button
                  type="button"
                  disabled={exportBusy}
                  className="mt-4 h-12 w-full gap-2 rounded-xl border-0 bg-[rgb(182_199_234)] text-[rgb(45_60_110)] hover:bg-[rgb(165_182_225)] focus-visible:ring-[rgb(182_199_234/0.6)]"
                  onClick={() => void handleExportDownload()}
                >
                  <Download className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                  {exportBusy ? "处理中…" : "下载并导出"}
                </Button>
                {exportHint === "ok" && (
                  <p className="mt-2 text-center text-xs text-emerald-600" role="status">
                    已从云端打开 PDF（无缓存时会先上传再打开）
                  </p>
                )}
                {exportHint === "fail" && (
                  <p className="mt-2 text-center text-xs text-amber-700" role="alert">
                    PDF 导出失败：请确认已配置 S3 环境变量，或刷新后重试；若仍失败，可尝试取消勾选「幼儿画语」再导出。
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in space-y-4 duration-300">
            <Card className={shellCard}>
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-200 px-1 shadow-sm">
                  {studentAvatarUrl ? (
                    <img
                      src={studentAvatarUrl}
                      alt=""
                      className="h-full w-full object-cover object-top"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="line-clamp-2 text-center text-xs font-semibold leading-tight text-slate-600">
                      {studentDisplayName.trim() || (recordsLoading ? "…" : "—")}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-medium text-slate-900">
                    {studentDisplayName || (recordsLoading ? "…" : "—")}
                  </p>
                  <p className="text-sm text-slate-500">
                    {recordsLoading ? "正在加载档案…" : `共 ${recordsForStudent.length} 份倾听记录`}
                  </p>
                </div>
              </div>
            </Card>

            <Card className={shellCard}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-[rgb(58_74_128)]">
                  已收集档案
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  {recordsLoading ? (
                    <p className="col-span-2 py-8 text-center text-sm text-slate-500">加载档案中…</p>
                  ) : null}
                  {!recordsLoading && recordsForStudent.length === 0 ? (
                    <p className="col-span-2 py-8 text-center text-sm text-slate-500">暂无倾听记录</p>
                  ) : null}
                  {!recordsLoading &&
                    recordsForStudent.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => setViewingRecord(record)}
                      className="min-w-0 w-full cursor-pointer rounded-xl text-left transition-opacity hover:opacity-90"
                    >
                      <div
                        className={cn(
                          "overflow-hidden rounded-lg border border-[rgb(182_199_234)] bg-white p-1.5 shadow-sm"
                        )}
                      >
                        <div
                          className={cn(
                            "aspect-[4/3] max-h-36 overflow-hidden rounded-md bg-[rgb(248_250_252)]",
                            frameInner
                          )}
                        >
                          <img
                            src={record.image}
                            alt={record.title}
                            className="h-full w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-center text-sm text-[rgb(90_108_158)]">
                        {formatDisplayDate(record.date)}
                      </p>
                      <p className="mt-0.5 truncate text-center text-xs text-slate-700">
                        {record.title}
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className={shellCard}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-[rgb(58_74_128)]">
                  个性化分析记录
                </CardTitle>
                <p className="text-xs leading-relaxed text-slate-500">
                  在「AI 分析」中生成的个别化报告已保存，可在此查看或导出 PDF
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                {iaLoading ? (
                  <p className="py-4 text-center text-sm text-slate-500">加载中…</p>
                ) : iaList.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">暂无个性化分析记录</p>
                ) : (
                  <ul className="space-y-2">
                    {iaList.map((row) => {
                      const d = parseISO(row.createdAt);
                      const label = isValid(d) ? format(d, "yyyy-MM-dd HH:mm") : row.createdAt;
                      return (
                        <li key={row.id}>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-auto w-full justify-between gap-2 rounded-xl border-[rgb(182_199_234)] py-2.5 text-left text-sm text-[rgb(58_74_128)] hover:bg-[rgb(248_250_252)]"
                            onClick={() => openIndividualAnalysis(row)}
                          >
                            <span className="min-w-0 truncate font-medium">个别化分析报告</span>
                            <span className="shrink-0 tabular-nums text-xs text-slate-500">{label}</span>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )
      ) : null}

      {iaDrawerOpen && iaDrawerAnalysisId != null ? (
        <AnalysisReportDrawer
          open={iaDrawerOpen}
          onClose={() => {
            setIaDrawerOpen(false);
            setIaDrawerAnalysisId(null);
          }}
          title={iaDrawerTitle}
          exportFileBaseName={iaExportBase}
          markdown={iaDrawerMarkdown}
          radarScores={iaDrawerJson?.radarScores}
          barSeries={iaDrawerJson?.barSeries}
          analysisPdfExport={{ kind: "individual", analysisId: iaDrawerAnalysisId }}
        />
      ) : null}

      {caDrawerOpen && caDrawerAnalysisId != null ? (
        <AnalysisReportDrawer
          open={caDrawerOpen}
          onClose={() => {
            setCaDrawerOpen(false);
            setCaDrawerAnalysisId(null);
          }}
          title={caTitle}
          exportFileBaseName={caExportBase}
          markdown={caMarkdown}
          radarScores={caStructured?.classRadarAverages}
          classBarByStudent={caStructured?.barByStudent}
          countsText={
            caStructured?.counts
              ? `有个别化分析：${caStructured.counts.withIndividualAnalysis} / 全班 ${caStructured.counts.totalStudents} 人`
              : undefined
          }
          analysisPdfExport={{ kind: "class", analysisId: caDrawerAnalysisId }}
        />
      ) : null}
    </div>
  );
}
