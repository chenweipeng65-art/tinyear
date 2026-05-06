import { useEffect, useState } from "react";
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { LogOut, LayoutGrid } from "lucide-react";
import { APP_LOGO_URL } from "@/lib/branding";
import { adminLogout, adminMe } from "@/lib/api/adminApi";

const headerBar =
  "flex items-center justify-between gap-3 rounded-b-3xl bg-[rgb(90_108_158)] px-4 py-3.5 shadow-sm sm:px-5 sm:py-4";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [teacher, setTeacher] = useState<{ displayName: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await adminMe();
      if (cancelled) return;
      setTeacher(me);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(248_250_252)] text-sm text-slate-600">
        加载中…
      </div>
    );
  }

  if (!teacher) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[rgb(248_250_252)]">
      <header className="sticky top-0 z-10 bg-[rgb(248_250_252)]">
        <div className="mx-auto max-w-5xl px-3 sm:px-4">
          <div className={headerBar}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/90" aria-hidden>
                <img src={APP_LOGO_URL} alt="" className="h-8 w-8 object-contain" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-white sm:text-xl">管理端</p>
                <p className="truncate text-xs text-white/85 sm:text-sm">{teacher.displayName}</p>
              </div>
            </div>
            <nav className="flex shrink-0 items-center gap-2 sm:gap-3">
              <NavLink
                to="/admin/classes"
                className={({ isActive }) =>
                  cnLink(isActive)
                }
              >
                <LayoutGrid size={16} className="sm:hidden" aria-hidden />
                <span className="hidden sm:inline">班级管理</span>
                <span className="sm:hidden">班级</span>
              </NavLink>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-white/95 transition-colors hover:bg-white/10 sm:px-3"
              >
                <LogOut size={18} strokeWidth={2} aria-hidden />
                退出
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 px-3 py-4 md:px-5 md:py-6">
        <div className="mx-auto max-w-4xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function cnLink(active: boolean) {
  return [
    "flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors sm:px-3",
    active ? "bg-white/20 text-white" : "text-white/90 hover:bg-white/10 hover:text-white",
  ].join(" ");
}
