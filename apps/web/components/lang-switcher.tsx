"use client";

import { Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LANGS, tr, useLang } from "@/lib/i18n";
import { cn } from "./ui";

/** Тугмаи ивази забон: Тоҷикӣ / Русский / English */
export function LangSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const currentLang = LANGS.find((l) => l.code === lang) ?? LANGS[0];
  return (
    <div ref={ref} className={className ?? "relative"}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-ink-2 transition hover:bg-surface-2"
        aria-label={tr("Забон")}
        aria-expanded={open}
        title={tr("Забон")}
      >
        <Languages className="size-5" />
        <span className="text-xs">{currentLang.short}</span>
      </button>
      {open && (
        <div className="rise absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-line bg-surface p-1 shadow-xl">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setOpen(false);
                setLang(l.code);
              }}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-surface-2",
                l.code === lang ? "font-semibold text-brand" : "text-ink-2",
              )}
            >
              {l.label}
              <span className="text-xs text-muted">{l.short}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
