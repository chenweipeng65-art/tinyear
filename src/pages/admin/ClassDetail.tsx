import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChevronLeft, Download, Pencil, Trash2, Upload, UserPlus, X } from "lucide-react";
import {
  adminCreateChild,
  adminDeleteChild,
  adminDeleteClass,
  adminGetClass,
  adminImportChildren,
  adminImportTemplateUrl,
  adminUpdateChild,
  adminUpdateClass,
  type AdminChildRow,
  type AdminClassDetail,
} from "@/lib/api/adminApi";
import { useAppAlert } from "@/components/ui/AppAlertProvider";

const gradeLabels: Record<string, string> = {
  small: "小班",
  medium: "中班",
  large: "大班",
};

const gradeOptions = [
  { value: "", label: "未指定" },
  { value: "small", label: "小班" },
  { value: "medium", label: "中班" },
  { value: "large", label: "大班" },
] as const;

const classGradeOptions = [
  { value: "small", label: "小班" },
  { value: "medium", label: "中班" },
  { value: "large", label: "大班" },
] as const;

export default function AdminClassDetail() {
  const showAlert = useAppAlert();
  const navigate = useNavigate();
  const { classId } = useParams<{ classId: string }>();
  const id = Number(classId);
  const [detail, setDetail] = useState<AdminClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const [addName, setAddName] = useState("");
  const [addAgeBand, setAddAgeBand] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminChildRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editIdSix, setEditIdSix] = useState("");
  const [editAgeBand, setEditAgeBand] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [classEdit, setClassEdit] = useState<{
    name: string;
    gradeBand: string;
    schoolYear: string;
    teacherVisible: boolean;
  } | null>(null);
  const [classEditError, setClassEditError] = useState<string | null>(null);
  const [savingClass, setSavingClass] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(id) || id < 1) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setDetail(await adminGetClass(id));
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (detail?.gradeBand) setAddAgeBand(detail.gradeBand);
  }, [detail?.id, detail?.gradeBand]);

  const openEdit = (ch: AdminChildRow) => {
    setEditing(ch);
    setEditName(ch.displayName);
    setEditIdSix("");
    setEditAgeBand(ch.ageBand ?? "");
    setEditError(null);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editing || !Number.isFinite(id)) return;
    const name = editName.trim();
    if (!name) {
      setEditError("请填写姓名");
      return;
    }
    const sixRaw = editIdSix.replace(/\D/g, "").slice(0, 6);
    const nameChanged = name !== editing.displayName;
    const body: { displayName?: string; idCardLastSix?: string; ageBand?: string | null } = {};

    if (nameChanged) {
      body.displayName = name;
      if (editing.idCardLastSixBound && sixRaw.length !== 6) {
        setEditError("该幼儿已绑定证件后六位，修改姓名时必须填写正确的后六位");
        return;
      }
      if (sixRaw.length === 6) body.idCardLastSix = sixRaw;
    } else if (sixRaw.length === 6) {
      body.idCardLastSix = sixRaw;
    }

    const nextBand = editAgeBand === "" ? null : editAgeBand;
    const prevBand = editing.ageBand ?? null;
    if (nextBand !== prevBand) {
      body.ageBand = nextBand;
    }

    if (Object.keys(body).length === 0) {
      closeEdit();
      return;
    }

    setSaving(true);
    setEditError(null);
    try {
      await adminUpdateChild(id, editing.id, body);
      closeEdit();
      await load();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const openClassEdit = () => {
    if (!detail) return;
    setClassEdit({
      name: detail.name,
      gradeBand: detail.gradeBand,
      schoolYear: detail.schoolYear ?? "",
      teacherVisible: detail.teacherVisible,
    });
    setClassEditError(null);
  };

  const closeClassEdit = () => {
    setClassEdit(null);
    setClassEditError(null);
  };

  const saveClassEdit = async () => {
    if (!classEdit || !Number.isFinite(id)) return;
    const n = classEdit.name.trim();
    if (!n) {
      setClassEditError("请填写班级名称");
      return;
    }
    const body: {
      name?: string;
      gradeBand?: string;
      schoolYear?: string | null;
      teacherVisible?: boolean;
    } = {};
    if (n !== detail!.name) body.name = n;
    if (classEdit.gradeBand !== detail!.gradeBand) body.gradeBand = classEdit.gradeBand;
    const nextYear = classEdit.schoolYear.trim() || null;
    const prevYear = detail!.schoolYear ?? null;
    if (nextYear !== prevYear) body.schoolYear = nextYear;
    if (classEdit.teacherVisible !== detail!.teacherVisible) body.teacherVisible = classEdit.teacherVisible;
    if (Object.keys(body).length === 0) {
      closeClassEdit();
      return;
    }
    setSavingClass(true);
    setClassEditError(null);
    try {
      await adminUpdateClass(id, body);
      closeClassEdit();
      await load();
    } catch (e) {
      setClassEditError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSavingClass(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!detail || !Number.isFinite(id)) return;
    const ok = window.confirm(
      `确定删除班级「${detail.name}」？\n本班全部学生、倾听会话及班级 AI 分析等将一并删除，不可恢复。`,
    );
    if (!ok) return;
    try {
      await adminDeleteClass(id);
      navigate("/admin/classes", { replace: true });
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "删除失败");
    }
  };

  const handleDelete = async (ch: AdminChildRow) => {
    if (!Number.isFinite(id)) return;
    const ok = window.confirm(
      `确定删除学生「${ch.displayName}」？\n其在本班的倾听会话将一并删除，档案等关联数据按库规则级联处理。`,
    );
    if (!ok) return;
    try {
      await adminDeleteChild(id, ch.id);
      await load();
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "删除失败");
    }
  };

  const downloadTemplate = async () => {
    if (!Number.isFinite(id)) return;
    const res = await fetch(adminImportTemplateUrl(id), { credentials: "include" });
    if (!res.ok) return;
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `学生导入模板_${detail?.name ?? id}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !Number.isFinite(id)) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const r = await adminImportChildren(id, file);
      setImportMsg(`导入完成：成功 ${r.imported} 条，跳过 ${r.skipped} 行`);
      await load();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
    }
  };

  const handleAddSingle = async () => {
    if (!Number.isFinite(id) || !detail) return;
    const n = addName.trim();
    setAddError(null);
    if (!n) {
      setAddError("请填写幼儿姓名");
      return;
    }
    const ageBand = addAgeBand === "" ? null : addAgeBand;
    if (ageBand !== null && !["small", "medium", "large"].includes(ageBand)) {
      setAddError("请选择有效年龄段");
      return;
    }
    setAddSaving(true);
    try {
      await adminCreateChild(id, { displayName: n, ageBand });
      setAddName("");
      setAddAgeBand(detail.gradeBand);
      await load();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "添加失败");
    } finally {
      setAddSaving(false);
    }
  };

  if (loading) {
    return <p className="py-12 text-center text-sm text-slate-500">加载中…</p>;
  }

  if (!detail) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-slate-600">未找到该班级</p>
        <Link to="/admin/classes" className="text-sm text-[rgb(90_108_158)] underline">
          返回列表
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        to="/admin/classes"
        className="inline-flex items-center gap-1 text-sm font-medium text-[rgb(90_108_158)] hover:underline"
      >
        <ChevronLeft size={18} aria-hidden />
        班级列表
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">{detail.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {gradeLabels[detail.gradeBand] ?? detail.gradeBand}
            {detail.schoolYear ? ` · ${detail.schoolYear}` : ""} · 共 {detail.children.length} 名幼儿
            {!detail.teacherVisible ? (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">
                教师端已隐藏
              </span>
            ) : null}
            {detail.defaultForTeacher ? (
              <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-900">
                全园默认班级
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {detail.teacherVisible && !detail.defaultForTeacher ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
              onClick={async () => {
                try {
                  await adminUpdateClass(id, { defaultForTeacher: true });
                  await load();
                } catch (e) {
                  showAlert(e instanceof Error ? e.message : "设置失败");
                }
              }}
            >
              设为全园默认
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-[rgb(182_199_234)]"
            onClick={openClassEdit}
          >
            <Pencil size={14} aria-hidden />
            编辑班级
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-rose-200 text-rose-700 hover:bg-rose-50"
            onClick={() => void handleDeleteClass()}
          >
            <Trash2 size={14} aria-hidden />
            删除班级
          </Button>
        </div>
      </div>

      <Card className="border-[rgb(182_199_234)] bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[rgb(58_74_128)]">添加学生</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-slate-800">单个添加</h3>
            <p className="text-sm text-slate-600">
              录入一名幼儿姓名与年龄段；证件后六位由家长首次登录时填写，不在此录入。
            </p>
            {addError ? (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{addError}</p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-[12rem] flex-1 space-y-1">
                <label className="text-xs font-medium text-slate-600">幼儿姓名</label>
                <Input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="与园方登记一致"
                  className="border-[rgb(182_199_234)]"
                />
              </div>
              <div className="w-full min-w-[10rem] space-y-1 sm:w-44">
                <label className="text-xs font-medium text-slate-600">年龄段</label>
                <select
                  value={addAgeBand}
                  onChange={(e) => setAddAgeBand(e.target.value)}
                  className="h-10 w-full rounded-md border border-[rgb(182_199_234)] bg-white px-2 text-sm"
                >
                  {gradeOptions.map((g) => (
                    <option key={g.value || "empty"} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                disabled={addSaving}
                onClick={() => void handleAddSingle()}
                className="h-10 gap-2 bg-[rgb(90_108_158)] text-white hover:bg-[rgb(74_90_138)] sm:shrink-0"
              >
                <UserPlus size={16} aria-hidden />
                {addSaving ? "添加中…" : "添加幼儿"}
              </Button>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-medium text-slate-800">Excel 批量导入</h3>
            <p className="text-sm text-slate-600">
              先下载模板，表头仅需「幼儿姓名」。证件后六位由家长首次登录时录入，不在此导入。保存后在此上传。
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-[rgb(182_199_234)]"
                onClick={() => void downloadTemplate()}
              >
                <Download size={16} aria-hidden />
                下载导入模板
              </Button>
              <label className="inline-flex cursor-pointer">
                <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={(ev) => void onFile(ev)} />
                <span className="inline-flex h-10 items-center gap-2 rounded-md bg-[rgb(90_108_158)] px-4 text-sm font-medium text-white hover:bg-[rgb(74_90_138)]">
                  <Upload size={16} aria-hidden />
                  {importing ? "导入中…" : "上传 Excel"}
                </span>
              </label>
            </div>
            {importMsg ? <p className="text-sm text-slate-700">{importMsg}</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-[rgb(182_199_234)] bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[rgb(58_74_128)]">本班学生</CardTitle>
          <p className="text-xs text-slate-500">
            支持编辑、删除；若家长已绑定证件后六位，修改姓名时需填写正确后六位；未绑定时可直接改姓名。
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {detail.children.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              暂无学生，请使用上方「单个添加」或「Excel 批量导入」
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-2">姓名</th>
                    <th className="py-2 pr-2">年龄段</th>
                    <th className="py-2 pr-2">录入时间</th>
                    <th className="py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.children.map((ch) => (
                    <tr key={ch.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-2 font-medium text-slate-900">{ch.displayName}</td>
                      <td className="py-2.5 pr-2 text-slate-600">
                        {ch.ageBand ? gradeLabels[ch.ageBand] ?? ch.ageBand : "—"}
                      </td>
                      <td className="py-2.5 pr-2 text-slate-500">
                        {new Date(ch.createdAt).toLocaleString("zh-CN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 px-2 text-[rgb(90_108_158)]"
                            onClick={() => openEdit(ch)}
                          >
                            <Pencil size={14} aria-hidden />
                            编辑
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 px-2 text-rose-600 hover:text-rose-700"
                            onClick={() => void handleDelete(ch)}
                          >
                            <Trash2 size={14} aria-hidden />
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {classEdit ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-edit-class-detail-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[rgb(182_199_234)] bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 id="admin-edit-class-detail-title" className="text-lg font-semibold text-slate-800">
                编辑班级
              </h2>
              <button
                type="button"
                onClick={closeClassEdit}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {classEditError ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{classEditError}</p>
              ) : null}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">班级名称</label>
                <Input
                  value={classEdit.name}
                  onChange={(e) => setClassEdit((s) => (s ? { ...s, name: e.target.value } : s))}
                  className="border-[rgb(182_199_234)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">学段</label>
                <select
                  value={classEdit.gradeBand}
                  onChange={(e) =>
                    setClassEdit((s) => (s ? { ...s, gradeBand: e.target.value } : s))
                  }
                  className="h-10 w-full rounded-md border border-[rgb(182_199_234)] bg-white px-2 text-sm"
                >
                  {classGradeOptions.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">学年（留空表示不填）</label>
                <Input
                  value={classEdit.schoolYear}
                  onChange={(e) =>
                    setClassEdit((s) => (s ? { ...s, schoolYear: e.target.value } : s))
                  }
                  placeholder="2025-2026"
                  className="border-[rgb(182_199_234)]"
                />
              </div>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-[rgb(182_199_234)]"
                  checked={classEdit.teacherVisible}
                  onChange={(e) =>
                    setClassEdit((s) => (s ? { ...s, teacherVisible: e.target.checked } : s))
                  }
                />
                <span>
                  <span className="font-medium">在教师端展示</span>
                  <span className="mt-0.5 block text-xs text-slate-500">关闭后教师端班级列表与幼儿数据将不再出现本班</span>
                </span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeClassEdit}
                  className="border-[rgb(182_199_234)]"
                >
                  取消
                </Button>
                <Button
                  type="button"
                  disabled={savingClass}
                  onClick={() => void saveClassEdit()}
                  className="bg-[rgb(90_108_158)] text-white hover:bg-[rgb(74_90_138)]"
                >
                  {savingClass ? "保存中…" : "保存"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-edit-child-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[rgb(182_199_234)] bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 id="admin-edit-child-title" className="text-lg font-semibold text-slate-800">
                编辑学生
              </h2>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label="关闭"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              {editError ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{editError}</p>
              ) : null}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">幼儿姓名</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border-[rgb(182_199_234)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">身份证后六位（管理端）</label>
                <Input
                  value={editIdSix}
                  onChange={(e) => setEditIdSix(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  inputMode="numeric"
                  className="border-[rgb(182_199_234)]"
                  placeholder={
                    editing.idCardLastSixBound
                      ? "已绑定：改姓名或纠错时按需填写"
                      : "未绑定：可留空，由家长首次登录录入"
                  }
                />
                <p className="text-xs text-slate-400">
                  {editing.idCardLastSixBound
                    ? "家长已绑定后六位；仅改年龄段可留空。改姓名或更正绑定值时需填写 6 位数字。"
                    : "家长尚未绑定；可直接改姓名。也可在此预填 6 位以写入绑定（与证件一致）。"}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">年龄段</label>
                <select
                  value={editAgeBand}
                  onChange={(e) => setEditAgeBand(e.target.value)}
                  className="h-10 w-full rounded-md border border-[rgb(182_199_234)] bg-white px-2 text-sm"
                >
                  {gradeOptions.map((g) => (
                    <option key={g.value || "empty"} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeEdit} className="border-[rgb(182_199_234)]">
                  取消
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveEdit()}
                  className="bg-[rgb(90_108_158)] text-white hover:bg-[rgb(74_90_138)]"
                >
                  {saving ? "保存中…" : "保存"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
