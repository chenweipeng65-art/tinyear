import { Outlet, NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { APP_LOGO_URL, TEACHER_HEADER_SLOGAN } from "@/lib/branding";

const parentHeaderBar =
  "flex items-center justify-between gap-3 rounded-b-3xl bg-[rgb(182_200_238)] px-4 py-3.5 shadow-sm sm:px-5 sm:py-4";

const parentLogoShell =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgb(255_248_225)]";

export default function ParentLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-10 bg-white">
        <div className="mx-auto max-w-5xl px-3 sm:px-4">
          <div className={parentHeaderBar}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className={parentLogoShell} aria-hidden>
                <img
                  src={APP_LOGO_URL}
                  alt=""
                  className="h-8 w-8 object-contain"
                />
              </div>
              <h1 className="truncate text-xl font-medium leading-snug tracking-tight text-white sm:text-2xl">
                {TEACHER_HEADER_SLOGAN}
              </h1>
            </div>
            <NavLink
              to="/parent/login"
              className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-white/95 transition-colors hover:text-white"
            >
              <LogOut size={18} strokeWidth={2} aria-hidden />
              退出
            </NavLink>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-3 py-2 md:px-5 md:py-3">
        <div className="max-w-3xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
