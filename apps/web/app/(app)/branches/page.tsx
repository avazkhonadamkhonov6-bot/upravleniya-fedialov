"use client";

import { POSITION_LABELS, type Branch, type BranchRank, type Period } from "@filialhub/shared";
import { ArrowUpRight, MapPin, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BranchForm } from "@/components/forms";
import { Badge, Button, Card, ContactButtons, ErrorBox, Modal, money, PageHeader, Segmented, Skeleton, cn } from "@/components/ui";
import { qs } from "@/lib/api";
import { useBusiness } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { tr } from "@/lib/i18n";
import { PositionIcon } from "@/components/glyph";

export default function BranchesPage() {
  const { positions } = useBusiness();
  const { data, error, reload } = useApi<Branch[]>("/branches");
  const [editing, setEditing] = useState<Branch | "new" | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const { data: ranks } = useApi<BranchRank[]>(`/stats/branches${qs({ period })}`);
  const rankOf = (id: number) => ranks?.find((r) => r.branchId === id);
  const totals = ranks?.reduce(
    (t, r) => ({ revenue: t.revenue + r.revenue, profit: t.profit + r.profit, expenses: t.expenses + r.expenses, netProfit: t.netProfit + r.netProfit }),
    { revenue: 0, profit: 0, expenses: 0, netProfit: 0 },
  );

  const totalStaff = data?.reduce((s, b) => s + (b.staffCount ?? 0) + (b.manager ? 1 : 0), 0);

  return (
    <>
      <PageHeader
        title={tr("Филиалҳо")}
        subtitle={data ? tr("{0} филиали фаъол · {1} корманд", data.filter((b) => b.isActive).length, totalStaff) : tr("Боркунӣ…")}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> {tr("Филиали нав")}
          </Button>
        }
      />
      <ErrorBox message={error} />

      {/* Ҳамаи филиалҳо якҷоя барои давраи интихобшуда */}
      <Card className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">{tr("Ҳамаи филиалҳо якҷоя")}</h2>
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { value: "day", label: tr("Имрӯз") },
              { value: "week", label: tr("Ин ҳафта") },
              { value: "month", label: tr("Ин моҳ") },
            ]}
          />
        </div>
        {!totals ? (
          <Skeleton className="h-16" />
        ) : (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Metric label={tr("Фурӯш")} value={money(totals.revenue)} />
            <Metric label={tr("Фоида")} value={money(totals.profit)} color="var(--chart-profit)" />
            <Metric label={tr("Хароҷот")} value={money(totals.expenses)} color="var(--warn)" />
            <Metric label={tr("Фоидаи соф")} value={money(totals.netProfit)} color={totals.netProfit < 0 ? "var(--brand)" : "var(--good)"} strong />
          </div>
        )}
      </Card>

      {!data ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Card className="rise">
          <h2 className="text-xl font-bold text-ink">{tr("Хуш омадед! Ширкати худро дар 3 қадам омода кунед")}</h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              { n: 1, title: tr("Филиал илова кунед"), text: tr("Мағоза, нуқта ё тарабхонаи аввалин"), action: () => setEditing("new") },
              { n: 2, title: tr("Маҳсулотро илова кунед"), text: tr("Ном, нарх, арзиши аслӣ ва воҳид (дона, кг…)"), href: "/products" },
              { n: 3, title: tr("Кормандонро илова кунед"), text: tr("Менеҷер, фурӯшанда, кассир — ҳар кас бо ҳисоби худ"), href: "/staff" },
            ].map((step) => (
              <li key={step.n} className="rounded-2xl border border-line bg-surface-2 p-4">
                <div className="brand-gradient grid size-8 place-items-center rounded-full text-sm font-bold text-white">{step.n}</div>
                <div className="mt-3 font-semibold text-ink">{step.title}</div>
                <div className="mt-1 text-sm text-muted">{step.text}</div>
                {step.action ? (
                  <Button size="sm" className="mt-3" onClick={step.action}>
                    <Plus className="size-4" /> {tr("Филиали нав")}
                  </Button>
                ) : (
                  <Link href={step.href!} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
                    {tr("Гузаштан")} <ArrowUpRight className="size-4" />
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <div className="stagger grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.map((b, i) => (
            <div key={b.id} data-tilt="5" className="rise card group flex flex-col overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="relative h-24 overflow-hidden bg-[#170d0f] px-5 pt-4">
                <div className="absolute -top-10 -right-6 size-40 rounded-full bg-[#e4002b] opacity-50 blur-2xl" />
                <div className="absolute -bottom-12 left-10 size-32 rounded-full bg-[#ff5a36] opacity-30 blur-2xl" />
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                    <MapPin className="size-3.5" /> {b.city}
                  </div>
                  {b.isActive ? <Badge tone="good">{tr("Фаъол")}</Badge> : <Badge tone="warn">{tr("Ғайрифаъол")}</Badge>}
                </div>
                <div className="relative mt-2 text-xl font-bold text-white">{b.name}</div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm text-muted">{b.address}</p>

                <BranchMoney rank={rankOf(b.id)} loading={!ranks} />

                <div className="mt-4 grid grid-cols-4 gap-2">
                  {positions.map((p) => (
                    <div key={p} className="rounded-xl bg-surface-2 p-2.5 text-center">
                      <div className="flex justify-center text-ink-2"><PositionIcon position={p} className="size-5" /></div>
                      <div className="text-lg font-bold text-ink tabular">{b.staffByPosition?.[p] ?? 0}</div>
                      <div className="text-[11px] text-muted">{tr(POSITION_LABELS[p])}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl border border-line p-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{tr("Менеҷер")}</div>
                    <div className="truncate text-sm font-semibold text-ink">{b.manager?.fullName ?? tr("Таъин нашудааст")}</div>
                    {b.manager && <div className="text-xs text-muted">{b.manager.phone}</div>}
                  </div>
                  {b.manager && <ContactButtons phone={b.manager.phone} email={b.manager.email} name={b.manager.fullName} whatsapp={b.manager.whatsapp} telegram={b.manager.telegram} />}
                </div>

                <div className="mt-auto flex gap-2 pt-5">
                  <Link
                    href={`/branches/view?id=${b.id}`}
                    className="brand-gradient flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white hover:brightness-110"
                  >
                    {tr("Омор ва кормандон")}{" "}<ArrowUpRight className="size-4" />
                  </Link>
                  <Button variant="outline" size="sm" className="h-10" onClick={() => setEditing(b)} aria-label={tr("Таҳрир")}>
                    <Pencil className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? tr("Филиали нав") : tr("Таҳрири филиал")}>
        {editing && (
          <BranchForm
            branch={editing === "new" ? undefined : editing}
            onDone={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function Metric({ label, value, color, strong }: { label: string; value: string; color?: string; strong?: boolean }) {
  return (
    <div className={cn("rounded-xl p-3", strong ? "bg-surface-2 ring-1 ring-line" : "bg-surface-2")}>
      <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</div>
      <div className={cn("mt-1 tabular leading-tight break-words", strong ? "text-lg font-extrabold" : "text-base font-bold")} style={{ color: color ?? "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

/** Фурӯш, фоида, хароҷот ва фоидаи софи филиал барои давраи интихобшуда */
function BranchMoney({ rank, loading }: { rank?: BranchRank; loading: boolean }) {
  if (loading) return <Skeleton className="mt-4 h-24" />;
  if (!rank) return null;
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
      <div className="rounded-xl bg-surface-2 p-2.5">
        <div className="text-[11px] text-muted">{tr("Фурӯш")}</div>
        <div className="font-bold text-ink tabular">{money(rank.revenue)}</div>
      </div>
      <div className="rounded-xl bg-surface-2 p-2.5">
        <div className="text-[11px] text-muted">{tr("Фоида")}</div>
        <div className="font-bold tabular" style={{ color: "var(--chart-profit)" }}>
          {money(rank.profit)}
        </div>
      </div>
      <div className="rounded-xl bg-surface-2 p-2.5">
        <div className="text-[11px] text-muted">{tr("Хароҷот")}</div>
        <div className="font-bold tabular" style={{ color: "var(--warn)" }}>
          {money(rank.expenses)}
        </div>
      </div>
      <div className="rounded-xl bg-surface-2 p-2.5">
        <div className="text-[11px] text-muted">{tr("Фоидаи соф")}</div>
        <div className="font-extrabold tabular" style={{ color: rank.netProfit < 0 ? "var(--brand)" : "var(--good)" }}>
          {money(rank.netProfit)}
        </div>
      </div>
    </div>
  );
}
