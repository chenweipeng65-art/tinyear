import React, { useState, useRef, useCallback, useEffect } from "react";
import { useChildDropdownOptions } from "@/lib/hooks/useReadApi";
import { useTeacherClass } from "@/lib/teacher/TeacherClassContext";
import { teacherUploadChildArtImage } from "@/lib/api/teacherMedia";
import { teacherAnalyzeChildArt } from "@/lib/api/teacherChildArtAi";
import { teacherListeningTextAi } from "@/lib/api/teacherListeningTextAi";
import { teacherListeningTranscribeDialogue } from "@/lib/api/teacherListeningTranscribe";
import { teacherLiveAssistantChunk } from "@/lib/api/teacherLiveAssistant";
import { saveTeacherPortfolioRecord } from "@/lib/api/teacherPortfolioItem";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { Mic, Image as ImageIcon, Save, Bot, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_LOGO_URL, ASSISTANT_PANEL_TITLE } from "@/lib/branding";
import { useAppAlert } from "@/components/ui/AppAlertProvider";
const PLACEHOLDER_GUIDANCE = "如何理解孩子行为\n在家庭中如何支持";
const PLACEHOLDER_TEACHER_SUPPORT =
  "可以如何回应儿童\n如何引导进一步表达\n如何支持发展";
const PLACEHOLDER_REFLECTION =
  "我今天是否真正倾听了孩子？\n我的回应是否促进幼儿的学习与发展？\n我可以如何进一步回应与支持？";

/** 下方大输入区：细描边、较大圆角（边框 rgb(65,100,170)） */
const fieldShell =
  "rounded-2xl border border-[rgb(65_100_170)] bg-[rgb(238_242_250)]";
const fieldFocus =
  "focus-visible:border-[rgb(65_100_170)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgb(65_100_170)]/25 focus-visible:ring-offset-0";

/** 复合输入区（含底部工具条）：焦点环画在外层，避免内层 textarea 与按钮叠压 */
const fieldShellFocusWithin =
  "focus-within:border-[rgb(65_100_170)] focus-within:outline-none focus-within:ring-1 focus-within:ring-[rgb(65_100_170)]/25 focus-within:ring-offset-0";

/** 姓名、日期行：更矮、圆角更小 */
const rowFieldShell =
  "rounded-lg border border-[rgb(65_100_170)] bg-[rgb(238_242_250)]";
const rowFieldFocus =
  "focus-visible:border-[rgb(65_100_170)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgb(65_100_170)]/25 focus-visible:ring-offset-0";
/** 多行输入：正文深色，占位符灰色；左右对称留白（全宽，不再保留半幅 pr） */
const textareaBodyText =
  "w-full max-w-none box-border px-4 text-left text-sm text-slate-900 placeholder:text-[rgb(175_171_171)]";

/** 与日期框右侧栏同宽：splitCompact 下 w-9，日期 pr-9 */
const selectTriggerHome = cn(
  rowFieldShell,
  rowFieldFocus,
  "!h-9 !min-h-9 overflow-hidden shadow-none !p-0 text-[13px] leading-tight",
  "focus-visible:!ring-1 focus-visible:!ring-[rgb(65_100_170)]/25"
);

/** 侧栏「回应参考」：有内容则直接替换上屏；空段不覆盖当前展示 */
type AssistantRefDisplay = { suggestion: string; transcript: string };

const EMPTY_ASSISTANT_REF: AssistantRefDisplay = { suggestion: "", transcript: "" };

/** 按分段序号依次应用，避免接口返回乱序时丢段；每段有字则整段替换当前展示 */
function drainAssistantRefChunks(
  pendingMap: Map<number, AssistantRefDisplay>,
  nextApplyRef: React.MutableRefObject<number>,
  prev: AssistantRefDisplay,
): AssistantRefDisplay {
  let p = prev;
  let n = nextApplyRef.current;
  while (pendingMap.has(n)) {
    const row = pendingMap.get(n)!;
    pendingMap.delete(n);
    n += 1;
    const s = row.suggestion.trim();
    const t = row.transcript.trim();
    if (s || t) {
      p = { suggestion: s, transcript: t };
    }
  }
  nextApplyRef.current = n;
  return p;
}

