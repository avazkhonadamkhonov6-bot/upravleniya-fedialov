"use client";

import {
  POSITION_EMOJI,
  POSITION_LABELS,
  POSITIONS,
  type Overview,
  type Period,
  type ProductRank,
  type TimePoint,
} from "@filialhub/shared";
import { CalendarDays, CalendarRange, Receipt, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import { qs } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { SalesChart } from "./charts-lazy";
import { Card, CardTitle, CountUp, Delta, Empty, ErrorBox, money, Segmented, Skeleton } from "./ui";
import { tr, locale } from "@/lib/i18n";

const PERIOD_OPTS: { value: Period; label: string }[] = [
  { value: "day", label: "Рӯзона" },
  { value: "week", label: "Ҳафтаина" },
  { value: "month", label: "Моҳона" },
];

function Kpi({
  icon,
  label,
  revenue,
  profit,
  orders,
  extra,
  accent,
  net,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  revenue: number;
  profit: number;
  orders: number;
  extra?: React.ReactNode;
  net?: number;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <div
      className={
        accent
          ? "rise relative overflow-hidden rounded-[20px] bg-[#170d0f] p-5 text-white shadow-card"
          : "rise card p-5"
      }
      style={{ animationDelay: `${delay}ms` }}
    >
      {accent && <div className="absolute -top-16 -right-16 size-48 rounded-full bg-[#e4002b] opacity-40 blur-3xl" />}
      <div className="relative flex items-center justify-between">
        <span className={accent ? "text-sm font-medium text-white/60" : "text-sm font-medium text-muted"}>{label}</span>
        <span className={accent ? "grid size-9 place-items-center rounded-xl bg-white/10" : "grid size-9 place-items-center rounded-xl bg-brand-soft text-brand"}>
          {icon}
        </span>
      </div>
      <div className="relative mt-3 text-2xl font-bold tracking-tight tabular sm:text-[26px]"><CountUp value={revenue} /></div>
      <div className="relative mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className={accent ? "text-white/80" : "text-ink-2"}>
          {tr("Фоида:")}{" "}<b className="tabular" style={{ color: accent ? "#8db8ff" : "var(--chart-profit)" }}><CountUp value={profit} /></b>
        </span>
        {net !== undefined && (
          <span className={accent ? "text-white/70" : "text-muted"}>
            {tr("соф:")}{" "}<b className={accent ? "text-white tabular" : "text-ink tabular"}><CountUp value={net} /></b>
          </span>
        )}
      </div>
      <div className={accent ? "relative mt-3 flex items-center justify-between text-xs text-white/50" : "relative mt-3 flex items-center justify-between text-xs text-muted"}>
        <span>{orders.toLocaleString(locale())} {tr("фармоиш")}</span>
        {extra}
      </div>
    </div>
  );
}

export function KpiRow({ overview }: { overview?: Overview }) {
  if (!overview) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[148px]" />
        ))}
      </div>
    );
  }
  const { today, yesterday, week, month } = overview;
  return (
    <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi accent icon={<Wallet className="size-4" />} label={tr("Имрӯз")} revenue={today.revenue} profit={today.profit} orders={today.orders} extra={<Delta now={today.revenue} prev={yesterday.revenue} />} />
      <Kpi icon={<Receipt className="size-4" />} label={tr("Дирӯз")} revenue={yesterday.revenue} profit={yesterday.profit} orders={yesterday.orders} delay={60} />
      <Kpi icon={<CalendarRange className="size-4" />} label={tr("Ин ҳафта")} revenue={week.revenue} profit={week.profit} net={week.netProfit} orders={week.orders} delay={120} />
      <Kpi icon={<CalendarDays className="size-4" />} label={tr("Ин моҳ")} revenue={month.revenue} profit={month.profit} net={month.netProfit} orders={month.orders} extra={<span>{tr("чеки миёна")}{" "}{money(month.avgCheck)}</span>} delay={180} />
    </div>
  );
}

