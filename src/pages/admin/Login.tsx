import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { User, KeyRound } from "lucide-react";
import { APP_LOGO_URL } from "@/lib/branding";
import { adminLogin } from "@/lib/api/adminApi";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/admin/classes";
  const [loginIdentifier, setLoginIdentifier] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await adminLogin(loginIdentifier.trim(), password);
      navigate(from.startsWith("/admin") ? from : "/admin/classes", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[rgb(248_250_252)] p-3 sm:p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="space-y-2 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-xl border-2 border-[rgb(182_199_234)] bg-white">
            <img src={APP_LOGO_URL} alt="" className="h-12 w-12 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">管理端登录</h1>
          <p className="text-sm text-slate-500">使用教师账号（Teacher 表）登录</p>
        </div>

        <Card className="border-[rgb(182_199_234)]">
          <CardContent className="pt-6">
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              {error ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
              ) : null}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <User size={16} className="text-[rgb(90_108_158)]" aria-hidden />
                  登录名
                </label>
                <Input
                  autoComplete="username"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="admin"
                  className="border-[rgb(182_199_234)]"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <KeyRound size={16} className="text-[rgb(90_108_158)]" aria-hidden />
                  密码
                </label>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="border-[rgb(182_199_234)]"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !loginIdentifier.trim() || !password}
                className="h-11 w-full rounded-lg bg-[rgb(90_108_158)] text-white hover:bg-[rgb(74_90_138)]"
              >
                {loading ? "登录中…" : "登录"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-slate-400">演示内置账号：admin / admin123（seed 写入）</p>
      </div>
    </div>
  );
}
