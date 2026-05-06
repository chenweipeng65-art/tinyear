import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportElementToPdf, exportElementToPdfBytes } from "@/lib/exportElementToPdf";
import {
  getClassAnalysisExportPdfCachedUrl,
  getIndividualAnalysisExportPdfCachedUrl,
  postClassAnalysisExportPdf,
  postIndividualAnalysisExportPdf,
} from "@/lib/api/teacherAnalysisExportPdf";
import {
  closePdfExportPlaceholder,
  openBlankTabForPdfExport,
  openPdfFromPublicUrl,
} from "@/lib/openPdfFromUrl";
import {
  ClassStudentCompositeBars,
  IndividualRadarChart,
  ScoreBarList,
} from "@/components/teacher/AnalysisScoreCharts";
import { MarkdownBody } from "@/components/teacher/MarkdownBody";
import { useAppAlert } from "@/components/ui/AppAlertProvider";

export type AnalysisPdfExportTarget =
  | { kind: "individual"; analysisId: number }
  | { kind: "class"; analysisId: number };

export type AnalysisReportDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** 下载文件名（不含 .pdf） */
  exportFileBaseName: string;
  markdown: string;
  radarScores?: Record<string, number> | undefined;
  barSeries?: { label: string; value: number }[] | undefined;
  classBarByStudent?: { displayName: string; compositeScore: number }[] | undefined;
  countsText?: string | undefined;
  /** 若提供则走「先查库中 S3 → 无则本机栅格化后上传」与成长档案导出一致 */
  analysisPdfExport?: AnalysisPdfExportTarget | undefined;
};

export function AnalysisReportDrawer({
  open,
  onClose,
  title,
  exportFileBaseName,
  markdown,
  radarScores,
  barSeries,
  classBarByStudent,
  countsText,
  analysisPdfExport,
}: AnalysisReportDrawerProps) {
  const showAlert = useAppAlert();
  const exportRootRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleExportPdf = async () => {
    const el = exportRootRef.current;
    if (!el) return;
    setExporting(true);
    const placeholder = analysisPdfExport ? openBlankTabForPdfExport() : null;
    try {
      const safe = exportFileBaseName.replace(/[/\\:*?"<>|]/g, "_").slice(0, 80) || "报告";
      const fileName = `${safe}.pdf`;

      if (analysisPdfExport) {
        const cached =
          analysisPdfExport.kind === "individual"
            ? await getIndividualAnalysisExportPdfCachedUrl(analysisPdfExport.analysisId)
            : await getClassAnalysisExportPdfCachedUrl(analysisPdfExport.analysisId);
        if (cached) {
          openPdfFromPublicUrl(cached, placeholder);
          return;
        }
        const pdfBytes = await exportElementToPdfBytes(el);
        const url =
          analysisPdfExport.kind === "individual"
            ? await postIndividualAnalysisExportPdf(
                analysisPdfExport.analysisId,
                pdfBytes,
                fileName,
              )
            : await postClassAnalysisExportPdf(analysisPdfExport.analysisId, pdfBytes, fileName);
        openPdfFromPublicUrl(url, placeholder);
        return;
      }

      await exportElementToPdf(el, fileName);
    } catch (e) {
      closePdfExportPlaceholder(placeholder);
      showAlert(e instanceof Error ? e.message : "导出失败");
    } finally {
      setExporting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[240] flex flex-col bg-slate-900/45 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysis-drawer-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="relative z-10 mx-auto flex h-[min(92dvh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[rgb(182_199_234/0.55)] bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
          <h2
            id="analysis-drawer-title"
            className="min-w-0 truncate text-base font-semibold text-[rgb(58_74_128)]"
          >
            {title}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={exporting}
              className="h-8 gap-1 rounded-lg border-[rgb(182_199_234)] text-xs"
              onClick={() => void handleExportPdf()}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              {exporting ? "导出中…" : "导出 PDF"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
          <div
            ref={exportRootRef}
            id="analysis-report-export-root"
            className="space-y-4 rounded-xl bg-white p-3 sm:p-4"
            style={{ boxSizing: "border-box" }}
          >
            {radarScores && Object.keys(radarScores).length > 0 ? (
              <section>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  维度雷达
                </h3>
                <IndividualRadarChart scores={radarScores} />
              </section>
            ) : null}

            {barSeries?.length || classBarByStudent?.length ? (
              <div
                className={cn(
                  "grid gap-4",
                  barSeries?.length && classBarByStudent?.length ? "md:grid-cols-2" : "",
                )}
              >
                {barSeries && barSeries.length > 0 ? (
                  <section>
                    <h3 className="mb-2 text-xs font-medium text-slate-600">柱状 · 维度</h3>
                    <ScoreBarList series={barSeries} />
                  </section>
                ) : null}
                {classBarByStudent && classBarByStudent.length > 0 ? (
                  <section>
                    <h3 className="mb-2 text-xs font-medium text-slate-600">幼儿综合分</h3>
                    <ClassStudentCompositeBars items={classBarByStudent} />
                  </section>
                ) : null}
              </div>
            ) : null}

            {countsText ? (
              <p className="text-xs text-slate-500">{countsText}</p>
            ) : null}

            <section>
              <h3 className="mb-2 text-xs font-medium text-slate-600">报告正文</h3>
              <MarkdownBody markdown={markdown} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
