"use client";

import { PAYMENT_LABELS, type Branch, type Order, type Paginated, type Period, type TimePoint } from "@filialhub/shared";
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";
import { bucketLabel } from "@/components/chart-label";
import { SalesChart } from "@/components/charts-lazy";
import { Badge, Button, Card, CardTitle, Empty, ErrorBox, formatDate, money, PageHeader, Segmented, Select, Skeleton, cn } from "@/components/ui";
import { qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { tr, locale } from "@/lib/i18n";

const GRAN: { value: Period; label: string }[] = [
  { value: "day", label: "Рӯзона" },
  { value: "week", label: "Ҳафтаина" },
  { value: "month", label: "Моҳона" },
];

export default function SalesPage() {
  const { user } = useAuth();
  const isChef = user?.role === "CHEF";
  const isStaff = user?.role === "STAFF";
  const [branchId, setBranchId] = useState<number | undefined>();
  const { data: branches } = useApi<Branch[]>(isChef ? "/branches" : null);

  return (
    <>
      <PageHeader
        title={tr("Таърихи фурӯш")}
        subtitle={isStaff ? tr("Фармоишҳое, ки шумо сабт кардед") : tr("Фурӯш ва фоида рӯз ба рӯз, ҳафта ба ҳафта, моҳ ба моҳ")}
        actions={
          <>
            {isChef && (
              <Select value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value) || undefined)} className="w-56" aria-label={tr("Филиал")}>
                <option value="">{tr("Ҳамаи филиалҳо")}</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
            <Link href="/pos">
              <Button>
                <Plus className="size-4" /> {tr("Фурӯши нав")}
              </Button>
            </Link>
          </>
        }
      />
      {!isStaff && <History branchId={branchId} />}
      <OrdersList branchId={branchId} showProfit={!isStaff} showBranch={isChef && !branchId} />
    </>
  );
}

