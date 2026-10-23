"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { cn } from "./ui";
import { tr } from "@/lib/i18n";

type Tone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  tone: Tone;
  title: string;
  text?: string;
}

interface ToastApi {
  success: (title: string, text?: string) => void;
  error: (title: string, text?: string) => void;
  info: (title: string, text?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (tone: Tone, title: string, text?: string) => {
      const id = ++seq.current;
      setItems((l) => [...l.slice(-3), { id, tone, title, text }]);
      setTimeout(() => dismiss(id), tone === "error" ? 6000 : 3500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, x) => push("success", t, x),
      error: (t, x) => push("error", t, x),
      info: (t, x) => push("info", t, x),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:right-6 lg:bottom-6 lg:left-auto lg:items-end">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="toast-in glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line p-3.5 shadow-card"
          >
            <span
              className={cn(
                "mt-0.5 shrink-0",
                t.tone === "success" && "text-good",
                t.tone === "error" && "text-brand",
                t.tone === "info" && "text-[var(--chart-profit)]",
              )}
            >
              {t.tone === "success" ? <CheckCircle2 className="size-5" /> : t.tone === "error" ? <XCircle className="size-5" /> : <Info className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">{t.title}</div>
              {t.text && <div className="mt-0.5 text-xs text-muted">{t.text}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} className="cursor-pointer text-muted hover:text-ink" aria-label={tr("Пӯшидан")}>
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