export default function TeacherHome() {
  const showAlert = useAppAlert();
  const { options: studentSelectOptions, loading: optionsLoading } = useChildDropdownOptions({
    emptyLabel: "幼儿姓名",
  });
  const { selectedClassId } = useTeacherClass();
  const [student, setStudent] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  /** 幼儿画语区：按住录音，结束后一次转写并整理对话 */
  const [homeMicRecording, setHomeMicRecording] = useState(false);
  const [homeTranscribeProcessing, setHomeTranscribeProcessing] = useState(false);
  /** 实时辅助：长录音 + 每约 10 秒一块转写并生成短建议 */
  const [assistantLiveRecording, setAssistantLiveRecording] = useState(false);
  const [assistantRefDisplay, setAssistantRefDisplay] =
    useState<AssistantRefDisplay>(EMPTY_ASSISTANT_REF);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [childArtImageUrl, setChildArtImageUrl] = useState<string | null>(null);
  /** 与当前表征图对应的档案记录（上传接口返回），用于服务端写入个性发展摘要 */
  const [portfolioArchiveItemId, setPortfolioArchiveItemId] = useState<number | null>(
    null,
  );
  const [artUploading, setArtUploading] = useState(false);
  const [analysisText, setAnalysisText] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  /** 幼儿画语：谈话记录、画作描述、录音转写等，参与图像分析提示 */
  const [childArtNotes, setChildArtNotes] = useState("");
  const [teacherSupportText, setTeacherSupportText] = useState("");
  const [parentGuidanceText, setParentGuidanceText] = useState("");
  const [teacherAiLoading, setTeacherAiLoading] = useState(false);
  const [parentAiLoading, setParentAiLoading] = useState(false);
  const [teacherTextError, setTeacherTextError] = useState<string | null>(null);
  const [parentTextError, setParentTextError] = useState<string | null>(null);
  const [teacherReflection, setTeacherReflection] = useState("");
  const [reflectionSaving, setReflectionSaving] = useState(false);

  const homeStreamRef = useRef<MediaStream | null>(null);
  const homeRecorderRef = useRef<MediaRecorder | null>(null);
  const homeChunksRef = useRef<BlobPart[]>([]);
  const recordingChildIdRef = useRef<number | null>(null);

  const assistantSessionActiveRef = useRef(false);
  /** 每次开启聆听或结束聆听时自增，用于丢弃已结束会话的在途转写结果 */
  const assistantLiveSessionIdRef = useRef(0);
  const assistantStreamRef = useRef<MediaStream | null>(null);
  const assistantRecorderRef = useRef<MediaRecorder | null>(null);
  const assistantSegmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assistantChildLabelRef = useRef("");
  const assistantChunkSeqRef = useRef(0);
  const assistantPendingChunkResultsRef = useRef(
    new Map<number, { suggestion: string; transcript: string }>(),
  );
  const assistantNextChunkApplyRef = useRef(1);

  const selectedChildId =
    student && !Number.isNaN(Number(student)) ? Number(student) : undefined;

  const stopHomeMediaStream = useCallback(() => {
    homeStreamRef.current?.getTracks().forEach((t) => t.stop());
    homeStreamRef.current = null;
  }, []);

  const stopAssistantLive = useCallback(() => {
    assistantSessionActiveRef.current = false;
    assistantLiveSessionIdRef.current += 1;
    if (assistantSegmentTimerRef.current != null) {
      clearTimeout(assistantSegmentTimerRef.current);
      assistantSegmentTimerRef.current = null;
    }
    try {
      assistantRecorderRef.current?.stop();
    } catch {
      /* noop */
    }
    assistantRecorderRef.current = null;
    assistantStreamRef.current?.getTracks().forEach((t) => t.stop());
    assistantStreamRef.current = null;
    setAssistantLiveRecording(false);
    setAssistantRefDisplay(EMPTY_ASSISTANT_REF);
    assistantPendingChunkResultsRef.current.clear();
    assistantNextChunkApplyRef.current = 1;
  }, []);

  useEffect(() => {
    if (!showAIAssistant) {
      stopAssistantLive();
    }
  }, [showAIAssistant, stopAssistantLive]);

  const toggleHomeListeningMic = useCallback(() => {
    if (homeTranscribeProcessing) return;
    if (homeMicRecording) {
      try {
        homeRecorderRef.current?.stop();
      } catch {
        setHomeMicRecording(false);
        stopHomeMediaStream();
      }
      return;
    }
    if (selectedChildId == null) {
      showAlert("请先选择幼儿姓名");
      return;
    }
    void (async () => {
      try {
        const md = navigator.mediaDevices;
        if (!md?.getUserMedia) {
          showAlert(
            "当前环境无法使用麦克风：手机浏览器一般要求页面使用 HTTPS（或本机 localhost），通过「电脑 IP + http」访问时录音接口会被禁用。\n\n请改用：https 部署后访问，或在电脑本机用 localhost 调试；并确认已为站点授予麦克风权限。",
          );
          return;
        }
        if (typeof MediaRecorder === "undefined") {
          showAlert("当前浏览器不支持 MediaRecorder，无法录音。");
          return;
        }
        const stream = await md.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        homeStreamRef.current = stream;
        homeChunksRef.current = [];
        recordingChildIdRef.current = selectedChildId;
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "";
        const rec = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined,
        );
        homeRecorderRef.current = rec;
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) homeChunksRef.current.push(e.data);
        };
        rec.onstop = () => {
          const childId = recordingChildIdRef.current;
          const mime = rec.mimeType || "audio/webm";
          stopHomeMediaStream();
          homeRecorderRef.current = null;
          setHomeMicRecording(false);
          const blob = new Blob(homeChunksRef.current, { type: mime });
          homeChunksRef.current = [];
          if (!childId) return;
          setHomeTranscribeProcessing(true);
          void (async () => {
            try {
              const out = await teacherListeningTranscribeDialogue(blob, childId);
              const next = (out.formattedText ?? "").trim();
              if (next) {
                setChildArtNotes((prev) => {
                  if (!prev.trim()) return next;
                  return `${prev.trim()}\n\n--- 录音整理 ---\n${next}`;
                });
              }
              if (out.message && !next) {
                showAlert(out.message);
              }
            } catch (err) {
              showAlert(err instanceof Error ? err.message : "转写失败");
            } finally {
              setHomeTranscribeProcessing(false);
            }
          })();
        };
        rec.start(250);
        setHomeMicRecording(true);
      } catch (err) {
        stopHomeMediaStream();
        showAlert(err instanceof Error ? err.message : "无法访问麦克风");
      }
    })();
  }, [homeMicRecording, homeTranscribeProcessing, selectedChildId, stopHomeMediaStream]);

  const toggleAssistantLiveMic = useCallback(() => {
    if (assistantLiveRecording) {
      stopAssistantLive();
      return;
    }
    if (selectedChildId == null || !student) {
      showAlert("请先选择幼儿姓名");
      return;
    }
    void (async () => {
      try {
        const md = navigator.mediaDevices;
        if (!md?.getUserMedia) {
          showAlert(
            "当前环境无法使用麦克风：请使用 HTTPS 或 localhost 访问页面后再试。",
          );
          return;
        }
        if (typeof MediaRecorder === "undefined") {
          showAlert("当前浏览器不支持 MediaRecorder，无法录音。");
          return;
        }
        assistantChildLabelRef.current =
          studentSelectOptions.find((o) => o.value === student)?.label ?? "";
        const stream = await md.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        assistantStreamRef.current = stream;
        assistantLiveSessionIdRef.current += 1;
        assistantSessionActiveRef.current = true;
        assistantChunkSeqRef.current = 0;
        assistantPendingChunkResultsRef.current.clear();
        assistantNextChunkApplyRef.current = 1;
        setAssistantRefDisplay(EMPTY_ASSISTANT_REF);
        setAssistantLiveRecording(true);

        const mimeHead = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : "";

        const scheduleSegment = () => {
          if (!assistantSessionActiveRef.current || !assistantStreamRef.current) return;
          const chunks: BlobPart[] = [];
          const rec = new MediaRecorder(
            assistantStreamRef.current,
            mimeHead ? { mimeType: mimeHead } : undefined,
          );
          assistantRecorderRef.current = rec;
          rec.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };
          rec.onstop = () => {
            const mime = rec.mimeType || "audio/webm";
            const blob = new Blob(chunks, { type: mime });
            if (assistantSessionActiveRef.current) {
              scheduleSegment();
            }
            if (blob.size < 400) return;
            const seq = ++assistantChunkSeqRef.current;
            const sessionAtChunk = assistantLiveSessionIdRef.current;
            void (async () => {
              try {
                const out = await teacherLiveAssistantChunk(
                  blob,
                  assistantChildLabelRef.current,
                );
                if (sessionAtChunk === assistantLiveSessionIdRef.current) {
                  const sug = (out.suggestion ?? "").trim();
                  const tr = (out.transcript ?? "").trim();
                  assistantPendingChunkResultsRef.current.set(seq, {
                    suggestion: sug,
                    transcript: tr,
                  });
                  setAssistantRefDisplay((prev) =>
                    drainAssistantRefChunks(
                      assistantPendingChunkResultsRef.current,
                      assistantNextChunkApplyRef,
                      prev,
                    ),
                  );
                }
              } catch (err) {
                if (sessionAtChunk === assistantLiveSessionIdRef.current) {
                  const msg = err instanceof Error ? err.message.slice(0, 80) : "稍后再试";
                  assistantPendingChunkResultsRef.current.set(seq, {
                    suggestion: "",
                    transcript: "",
                  });
                  setAssistantRefDisplay((prev) => {
                    const afterDrain = drainAssistantRefChunks(
                      assistantPendingChunkResultsRef.current,
                      assistantNextChunkApplyRef,
                      prev,
                    );
                    const stillEmpty =
                      !afterDrain.suggestion.trim() && !afterDrain.transcript.trim();
                    if (stillEmpty) {
                      return { suggestion: msg, transcript: "" };
                    }
                    return afterDrain;
                  });
                }
              }
            })();
          };
          rec.start(250);
          assistantSegmentTimerRef.current = setTimeout(() => {
            assistantSegmentTimerRef.current = null;
            try {
              rec.stop();
            } catch {
              /* noop */
            }
          }, 10_000);
        };

        scheduleSegment();
      } catch (err) {
        assistantSessionActiveRef.current = false;
        assistantStreamRef.current?.getTracks().forEach((t) => t.stop());
        assistantStreamRef.current = null;
        setAssistantLiveRecording(false);
        showAlert(err instanceof Error ? err.message : "无法访问麦克风");
      }
    })();
  }, [assistantLiveRecording, selectedChildId, stopAssistantLive, student, studentSelectOptions]);

  const handleChildArtFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!selectedClassId || selectedChildId == null) {
      showAlert("请先选择幼儿姓名");
      return;
    }
    setArtUploading(true);
    try {
      const { imageUrl, portfolioArchiveItemId: pid } =
        await teacherUploadChildArtImage(file, selectedChildId, selectedClassId, date);
      setChildArtImageUrl(imageUrl);
      setPortfolioArchiveItemId(pid);
      setAnalysisText("");
      setAnalysisError(null);
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "上传失败");
    } finally {
      setArtUploading(false);
    }
  };

  return (
    <div className="relative pb-20">
      <div className="space-y-3">

        {/* 幼儿姓名 + 时间：同一白卡片、同一列宽，保证控件等宽、右侧图标纵向对齐 */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid grid-cols-[5rem_1fr] items-center gap-x-3 gap-y-3">
            <span className="text-sm text-slate-600">幼儿姓名</span>
            <Select
              value={student}
              onValueChange={setStudent}
              options={studentSelectOptions}
              placeholder="幼儿姓名"
              aria-label="选择幼儿姓名"
              className="min-w-0 w-full"
              splitEndAffix
              splitCompact
              triggerClassName={selectTriggerHome}
              displayClassName="max-w-[50%]"
              disabled={optionsLoading}
            />
            {optionsLoading ? (
              <div className="col-span-2 text-xs text-slate-500">正在加载幼儿列表…</div>
            ) : null}
            <span className="text-sm text-slate-600">时间</span>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cn(
                "relative h-9 w-full min-w-0 pl-2.5 pr-9 text-[13px] leading-none",
                rowFieldShell,
                rowFieldFocus,
                "text-left text-slate-900",
                "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              )}
            />
          </div>
        </section>

        {/* 幼儿画语 */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-800">幼儿画语</h2>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(ev) => void handleChildArtFile(ev)}
          />
          {childArtImageUrl ? (
            <div className="mb-3 overflow-hidden rounded-xl border border-[rgb(65_100_170)]/30 bg-[rgb(248_250_252)] p-2">
              <p className="mb-1 text-xs text-slate-500">已上传表征图（已保存至档案库）</p>
              <img
                src={childArtImageUrl}
                alt="幼儿表征"
                className="max-h-40 w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : null}
          <div
            className={cn(
              fieldShell,
              fieldShellFocusWithin,
              "flex flex-col overflow-hidden p-0",
            )}
          >
            <Textarea
              value={childArtNotes}
              onChange={(e) => setChildArtNotes(e.target.value)}
              placeholder="在此记录谈话内容或描述幼儿画作"
              className={cn(
                "no-scrollbar min-h-[128px] flex-1 resize-y overflow-y-auto rounded-none rounded-t-2xl border-0 bg-transparent py-3 shadow-none outline-none",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                textareaBodyText,
              )}
            />
            {(homeMicRecording || homeTranscribeProcessing) && (
              <div className="border-t border-[rgb(65_100_170)]/15 px-2 pt-2">
                <LiveWaveform
                  active={false}
                  processing={homeMicRecording || homeTranscribeProcessing}
                  height={44}
                  mode="static"
                  className="rounded-lg bg-[rgb(248_250_252)] text-[rgb(65_100_170)]"
                  aria-label={homeTranscribeProcessing ? "正在转写" : "录音电平"}
                />
              </div>
            )}
            <div
              role="toolbar"
              aria-label="幼儿画语工具"
              className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[rgb(65_100_170)]/20 px-3 py-2.5"
            >
              <button
                type="button"
                disabled={artUploading || optionsLoading}
                onClick={() => imageInputRef.current?.click()}
                className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-xs leading-none text-slate-600 transition-colors hover:bg-[rgb(65_100_170)]/10 hover:text-[rgb(65_100_170)] disabled:opacity-50"
                aria-label="幼儿表征"
              >
                <ImageIcon
                  size={14}
                  strokeWidth={2}
                  className="size-3.5 shrink-0 text-[rgb(65_100_170)]"
                  aria-hidden
                />
                <span className="leading-none">幼儿表征</span>
              </button>
              <button
                type="button"
                disabled={optionsLoading || homeTranscribeProcessing}
                onClick={() => toggleHomeListeningMic()}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-xs leading-none transition-colors",
                  homeMicRecording
                    ? "text-emerald-600"
                    : "text-slate-600 hover:bg-[rgb(65_100_170)]/10 hover:text-[rgb(65_100_170)]",
                  homeTranscribeProcessing && "opacity-70",
                )}
                aria-label={homeMicRecording ? "停止录音并转写" : "开始录音"}
              >
                {homeTranscribeProcessing ? (
                  <Loader2
                    size={14}
                    strokeWidth={2}
                    className="size-3.5 shrink-0 animate-spin text-[rgb(65_100_170)]"
                    aria-hidden
                  />
                ) : (
                  <Mic
                    size={14}
                    strokeWidth={2}
                    className={cn(
                      "size-3.5 shrink-0 text-[rgb(65_100_170)]",
                      homeMicRecording && "animate-pulse text-emerald-600",
                    )}
                    aria-hidden
                  />
                )}
                <span className="leading-none">
                  {homeTranscribeProcessing ? "转写中" : homeMicRecording ? "停止" : "录音"}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* AI 辅助生成：白卡片包裹 */}
        <section className="space-y-3 rounded-2xl bg-white p-3 shadow-sm sm:p-4">
          <AIGenerateArea
            title="分析解读"
            placeholder=""
            value={analysisText}
            onChange={setAnalysisText}
            onAIGenerate={
              childArtImageUrl
                ? async () => {
                    setAnalysisLoading(true);
                    setAnalysisError(null);
                    try {
                      const text = await teacherAnalyzeChildArt(
                        childArtImageUrl,
                        childArtNotes,
                        portfolioArchiveItemId ?? undefined,
                      );
                      setAnalysisText(text);
                    } catch (err) {
                      setAnalysisError(
                        err instanceof Error ? err.message : "分析失败",
                      );
                    } finally {
                      setAnalysisLoading(false);
                    }
                  }
                : undefined
            }
            generateDisabled={!childArtImageUrl || analysisLoading}
            loading={analysisLoading}
            errorText={analysisError}
          />
          <AIGenerateArea
            title="教师支持策略"
            placeholder={PLACEHOLDER_TEACHER_SUPPORT}
            value={teacherSupportText}
            onChange={setTeacherSupportText}
            onAIGenerate={async () => {
              setTeacherAiLoading(true);
              setTeacherTextError(null);
              try {
                const text = await teacherListeningTextAi("teacher_support", {
                  transcriptNote: childArtNotes,
                  analysisInterpretation: analysisText,
                  sectionHint: teacherSupportText,
                  portfolioArchiveItemId: portfolioArchiveItemId ?? undefined,
                });
                setTeacherSupportText(text);
              } catch (err) {
                setTeacherTextError(
                  err instanceof Error ? err.message : "生成失败",
                );
              } finally {
                setTeacherAiLoading(false);
              }
            }}
            generateDisabled={teacherAiLoading}
            loading={teacherAiLoading}
            errorText={teacherTextError}
          />
          <AIGenerateArea
            title="指导建议（家长）"
            placeholder={PLACEHOLDER_GUIDANCE}
            value={parentGuidanceText}
            onChange={setParentGuidanceText}
            onAIGenerate={async () => {
              setParentAiLoading(true);
              setParentTextError(null);
              try {
                const text = await teacherListeningTextAi("parent_guidance", {
                  transcriptNote: childArtNotes,
                  analysisInterpretation: analysisText,
                  sectionHint: parentGuidanceText,
                  portfolioArchiveItemId: portfolioArchiveItemId ?? undefined,
                });
                setParentGuidanceText(text);
              } catch (err) {
                setParentTextError(
                  err instanceof Error ? err.message : "生成失败",
                );
              } finally {
                setParentAiLoading(false);
              }
            }}
            generateDisabled={parentAiLoading}
            loading={parentAiLoading}
            errorText={parentTextError}
          />
        </section>

        {/* 教师反思与保存 */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-slate-800">教师反思</h2>
          <p className="mb-3 text-sm text-slate-500">记录本次倾听后的思考与后续支持</p>
          <div className="relative">
            <Textarea
              placeholder={PLACEHOLDER_REFLECTION}
              value={teacherReflection}
              onChange={(e) => setTeacherReflection(e.target.value)}
              className={cn(
                fieldShell,
                fieldFocus,
                "no-scrollbar min-h-[120px] overflow-y-auto py-3",
                textareaBodyText
              )}
            />
          </div>
          <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
            <Button
              type="button"
              disabled={reflectionSaving || portfolioArchiveItemId == null}
              onClick={async () => {
                if (portfolioArchiveItemId == null) {
                  showAlert("请先上传幼儿画语以创建档案记录");
                  return;
                }
                setReflectionSaving(true);
                try {
                  const out = await saveTeacherPortfolioRecord(portfolioArchiveItemId, {
                    teacherReflection,
                    recordingTranscript: childArtNotes,
                    analysisInterpretation: analysisText,
                    teacherSupportStrategies: teacherSupportText,
                    parentGuidanceAdvice: parentGuidanceText,
                    observedDay: date,
                  });
                  showAlert(
                    out.snippetGenerated
                      ? "已保存，并已生成个性发展摘要"
                      : `已保存${out.snippetMessage ? `（${out.snippetMessage}）` : ""}`,
                  );
                } catch (err) {
                  showAlert(err instanceof Error ? err.message : "保存失败");
                } finally {
                  setReflectionSaving(false);
                }
              }}
              className="inline-flex h-9 min-w-[12rem] items-center justify-center gap-1.5 rounded-md border-0 bg-[rgb(145_172_224)] px-10 text-sm text-white hover:bg-[rgb(125_155_210)] hover:text-white"
            >
              <Save size={18} strokeWidth={2} aria-hidden />
              {reflectionSaving ? "保存中…" : "保存记录"}
            </Button>
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={() => setShowAIAssistant(true)}
        className={cn(
          "fixed right-4 top-1/2 z-40 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[rgb(65_100_170)]/40 bg-white text-[rgb(65_100_170)] transition-transform hover:scale-105 hover:border-[rgb(65_100_170)] hover:bg-[rgb(238_242_250)]",
          showAIAssistant && "pointer-events-none opacity-0"
        )}
        aria-label="打开实时辅助回应"
      >
        <Bot size={26} strokeWidth={1.75} />
      </button>

      <aside
        className={cn(
          "fixed right-0 top-1/2 z-[100] flex h-[min(50vh,50dvh)] w-4/5 max-w-md -translate-y-1/2 flex-col overflow-hidden rounded-l-2xl border-l border-[rgb(65_100_170/0.22)] bg-[rgb(182_199_234/0.58)] text-[rgb(48_62_108)] shadow-[0_8px_32px_rgb(65_100_170/0.12)] backdrop-blur-2xl backdrop-saturate-150 transition-transform duration-300 ease-out sm:max-w-lg",
          showAIAssistant ? "translate-x-0" : "pointer-events-none translate-x-full"
        )}
        aria-hidden={!showAIAssistant}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-[rgb(65_100_170/0.15)] px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={() => setShowAIAssistant(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgb(65_100_170/0.35)] bg-white/45 text-[rgb(58_74_128)] transition-colors hover:bg-white/75"
            aria-label="收回"
          >
            <ChevronRight size={20} strokeWidth={2} />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <img
              src={APP_LOGO_URL}
              alt=""
              className="h-9 w-9 shrink-0 rounded-md object-contain sm:h-10 sm:w-10"
            />
            <h2 className="min-w-0 text-center text-sm font-semibold leading-tight tracking-tight text-[rgb(48_62_108)] sm:text-base">
              {ASSISTANT_PANEL_TITLE}
            </h2>
          </div>
          <span className="h-9 w-9 shrink-0" aria-hidden />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-4 py-3">
            {!assistantLiveRecording ? (
              <p className="text-center text-sm text-[rgb(58_74_128)]/85">
                和孩子说话时，可打开下方麦克风，下方会陆续出现很短的回应参考；需要结束时再点一次麦克风。
              </p>
            ) : null}
            {assistantLiveRecording ? (
              <div className="w-full max-w-xs px-1">
                <LiveWaveform
                  active={false}
                  processing
                  height={40}
                  mode="static"
                  className="rounded-lg bg-white/50 text-[rgb(65_100_170)]"
                  aria-label="持续聆听中"
                />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => toggleAssistantLiveMic()}
              className={cn(
                "flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 transition-all sm:h-28 sm:w-28",
                assistantLiveRecording
                  ? "border-[rgb(65_100_170)] bg-[rgb(182_199_234/0.85)] text-[rgb(48_62_108)] shadow-[0_0_28px_rgb(182_199_234/0.9)]"
                  : "border-[rgb(65_100_170/0.45)] bg-white/55 text-[rgb(58_74_128)] hover:border-[rgb(65_100_170)] hover:bg-white/85",
              )}
              aria-pressed={assistantLiveRecording}
              aria-label={assistantLiveRecording ? "结束持续聆听" : "开始持续聆听"}
            >
              <Mic
                size={40}
                strokeWidth={1.75}
                className={assistantLiveRecording ? "animate-pulse" : ""}
              />
            </button>
          </div>

          <div className="shrink-0 border-t border-[rgb(65_100_170/0.15)] bg-white/40 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
            <p className="mb-2 text-xs font-semibold tracking-wide text-[rgb(90_108_158)]">
              回应参考
            </p>
            <div className="max-h-44 min-h-[4.5rem] space-y-2 overflow-y-auto text-sm leading-relaxed text-[rgb(48_62_108)]/92">
              {assistantRefDisplay.suggestion.trim() ? (
                <p className="text-center text-lg font-semibold tracking-wide text-[rgb(48_62_108)]">
                  {assistantRefDisplay.suggestion}
                </p>
              ) : null}
              {assistantRefDisplay.transcript.trim() ? (
                <div
                  className={cn(
                    assistantRefDisplay.suggestion.trim() &&
                      "border-t border-[rgb(65_100_170/0.12)] pt-2",
                  )}
                >
                  <p className="mb-0.5 text-xs font-medium text-[rgb(90_108_158)]">
                    依据刚才谈话整理
                  </p>
                  <p className="text-xs leading-snug text-[rgb(58_74_128)]/90">
                    {assistantRefDisplay.transcript}
                  </p>
                </div>
              ) : null}
              {!assistantLiveRecording &&
              !assistantRefDisplay.suggestion.trim() &&
              !assistantRefDisplay.transcript.trim() ? (
                <p className="py-3 text-center text-xs text-[rgb(58_74_128)]/75">
                  开始录音后，回应参考会出现在这里。
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function AIGenerateArea({
  title,
  placeholder,
  value: controlledValue,
  onChange,
  onAIGenerate,
  generateDisabled,
  loading,
  errorText,
}: {
  title: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onAIGenerate?: () => void | Promise<void>;
  generateDisabled?: boolean;
  loading?: boolean;
  errorText?: string | null;
}) {
  const [internalValue, setInternalValue] = useState("");
  const isControlled = controlledValue !== undefined;
  const text = isControlled ? controlledValue! : internalValue;
  const setText = isControlled ? onChange! : setInternalValue;

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-slate-800">{title}</h3>
      {errorText ? (
        <p className="mb-2 text-xs text-red-600" role="alert">
          {errorText}
        </p>
      ) : null}
      <div className="relative min-h-[132px]">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            placeholder === undefined
              ? `可在此输入要点或点击「AI生成」生成${title}`
              : placeholder
          }
          className={cn(
            fieldShell,
            fieldFocus,
            "no-scrollbar min-h-[120px] max-h-[min(70vh,28rem)] resize-y overflow-y-auto py-3 pb-16",
            textareaBodyText
          )}
        />
        <div className="absolute bottom-5 right-4 z-10">
          <Button
            type="button"
            disabled={generateDisabled ?? false}
            onClick={() => {
              if (onAIGenerate) void onAIGenerate();
            }}
            className="h-8 min-w-[5.25rem] rounded-md border-0 bg-[rgb(145_172_224)] px-4 text-xs font-medium text-white hover:bg-[rgb(125_155_210)] hover:text-white disabled:opacity-50"
          >
            {loading ? "生成中…" : "AI生成"}
          </Button>
        </div>
      </div>
    </div>
  );
}
