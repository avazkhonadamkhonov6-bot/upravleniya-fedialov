"use client";

import { BUSINESS_TYPE_LABELS, POSITION_LABELS, ROLE_LABELS, type AdminBusinessDetail } from "@filialhub/shared";
import { ArrowLeft, Building2, MapPin, Package, Phone, Send, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ReviewActions, StatusBadge } from "@/components/admin-review";
import { BusinessIcon, PositionIcon } from "@/components/glyph";
import { Avatar, Badge, Card, CardTitle, ContactButtons, Empty, ErrorBox, Input, PageHeader, Skeleton, cn, formatDate } from "@/components/ui";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";

export default function AdminBusinessPage() {
  return (
    <Suspense fallback={<Skeleton className="h-48" />}>
      <AdminBusinessView />
    </Suspense>
  );
}

function AdminBusinessView() {
  const id = Number(useSearchParams().get("id")) || 0;
  const { data: b, error, reload } = useApi<AdminBusinessDetail>(id ? `/admin/businesses/${id}` : null);
  const [branchId, setBranchId] = useState<number | "all">("all");
  const [q, setQ] = useState("");

  const back = (
    <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <ArrowLeft className="size-4" /> {tr("Ҳамаи бизнесҳо")}
    </Link>
  );

  if (!id) return <Empty title={tr("Бизнес ёфт нашуд")} />;
  if (error) return <><div className="mb-4">{back}</div><ErrorBox message={error} /></>;
  if (!b) return <Skeleton className="h-64" />;

  const needle = q.trim().toLowerCase();
  const staff = b.staff.filter(
    (u) => (branchId === "all" || u.branchId === branchId) && (!needle || [u.fullName, u.email, u.phone].some((v) => v.toLowerCase().includes(needle))),
  );

  return (
    <>
      <div className="mb-4">{back}</div>
      <PageHeader
        title={b.name}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <BusinessIcon type={b.type} className="size-4" /> {tr(BUSINESS_TYPE_LABELS[b.type])} · #{b.id} · {tr("сабт: {0}", formatDate(b.createdAt, true))}
            <StatusBadge status={b.status} />
          </span>
        }
        actions={<ReviewActions business={b} onDone={reload} size="md" />}
      />
      {b.statusNote && <div className="mb-4 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">{tr("Сабаб")}: {b.statusNote}</div>}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>{tr("Соҳиби бизнес")}</CardTitle>
          {b.owner ? (
            <div className="flex items-center gap-3">
              <Avatar name={b.owner.fullName} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-semibold text-ink">
                  {b.owner.fullName}
                  {b.owner.telegramLinked && <Send className="size-3.5 text-[#229ed9]" />}
                </div>
                <div className="truncate text-xs text-muted">{b.owner.email}</div>
                <div className="truncate text-xs text-muted">{b.owner.phone}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">{tr("Соҳиб нест")}</p>
          )}
          {b.owner && (
            <div className="mt-3">
              <ContactButtons name={b.owner.fullName} phone={b.owner.phone} whatsapp={b.owner.whatsapp} telegram={b.owner.telegram} email={b.owner.email} />
            </div>
          )}
          {b.ownerBusinesses > 0 && <p className="mt-3 text-xs font-medium text-warn">{tr("соҳиб боз {0} бизнес дорад", b.ownerBusinesses)}</p>}
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle>{tr("Маълумот")}</CardTitle>
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={Building2} label={tr("Филиалҳо")} value={b.branches} />
            <Stat icon={Users} label={tr("Кормандон")} value={b.employees} />
            <Stat icon={Package} label={tr("Маҳсулот")} value={b.products} />
          </div>
          {b.description && <p className="mt-4 text-sm text-ink-2">{b.description}</p>}
          {b.reviewedAt && <p className="mt-3 text-xs text-muted">{tr("Охирин баррасӣ: {0}", formatDate(b.reviewedAt, true))}</p>}
        </Card>
      </div>

      <Card className="mb-6">
        <CardTitle>{tr("Филиалҳо ({0})", b.branchList.length)}</CardTitle>
        {b.branchList.length === 0 ? (
          <Empty icon={<Building2 className="size-7" />} title={tr("Филиал ҳоло нест")} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {b.branchList.map((br) => (
              <button
                key={br.id}
                onClick={() => setBranchId(branchId === br.id ? "all" : br.id)}
                className={cn(
                  "cursor-pointer rounded-2xl border p-4 text-left transition",
                  branchId === br.id ? "border-brand bg-brand-soft" : "border-line bg-surface-2/50 hover:border-brand/30",
                  !br.isActive && "opacity-60",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-ink">{br.name}</span>
                  {!br.isActive && <Badge>{tr("Ғайрифаъол")}</Badge>}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <MapPin className="size-3.5" /> {br.city}, {br.address}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                  <Phone className="size-3.5" /> {br.phone}
                </div>
                <div className="mt-2 text-xs font-semibold text-ink-2">{tr("{0} корманд", br.staffCount)}</div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle
          extra={
            <div className="w-full sm:w-64">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Ҷустуҷӯ…")} />
            </div>
          }
        >
          {branchId === "all" ? tr("Ҳамаи кормандон ({0})", staff.length) : tr("Кормандони филиал ({0})", staff.length)}
        </CardTitle>
        {staff.length === 0 ? (
          <Empty icon={<Users className="size-7" />} title={tr("Корманд ёфт нашуд")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted uppercase">
                  <th className="px-3 py-3 font-semibold">{tr("Корманд")}</th>
                  <th className="px-3 py-3 font-semibold">{tr("Вазифа|position")}</th>
                  <th className="px-3 py-3 font-semibold">{tr("Филиал")}</th>
                  <th className="px-3 py-3 font-semibold">{tr("Телефон")}</th>
                  <th className="px-3 py-3 font-semibold">{tr("Аз")}</th>
                  <th className="px-3 py-3 font-semibold">{tr("Тамос")}</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((u) => (
                  <tr key={u.id} className={cn("border-t border-line transition hover:bg-surface-2", !u.isActive && "opacity-50")}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName} size={34} />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">{u.fullName}</div>
                          <div className="truncate text-xs text-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {u.position ? (
                        <Badge>
                          <PositionIcon position={u.position} className="mr-1 inline size-3.5 -mt-0.5" />
                          {tr(POSITION_LABELS[u.position])}
                        </Badge>
                      ) : (
                        <Badge tone={u.role === "CHEF" ? "warn" : "brand"}>{tr(ROLE_LABELS[u.role])}</Badge>
                      )}
                      {!u.isActive && <span className="ml-1 text-xs text-muted">{tr("ғайрифаъол")}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-ink-2">{u.branch?.name ?? tr("Ҳама")}</td>
                    <td className="px-3 py-2.5 text-ink-2">{u.phone}</td>
                    <td className="px-3 py-2.5 text-xs text-muted">{formatDate(u.hiredAt)}</td>
                    <td className="px-3 py-2.5">
                      <ContactButtons name={u.fullName} phone={u.phone} whatsapp={u.whatsapp} telegram={u.telegram} email={u.email} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-1 text-xl font-extrabold text-ink">{value}</div>
    </div>
  );
}
