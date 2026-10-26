"use client";

// Бахшҳои саҳифаи филиал: ҳар кадом танҳо маълумоти ҳамин филиалро мегирад (branchId).
// Ҳуқуқ дар API санҷида мешавад (scopeBranch): менеҷер филиали дигарро гирифта наметавонад.

import {
  EXPENSE_EMOJI,
  EXPENSE_LABELS,
  POSITION_EMOJI,
  SHIFT_STATE_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type Customer,
  type Expense,
  type Order,
  type Paginated,
  type ProfitAndLoss,
  type Shift,
  type Task,
} from "@filialhub/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { AttendanceWidget, CustomersWidget } from "./crm-widgets";
import { PriorityBadge, SegmentBadge } from "./crm";
import { Avatar, Badge, Button, Card, CardTitle, Empty, ErrorBox, Skeleton, cn, formatDate, money } from "./ui";
import { qs } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { tr, locale } from "@/lib/i18n";

function Pager({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3 text-sm text-muted">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label={tr("Пештар")}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className="tabular">
        {page} / {pages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label={tr("Баъдӣ")}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

const th = "px-3 py-3 font-semibold";
const MONTHS = ["Январ", "Феврал", "Март", "Апрел", "Май", "Июн", "Июл", "Август", "Сентябр", "Октябр", "Ноябр", "Декабр"];
const month = (m: string) => `${tr(MONTHS[Number(m.slice(5, 7)) - 1])} ${m.slice(0, 4)}`;
const td = "px-3 py-3";

/** Фоида, хароҷот ва фоидаи соф аз рӯи моҳҳо + рӯйхати хароҷот */
export function BranchMoneyTab({ branchId }: { branchId: number }) {
  const [page, setPage] = useState(1);
  const { data: pnl, error: pnlError } = useApi<ProfitAndLoss[]>(`/expenses/pnl${qs({ branchId, months: 6 })}`);
  const { data: list, error } = useApi<Paginated<Expense> & { sum: number }>(`/expenses${qs({ branchId, page })}`);

  return (
    <div className="space-y-6">
      <Card className="p-0">
        <div className="px-5 pt-5">
          <CardTitle>{tr("Фоида ва хароҷот аз рӯи моҳҳо")}</CardTitle>
        </div>
        <ErrorBox message={pnlError} />
        {!pnl ? (
          <Skeleton className="m-5 h-48" />
        ) : (
          <div className="overflow-x-auto p-2">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted uppercase">
                  <th className={th}>{tr("Моҳ")}</th>
                  <th className={cn(th, "text-right")}>{tr("Фурӯш")}</th>
                  <th className={cn(th, "text-right")}>{tr("Арзиши аслӣ")}</th>
                  <th className={cn(th, "text-right")}>{tr("Фоида")}</th>
                  <th className={cn(th, "text-right")}>{tr("Хароҷот")}</th>
                  <th className={cn(th, "text-right")}>{tr("Фоидаи соф")}</th>
                </tr>
              </thead>
              <tbody>
                {pnl
                  .filter((p) => p.revenue > 0 || p.expenses > 0)
                  .reverse()
                  .map((p) => (
                  <tr key={p.month} className="border-t border-line hover:bg-surface-2">
                    <td className={cn(td, "font-semibold text-ink")}>{month(p.month)}</td>
                    <td className={cn(td, "text-right text-ink-2 tabular")}>{money(p.revenue)}</td>
                    <td className={cn(td, "text-right text-muted tabular")}>{money(p.cost)}</td>
                    <td className={cn(td, "text-right tabular")} style={{ color: "var(--chart-profit)" }}>{money(p.grossProfit)}</td>
                    <td className={cn(td, "text-right text-warn tabular")}>{money(p.expenses)}</td>
                    <td className={cn(td, "text-right font-bold tabular", p.netProfit < 0 ? "text-brand" : "text-good")}>{money(p.netProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-0">
        <div className="flex items-center justify-between px-5 pt-5">
          <CardTitle>{tr("Хароҷоти филиал")}</CardTitle>
          {list && <span className="text-sm font-bold text-ink tabular">{money(list.sum)}</span>}
        </div>
        <ErrorBox message={error} />
        {!list ? (
          <Skeleton className="m-5 h-48" />
        ) : list.items.length === 0 ? (
          <Empty icon="🧾" title={tr("Хароҷот нест")} />
        ) : (
          <div className="overflow-x-auto p-2">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted uppercase">
                  <th className={th}>{tr("Сана")}</th>
                  <th className={th}>{tr("Категория")}</th>
                  <th className={th}>{tr("Эзоҳ")}</th>
                  <th className={cn(th, "text-right")}>{tr("Маблағ")}</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((e) => (
                  <tr key={e.id} className="border-t border-line hover:bg-surface-2">
                    <td className={cn(td, "whitespace-nowrap text-ink-2 tabular")}>{formatDate(e.date)}</td>
                    <td className={cn(td, "font-semibold whitespace-nowrap text-ink")}>
                      {EXPENSE_EMOJI[e.category]} {tr(EXPENSE_LABELS[e.category])}
                    </td>
                    <td className={cn(td, "text-muted")}>{e.note || "—"}</td>
                    <td className={cn(td, "text-right font-bold whitespace-nowrap text-ink tabular")}>{money(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list && <Pager page={page} total={list.total} pageSize={list.pageSize} onChange={setPage} />}
      </Card>
    </div>
  );
}

/** Вазифаҳои филиал дар се сутун (Нав / Дар раванд / Тайёр) */
export function BranchTasksTab({ branchId }: { branchId: number }) {
  const { data, error } = useApi<Task[]>(`/tasks${qs({ branchId })}`);
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Skeleton className="h-64" />;
  if (data.length === 0) return <Empty icon="📋" title={tr("Дар ин филиал вазифа нест")} />;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {TASK_STATUSES.map((s) => {
        const items = data.filter((t) => t.status === s);
        return (
          <Card key={s}>
            <CardTitle extra={<Badge tone={s === "DONE" ? "good" : s === "IN_PROGRESS" ? "warn" : "neutral"}>{items.length}</Badge>}>
              {tr(TASK_STATUS_LABELS[s])}
            </CardTitle>
            {items.length === 0 ? (
              <p className="text-sm text-muted">—</p>
            ) : (
              <ul className="space-y-2">
                {items.map((t) => (
                  <li key={t.id} className={cn("rounded-xl border border-line p-3", t.overdue && "border-brand/40")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold text-ink">{t.title}</div>
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {t.assignee?.fullName ?? tr("Бе иҷрокунанда")}
                      {t.dueDate && ` · ${formatDate(t.dueDate)}`}
                      {t.overdue && <span className="font-semibold text-brand">{tr(" · мӯҳлаташ гузашт")}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/** Давомоти имрӯз ва сменаҳои 7 рӯзи гузашта ва 7 рӯзи оянда (навтаринҳо боло) */
export function BranchScheduleTab({ branchId }: { branchId: number }) {
  const [today] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const from = new Date(today.getTime() - 7 * 86_400_000);
  const to = new Date(today.getTime() + 8 * 86_400_000);
  const { data, error } = useApi<Shift[]>(`/shifts${qs({ branchId, from: from.toISOString(), to: to.toISOString() })}`);
  const tone = (s: Shift) => (s.state === "ON_SHIFT" || s.state === "DONE" ? "good" : s.state === "LATE" ? "warn" : s.state === "ABSENT" ? "brand" : "neutral");
  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <AttendanceWidget branchId={branchId} />
      <Card className="p-0">
        <div className="px-5 pt-5">
          <CardTitle>{tr("Сменаҳо: 7 рӯзи гузашта ва оянда")}</CardTitle>
        </div>
        <ErrorBox message={error} />
        {!data ? (
          <Skeleton className="m-5 h-48" />
        ) : data.length === 0 ? (
          <Empty icon="🌴" title={tr("Смена нест")} />
        ) : (
          <div className="overflow-x-auto p-2">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted uppercase">
                  <th className={th}>{tr("Рӯз")}</th>
                  <th className={th}>{tr("Корманд")}</th>
                  <th className={th}>{tr("Вақт")}</th>
                  <th className={th}>{tr("Ҳолат")}</th>
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((s) => (
                  <tr key={s.id} className="border-t border-line hover:bg-surface-2">
                    <td className={cn(td, "whitespace-nowrap text-ink-2 capitalize")}>
                      {new Date(s.startsAt).toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" })}
                    </td>
                    <td className={cn(td, "font-semibold text-ink")}>
                      {s.position ? POSITION_EMOJI[s.position] : "🧑‍💼"} {s.userName}
                    </td>
                    <td className={cn(td, "whitespace-nowrap text-ink-2 tabular")}>
                      {time(s.startsAt)}–{time(s.endsAt)}
                    </td>
                    <td className={td}>
                      <Badge tone={tone(s)}>
                        {tr(SHIFT_STATE_LABELS[s.state])}
                        {s.lateMinutes > 0 && ` +${s.lateMinutes} ${tr("дақ")}`}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/** Чекҳои охирини филиал */
export function BranchSalesTab({ branchId }: { branchId: number }) {
  const [page, setPage] = useState(1);
  const { data, error } = useApi<Paginated<Order>>(`/orders${qs({ branchId, page, pageSize: 15 })}`);
  return (
    <Card className="p-0">
      <div className="px-5 pt-5">
        <CardTitle>{tr("Фурӯшҳои филиал")}</CardTitle>
      </div>
      <ErrorBox message={error} />
      {!data ? (
        <Skeleton className="m-5 h-64" />
      ) : data.items.length === 0 ? (
        <Empty icon="🧾" title={tr("Фурӯш нест")} />
      ) : (
        <div className="overflow-x-auto p-2">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs tracking-wide text-muted uppercase">
                <th className={th}>№</th>
                <th className={th}>{tr("Сана")}</th>
                <th className={th}>{tr("Кассир")}</th>
                <th className={th}>{tr("Мизоҷ")}</th>
                <th className={cn(th, "text-right")}>{tr("Маблағ")}</th>
                <th className={cn(th, "text-right")}>{tr("Фоида")}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id} className="border-t border-line hover:bg-surface-2">
                  <td className={cn(td, "text-muted tabular")}>#{o.id}</td>
                  <td className={cn(td, "whitespace-nowrap text-ink-2 tabular")}>{formatDate(o.createdAt, true)}</td>
                  <td className={cn(td, "text-ink")}>{o.userName}</td>
                  <td className={cn(td, "text-muted")}>{o.customerName ?? "—"}</td>
                  <td className={cn(td, "text-right font-bold whitespace-nowrap text-ink tabular")}>{money(o.total)}</td>
                  <td className={cn(td, "text-right whitespace-nowrap tabular")} style={{ color: "var(--chart-profit)" }}>
                    {money(o.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pager page={page} total={data.total} pageSize={data.pageSize} onChange={setPage} />}
    </Card>
  );
}

/** Мизоҷони филиал: омор + рӯйхат аз рӯи харид */
export function BranchCustomersTab({ branchId }: { branchId: number }) {
  const [page, setPage] = useState(1);
  const { data, error } = useApi<Paginated<Customer>>(`/customers${qs({ branchId, sort: "spent", page })}`);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <CustomersWidget branchId={branchId} />
      <Card className="p-0">
        <div className="px-5 pt-5">
          <CardTitle>{tr("Мизоҷони филиал")}</CardTitle>
        </div>
        <ErrorBox message={error} />
        {!data ? (
          <Skeleton className="m-5 h-64" />
        ) : data.items.length === 0 ? (
          <Empty icon="💝" title={tr("Мизоҷ нест")} />
        ) : (
          <ul className="divide-y divide-line px-2 pb-2">
            {data.items.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-3">
                <Avatar name={c.fullName} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">{c.fullName}</div>
                  <div className="text-xs text-muted tabular">
                    {c.phone} · {c.visits} {tr("ташриф")}
                  </div>
                </div>
                <SegmentBadge segment={c.segment} />
                <div className="w-28 text-right text-sm font-bold text-ink tabular">{money(c.totalSpent)}</div>
              </li>
            ))}
          </ul>
        )}
        {data && <Pager page={page} total={data.total} pageSize={data.pageSize} onChange={setPage} />}
      </Card>
    </div>
  );
}
