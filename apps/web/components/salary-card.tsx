"use client";

import { nextPayDate, type User } from "@filialhub/shared";
import { CalendarCheck, PiggyBank } from "lucide-react";
import { useNow } from "@/lib/use-now";
import { locale, tr } from "@/lib/i18n";
import { Card, CardTitle, money } from "./ui";

const DAY = 86400000;

/** Маош ва кай гирифтани он: санаи навбатӣ, чанд рӯз монд ва се моҳи оянда. */
export function SalaryCard({ user }: { user: User }) {
  const now = useNow(3600000);
  const today = new Date(now);
  const next = nextPayDate(user.payDay, today);
  const prev = nextPayDate(user.payDay, new Date(next.getFullYear(), next.getMonth() - 1, 1));
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysLeft = Math.round((next.getTime() - start.getTime()) / DAY);
  const span = Math.max(Math.round((next.getTime() - prev.getTime()) / DAY), 1);
  const progress = Math.min(Math.max(1 - daysLeft / span, 0), 1);
  const upcoming = [1, 2, 3].map((k) => nextPayDate(user.payDay, new Date(next.getFullYear(), next.getMonth() + k, 1)));
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }) => d.toLocaleDateString(locale(), opts);

  return (
    <Card className="overflow-hidden">
      <CardTitle extra={<PiggyBank className="size-5 text-brand" />}>{tr("Маош")}</CardTitle>
      <div className="text-3xl font-extrabold tracking-tight text-ink">{money(user.salary)}</div>
      <div className="mt-1 text-sm text-muted">{tr("дар як моҳ · ҳар моҳ рӯзи {0}", user.payDay)}</div>

      <div className="mt-5 rounded-2xl bg-brand-soft p-4">
        <div className="flex items-center gap-3">
          <span className="brand-gradient grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-lg shadow-red-500/25">
            <CalendarCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wide text-brand uppercase">{tr("Маоши навбатӣ")}</div>
            <div className="text-lg leading-tight font-bold text-ink">{fmt(next)}</div>
            <div className="text-xs text-muted capitalize">{fmt(next, { weekday: "long" })}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-extrabold text-brand">{daysLeft}</div>
            <div className="text-[11px] font-medium text-muted">{daysLeft === 0 ? tr("имрӯз!") : tr("рӯз монд")}</div>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="brand-gradient h-full rounded-full transition-[width] duration-700" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-muted">
          <span>{fmt(prev)}</span>
          <span>{fmt(next)}</span>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {upcoming.map((d) => (
          <li key={d.toISOString()} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
            <span className="text-ink-2">{fmt(d, { day: "numeric", month: "long", year: "numeric" })}</span>
            <span className="font-semibold text-ink">{money(user.salary)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
