import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { User, KeyRound, School } from "lucide-react";
import { APP_LOGO_URL } from "@/lib/branding";
import { parentVerifyLogin } from "@/lib/api/parentAuth";
import { fetchClasses } from "@/lib/api/readData";
import type { SchoolClassDto } from "@/lib/api/types";

const PARENT_CLASS_PICK_KEY = "parent_login_selected_class_id";

export default function ParentLogin() {
  const navigate = useNavigate();
  const [classList, setClassList] = useState<SchoolClassDto[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classId, setClassId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setClassesLoading(true);
      try {
        const { items } = await fetchClasses();
        if (cancelled) return;
        setClassList(items);
        let stored: string | null = null;
        try {
          stored = sessionStorage.getItem(PARENT_CLASS_PICK_KEY);
        } catch {
          stored = null;
        }
        const storedNum = stored != null ? Number.parseInt(stored, 10) : NaN;
        const validStored = Number.isFinite(storedNum) && items.some((c) => c.id === storedNum);
        const def = items.find((c) => c.defaultForTeacher) ?? items[0];
        const next = validStored ? storedNum : def != null ? def.id : null;
        setClassId(next);
      } catch {
        if (!cancelled) {
          setClassList([]);
          setClassId(null);
        }
      } finally {
        if (!cancelled) setClassesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const n = name.trim();
    const six = idCard.replace(/\D/g, "").slice(0, 6);
    if (!n || six.length !== 6) {
      setError("请输入幼儿姓名与 6 位身份证后六位");
      return;
    }
    if (classList.length === 0) {
      setError("暂无在园内向家长开放的班级，请联系园所管理员");
      return;
    }
    if (classId == null) {
      setError("请选择幼儿所在班级");
      return;
    }
    setLoading(true);
    try {
      const { displayName, classId: resolvedClassId } = await parentVerifyLogin(n, six, classId);
      sessionStorage.setItem("parent_student_name", displayName);
      sessionStorage.setItem("parent_class_id", String(resolvedClassId));
      sessionStorage.setItem("parent_id_card_last_six", six);
      try {
        sessionStorage.setItem(PARENT_CLASS_PICK_KEY, String(classId));
      } catch {
        /* ignore */
      }
      navigate("/parent/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-3 sm:p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto bg-white rounded-lg flex items-center justify-center border-2 border-sky-100 mb-4">
            <img src={APP_LOGO_URL} alt="" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">家长端登录</h1>
          <p className="text-slate-500 text-sm">欢迎来到幼儿一对一倾听系统</p>
        </div>

        <Card className="border-sky-100">
          <CardContent className="pt-4">
            <form onSubmit={(e) => void handleLogin(e)} className="space-y-4">
              {error ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <School size={16} className="text-sky-500" />
                  幼儿所在班级
                </label>
                <select
                  value={classId != null ? String(classId) : ""}
                  disabled={classesLoading || classList.length === 0}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v)) {
                      setClassId(v);
                      try {
                        sessionStorage.setItem(PARENT_CLASS_PICK_KEY, String(v));
                      } catch {
                        /* ignore */
                      }
                    }
                  }}
                  className="h-11 w-full rounded-md border border-sky-200 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:border-sky-400 focus-visible:ring-2 focus-visible:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                  aria-label="选择幼儿所在班级"
                >
                  {classesLoading ? (
                    <option value="">正在加载班级…</option>
                  ) : classList.length === 0 ? (
                    <option value="">暂无开放班级</option>
                  ) : (
                    classList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.defaultForTeacher ? "（默认）" : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <User size={16} className="text-sky-500" />
                  幼儿姓名
                </label>
                <Input
                  placeholder="请输入幼儿姓名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="focus-visible:border-sky-400 focus-visible:ring-sky-100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <KeyRound size={16} className="text-sky-500" />
                  身份证后六位
                </label>
                <Input
                  type="password"
                  placeholder="请输入身份证后六位"
                  maxLength={6}
                  inputMode="numeric"
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="focus-visible:border-sky-400 focus-visible:ring-sky-100"
                />
                <p className="text-xs text-slate-400">
                  首次登录将保存后六位用于后续校验；须与园方登记信息一致。
                </p>
              </div>

              <Button type="submit" disabled={loading} className="h-12 w-full rounded-md text-base">
                {loading ? "校验中…" : "登录查看档案"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