function History({ branchId }: { branchId?: number }) {
  const [g, setG] = useState<Period>("day");
  const { data, error } = useApi<TimePoint[]>(`/stats/timeseries${qs({ branchId, granularity: g })}`);
  const rows = data ? [...data].reverse() : [];
  const total = data?.reduce((s, p) => ({ r: s.r + p.revenue, p: s.p + p.profit, o: s.o + p.orders }), { r: 0, p: 0, o: 0 });
  const maxRev = Math.max(...rows.map((r) => r.revenue), 1);

  return (
    <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card>
        <CardTitle extra={<Segmented value={g} onChange={setG} options={GRAN} />}>{tr("Графики фурӯш")}</CardTitle>
        <ErrorBox message={error} />
        {data ? <SalesChart data={data} granularity={g} height={340} /> : <Skeleton className="h-[360px]" />}
      </Card>
      <Card className="flex flex-col p-0">
        <div className="border-b border-line p-5">
          <h2 className="text-base font-semibold text-ink">
            {g === "day" ? tr("Аз рӯи рӯзҳо") : g === "week" ? tr("Аз рӯи ҳафтаҳо") : tr("Аз рӯи моҳҳо")}
          </h2>
          {total && (
            <p className="text-sm text-muted tabular">
              {tr("Ҳамагӣ")}{" "}{money(total.r)} {tr("· фоида")}{" "}{money(total.p)} · {total.o.toLocaleString(locale())} {tr("фармоиш")}
            </p>
          )}
        </div>
        <div className="max-h-[400px] flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-left text-xs tracking-wide text-muted uppercase">
                <th className="px-5 py-2.5 font-semibold">{g === "day" ? tr("Рӯз") : g === "week" ? tr("Ҳафта аз") : tr("Моҳ")}</th>
                <th className="px-3 py-2.5 text-right font-semibold">{tr("Фурӯш")}</th>
                <th className="px-3 py-2.5 text-right font-semibold">{tr("Фоида")}</th>
                <th className="px-5 py-2.5 text-right font-semibold">{tr("Фарм.")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.date} className="border-t border-line">
                  <td className="px-5 py-2.5">
                    <div className="font-medium text-ink">
                      {bucketLabel(r.date, g)}
                      {i === 0 && <Badge tone="brand" className="ml-2">{tr("ҷорӣ")}</Badge>}
                    </div>
                    <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full" style={{ width: `${(r.revenue / maxRev) * 100}%`, background: "var(--chart-revenue)" }} />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-ink tabular">{money(r.revenue)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap tabular" style={{ color: "var(--chart-profit)" }}>
                    {money(r.profit)}
                  </td>
                  <td className="px-5 py-2.5 text-right text-ink-2 tabular">{r.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function OrdersList({ branchId, showProfit, showBranch }: { branchId?: number; showProfit: boolean; showBranch: boolean }) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);
  const { data, error } = useApi<Paginated<Order>>(`/orders${qs({ branchId, page, pageSize: 15 })}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-line p-5">
        <div>
          <h2 className="text-base font-semibold text-ink">{tr("Фармоишҳои охирин")}</h2>
          {data && <p className="text-sm text-muted">{data.total.toLocaleString(locale())} {tr("фармоиш")}</p>}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={tr("Пештар")}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="tabular">
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label={tr("Баъдӣ")}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="p-2">
        <ErrorBox message={error} />
        {!data ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <Empty icon="🧾" title={tr("Ҳоло фармоиш нест")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted uppercase">
                  <th className="px-3 py-3 font-semibold">№</th>
                  <th className="px-3 py-3 font-semibold">{tr("Вақт")}</th>
                  {showBranch && <th className="px-3 py-3 font-semibold">{tr("Филиал")}</th>}
                  <th className="px-3 py-3 font-semibold">{tr("Корманд / мизоҷ")}</th>
                  <th className="px-3 py-3 font-semibold">{tr("Пардохт")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{tr("Маблағ")}</th>
                  {showProfit && <th className="px-3 py-3 text-right font-semibold">{tr("Фоида")}</th>}
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <Fragment key={o.id}>
                    <tr className="cursor-pointer border-t border-line hover:bg-surface-2" onClick={() => setOpen(open === o.id ? null : o.id)}>
                      <td className="px-3 py-3 font-semibold text-muted tabular">#{o.id}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-ink-2 tabular">{formatDate(o.createdAt, true)}</td>
                      {showBranch && <td className="px-3 py-3 text-ink-2">{o.branchName.replace("FilialHub ", "")}</td>}
                      <td className="px-3 py-3 text-ink-2">
                        {o.userName}
                        {o.customerName && <span className="block text-xs font-medium text-warn">🎁 {o.customerName}{o.pointsUsed ? ` · −${o.pointsUsed}` : ""}</span>}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={o.payment === "CARD" ? "blue" : "neutral"}>{o.payment === "CARD" ? "💳" : "💵"} {tr(PAYMENT_LABELS[o.payment])}</Badge>
                      </td>
                      <td className="px-3 py-3 text-right font-bold whitespace-nowrap text-ink tabular">{money(o.total)}</td>
                      {showProfit && (
                        <td className="px-3 py-3 text-right font-semibold whitespace-nowrap tabular" style={{ color: "var(--chart-profit)" }}>
                          {money(o.profit)}
                        </td>
                      )}
                      <td className="px-3 py-3 text-right">
                        <ChevronDown className={cn("ml-auto size-4 text-muted transition", open === o.id && "rotate-180")} />
                      </td>
                    </tr>
                    {open === o.id && (
                      <tr className="bg-surface-2">
                        <td colSpan={8} className="px-6 py-3">
                          <div className="flex flex-wrap gap-2">
                            {o.items.map((i) => (
                              <span key={i.productId} className="rounded-xl bg-surface px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-line">
                                {i.emoji} {i.name} × {i.qty} = <b className="tabular">{money(i.unitPrice * i.qty)}</b>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
