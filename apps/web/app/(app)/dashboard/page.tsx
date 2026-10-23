"use client";

import {
  canSell,
  POSITION_EMOJI,
  POSITION_LABELS,
  type Branch,
  type BranchRank,
  type Overview,
  type Period,
} from "@filialhub/shared";
import { ArrowUpRight, Building2, Receipt, ShoppingBag, Users, UtensilsCrossed, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BranchBars } from "@/components/charts-lazy";
import { AttendanceWidget, CustomersWidget, MyShiftsWidget, TasksWidget } from "@/components/crm-widgets";
import { ShiftButton } from "@/components/shift-button";
import { KpiRow, MiniStat, SalesCard, StaffBreakdown, TopProducts } from "@/components/stats-panel";
import { Card, CardTitle, ContactButtons, money, PageHeader, Segmented, Select, Skeleton } from "@/components/ui";
import { qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { tr, locale } from "@/lib/i18n";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return tr("Шаби хуш");
  if (h < 12) return tr("Субҳ ба хайр");
  if (h < 18) return tr("Рӯз ба хайр");
  return tr("Шом ба хайр");
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "STAFF") return <StaffHome />;
  return <ManagerDashboard />;
}

function ManagerDashboard() {
  const { user } = useAuth();
  const isChef = user!.role === "CHEF";
  const [branchId, setBranchId] = useState<number | undefined>(undefined);
  const { data: branches } = useApi<Branch[]>(isChef ? "/branches" : null);
  const { data: overview } = useApi<Overview>(`/stats/overview${qs({ branchId })}`);

  const today = new Date().toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user!.fullName.split(" ")[0]} 👋`}
        subtitle={
          <span className="capitalize">
            {today} · {isChef ? (branchId ? branches?.find((b) => b.id === branchId)?.name : tr("ҳамаи филиалҳо")) : user!.branch?.name}
          </span>
        }
        actions={
          isChef && (
            <Select
              value={branchId ?? ""}
              onChange={(e) => setBranchId(Number(e.target.value) || undefined)}
              className="w-60"
              aria-label={tr("Филиал")}
            >
              <option value="">{tr("🏢 Ҳамаи филиалҳо")}</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )
        }
      />

      <KpiRow overview={overview} />

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isChef && !branchId ? (
          <MiniStat icon={<Building2 className="size-5" />} label={tr("Филиалҳои фаъол")} value={overview?.branches ?? "—"} />
        ) : (
          <MiniStat icon={<Wallet className="size-5" />} label={tr("Фоидаи моҳ")} value={overview ? money(overview.month.profit) : "—"} />
        )}
        <MiniStat icon={<Users className="size-5" />} label={tr("Кормандон")} value={overview ? overview.employees + overview.managers : "—"} />
        <MiniStat icon={<Receipt className="size-5" />} label={tr("Чеки миёнаи имрӯз")} value={overview ? money(overview.today.avgCheck) : "—"} />
        <MiniStat
          icon={<ArrowUpRight className="size-5" />}
          label={tr("Фоидаи соф (моҳ)")}
          value={overview ? money(overview.month.netProfit) : "—"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SalesCard branchId={branchId} />
        <StaffBreakdown overview={overview} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <AttendanceWidget branchId={branchId} />
        <TasksWidget branchId={branchId} />
        <CustomersWidget branchId={branchId} />
      </div>

      {isChef && !branchId && (
        <div className="mt-6">
          <BranchRanking />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TopProducts branchId={branchId} />
        <QuickLinks isChef={isChef} />
      </div>
    </>
  );
}

function BranchRanking() {
  const [period, setPeriod] = useState<Period>("day");
  const { data } = useApi<BranchRank[]>(`/stats/branches?period=${period}`);
  const medals = ["🥇", "🥈", "🥉"];
  const total = data?.reduce((s, r) => ({ rev: s.rev + r.revenue, prof: s.prof + r.profit }), { rev: 0, prof: 0 });
  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{tr("Кадом филиал чанд фоида овард")}</h2>
          {total && (
            <p className="text-sm text-muted">
              {tr("Ҳамагӣ:")}{" "}<b className="text-ink tabular">{money(total.rev)}</b> {tr("фурӯш ·")}{" "}
              <b className="text-ink tabular">{money(total.prof)}</b> {tr("фоида")}
            </p>
          )}
        </div>
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
      {!data ? (
        <Skeleton className="h-80" />
      ) : (
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_1.3fr]">
          <BranchBars data={data} />
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted uppercase">
                  <th className="px-2 pb-3 font-semibold">{tr("Филиал")}</th>
                  <th className="px-2 pb-3 text-right font-semibold">{tr("Фурӯш")}</th>
                  <th className="px-2 pb-3 text-right font-semibold">{tr("Фоида")}</th>
                  <th className="px-2 pb-3 text-right font-semibold">{tr("Фармоиш")}</th>
                  <th className="px-2 pb-3 text-right font-semibold">{tr("Соф")}</th>
                  <th className="px-2 pb-3 text-right font-semibold">{tr("Корманд")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r, i) => (
                  <tr key={r.branchId} className="border-t border-line">
                    <td className="px-2 py-3">
                      <Link href={`/branches/view?id=${r.branchId}`} className="flex items-center gap-2 font-semibold text-ink hover:text-brand">
                        <span className="w-6 text-center">{medals[i] ?? <span className="text-muted">{i + 1}</span>}</span>
                        <span>
                          {r.name.replace("FilialHub ", "")}
                          <span className="block text-xs font-normal text-muted">{r.city}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-right whitespace-nowrap tabular text-ink">{money(r.revenue)}</td>
                    <td className="px-2 py-3 text-right font-semibold whitespace-nowrap tabular" style={{ color: "var(--chart-profit)" }}>
                      {money(r.profit)}
                    </td>
                    <td className="px-2 py-3 text-right tabular text-ink-2">{r.orders}</td>
                    <td className="px-2 py-3 text-right font-semibold whitespace-nowrap tabular text-ink">{money(r.netProfit)}</td>
                    <td className="px-2 py-3 text-right tabular text-ink-2">{r.employees}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

function QuickLinks({ isChef }: { isChef: boolean }) {
  const links = [
    { href: "/pos", label: tr("Фурӯши нав"), desc: tr("Сабти фармоиш"), icon: ShoppingBag },
    { href: "/sales", label: tr("Таърихи фурӯш"), desc: tr("Рӯз, ҳафта, моҳ"), icon: Receipt },
    { href: "/staff", label: tr("Кормандон"), desc: isChef ? tr("Ҳамаи филиалҳо") : tr("Филиали шумо"), icon: Users },
    { href: "/products", label: tr("Меню ва нархҳо"), desc: tr("Нарх ва фоида"), icon: UtensilsCrossed },
  ];
  return (
    <Card>
      <CardTitle>{tr("Амалҳои зуд")}</CardTitle>
      <div className="grid grid-cols-2 gap-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group rounded-2xl border border-line bg-surface-2 p-4 transition hover:-translate-y-0.5 hover:border-brand/40 hover:bg-surface"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                <l.icon className="size-5" />
              </span>
              <ArrowUpRight className="size-4 text-muted transition group-hover:text-brand" />
            </div>
            <div className="mt-3 text-sm font-semibold text-ink">{l.label}</div>
            <div className="text-xs text-muted">{l.desc}</div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function StaffHome() {
  const { user } = useAuth();
  const { data: branches } = useApi<Branch[]>("/branches");
  const branch = branches?.[0];
  const u = user!;
  return (
    <>
      <PageHeader title={`${greeting()}, ${u.fullName.split(" ")[0]} 👋`} subtitle={tr("Саҳифаи корманд")} actions={<ShiftButton />} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rise relative overflow-hidden rounded-[24px] bg-[#170d0f] p-7 text-white shadow-card">
          <div className="absolute -top-20 -right-20 size-64 rounded-full bg-[#e4002b] opacity-40 blur-3xl" />
          <div className="relative text-5xl">{u.position ? POSITION_EMOJI[u.position] : "👤"}</div>
          <div className="relative mt-4 text-sm text-white/60">{tr("Вазифаи шумо")}</div>
          <div className="relative text-3xl font-bold">{u.position ? tr(POSITION_LABELS[u.position]) : tr("Корманд")}</div>
          <div className="relative mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="text-white/50">{tr("Маош")}</div>
              <div className="font-semibold">{money(u.salary)}</div>
            </div>
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="text-white/50">{tr("Аз санаи")}</div>
              <div className="font-semibold">{new Date(u.hiredAt).toLocaleDateString(locale())}</div>
            </div>
          </div>
          {u.role === "STAFF" && canSell(u) && (
            <Link href="/pos" className="brand-gradient relative mt-6 flex h-12 items-center justify-center gap-2 rounded-xl font-semibold">
              <ShoppingBag className="size-5" /> {tr("Фурӯши нав")}
            </Link>
          )}
        </div>
        <Card>
          <CardTitle>{tr("Филиали шумо")}</CardTitle>
          {!branch ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-xl font-bold text-ink">{branch.name}</div>
                <div className="text-sm text-muted">
                  {branch.city}, {branch.address}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-3">
                <div>
                  <div className="text-xs text-muted">{tr("Филиал")}</div>
                  <div className="text-sm font-semibold text-ink">{branch.phone}</div>
                </div>
                <ContactButtons phone={branch.phone} email={branch.email} />
              </div>
              {branch.manager && (
                <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-3">
                  <div>
                    <div className="text-xs text-muted">{tr("Менеҷер")}</div>
                    <div className="text-sm font-semibold text-ink">{branch.manager.fullName}</div>
                  </div>
                  <ContactButtons
                    phone={branch.manager.phone}
                    email={branch.manager.email}
                    name={branch.manager.fullName}
                    whatsapp={branch.manager.whatsapp}
                    telegram={branch.manager.telegram}
                  />
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TasksWidget mine />
        <MyShiftsWidget />
      </div>
    </>
  );
}
