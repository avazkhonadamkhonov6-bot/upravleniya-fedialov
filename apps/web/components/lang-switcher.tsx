"use client";

import { LANGS, tr, useLang } from "@/lib/i18n";
import { cn } from "./ui";

/** Ивази забон: ТҶ / RU / EN — се тугма дар як қатор (дизайни FilialHub) */
export function LangSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div className={className ?? "relative"}>
      <div role="group" aria-label={tr("Забон")} className="flex gap-0.5 rounded-[14px] bg-surface-2 p-1">
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            aria-pressed={l.code === lang}
            title={l.label}
            className={cn(
              "h-8 cursor-pointer rounded-[10px] px-2 text-[11px] font-bold transition sm:h-9 sm:px-2.5 sm:text-xs",
              l.code === lang ? "bg-ink text-bg" : "text-ink hover:bg-surface",
            )}
          >
            {l.code === "tg" ? "ТҶ" : l.short}
          </button>
        ))}
      </div>
    </div>
  );
}
