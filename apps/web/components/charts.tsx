"use client";

import type { BranchRank, TimePoint } from "@filialhub/shared";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { bucketLabel } from "./chart-label";
import { compactMoney, money } from "./ui";
import { tr } from "@/lib/i18n";


function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs font-medium text-ink-2">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-4 rounded-full" style={{ background: "var(--chart-revenue)" }} /> {tr("Фурӯш")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-4 rounded-full" style={{ background: "var(--chart-profit)" }} /> {tr("Фоида")}
      </span>
    </div>
  );
}

function TooltipBox({
  active,
  payload,
  label,
  labelFormatter,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; payload: Record<string, number> }[];
  label?: string;
  labelFormatter?: (l: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs shadow-card">
      <div className="mb-1.5 font-semibold text-ink">{labelFormatter ? labelFormatter(String(label)) : label}</div>
      <div className="space-y-1 tabular">
        <Row color="var(--chart-revenue)" label={tr("Фурӯш")} value={money(row.revenue)} />
        <Row color="var(--chart-profit)" label={tr("Фоида")} value={money(row.profit)} />
        {"orders" in row && <Row label={tr("Фармоишҳо")} value={String(row.orders)} />}
      </div>
    </div>
  );
}

function Row({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-1.5 text-muted">
        {color && <span className="size-2 rounded-full" style={{ background: color }} />}
        {label}
      </span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

const axis = { fontSize: 11, fill: "var(--muted)" };

export function SalesChart({
  data,
  granularity,
  height = 300,
}: {
  data: TimePoint[];
  granularity: "day" | "week" | "month";
  height?: number;
}) {
  const fmt = (d: string) => bucketLabel(d, granularity);
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Legend />
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-revenue)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--chart-revenue)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gProf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-profit)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--chart-profit)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="date" tickFormatter={fmt} tick={axis} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tickFormatter={compactMoney} tick={axis} axisLine={false} tickLine={false} width={56} />
            <Tooltip
              content={<TooltipBox labelFormatter={fmt} />}
              cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
            />
            <Area type="monotone" dataKey="revenue" stroke="var(--chart-revenue)" strokeWidth={2} fill="url(#gRev)" activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} />
            <Area type="monotone" dataKey="profit" stroke="var(--chart-profit)" strokeWidth={2} fill="url(#gProf)" activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function BranchBars({ data, height = 300 }: { data: BranchRank[]; height?: number }) {
  const rows = data.map((d) => ({ ...d, label: d.name.replace("FilialHub ", "") }));
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Legend />
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval={0} />
            <YAxis tickFormatter={compactMoney} tick={axis} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--surface-2)" }} />
            <Bar dataKey="revenue" fill="var(--chart-revenue)" radius={[4, 4, 0, 0]} maxBarSize={34} />
            <Bar dataKey="profit" fill="var(--chart-profit)" radius={[4, 4, 0, 0]} maxBarSize={34} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
