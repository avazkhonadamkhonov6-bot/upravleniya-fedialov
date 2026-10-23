"use client";

import { type Customer } from "@filialhub/shared";
import { ArrowLeft, Cake, CalendarDays, Mail, Pencil, Phone, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { timeAgo } from "@/components/alerts-bell";
import { CustomerForm, prettyPhone, SegmentBadge } from "@/components/crm";
import { useToast } from "@/components/toast";
import { Avatar, Button, Card, CardTitle, ContactButtons, Empty, ErrorBox, formatDate, Modal, money, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { tr, locale } from "@/lib/i18n";

interface Detail {
  customer: Customer;
  favorites: { name: string; emoji: string; qty: number }[];
  orders: {
    id: number;
    createdAt: string;
    branchName: string;
    total: number;
    discount: number;
    pointsEarned: number;
    pointsUsed: number;
    items: string[];
  }[];
}

export default function CustomerViewPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <CustomerView />
    </Suspense>
  );
}

function CustomerView() {
  const id = Number(useSearchParams().get("id")) || 0;
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { data, error, reload } = useApi<Detail>(id ? `/customers/${id}` : null);
  const [editing, setEditing] = useState(false);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Skeleton className="h-64" />;
  const c = data.customer;

  async function remove() {
    if (!confirm(tr("{0} нест карда шавад? Таърихи фармоишҳо мемонад.", c.fullName))) return;
    try {
      await api(`/customers/${c.id}`, { method: "DELETE" });
      toast.success(tr("Мизоҷ нест карда шуд"));
      router.replace("/customers");
    } catch (e) {
      toast.error(tr("Хатогӣ"), (e as Error).message);
    }
  }

  const facts = [
    { icon: Phone, label: tr("Телефон"), value: prettyPhone(c.phone) },
    { icon: Mail, label: tr("Почта"), value: c.email ?? "—" },
    { icon: Cake, label: tr("Зодрӯз"), value: c.birthday ? new Date(c.birthday).toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" }) : "—" },
    { icon: CalendarDays, label: tr("Мизоҷ аз"), value: new Date(c.createdAt).toLocaleDateString(locale()) },
  ];

  return (
    <>
      <Link href="/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {tr("Ҳамаи мизоҷон")}
      </Link>

      <div className="rise relative mb-6 overflow-hidden rounded-[28px] bg-[#170d0f] p-6 text-white shadow-card sm:p-8">
        <div className="absolute -top-24 -right-10 size-72 rounded-full bg-[#e4002b] opacity-45 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 size-64 rounded-full bg-[#ffb36b] opacity-15 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-4">
            <Avatar name={c.fullName} size={72} />
            <div>
              <div className="mb-1.5">
                <SegmentBadge segment={c.segment} />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{c.fullName}</h1>
              <div className="text-sm text-white/60">
                {c.branchName ?? tr("Филиал нест")} {tr("· охирин ташриф")}{" "}{c.lastVisitAt ? timeAgo(c.lastVisitAt) : "—"}
              </div>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4 lg:ml-auto lg:max-w-2xl">
            {[
              [tr("🎁 Балл"), c.points.toLocaleString(locale())],
              [tr("💰 Харид"), money(c.totalSpent)],
              [tr("🧾 Ташриф"), String(c.visits)],
              [tr("💳 Чеки миёна"), money(c.avgCheck)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                <div className="text-xs text-white/60">{l}</div>
                <div className="mt-1 text-lg font-bold tabular">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardTitle
              extra={
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)} aria-label={tr("Таҳрир")}>
                    <Pencil className="size-4" />
                  </Button>
                  {user?.role === "CHEF" && (
                    <Button variant="danger" size="sm" onClick={remove} aria-label={tr("Нест кардан")}>
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              }
            >
              {tr("Маълумот")}
            </CardTitle>
            <ul className="space-y-2">
              {facts.map((f) => (
                <li key={f.label} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                  <f.icon className="size-4 text-muted" />
                  <span className="text-sm text-muted">{f.label}</span>
                  <span className="ml-auto truncate text-sm font-semibold text-ink">{f.value}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-line p-3">
              <span className="text-sm font-medium text-ink-2">{tr("Навиштан")}</span>
              <ContactButtons phone={c.phone} email={c.email ?? undefined} name={c.fullName} />
            </div>
            {c.note && <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">📝 {c.note}</p>}
          </Card>
          <Card>
            <CardTitle>{tr("❤️ Маҳсулоти дӯстдошта")}</CardTitle>
            {data.favorites.length === 0 ? (
              <Empty icon="🍽" title={tr("Ҳоло харид нест")} />
            ) : (
              <ul className="space-y-2">
                {data.favorites.map((f, i) => (
                  <li key={f.name} className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-xl">{f.emoji}</span>
                    <span className="flex-1 text-sm font-semibold text-ink">{f.name}</span>
                    <span className="text-sm text-muted tabular">{f.qty} {tr("дона")}</span>
                    {i === 0 && <span className="text-base">🏆</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="p-0">
          <div className="border-b border-line p-5">
            <h2 className="text-base font-semibold text-ink">{tr("Таърихи харид")}</h2>
            <p className="text-sm text-muted">{tr("30 фармоиши охирин")}</p>
          </div>
          {data.orders.length === 0 ? (
            <Empty icon="🧾" title={tr("Фармоиш нест")} />
          ) : (
            <ol className="relative p-5">
              <span className="absolute top-8 bottom-8 left-[33px] w-px bg-line" />
              {data.orders.map((o) => (
                <li key={o.id} className="relative flex gap-4 pb-5 last:pb-0">
                  <span className="relative z-10 mt-1 grid size-7 shrink-0 place-items-center rounded-full border-2 border-surface bg-brand-soft text-xs">🧾</span>
                  <div className="min-w-0 flex-1 rounded-2xl border border-line p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-ink">
                        #{o.id} · {o.branchName.replace("FilialHub ", "")}
                      </div>
                      <div className="text-sm font-bold text-ink tabular">{money(o.total)}</div>
                    </div>
                    <div className="mt-0.5 text-xs text-muted">{formatDate(o.createdAt, true)}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {o.items.map((i) => (
                        <span key={i} className="rounded-lg bg-surface-2 px-2 py-0.5 text-xs text-ink-2">
                          {i}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                      {o.pointsEarned > 0 && <span className="text-good">+{o.pointsEarned} {tr("балл")}</span>}
                      {o.pointsUsed > 0 && <span className="text-warn">−{o.pointsUsed} {tr("балл (тахфиф")}{" "}{money(o.discount)})</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title={tr("Таҳрири мизоҷ")}>
        {editing && (
          <CustomerForm
            customer={c}
            onDone={() => {
              setEditing(false);
              reload();
            }}
          />
        )}
      </Modal>
    </>
  );
}
