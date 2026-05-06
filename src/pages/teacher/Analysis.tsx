import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Sparkles, Loader2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChildDropdownOptions } from "@/lib/hooks/useReadApi";
import { useTeacherClass } from "@/lib/teacher/TeacherClassContext";
import {
  CLASS_OVERALL_INDIVIDUAL_BATCH_SIZE,
  teacherRunClassOverallAnalysisStream,
  teacherRunIndividualAnalysis,
  type TeacherClassOverallAnalysisResponse,
  type TeacherIndividualAnalysisResponse,
} from "@/lib/api/teacherAnalysisAi";
import { AnalysisReportDrawer } from "@/components/teacher/AnalysisReportDrawer";
import iconAll from "@/pages/ai-icon/all.png";
import iconOne from "@/pages/ai-icon/one.png";

const analysisBtn =
  "border-0 bg-[rgb(145_172_224)] text-[rgb(48_62_108)] hover:bg-[rgb(125_155_210)] hover:text-[rgb(38_48_88)] focus-visible:ring-[rgb(145_172_224/0.55)]";

export default function TeacherAnalysis() {
  const { selectedClassId } = useTeacherClass();
  const { options: analysisStudentOptions, loading: optionsLoading } = useChildDropdownOptions({
    emptyLabel: "请选择需要分析的幼儿",
  });
  const [student, setStudent] = useState("");
  const [isGeneratingOverall, setIsGeneratingOverall] = useState(false);
  const [isGeneratingIndividual, setIsGeneratingIndividual] = useState(false);
  const [needStudentTipOpen, setNeedStudentTipOpen] = useState(false);
  const [individualError, setIndividualError] = useState<string | null>(null);
  const [overallError, setOverallError] = useState<string | null>(null);
  const [individualResult, setIndividualResult] = useState<TeacherIndividualAnalysisResponse | null>(
    null,
  );
  const [overallResult, setOverallResult] = useState<TeacherClassOverallAnalysisResponse | null>(
    null,
  );
  const [individualDrawerOpen, setIndividualDrawerOpen] = useState(false);
  const [overallDrawerOpen, setOverallDrawerOpen] = useState(false);
  /** 整体分析流式进度：个别化批次 → 班级报告 */
  const [overallSubPhase, setOverallSubPhase] = useState<"individual" | "overall">("individual");
  const [overallIndividualDone, setOverallIndividualDone] = useState(0);
  const [overallIndividualTotal, setOverallIndividualTotal] = useState(0);

  useEffect(() => {
    if (!needStudentTipOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNeedStudentTipOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [needStudentTipOpen]);

  useEffect(() => {
    setIndividualResult(null);
    setIndividualDrawerOpen(false);
  }, [student]);

  const cardClass =
    "flex flex-col overflow-hidden rounded-2xl border border-[rgb(182_199_234/0.45)] bg-white shadow-sm";

  const selectedChildLabel =
    analysisStudentOptions.find((o) => o.value === student)?.label ?? "幼儿";

  const runIndividual = async () => {
    if (isGeneratingIndividual) return;
    if (!student) {
      setNeedStudentTipOpen(true);
      return;
    }
    const childId = Number(student);
    if (!Number.isFinite(childId)) return;
    setIsGeneratingIndividual(true);
    setIndividualError(null);
    try {
      const data = await teacherRunIndividualAnalysis(childId);
      setIndividualResult(data);
      setIndividualDrawerOpen(false);
    } catch (e) {
      setIndividualResult(null);
      setIndividualError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setIsGeneratingIndividual(false);
    }
  };

  const runOverall = async () => {
    if (isGeneratingOverall) return;
    if (selectedClassId == null) {
      setOverallError("请先在顶部选择班级");
      return;
    }
    setIsGeneratingOverall(true);
    setOverallError(null);
    setOverallSubPhase("individual");
    setOverallIndividualDone(0);
    setOverallIndividualTotal(0);
    try {
      const data = await teacherRunClassOverallAnalysisStream(selectedClassId, (e) => {
        if (e.type === "individual_progress") {
          setOverallSubPhase("individual");
          setOverallIndividualDone(e.completed);
          setOverallIndividualTotal(e.total);
        } else if (e.type === "overall_start") {
          setOverallSubPhase("overall");
        } else if (e.type === "overall_done") {
          setOverallSubPhase("overall");
        }
      });
      setOverallResult(data);
      setOverallDrawerOpen(false);
    } catch (e) {
      setOverallResult(null);
      setOverallError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setIsGeneratingOverall(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-20 md:max-w-none md:max-w-5xl">
      <div className="md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        <Card className={cardClass}>
          <CardHeader className="space-y-3 pb-2">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(182_199_234/0.4)]">
                <img src={iconAll} alt="" className="h-7 w-7 object-contain" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="text-lg font-semibold leading-snug text-[rgb(58_74_128)]">
                  整体分析
                </h3>
                <p className="text-sm font-normal leading-relaxed text-slate-500">
                  分析全班儿童的整体发展情况，识别优势领域和需要关注的方面
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-4 pb-4 pt-0">
            <Button
              size="sm"
              className={cn("h-11 w-full gap-2 rounded-xl text-sm font-medium", analysisBtn)}
              onClick={() => void runOverall()}
              disabled={isGeneratingOverall}
            >
              {isGeneratingOverall ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  分析中
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  开始整体分析
                </>
              )}
            </Button>
            {overallResult?.markdown ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-10 w-full gap-2 rounded-xl border-[rgb(182_199_234)] text-sm text-[rgb(58_74_128)]"
                onClick={() => setOverallDrawerOpen(true)}
              >
                <FileText className="h-4 w-4 shrink-0" aria-hidden />
                查看整体分析报告
              </Button>
            ) : null}
            {isGeneratingOverall ? (
              <div className="space-y-2 rounded-xl border border-[rgb(182_199_234/0.35)] bg-[rgb(248_250_252)] px-3 py-2.5">
                <p className="text-xs leading-relaxed text-slate-600">
                  {overallSubPhase === "individual" ? (
                    overallIndividualTotal === 0 ? (
                      <>全班幼儿均已具备可用的图表维度数据，已跳过个别化刷新。</>
                    ) : (
                      <>
                        个别化维度（并发每批 {CLASS_OVERALL_INDIVIDUAL_BATCH_SIZE} 人）：{" "}
                        <span className="font-medium text-slate-800">
                          {overallIndividualDone} / {overallIndividualTotal}
                        </span>
                      </>
                    )
                  ) : (
                    <>正在生成班级整体分析报告…</>
                  )}
                </p>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    overallSubPhase === "individual" && overallIndividualTotal > 0
                      ? Math.round((overallIndividualDone / overallIndividualTotal) * 100)
                      : overallSubPhase === "overall"
                        ? undefined
                        : overallIndividualTotal === 0 && overallSubPhase === "individual"
                          ? 100
                          : 0
                  }
                >
                  {overallSubPhase === "overall" ? (
                    <div className="relative h-full w-full overflow-hidden rounded-full bg-slate-200">
                      <div className="absolute inset-y-0 left-0 w-[36%] rounded-full bg-[rgb(145_172_224)] motion-safe:animate-[analysis-indeterminate_1.1s_linear_infinite]" />
                    </div>
                  ) : (
                    <div
                      className="h-full rounded-full bg-[rgb(145_172_224)] transition-[width] duration-300"
                      style={{
                        width:
                          overallIndividualTotal > 0
                            ? `${Math.min(100, (overallIndividualDone / overallIndividualTotal) * 100)}%`
                            : overallIndividualTotal === 0
                              ? "100%"
                              : "0%",
                      }}
                    />
                  )}
                </div>
              </div>
            ) : null}
            {overallError ? (
              <p className="text-xs text-amber-700" role="alert">
                {overallError}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className="space-y-3 pb-2">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(182_199_234/0.35)]">
                <img src={iconOne} alt="" className="h-7 w-7 object-contain" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="text-lg font-semibold leading-snug text-[rgb(58_74_128)]">
                  个别化分析
                </h3>
                <p className="text-sm font-normal leading-relaxed text-slate-500">
                  选择一个学生，生成个性的发展分析报告
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-4 pb-4 pt-0">
            <Select
              id="analysis-student-select"
              value={student}
              onValueChange={setStudent}
              options={analysisStudentOptions}
              placeholder="请选择需要分析的幼儿"
              tone="analysis"
              size="sm"
              aria-label="选择需要分析的幼儿"
              className="w-full"
              disabled={optionsLoading}
            />
            {optionsLoading ? <p className="text-xs text-slate-500">正在加载幼儿列表…</p> : null}

            <Button
              size="sm"
              variant="default"
              className={cn("h-11 w-full gap-2 rounded-xl text-sm font-medium", analysisBtn)}
              onClick={() => void runIndividual()}
              disabled={isGeneratingIndividual}
            >
              {isGeneratingIndividual ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  分析中
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  开始个别分析
                </>
              )}
            </Button>
            {individualResult?.markdown ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-10 w-full gap-2 rounded-xl border-[rgb(182_199_234)] text-sm text-[rgb(58_74_128)]"
                onClick={() => setIndividualDrawerOpen(true)}
              >
                <FileText className="h-4 w-4 shrink-0" aria-hidden />
                查看个别化分析报告
              </Button>
            ) : null}
            {isGeneratingIndividual ? (
              <div className="space-y-2 rounded-xl border border-[rgb(182_199_234/0.35)] bg-[rgb(248_250_252)] px-3 py-2.5">
                <p className="text-xs text-slate-600">正在生成个别化报告与图表数据…</p>
                <div
                  className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200"
                  aria-busy="true"
                  aria-label="个别化分析进行中"
                >
                  <div className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-[rgb(145_172_224)] motion-safe:animate-[analysis-indeterminate_1.1s_linear_infinite]" />
                </div>
              </div>
            ) : null}
            {individualError ? (
              <p className="text-xs text-amber-700" role="alert">
                {individualError}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {individualResult?.markdown && individualDrawerOpen ? (
        <AnalysisReportDrawer
          open={individualDrawerOpen}
          onClose={() => setIndividualDrawerOpen(false)}
          title={`个别化分析报告 · ${selectedChildLabel}`}
          exportFileBaseName={`个别化分析-${selectedChildLabel}-${individualResult.id}`}
          markdown={individualResult.markdown}
          radarScores={individualResult.structured?.radarScores}
          barSeries={individualResult.structured?.barSeries}
          analysisPdfExport={{ kind: "individual", analysisId: individualResult.id }}
        />
      ) : null}

      {overallResult?.markdown && overallDrawerOpen ? (
        <AnalysisReportDrawer
          open={overallDrawerOpen}
          onClose={() => setOverallDrawerOpen(false)}
          title="班级整体分析报告"
          exportFileBaseName={`班级整体分析-${overallResult.id}`}
          markdown={overallResult.markdown}
          radarScores={overallResult.structured?.classRadarAverages}
          classBarByStudent={overallResult.structured?.barByStudent}
          countsText={
            overallResult.structured?.counts
              ? `有个别化分析：${overallResult.structured.counts.withIndividualAnalysis} / 全班 ${overallResult.structured.counts.totalStudents} 人`
              : undefined
          }
          analysisPdfExport={{ kind: "class", analysisId: overallResult.id }}
        />
      ) : null}

      {needStudentTipOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="analysis-need-student-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="关闭"
            onClick={() => setNeedStudentTipOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-[rgb(182_199_234/0.5)] bg-white p-5 shadow-lg">
            <h3
              id="analysis-need-student-title"
              className="text-base font-semibold text-slate-800"
            >
              请先选择幼儿
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              个别化分析需要指定一名幼儿，请在上方的下拉框中选择后再开始分析。
            </p>
            <Button
              size="sm"
              variant="default"
              className={cn("mt-5 w-full rounded-md", analysisBtn)}
              onClick={() => setNeedStudentTipOpen(false)}
            >
              知道了
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
