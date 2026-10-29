"use client";

import { Banknote, CreditCard, MapPin, Package } from "lucide-react";
import { ONLINE_STATUS_LABELS, type OnlineOrder, type OnlineOrderStatus } from "@filialhub/shared";
import { useState } from "react";
import { NeedClient } from "@/components/shop-shell";
import { useToast } from "@/components/toast";
import { Button, ErrorBox, formatDate, money, cn } from "@/components/ui";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { storeTheme } from "@/lib/store-theme";
import { useApi } from "@/lib/use-api";
import { useVisibleInterval } from "@/lib/use-interval";
import { BusinessIcon, ProductIcon, StatusIcon } from "@/components/glyph";

const STEPS: OnlineOrderStatus[] = ["NEW", "ACCEPTED", "DELIVERING", "DELIVERED"];
const FILTERS = [
  { value: "", label: "Ҳама" },
  { value: "active", label: "Дар роҳ" },
  { value: "DELIVERED", label: "Гирифта шуд" },
  { value: "CANCELLED", label: "Бекор шуд" },
] as const;

/** Саҳифаи 3: таърихи фармоишҳо — кадомаш гирифта шуд, кадомаш дар роҳ */
export default function OrdersPage() {
  return (
    <NeedClient>
      <Orders />
    </NeedClient>
  );
}

function Orders() {
  const { data, error, reload } = useApi<OnlineOrder[]>("/shop/orders");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("");

  // Ҳолат худкор нав мешавад (мағоза фармоишро қабул мекунад, мефиристад…)
  useVisibleInterval(reload, 15000);

  const active = (o: OnlineOrder) => o.status !== "DELIVERED" && o.status !== "CANCELLED";
  const list = (data ?? []).filter((o) => (!filter ? true : filter === "active" ? active(o) : o.status === filter));
  const count = (f: (typeof FILTERS)[number]["value"]) => (data ?? []).filter((o) => (!f ? true : f === "active" ? active(o) : o.status === f)).length;

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{tr("Фармоишҳои ман")}</h1>
      <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap",
              filter === f.value ? "brand-gradient border-transparent text-white" : "border-line bg-surface text-ink-2",
            )}
          >
            {tr(f.label)} <b className="tabular">{count(f.value)}</b>
          </button>
        ))}
      </div>
      <ErrorBox message={error} />
      {!data ? (
        <div className="mt-6 h-40 skeleton rounded-3xl" />
      ) : list.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-muted">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand"><Package className="size-8" /></div>
          <p className="mt-3">{tr("Фармоиш нест")}</p>
        </div>
      ) : (
        <div className="stagger mt-5 grid gap-4 lg:grid-cols-2">
          {list.map((o) => (
            <OrderCard key={o.id} order={o} onChange={reload} />
          ))}
        </div>
      )}
    </>
  );
}

function OrderCard({ order: o, onChange }: { order: OnlineOrder; onChange: () => void }) {
  const th = storeTheme(o.store.type);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const stepIdx = STEPS.indexOf(o.status);

  async function cancel() {
    if (!confirm(tr("Фармоиш #{0} бекор карда шавад?", o.id))) return;
    setBusy(true);
    try {
      await api(`/shop/orders/${o.id}/cancel`, { method: "POST" });
      toast.success(tr("Фармоиш бекор шуд"));
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article data-reveal className="overflow-hidden border border-line bg-surface shadow-card" style={{ borderRadius: th.radius }}>
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="truncate font-bold text-ink">
            <span className="inline-flex items-center gap-1.5"><BusinessIcon type={o.store.type} className="size-4" /> {o.store.name}</span>
          </div>
          <div className="text-xs text-muted">
            #{o.id} · {formatDate(o.createdAt, true)}
            {o.branch && ` · ${o.branch.name}`}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap",
            o.status === "DELIVERED" ? "bg-good-soft text-good" : o.status === "CANCELLED" ? "bg-surface-2 text-muted" : "bg-warn-soft text-warn",
          )}
        >
          <span className="inline-flex items-center gap-1"><StatusIcon status={o.status} className="size-3.5" /> {tr(ONLINE_STATUS_LABELS[o.status])}</span>
        </span>
      </div>

      {o.status !== "CANCELLED" && (
        <ol className="flex items-center gap-1 px-4" aria-label={tr("Ҳолати фармоиш")}>
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 flex-col items-center gap-1">
              <span className="relative h-1.5 w-full overflow-hidden rounded-full bg-line">
                {i <= stepIdx && (
                  <span className="bar-fill absolute inset-0 rounded-full" style={{ background: th.accent, animationDelay: `${i * 180}ms` }} />
                )}
              </span>
              {i === stepIdx && o.status !== "DELIVERED" && (
                <span className="step-pulse -mt-2.5 size-2.5 rounded-full" style={{ background: th.accent, "--step": th.accent } as React.CSSProperties} />
              )}
              <span className={cn("text-[11px] font-semibold sm:text-[11px]", i <= stepIdx ? "text-ink" : "text-muted")}>{tr(ONLINE_STATUS_LABELS[s])}</span>
            </li>
          ))}
        </ol>
      )}

      <ul className="mt-3 space-y-1 px-4 text-sm">
        {o.items.map((i, k) => (
          <li key={k} className="flex justify-between gap-2">
            <span className="truncate text-ink-2">
              <ProductIcon value={i.emoji} type={o.store.type} className="mr-1 inline size-4 -mt-0.5" />{i.name} × {i.qty} {tr(i.unit)}
            </span>
            <span className="shrink-0 text-ink tabular">{money(i.unitPrice * i.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line px-4 py-3">
        <div className="min-w-0 space-y-0.5 text-xs text-muted">
          <div className="flex items-center gap-1">
            {o.payment === "CARD" ? <CreditCard className="size-3.5 shrink-0" /> : <Banknote className="size-3.5 shrink-0" />}
            {o.payment === "CARD" ? tr("Корт") : tr("Нақд")} · {o.status === "DELIVERED" ? tr("пардохт шуд") : tr("пардохт ҳангоми гирифтан")}
          </div>
          <div className="flex items-center gap-1 truncate"><MapPin className="size-3.5 shrink-0" /> {o.address}</div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {o.status === "NEW" && (
            <Button size="sm" variant="outline" onClick={cancel} loading={busy}>
              {tr("Бекор кардан")}
            </Button>
          )}
          <span className="text-base font-bold tabular" style={{ color: th.accent }}>
            {money(o.total)}
          </span>
        </div>
      </div>
    </article>
  );
}
