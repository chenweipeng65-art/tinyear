import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Camera, Image as ImageIcon, ChevronLeft, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArchiveRecord } from "@/types/archiveRecord";
import { useArchiveRecordsByClass } from "@/lib/hooks/useReadApi";
import { parentUploadAvatar } from "@/lib/api/parentMedia";
import { useAppAlert } from "@/components/ui/AppAlertProvider";

function formatDisplayDate(iso: string) {
  try {
    return format(parseISO(iso), "yyyy年M月d日");
  } catch {
    return iso;
  }
}

/** 与教师端导出一致：优先展示录音转写，其次档案小结 */
function processRecordBody(record: ArchiveRecord): string {
  const t = record.recordingTranscript?.trim();
  const s = record.content?.trim();
  if (t) return s && s !== t ? `${t}\n\n${s}` : t;
  return s || "（暂无文字记录）";
}

const frameBorder = "rounded-xl border border-[rgb(182_199_234)] bg-white shadow-sm";
const frameInner = "flex items-center justify-center rounded-lg bg-[rgb(248_250_252)]";

export default function ParentDashboard() {
  const showAlert = useAppAlert();
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState("");
  const [parentClassId, setParentClassId] = useState<number | null>(null);
  const [viewingRecord, setViewingRecord] = useState<ArchiveRecord | null>(null);

  const { records: recordsForChild, loading: recordsLoading, matchedChild, reloadChildAndRecords } =
    useArchiveRecordsByClass(studentName, parentClassId);
  const avatarUrl =
    matchedChild?.avatarUrl != null && matchedChild.avatarUrl.trim() !== ""
      ? matchedChild.avatarUrl
      : null;
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    const name = sessionStorage.getItem("parent_student_name");
    if (!name) {
      navigate("/parent/login");
      return;
    }
    setStudentName(name);
    const classRaw = sessionStorage.getItem("parent_class_id");
    const id = classRaw != null ? Number.parseInt(classRaw, 10) : NaN;
    setParentClassId(Number.isFinite(id) ? id : null);
  }, [navigate]);

  const handleAvatarPick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !studentName) return;
    const six = sessionStorage.getItem("parent_id_card_last_six") ?? "";
    const classRaw = sessionStorage.getItem("parent_class_id");
    const classId = classRaw != null ? Number.parseInt(classRaw, 10) : NaN;
    if (six.length !== 6 || !Number.isFinite(classId)) {
      showAlert("登录信息已失效，请重新登录后再上传头像");
      navigate("/parent/login");
      return;
    }
    setAvatarUploading(true);
    try {
      await parentUploadAvatar(file, studentName, six, classId);
      reloadChildAndRecords();
    } catch (err) {
      showAlert(err instanceof Error ? err.message : "上传失败");
    } finally {
      setAvatarUploading(false);
    }
  };

  if (viewingRecord) {
    return (
      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <Button
          variant="ghost"
          className="-ml-4 gap-2 text-slate-500 hover:text-slate-800"
          onClick={() => setViewingRecord(null)}
        >
          <ChevronLeft size={20} />
          返回档案列表
        </Button>

        <div className="overflow-hidden rounded-xl border border-slate-100 bg-[rgb(236_240_250)] shadow-sm">
          <div className="px-3 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-4">
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
            <p className="mt-3 text-center text-sm font-medium text-[rgb(90_115_170)] sm:mt-4 sm:text-base">
              {formatDisplayDate(viewingRecord.date)}
            </p>
          </div>

          <div className="space-y-3 px-3 pb-5 sm:space-y-4 sm:px-6 sm:pb-6">
            <div className="rounded-xl border border-[rgb(182_199_234/0.4)] bg-white p-4 shadow-sm sm:p-5">
              <p className="text-sm font-semibold text-[rgb(90_115_170)]">过程实录：</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                {processRecordBody(viewingRecord)}
              </p>
            </div>
            <div className="rounded-xl border border-[rgb(182_199_234/0.4)] bg-white p-4 shadow-sm sm:p-5">
              <p className="text-sm font-semibold text-[rgb(90_115_170)]">教育建议</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                {viewingRecord.educationSuggestion}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300 pb-4">
      <Card className="relative overflow-hidden border-slate-100">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-[rgb(198_210_240)] to-[rgb(182_199_234/0.65)]" />
        <CardContent className="relative z-10 flex flex-col items-center gap-4 px-4 pb-4 pt-10 text-center sm:flex-row sm:items-end sm:text-left">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(ev) => void handleAvatarFile(ev)}
          />
          <div className="relative">
            <div className="flex h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-200">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={studentName}
                  className="h-full w-full object-cover object-top"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-slate-400" aria-hidden>
                  <User className="h-12 w-12" strokeWidth={1.25} />
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={avatarUploading || recordsLoading}
              onClick={() => handleAvatarPick()}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(182_199_234)] bg-[rgb(125_142_198)] text-white transition-colors hover:bg-[rgb(105_122_178)] disabled:opacity-50"
              aria-label="更换头像"
            >
              <Camera size={14} />
            </button>
          </div>
          <div className="mb-0.5 sm:mb-2">
            <h2 className="text-2xl font-bold text-slate-800">{studentName}</h2>
            <p className="mt-1 text-sm text-slate-500">阳光幼儿园 大一班</p>
            <p className="mt-0.5 text-sm text-slate-500">
              {recordsLoading ? "正在加载倾听记录…" : `共 ${recordsForChild.length} 份倾听记录`}
            </p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800">
          <ImageIcon size={20} className="text-amber-500" />
          已收集档案
        </h3>
        {recordsLoading ? (
          <div className="rounded-xl border border-[rgb(182_199_234/0.6)] bg-white px-4 py-12 text-center text-sm text-slate-500">
            加载中…
          </div>
        ) : recordsForChild.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[rgb(182_199_234/0.6)] bg-white px-4 py-8 text-center text-sm text-slate-500">
            暂无档案
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {recordsForChild.map((record) => (
              <Card
                key={record.id}
                className="flex cursor-pointer flex-col border-slate-100 bg-[rgb(236_240_250)] transition-all hover:border-[rgb(182_199_234)]"
                onClick={() => setViewingRecord(record)}
              >
                <div className="p-2 sm:p-2.5">
                  <div className={cn("p-1.5 sm:p-2", frameBorder)}>
                    <div className={cn("aspect-[4/3] max-h-36 sm:max-h-44", frameInner)}>
                      <img
                        src={record.image}
                        alt={record.title}
                        className="max-h-full w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-center text-[10px] text-[rgb(90_115_170)] sm:text-xs">
                    {formatDisplayDate(record.date)}
                  </p>
                  <p className="mt-1 truncate text-center text-xs font-medium text-slate-800 sm:text-sm">
                    {record.title}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
