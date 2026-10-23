"use client";

import type { Branch, Overview } from "@filialhub/shared";
import { ArrowLeft, CalendarDays, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { StaffTable } from "@/components/staff-table";
import { KpiRow, SalesCard, StaffBreakdown, TopProducts } from "@/components/stats-panel";
import { Badge, ContactButtons, ErrorBox, Skeleton } from "@/components/ui";
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
  const id = Number(useSearchParams().get("id")) || user?.branchId || 0;
  const { data: branch, error } = useApi<Branch>(id ? `/branches/${id}` : null);
  const { data: overview } = useApi<Overview>(id ? `/stats/overview${qs({ branchId: id })}` : null);

  if (error) return <ErrorBox message={error} />;
  if (!branch) return <Skeleton className="h-48" />;

  return (
    <>
      {user?.role === "CHEF" && (
        <Link href="/branches" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> {tr("Ҳамаи филиалҳо")}
        </Link>
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
                <ContactButtons phone={branch.manager.phone} email={branch.manager.email} name={branch.manager.fullName} />
              </div>
            </div>
          )}
        </div>
      </div>

      <KpiRow overview={overview} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <SalesCard branchId={id} />
        <StaffBreakdown overview={overview} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <h2 className="mb-3 text-lg font-bold text-ink">{tr("Кормандони филиал")}</h2>
          <StaffTable fixedBranchId={id} compact />
        </div>
        <div>
          <h2 className="mb-3 text-lg font-bold text-ink">&nbsp;</h2>
          <TopProducts branchId={id} />
        </div>
      </div>
    </>
  );
}