export function SalesCard({ branchId, title = tr("Динамикаи фурӯш ва фоида") }: { branchId?: number; title?: string }) {
  const [g, setG] = useState<Period>("day");
  const { data, error } = useApi<TimePoint[]>(`/stats/timeseries${qs({ branchId, granularity: g })}`);
  const totals = data?.reduce((s, p) => ({ r: s.r + p.revenue, p: s.p + p.profit }), { r: 0, p: 0 });
  const span = { day: tr("30 рӯзи охир"), week: tr("12 ҳафтаи охир"), month: tr("12 моҳи охир") }[g];
  return (
    <Card>
      <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="text-sm text-muted">
            {span}
            {totals && (
              <>
                {tr("· фурӯш")}{" "}<b className="text-ink tabular">{money(totals.r)}</b> {tr("· фоида")}{" "}
                <b className="text-ink tabular">{money(totals.p)}</b>
              </>
            )}
          </p>
        </div>
        <Segmented value={g} onChange={setG} options={PERIOD_OPTS} />
      </div>
      <ErrorBox message={error} />
      {data ? <SalesChart data={data} granularity={g} /> : <Skeleton className="h-[320px]" />}
    </Card>
  );
}

export function TopProducts({ branchId }: { branchId?: number }) {
  const [period, setPeriod] = useState<Period>("month");
  const { data } = useApi<ProductRank[]>(`/stats/products${qs({ branchId, period })}`);
  const max = Math.max(...(data ?? []).map((d) => d.revenue), 1);
  return (
    <Card>
      <CardTitle
        extra={
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { value: "day", label: tr("Рӯз") },
              { value: "week", label: tr("Ҳафта") },
              { value: "month", label: tr("Моҳ") },
            ]}
          />
        }
      >
        {tr("Маҳсулоти беҳтарин")}
      </CardTitle>
      {!data ? (
        <Skeleton className="h-64" />
      ) : data.length === 0 ? (
        <Empty title={tr("Ҳоло фурӯш нест")} />
      ) : (
        <ul className="space-y-3">
          {data.map((p) => (
            <li key={p.productId} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-xl">{p.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-ink">{p.name}</span>
                  <span className="text-sm font-semibold text-ink tabular">{money(p.revenue)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${(p.revenue / max) * 100}%`, background: "var(--chart-revenue)" }} />
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted tabular">
                  <span>{p.qty} {tr("дона")}</span>
                  <span>{tr("фоида")}{" "}{money(p.profit)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function StaffBreakdown({ overview }: { overview?: Overview }) {
  if (!overview) return <Skeleton className="h-56" />;
  const max = Math.max(...POSITIONS.map((p) => overview.employeesByPosition[p]), 1);
  return (
    <Card>
      <CardTitle extra={<span className="text-2xl font-bold text-ink tabular">{overview.employees + overview.managers}</span>}>
        {tr("Кормандон")}
      </CardTitle>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-xl">🧑‍💼</span>
          <div className="flex-1 text-sm font-semibold text-ink">{tr("Менеҷерҳо")}</div>
          <span className="text-sm font-bold text-ink tabular">{overview.managers}</span>
        </div>
        {POSITIONS.map((p) => (
          <div key={p} className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-xl">{POSITION_EMOJI[p]}</span>
            <div className="flex-1">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-ink">{tr(POSITION_LABELS[p])}</span>
                <span className="font-bold text-ink tabular">{overview.employeesByPosition[p]}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-ink-2/60" style={{ width: `${(overview.employeesByPosition[p] / max) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="grid size-11 place-items-center rounded-2xl bg-surface-2 text-ink-2">{icon}</span>
      <div>
        <div className="text-xs font-medium text-muted">{label}</div>
        <div className="text-lg font-bold text-ink tabular">{value}</div>
      </div>
    </div>
  );
}

export { TrendingUp };
