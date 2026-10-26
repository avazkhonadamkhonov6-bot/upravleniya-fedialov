"use client";

import type { Branch, Overview } from "@filialhub/shared";
import { ArrowLeft, CalendarDays, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BranchCustomersTab, BranchMoneyTab, BranchSalesTab, BranchScheduleTab, BranchTasksTab } from "@/components/branch-tabs";
import { AttendanceWidget, TasksWidget } from "@/components/crm-widgets";
import { StaffTable } from "@/components/staff-table";
import { KpiRow, SalesCard, StaffBreakdown, TopProducts } from "@/components/stats-panel";
import { Badge, ContactButtons, ErrorBox, Segmented, Select, Skeleton } from "@/components/ui";
import { qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { tr, locale } from "@/lib/i18n";

export default function BranchViewPage() {
  return (
    <Suspense fallback={<Skeleton className="h-48" />}>
      <BranchView />
    </Suspense>
  );
}

function BranchView() {
  const { user } = useAuth();
  const isChef = user?.role === "CHEF";
  const params = useSearchParams();
  const router = useRouter();
  // Менеҷер ҳамеша филиали худро мебинад (API ҳам филиали дигарро намедиҳад)
  const id = (isChef ? Number(params.get("id")) : 0) || user?.branchId || Number(params.get("id")) || 0;
  const tab = (TABS.find((t) => t.value === params.get("tab"))?.value ?? "overview") as Tab;
  const { data: branch, error } = useApi<Branch>(id ? `/branches/${id}` : null);
  const { data: branches } = useApi<Branch[]>(isChef ? "/branches" : null);
  const { data: overview } = useApi<Overview>(id ? `/stats/overview${qs({ branchId: id })}` : null);

  const go = (next: { id?: number; tab?: Tab }) =>
    router.replace(`/branches/view${qs({ id: isChef ? (next.id ?? id) : undefined, tab: (next.tab ?? tab) === "overview" ? undefined : (next.tab ?? tab) })}`, { scroll: false });

  if (error) return <ErrorBox message={error} />;
  if (!branch) return <Skeleton className="h-48" />;

  return (
    <>
      {isChef && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/branches" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> {tr("Ҳамаи филиалҳо")}
          </Link>
          {branches && branches.length > 1 && (
            <Select value={id} onChange={(e) => go({ id: Number(e.target.value) })} className="w-60" aria-label={tr("Филиал")}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      )}
      <div className="rise relative mb-6 overflow-hidden rounded-[24px] bg-[#170d0f] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -top-24 -right-10 size-72 rounded-full bg-[#e4002b] opacity-45 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 size-64 rounded-full bg-[#ff5a36] opacity-20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              {branch.isActive ? <Badge tone="good">{tr("Фаъол")}</Badge> : <Badge tone="warn">{tr("Ғайрифаъол")}</Badge>}
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{branch.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/60">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" /> {branch.city}, {branch.address}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="size-4" /> {branch.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="size-4" /> {branch.email}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" /> {tr("аз")}{" "}{new Date(branch.openedAt).toLocaleDateString(locale())}
              </span>
            </div>
          </div>
          {branch.manager && (
            <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4 backdrop-blur">
              <div>
                <div className="text-xs text-white/50">{tr("Менеҷер")}</div>
                <div className="font-semibold">{branch.manager.fullName}</div>
                <div className="text-xs text-white/60">{branch.manager.phone}</div>
              </div>
              <div className="rounded-xl bg-white/90 p-0.5">
                <ContactButtons
                  phone={branch.manager.phone}
                  email={branch.manager.email}
                  name={branch.manager.fullName}
                  whatsapp={branch.manager.whatsapp}
                  telegram={branch.manager.telegram}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="-mx-1 mb-6 overflow-x-auto px-1 pb-1">
        <Segmented value={tab} onChange={(t) => go({ tab: t })} options={TABS.map((t) => ({ value: t.value, label: t.label }))} />
      </div>

      {/* key — то ҳангоми иваз кардани филиал саҳифабандии ҷадвалҳо аз нав сар шавад */}
      <div key={`${id}-${tab}`} className="rise">
        {tab === "overview" && (
          <>
            <KpiRow overview={overview} />
            <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <SalesCard branchId={id} />
              <StaffBreakdown overview={overview} />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <AttendanceWidget branchId={id} />
              <TasksWidget branchId={id} />
              <TopProducts branchId={id} />
            </div>
          </>
        )}
        {tab === "staff" && <StaffTable fixedBranchId={id} />}
        {tab === "money" && <BranchMoneyTab branchId={id} />}
        {tab === "tasks" && <BranchTasksTab branchId={id} />}
        {tab === "schedule" && <BranchScheduleTab branchId={id} />}
        {tab === "sales" && <BranchSalesTab branchId={id} />}
        {tab === "customers" && <BranchCustomersTab branchId={id} />}
      </div>
    </>
  );
}

const TABS = [
  { value: "overview", label: "Умумӣ" },
  { value: "staff", label: "Кормандон" },
  { value: "money", label: "Фоида ва хароҷот" },
  { value: "tasks", label: "Вазифаҳо" },
  { value: "schedule", label: "Ҷадвал" },
  { value: "sales", label: "Фурӯш" },
  { value: "customers", label: "Мизоҷон" },
] as const;
type Tab = (typeof TABS)[number]["value"];
