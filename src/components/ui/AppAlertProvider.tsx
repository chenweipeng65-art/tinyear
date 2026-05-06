"use client";

import * as React from "react";
import { AlertDialog } from "radix-ui";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type AppAlertContextValue = {
  showAlert: (message: string) => void;
};

const AppAlertContext = React.createContext<AppAlertContextValue | null>(null);

export function useAppAlert(): (message: string) => void {
  const ctx = React.useContext(AppAlertContext);
  if (!ctx) {
    throw new Error("useAppAlert 必须在 AppAlertProvider 内使用");
  }
  return ctx.showAlert;
}

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");

  const showAlert = React.useCallback((msg: string) => {
    setMessage(msg);
    setOpen(true);
  }, []);

  const value = React.useMemo(() => ({ showAlert }), [showAlert]);

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      <AlertDialog.Root open={open} onOpenChange={setOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay
            className={cn(
              "fixed inset-0 z-[320] bg-slate-900/45 backdrop-blur-[2px]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            )}
          />
          <AlertDialog.Content
            className={cn(
              "fixed left-1/2 top-1/2 z-[321] w-[min(calc(100vw-2rem),22rem)] max-h-[min(70vh,24rem)] -translate-x-1/2 -translate-y-1/2",
              "rounded-2xl border border-[rgb(65_100_170/0.22)] bg-[rgb(252_253_255)] shadow-[0_24px_48px_-12px_rgb(65_100_170/0.25)]",
              "outline-none focus:outline-none",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            )}
          >
            <div className="flex gap-3 border-b border-[rgb(65_100_170/0.12)] px-5 py-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(182_199_234/0.55)] text-[rgb(65_100_170)]"
                aria-hidden
              >
                <Info className="size-5" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <AlertDialog.Title className="text-base font-semibold leading-snug text-[rgb(48_62_108)]">
                  提示
                </AlertDialog.Title>
                <AlertDialog.Description className="mt-2 max-h-[min(40vh,14rem)] overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-[rgb(58_74_128)]/95">
                  {message}
                </AlertDialog.Description>
              </div>
            </div>
            <div className="flex justify-end px-4 py-3">
              <AlertDialog.Action asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-9 min-w-[5.5rem] items-center justify-center rounded-lg px-4 text-sm font-medium text-white",
                    "border-0 bg-[rgb(145_172_224)] shadow-sm transition-colors",
                    "hover:bg-[rgb(125_155_210)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(65_100_170)]/35",
                  )}
                >
                  知道了
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </AppAlertContext.Provider>
  );
}
