"use client";

import type { AttendanceSummary, CustomerStats, Shift, Task } from "@filialhub/shared";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { qs } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useNow } from "@/lib/use-now";
import { PriorityBadge, SEGMENT_STYLE } from "./crm";
import { timeOf } from "./shift-button";
import { Avatar, Card, CardTitle, Empty, Skeleton, cn } from "./ui";
import { tr, locale } from "@/lib/i18n";
import { Glyph, Iconized } from "./glyph";

function More({ href, label = tr("Ҳама") }: { href: string; label?: string }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
      {label} <ArrowUpRight className="size-3.5" />
    </Link>
  );
}

export function AttendanceWidget({ branchId }: { branchId?: number }) {
  const { data } = useApi<{ summary: AttendanceSummary; shifts: Shift[] }>(`/shifts/today${qs({ branchId })}`);
  const s = data?.summary;
  const pct = s && s.planned ? Math.round(((s.onShift + s.done) / s.planned) * 100) : 0;
  return (
    <Card>
      <CardTitle extra={<More href="/schedule" label={tr("Ҷадвал")} />}>{tr("🗓 Давомоти имрӯз")}</CardTitle>
      {!s ? (
        <Skeleton className="h-40" />
      ) : s.planned === 0 ? (
        <Empty icon="🌴" title={tr("Имрӯз смена нест")} />
      ) : (
        <>
          <div className="flex items-end gap-3">
            <div className="text-4xl font-extrabold text-ink tabular">{s.onShift}</div>
            <div className="pb-1 text-sm text-muted">{tr("аз")}{" "}{s.planned} {tr("нафар дар кор")}</div>
          </div>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-good" style={{ width: `${(s.onShift / s.planned) * 100}%` }} />
            <div className="h-full bg-ink-2/40" style={{ width: `${(s.done / s.planned) * 100}%` }} />
          </div>
          <div className="mt-2 text-xs text-muted">{pct}{tr("% омаданд")}</div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ["⏰", s.late, tr("дер")],
              ["🚫", s.absent, tr("наомад")],
              ["🏁", s.done, tr("тамом")],
            ].map(([e, v, l]) => (
              <div key={String(l)} className="rounded-xl bg-surface-2 p-2">
                <div className="flex justify-center text-muted"><Glyph e={String(e)} className="size-4" /></div>
                <div className="text-lg font-bold text-ink tabular">{v}</div>
                <div className="text-[11px] text-muted">{l}</div>
              </div>
            ))}
          </div>
          {data.shifts.filter((x) => x.lateMinutes > 0).length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {data.shifts
                .filter((x) => x.lateMinutes > 0)
                .slice(0, 3)
                .map((x) => (
                  <li key={x.id} className="flex items-center gap-2 text-xs">
                    <Avatar name={x.userName} size={22} />
                    <span className="flex-1 truncate text-ink-2">{x.userName}</span>
                    <span className="font-semibold text-warn">+{x.lateMinutes} {tr("дақ")}</span>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

export function TasksWidget({ branchId, mine }: { branchId?: number; mine?: boolean }) {
  const { data } = useApi<Task[]>(`/tasks${qs({ branchId, mine: mine || undefined })}`);
  const open = (data ?? []).filter((t) => t.status !== "DONE");
  const overdue = open.filter((t) => t.overdue).length;
  return (
    <Card>
      <CardTitle extra={<More href="/tasks" />}>{tr("📋 Вазифаҳои кушода")}</CardTitle>
      {!data ? (
        <Skeleton className="h-40" />
      ) : open.length === 0 ? (
        <Empty icon="🎉" title={tr("Ҳамаи вазифаҳо иҷро шудаанд")} />
      ) : (
        <>
          <div className="mb-3 flex gap-2 text-xs font-semibold">
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-ink-2">{open.length} {tr("кушода")}</span>
            {overdue > 0 && <span className="rounded-full bg-brand-soft px-2.5 py-1 text-brand">{overdue} {tr("мӯҳлаташ гузашт")}</span>}
          </div>
          <ul className="space-y-2">
            {open.slice(0, 5).map((t) => (
              <li key={t.id} className={cn("flex items-center gap-3 rounded-xl border border-line p-2.5", t.overdue && "border-brand/40")}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">{t.title}</div>
                  <div className="truncate text-xs text-muted">
                    {t.assignee?.fullName ?? tr("Бе иҷрокунанда")}
                    {t.status === "IN_PROGRESS" && <Iconized text={tr(" · ⚡ дар раванд")} />}
                  </div>
                </div>
                <PriorityBadge priority={t.priority} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export function CustomersWidget({ branchId }: { branchId?: number }) {
  const { data } = useApi<CustomerStats>(`/customers/stats${qs({ branchId })}`);
  return (
    <Card>
      <CardTitle extra={<More href="/customers" />}>{tr("💝 Мизоҷон")}</CardTitle>
      {!data ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <div className="flex items-end gap-3">
            <div className="text-4xl font-extrabold text-ink tabular">{data.total}</div>
            <div className="pb-1 text-sm text-muted">+{data.newThisMonth} {tr("дар ин моҳ")}</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(Object.keys(SEGMENT_STYLE) as (keyof typeof SEGMENT_STYLE)[]).map((s) => (
              <div key={s} className="flex items-center gap-2 rounded-xl bg-surface-2 p-2.5">
                <span className="text-ink-2"><Glyph e={SEGMENT_STYLE[s].emoji} className="size-4" /></span>
                <span className="text-lg font-bold text-ink tabular">{data.bySegment[s]}</span>
                <span className="truncate text-xs text-muted">{s === "VIP" ? "VIP" : s === "REGULAR" ? tr("доимӣ") : s === "NEW" ? tr("нав") : tr("хоб")}</span>
              </div>
            ))}
          </div>
          {data.birthdaysThisWeek.length > 0 && (
            <div className="mt-3 rounded-xl bg-warn-soft p-2.5 text-xs font-semibold text-warn">
              <Glyph e="🎂" className="mr-1 inline size-3.5 -mt-0.5" />{data.birthdaysThisWeek.length} {tr("зодрӯз дар 7 рӯз:")}{" "}{data.birthdaysThisWeek.slice(0, 2).map((b) => b.fullName.split(" ")[0]).join(", ")}
              {data.birthdaysThisWeek.length > 2 && " …"}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export function MyShiftsWidget() {
  const { data } = useApi<Shift[]>("/shifts");
  const now = useNow();
  const upcoming = (data ?? []).filter((s) => new Date(s.endsAt).getTime() > now).slice(0, 4);
  return (
    <Card>
      <CardTitle extra={<More href="/schedule" label={tr("Ҷадвал")} />}>{tr("🗓 Сменаҳои наздик")}</CardTitle>
      {!data ? (
        <Skeleton className="h-32" />
      ) : upcoming.length === 0 ? (
        <Empty icon="🌴" title={tr("Дар ин ҳафта дигар смена нест")} />
      ) : (
        <ul className="space-y-2">
          {upcoming.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-xl bg-surface-2 p-3 text-sm">
              <span className="font-semibold text-ink capitalize">
                {new Date(s.startsAt).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "short" })}
              </span>
              <span className="font-bold text-ink-2 tabular">
                {timeOf(s.startsAt)}–{timeOf(s.endsAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
