import { Outlet, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTeacherClass } from "@/lib/teacher/TeacherClassContext";
import {
  TEACHER_HEADER_SLOGAN,
  TEACHER_PAGE_TITLE_ANALYSIS,
  TEACHER_PAGE_TITLE_PORTFOLIO,
} from "@/lib/branding";
import navIconHome from "@/pages/icon/home.png";
import navIconHomeActive from "@/pages/icon/home2.png";
import navIconAi from "@/pages/icon/ai.png";
import navIconAiActive from "@/pages/icon/ai2.png";
import navIconDoc from "@/pages/icon/doc.png";
import navIconDocActive from "@/pages/icon/doc2.png";
import topIconHome from "@/pages/top/home.png";
import topIconAi from "@/pages/top/ai.png";
import topIconDoc from "@/pages/top/doc.png";

export default function TeacherLayout() {
  const location = useLocation();
  const { classes, selectedClassId, setSelectedClassId, loading: classListLoading } = useTeacherClass();

  const headerTitle =
    location.pathname === "/teacher/analysis"
      ? TEACHER_PAGE_TITLE_ANALYSIS
      : location.pathname === "/teacher/portfolio"
        ? TEACHER_PAGE_TITLE_PORTFOLIO
        : TEACHER_HEADER_SLOGAN;

  const headerLogoSrc =
    location.pathname === "/teacher/analysis"
      ? topIconAi
      : location.pathname === "/teacher/portfolio"
        ? topIconDoc
        : topIconHome;

  const navItems = [
    {
      name: "首页",
      path: "/teacher/home",
      iconSrc: navIconHome,
      iconSrcActive: navIconHomeActive,
    },
    {
      name: "AI分析",
      path: "/teacher/analysis",
      iconSrc: navIconAi,
      iconSrcActive: navIconAiActive,
    },
    {
      name: "成长档案",
      path: "/teacher/portfolio",
      iconSrc: navIconDoc,
      iconSrcActive: navIconDocActive,
    },
  ];

  const hasClasses = classes.length > 0;
  const selectValue = selectedClassId != null && hasClasses ? String(selectedClassId) : "";

  return (
    <div className="flex min-h-screen flex-col bg-[rgb(238_242_250)]">
      {/* Top Header：左/右/上贴边，底部保留 2xl 圆角 */}
      <header className="sticky top-0 z-20 w-full rounded-b-2xl border-b border-white/25 bg-[rgb(182_199_234)] shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex min-h-14 max-w-full min-w-0 items-center justify-center gap-3 sm:min-h-16">
            <img
              src={headerLogoSrc}
              alt=""
              className="h-11 w-11 shrink-0 rounded-md object-contain sm:h-12 sm:w-12"
            />
            <h1 className="text-center text-2xl font-normal leading-snug tracking-tight text-white sm:text-3xl">
              {headerTitle}
            </h1>
          </div>

          {!classListLoading ? (
            <div className="flex w-full justify-end pb-0.5">
              <select
                id="teacher-class-select"
                value={selectValue}
                disabled={!hasClasses}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setSelectedClassId(v);
                }}
                className={cn(
                  "rounded-lg border border-white/55 py-2 text-sm font-medium shadow-sm outline-none transition-[box-shadow,opacity]",
                  "bg-[rgb(182_199_234)] text-white text-right [text-align-last:right]",
                  "focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0",
                  "disabled:cursor-not-allowed disabled:opacity-75",
                  hasClasses ? "w-36 px-2 sm:w-44" : "ml-auto w-full max-w-sm px-3",
                )}
                aria-label="选择班级"
              >
                {!hasClasses ? (
                  <option value="" className="bg-white text-slate-800">
                    暂无可选班级，请在管理端勾选「在教师端展示」
                  </option>
                ) : (
                  classes.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white text-slate-900">
                      {c.name}
                      {c.defaultForTeacher ? "（默认）" : ""}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : null}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-3 py-2 pb-24 md:px-5 md:py-3">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50">
        <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                  isActive
                    ? "text-[rgb(58_74_128)]"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <img
                  src={isActive ? item.iconSrcActive : item.iconSrc}
                  alt=""
                  className="h-6 w-6 object-contain transition-opacity duration-200"
                />
                <span className="text-[11px] font-medium">{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
