"use client";

import { CalendarClock } from "lucide-react";
import { dayKey, dueInfo } from "@/lib/due";
import { tr } from "@/lib/i18n";
import { cn, Input } from "./ui";

const QUICK = [
  { days: 7, label: "1 ҳафта" },
  { days: 14, label: "2 ҳафта" },
  { days: 30, label: "1 моҳ" },
];

/** Мӯҳлати пардохти қарз: сана ё тугмаҳои зуд. Холӣ — бе мӯҳлат. */
export function DueField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink-2">
        <CalendarClock className="size-4" /> {tr("Мӯҳлати пардохт")}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {QUICK.map((q) => {
          const key = dayKey(q.days);
          return (
            <button
              key={q.days}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "h-9 cursor-pointer rounded-xl border px-3 text-xs font-semibold transition",
                value === key ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-2 hover:border-ink-2/40",
              )}
            >
              {tr(q.label)}
            </button>
          );
        })}
        <Input
          type="date"
          value={value}
          min={dayKey(0)}
          max={dayKey(366)}
          onChange={(e) => onChange(e.target.value)}
          aria-label={tr("Мӯҳлати пардохт")}
          className="h-9 w-auto min-w-0 flex-1 text-sm"
        />
      </div>
      <p className="mt-1 text-xs text-muted">
        {value ? `${dueInfo(value).label} · ${tr("рӯзи мӯҳлат ба мизоҷ ёдрас меравад")}` : tr("Бе мӯҳлат — танҳо ёдраси ҳарҳафтаина")}
        {value && (
          <button type="button" onClick={() => onChange("")} className="ml-2 cursor-pointer font-semibold text-brand hover:underline">
            {tr("Бе мӯҳлат")}
          </button>
        )}
      </p>
    </div>
  );
}

/** Нишони мӯҳлат дар рӯйхат: сурх — гузашт, зард — имрӯз, хокистарӣ — оянда */
export function DueBadge({ due, className }: { due: string | null; className?: string }) {
  if (!due) return null;
  const d = dueInfo(due);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        d.tone === "overdue" ? "bg-brand-soft text-brand" : d.tone === "today" ? "bg-warn-soft text-warn" : "bg-surface-2 text-muted",
        className,
      )}
    >
      <CalendarClock className="size-3" /> {d.label}
    </span>
  );
}
