import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus, ChevronRight, Users, Pencil, Trash2, X } from "lucide-react";
import {
  adminCreateClass,
  adminDeleteClass,
  adminListClasses,
  adminUpdateClass,
  type AdminClassSummary,
} from "@/lib/api/adminApi";
import { useAppAlert } from "@/components/ui/AppAlertProvider";

const gradeOptions = [
  { value: "small", label: "小班" },
  { value: "medium", label: "中班" },
  { value: "large", label: "大班" },
] as const;

function gradeLabel(band: string): string {
  return gradeOptions.find((g) => g.value === band)?.label ?? band;
}

export default function AdminClasses() {
  const showAlert = useAppAlert();
  const [items, setItems] = useState<AdminClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [gradeBand, setGradeBand] = useState<string>("medium");
  const [schoolYear, setSchoolYear] = useState("");
  const [teacherVisibleNew, setTeacherVisibleNew] = useState(true);
  const [defaultForTeacherNew, setDefaultForTeacherNew] = useState(false);

  const [editing, setEditing] = useState<AdminClassSummary | null>(null);
  const [editName, setEditName] = useState("");
  const [editGrade, setEditGrade] = useState("medium");
  const [editYear, setEditYear] = useState("");
  const [editTeacherVisible, setEditTeacherVisible] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await adminListClasses());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await adminCreateClass({
        name: name.trim(),
        gradeBand,
        schoolYear: schoolYear.trim() || null,
        teacherVisible: teacherVisibleNew,
        ...(defaultForTeacherNew ? { defaultForTeacher: true } : {}),
      });
      setName("");
      setSchoolYear("");
      setDefaultForTeacherNew(false);
      await load();
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (c: AdminClassSummary) => {
    setEditing(c);
    setEditName(c.name);
    setEditGrade(c.gradeBand);
    setEditYear(c.schoolYear ?? "");
    setEditTeacherVisible(c.teacherVisible);
    setEditError(null);
  };

  const closeEdit = () => {
    setEditing(null);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    const n = editName.trim();
    if (!n) {
      setEditError("请填写班级名称");
      return;
    }
    const body: { name?: string; gradeBand?: string; schoolYear?: string | null; teacherVisible?: boolean } = {};
    if (n !== editing.name) body.name = n;
    if (editGrade !== editing.gradeBand) body.gradeBand = editGrade;
    const nextYear = editYear.trim() || null;
    const prevYear = editing.schoolYear ?? null;
    if (nextYear !== prevYear) body.schoolYear = nextYear;
    if (editTeacherVisible !== editing.teacherVisible) body.teacherVisible = editTeacherVisible;
    if (Object.keys(body).length === 0) {
      closeEdit();
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      await adminUpdateClass(editing.id, body);
      closeEdit();
      await load();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: AdminClassSummary) => {
    const ok = window.confirm(
      `确定删除班级「${c.name}」？\n将删除本班全部学生及其倾听会话等关联数据，且不可恢复。`,
    );
    if (!ok) return;
    try {
      await adminDeleteClass(c.id);
      await load();
    } catch (e) {
      showAlert(e instanceof Error ? e.message : "删除失败");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">班级管理</h1>
        <p className="mt-1 text-sm text-slate-500">
          创建班级后，可进入班级导入学生（Excel）。仅勾选「在教师端展示」的班级会出现在教师端与家长端并可切换；可将其中一个班设为「默认」，教师端与家长端未记住选择时将优先选中该班。
        </p>
      </div>

      <Card className="border-[rgb(182_199_234)] bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-[rgb(58_74_128)]">
            <Plus size={18} aria-hidden />
            新建班级
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleCreate(e)} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[8rem] flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-600">班级名称</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：大一班"
                className="border-[rgb(182_199_234)]"
              />
            </div>
            <div className="w-full min-w-[6rem] space-y-1 sm:w-36">
              <label className="text-xs font-medium text-slate-600">学段</label>
              <select
                value={gradeBand}
                onChange={(e) => setGradeBand(e.target.value)}
                className="h-10 w-full rounded-md border border-[rgb(182_199_234)] bg-white px-2 text-sm"
              >
                {gradeOptions.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[8rem] flex-1 space-y-1">
              <label className="text-xs font-medium text-slate-600">学年（可选）</label>
              <Input
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                placeholder="2025-2026"
                className="border-[rgb(182_199_234)]"
              />
            </div>
            <label className="flex min-w-[10rem] cursor-pointer items-center gap-2 text-sm text-slate-700 sm:pb-1">
              <input
                type="checkbox"
                className="rounded border-[rgb(182_199_234)]"
                checked={teacherVisibleNew}
                onChange={(e) => {
                  const v = e.target.checked;
                  setTeacherVisibleNew(v);
                  if (!v) setDefaultForTeacherNew(false);
                }}
              />
              <span className="text-xs leading-tight">在教师端展示</span>
            </label>
            <label className="flex min-w-[10rem] cursor-pointer items-center gap-2 text-sm text-slate-700 sm:pb-1">
              <input
                type="checkbox"
                className="rounded border-[rgb(182_199_234)]"
                checked={defaultForTeacherNew}
                onChange={(e) => {
                  const v = e.target.checked;
                  setDefaultForTeacherNew(v);
                  if (v) setTeacherVisibleNew(true);
                }}
              />
              <span className="text-xs leading-tight">设为默认班级</span>
            </label>
            <Button
              type="submit"
              disabled={creating || !name.trim()}
              className="h-10 shrink-0 bg-[rgb(90_108_158)] hover:bg-[rgb(74_90_138)]"
            >
              {creating ? "创建中…" : "创建"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-[rgb(182_199_234)] bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[rgb(58_74_128)]">班级列表</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">加载中…</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">暂无班级，请先创建</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 py-3 sm:flex-nowrap">
                  <label className="flex shrink-0 cursor-pointer flex-col items-center gap-0.5 px-1 text-center">
                    <input
                      type="checkbox"
                      title="在教师端展示"
                      checked={c.teacherVisible}
                      onChange={async (e) => {
                        const next = e.target.checked;
                        try {
                          await adminUpdateClass(c.id, { teacherVisible: next });
                          await load();
                        } catch (err) {
                          showAlert(err instanceof Error ? err.message : "更新失败");
                        }
                      }}
                      className="rounded border-[rgb(182_199_234)]"
                    />
                    <span className="text-[10px] leading-none text-slate-500">教师端</span>
                  </label>
                  <div className="flex shrink-0 flex-col items-center gap-1 px-1">
                    {c.defaultForTeacher ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                        默认
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      title={c.teacherVisible ? "设为教师端与家长端默认班级" : "请先勾选在教师端展示"}
                      disabled={!c.teacherVisible}
                      className="h-7 px-1.5 text-[10px] font-medium text-[rgb(90_108_158)] disabled:opacity-40"
                      onClick={async () => {
                        try {
                          await adminUpdateClass(c.id, { defaultForTeacher: true });
                          await load();
                        } catch (err) {
                          showAlert(err instanceof Error ? err.message : "设置失败");
                        }
                      }}
                    >
                      设默认
                    </Button>
                  </div>
                  <Link
                    to={`/admin/classes/${c.id}`}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-1 pr-1 transition-colors hover:bg-slate-50 sm:py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">
                        {gradeLabel(c.gradeBand)}
                        {c.schoolYear ? ` · ${c.schoolYear}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-sm text-slate-600">
                      <Users size={16} className="text-[rgb(90_108_158)]" aria-hidden />
                      <span>{c.childCount} 人</span>
                      <ChevronRight size={18} className="text-slate-400" aria-hidden />
                    </div>
                  </Link>
                  <div className="flex w-full shrink-0 justify-end gap-1 border-t border-slate-100 pt-2 sm:ml-auto sm:w-auto sm:border-0 sm:pt-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 px-2 text-[rgb(90_108_158)]"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil size={14} aria-hidden />
                      编辑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 px-2 text-rose-600 hover:text-rose-700"
                      onClick={() => void handleDelete(c)}
                    >
                      <Trash2 size={14} aria-hidden />
                      删除
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {editing ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-edit-class-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[rgb(182_199_234)] bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h2 id="admin-edit-class-title" className="text-lg font-semibold text-slate-800">
                编辑班级
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
                <label className="text-xs font-medium text-slate-600">班级名称</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border-[rgb(182_199_234)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">学段</label>
                <select
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  className="h-10 w-full rounded-md border border-[rgb(182_199_234)] bg-white px-2 text-sm"
                >
                  {gradeOptions.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">学年（留空表示不填）</label>
                <Input
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  placeholder="2025-2026"
                  className="border-[rgb(182_199_234)]"
                />
              </div>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-[rgb(182_199_234)]"
                  checked={editTeacherVisible}
                  onChange={(e) => setEditTeacherVisible(e.target.checked)}
                />
                <span>
                  <span className="font-medium">在教师端展示</span>
                  <span className="mt-0.5 block text-xs text-slate-500">关闭后教师端不再列出该班</span>
                </span>
              </label>
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
