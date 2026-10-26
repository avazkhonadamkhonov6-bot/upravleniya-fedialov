"use client";

import {
  POINTS_RATE,
  SEGMENT_HINTS,
  SEGMENT_LABELS,
  SEGMENTS,
  type Branch,
  type Customer,
  type CustomerStats,
  type Paginated,
  type Segment,
} from "@filialhub/shared";
import { Cake, ChevronLeft, ChevronRight, Gift, Plus, Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { timeAgo } from "@/components/alerts-bell";
import { CustomerForm, prettyPhone, SegmentBadge, SEGMENT_STYLE } from "@/components/crm";
import { MiniStat } from "@/components/stats-panel";
import { Avatar, Button, Card, CardTitle, ContactButtons, Empty, ErrorBox, Input, Modal, money, PageHeader, Select, Skeleton, cn } from "@/components/ui";
import { qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { tr, locale } from "@/lib/i18n";
import { Glyph, Iconized } from "@/components/glyph";

const SORTS = [
  { value: "spent", label: "Бештар харид кардааст" },
  { value: "recent", label: "Охирин ташриф" },
  { value: "points", label: "Бештар балл" },
  { value: "new", label: "Навтарин" },
];

export default function CustomersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isChef = user?.role === "CHEF";
  const [branchId, setBranchId] = useState<number | undefined>();
  const [segment, setSegment] = useState<Segment | "">("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("spent");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const { data: branches } = useApi<Branch[]>(isChef ? "/branches" : null);
  const { data: stats } = useApi<CustomerStats>(`/customers/stats${qs({ branchId })}`);
  const { data, error } = useApi<Paginated<Customer>>(
    `/customers${qs({ branchId, segment, search: search.trim() || undefined, sort, page })}`,
  );
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const reset = () => setPage(1);

  return (
    <>
      <PageHeader
        title={tr("Мизоҷон ва бонус")}
        subtitle={tr("Ҳар харид {0}% бонус медиҳад · 1 балл = 1 сомонӣ · бонус дар ҳамаи филиалҳо кор мекунад", POINTS_RATE * 100)}
        actions={
          <>
            {isChef && (
              <Select
                value={branchId ?? ""}
                onChange={(e) => {
                  setBranchId(Number(e.target.value) || undefined);
                  reset();
                }}
                className="w-56"
                aria-label={tr("Филиал")}
              >
                <option value="">{tr("Ҳамаи филиалҳо")}</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
            <Button onClick={() => setCreating(true)}>
              <UserPlus className="size-4" /> {tr("Мизоҷи нав")}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat icon={<Users className="size-5" />} label={tr("Ҳамаи мизоҷон")} value={stats?.total.toLocaleString(locale()) ?? "—"} />
        <MiniStat icon={<Plus className="size-5" />} label={tr("Нав дар ин моҳ")} value={stats?.newThisMonth ?? "—"} />
        <MiniStat icon={<Gift className="size-5" />} label={tr("Баллҳои ҷамъшуда")} value={stats ? `${stats.pointsOutstanding.toLocaleString(locale())}` : "—"} />
        <MiniStat icon={<Cake className="size-5" />} label={tr("Зодрӯз дар 7 рӯз")} value={stats?.birthdaysThisWeek.length ?? "—"} />
      </div>

      {/* Segments */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SEGMENTS.map((s) => {
          const active = segment === s;
          const count = stats?.bySegment[s] ?? 0;
          const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0;
          return (
            <button
              key={s}
              onClick={() => {
                setSegment(active ? "" : s);
                reset();
              }}
              className={cn(
                "card card-hover cursor-pointer p-4 text-left",
                active && "border-brand ring-4 ring-brand/10",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-ink-2"><Glyph e={SEGMENT_STYLE[s].emoji} className="size-5" /></span>
                <span className="text-xs font-semibold text-muted tabular">{pct}%</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-ink tabular">{stats ? count : "—"}</div>
              <div className="text-sm font-semibold text-ink-2">{tr(SEGMENT_LABELS[s])}</div>
              <div className="mt-0.5 text-[11px] text-muted">{tr(SEGMENT_HINTS[s])}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-0">
          <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  reset();
                }}
                placeholder={tr("Ном, телефон ё почта…")}
                className="pl-10"
              />
            </div>
            <Select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full sm:w-56" aria-label={tr("Тартиб")}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {tr(s.label)}
                </option>
              ))}
            </Select>
          </div>
          <div className="p-2">
            <ErrorBox message={error} />
            {!data ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : data.items.length === 0 ? (
              <Empty icon="🧑‍🤝‍🧑" title={tr("Мизоҷ ёфт нашуд")} text={tr("Филтрро тағйир диҳед ё мизоҷи нав илова кунед.")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="text-left text-xs tracking-wide text-muted uppercase">
                      <th className="px-3 py-3 font-semibold">{tr("Мизоҷ")}</th>
                      <th className="px-3 py-3 font-semibold">{tr("Сегмент")}</th>
                      <th className="px-3 py-3 text-right font-semibold">{tr("Харид")}</th>
                      <th className="px-3 py-3 text-right font-semibold">{tr("Ташриф")}</th>
                      <th className="px-3 py-3 text-right font-semibold">{tr("Балл")}</th>
                      <th className="px-3 py-3 font-semibold">{tr("Охирин")}</th>
                      <th className="px-3 py-3 font-semibold">{tr("Тамос")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => router.push(`/customers/view?id=${c.id}`)}
                        className="cursor-pointer border-t border-line transition hover:bg-surface-2"
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={c.fullName} size={36} />
                            <div className="min-w-0">
                              <div className="font-semibold whitespace-nowrap text-ink">{c.fullName}</div>
                              <div className="text-xs whitespace-nowrap text-muted tabular">
                                {prettyPhone(c.phone)}
                                {isChef && !branchId && c.branchName ? ` · ${c.branchName.replace("FilialHub ", "")}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <SegmentBadge segment={c.segment} />
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap text-ink tabular">{money(c.totalSpent)}</td>
                        <td className="px-3 py-2.5 text-right text-ink-2 tabular">{c.visits}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap tabular">
                          <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-bold text-warn"><Glyph e="🎁" className="mr-0.5 inline size-3 -mt-0.5" />{c.points}</span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-ink-2">{c.lastVisitAt ? timeAgo(c.lastVisitAt) : "—"}</td>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <ContactButtons phone={c.phone} email={c.email ?? undefined} name={c.fullName} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {data && data.total > data.pageSize && (
            <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-muted">
              <span>{data.total.toLocaleString(locale())} {tr("мизоҷ")}</span>
              <div className="flex items-center gap-2">
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
          )}
        </Card>

        <Card className="h-fit">
          <CardTitle>{tr("🎂 Зодрӯзҳои наздик")}</CardTitle>
          {!stats ? (
            <Skeleton className="h-40" />
          ) : stats.birthdaysThisWeek.length === 0 ? (
            <Empty icon="🎈" title={tr("Дар 7 рӯз зодрӯз нест")} />
          ) : (
            <ul className="space-y-2">
              {stats.birthdaysThisWeek.map((b) => (
                <li key={b.id} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-2.5">
                  <Avatar name={b.fullName} size={34} />
                  <Link href={`/customers/view?id=${b.id}`} className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink hover:text-brand">{b.fullName}</div>
                    <div className="text-xs text-muted">
                      {new Date(b.birthday!).toLocaleDateString(locale(), { day: "numeric", month: "long" })}
                    </div>
                  </Link>
                  <ContactButtons phone={b.phone} name={b.fullName} />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 rounded-xl bg-surface-2 p-3 text-xs text-muted">
            <Iconized text={tr("💡 Ба мизоҷон дар рӯзи зодрӯз тавассути WhatsApp табрик ва тахфиф фиристед — ин сабаби бозгашти онҳо мешавад.")} />
          </p>
        </Card>
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title={tr("Мизоҷи нав")}>
        {creating && (
          <CustomerForm
            onDone={(c) => {
              setCreating(false);
              router.push(`/customers/view?id=${c.id}`);
            }}
          />
        )}
      </Modal>
    </>
  );
}
