"use client";

import { BUSINESS_TYPE_LABELS, type AdminBusiness, type AdminOverview, type OrgStatus } from "@filialhub/shared";
import { ArrowUpRight, Building2, Clock, Search, ShieldCheck, Store, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ReviewActions, StatusBadge } from "@/components/admin-review";
import { BusinessIcon } from "@/components/glyph";
import { Avatar, Card, ContactButtons, CountUp, Empty, ErrorBox, Input, PageHeader, Segmented, Skeleton, cn, formatDate } from "@/components/ui";
import { qs } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";

type Filter = OrgStatus | "ALL";

/** Супер-админ: дархостҳои бизнесҳои нав, ҳамаи бизнесҳо, филиалҳо ва кормандон */
export default function AdminPage() {
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [q, setQ] = useState("");
  const { data: overview, reload: reloadOverview } = useApi<AdminOverview>("/admin/overview");
  const { data, error, loading, reload } = useApi<AdminBusiness[]>(`/admin/businesses${qs({ status: filter === "ALL" ? undefined : filter, q: q.trim() || undefined })}`);

  const refresh = () => {
    reload();
    reloadOverview();
  };

  return (
    <>
      <PageHeader
        title={tr("Супер-админ")}
        subtitle={tr("Бизнесҳои нав танҳо пас аз тасдиқи шумо кор мекунанд. Хабар ба Telegram ва WhatsApp меояд.")}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={Clock} label={tr("Интизори тасдиқ")} value={overview?.pending} accent={!!overview?.pending} />
        <Tile icon={Store} label={tr("Ҳамаи бизнесҳо")} value={overview?.businesses} />
        <Tile icon={Building2} label={tr("Филиалҳо")} value={overview?.branches} />
        <Tile icon={Users} label={tr("Кормандон")} value={overview?.employees} />
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="scrollbar-none -mx-1 max-w-full overflow-x-auto px-1">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "PENDING", label: `${tr("Дархостҳо")}${overview?.pending ? ` · ${overview.pending}` : ""}` },
              { value: "APPROVED", label: tr("Тасдиқшуда") },
              { value: "REJECTED", label: tr("Радшуда") },
              { value: "BLOCKED", label: tr("Басташуда") },
              { value: "ALL", label: tr("Ҳама") },
            ]}
          />
          </div>
          <div className="relative lg:w-80">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Ном, почта ё телефон…")} className="pl-9" />
          </div>
        </div>
        <ErrorBox message={error} />

        {!data ? (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : data.length === 0 ? (
          <Empty
            icon={<ShieldCheck className="size-7" />}
            title={filter === "PENDING" ? tr("Дархости нав нест") : tr("Бизнес ёфт нашуд")}
            text={filter === "PENDING" ? tr("Вақте ки касе бизнес сабт кунад, дар ин ҷо пайдо мешавад.") : undefined}
          />
        ) : (
          <div className={cn("space-y-3 transition-opacity", loading && "opacity-60")}>
            {data.map((b) => (
              <BusinessRow key={b.id} b={b} onChanged={refresh} />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function Tile({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | undefined; accent?: boolean }) {
  return (
    <Card className={cn("p-4", accent && "ring-2 ring-warn/40")}>
      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
        <Icon className={cn("size-4", accent && "text-warn")} /> {label}
      </div>
      <div className="mt-2 text-2xl font-extrabold text-ink">
        {value === undefined ? <Skeleton className="h-8 w-16" /> : <CountUp value={value} format={(n) => String(Math.round(n))} />}
      </div>
    </Card>
  );
}

function BusinessRow({ b, onChanged }: { b: AdminBusiness; onChanged: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2/50 p-4 transition hover:border-brand/30">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="brand-gradient grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg shadow-red-500/20">
          <BusinessIcon type={b.type} className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/view?id=${b.id}`} className="truncate text-base font-bold text-ink hover:text-brand">
              {b.name}
            </Link>
            <span className="text-xs text-muted">#{b.id}</span>
            <StatusBadge status={b.status} />
          </div>
          <div className="mt-0.5 text-sm text-muted">
            {tr(BUSINESS_TYPE_LABELS[b.type])} · {tr("сабт: {0}", formatDate(b.createdAt, true))}
          </div>
          {b.description && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{b.description}</p>}
          {b.statusNote && (
            <p className="mt-1 text-sm text-brand">
              {tr("Сабаб")}: {b.statusNote}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-ink-2">
            <span>{tr("{0} филиал", b.branches)}</span>
            <span>{tr("{0} корманд", b.employees)}</span>
            <span>{tr("{0} маҳсулот", b.products)}</span>
            {b.ownerBusinesses > 0 && <span className="text-warn">{tr("соҳиб боз {0} бизнес дорад", b.ownerBusinesses)}</span>}
          </div>
        </div>
        {b.owner && (
          <div className="flex min-w-0 items-center gap-3 md:w-72">
            <Avatar name={b.owner.fullName} size={38} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink">{b.owner.fullName}</div>
              <div className="truncate text-xs text-muted">{b.owner.email}</div>
              <div className="truncate text-xs text-muted">{b.owner.phone}</div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {b.owner && <ContactButtons name={b.owner.fullName} phone={b.owner.phone} whatsapp={b.owner.whatsapp} telegram={b.owner.telegram} email={b.owner.email} />}
          <Link href={`/admin/view?id=${b.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
            {tr("Филиалҳо ва кормандон")} <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <ReviewActions business={b} onDone={onChanged} />
      </div>
    </div>
  );
}
