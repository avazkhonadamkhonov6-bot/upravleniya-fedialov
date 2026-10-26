"use client";

import { BUSINESS_TYPE_EMOJI, ONLINE_STATUS_EMOJI, ONLINE_STATUS_LABELS, type OnlineOrder, type OnlineOrderStatus } from "@filialhub/shared";
import { useEffect, useState } from "react";
import { NeedClient } from "@/components/shop-shell";
import { useToast } from "@/components/toast";
import { Button, ErrorBox, formatDate, money, cn } from "@/components/ui";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { storeTheme } from "@/lib/store-theme";
import { useApi } from "@/lib/use-api";

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
  useEffect(() => {
    const t = setInterval(reload, 15000);
    return () => clearInterval(t);
  }, [reload]);

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
        <div className="mt-6 h-40 animate-pulse rounded-3xl bg-surface-2" />
      ) : list.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-muted">
          <div className="text-5xl">📦</div>
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
    <article className="rise overflow-hidden border border-line bg-surface shadow-card" style={{ borderRadius: th.radius }}>
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="truncate font-bold text-ink">
            {BUSINESS_TYPE_EMOJI[o.store.type]} {o.store.name}
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
          {ONLINE_STATUS_EMOJI[o.status]} {tr(ONLINE_STATUS_LABELS[o.status])}
        </span>
      </div>

      {o.status !== "CANCELLED" && (
        <ol className="flex items-center gap-1 px-4" aria-label={tr("Ҳолати фармоиш")}>
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 flex-col items-center gap-1">
              <span className="h-1.5 w-full rounded-full" style={{ background: i <= stepIdx ? th.accent : "var(--line)" }} />
              <span className={cn("text-[10px] font-semibold sm:text-[11px]", i <= stepIdx ? "text-ink" : "text-muted")}>{tr(ONLINE_STATUS_LABELS[s])}</span>
            </li>
          ))}
        </ol>
      )}

      <ul className="mt-3 space-y-1 px-4 text-sm">
        {o.items.map((i, k) => (
          <li key={k} className="flex justify-between gap-2">
            <span className="truncate text-ink-2">
              {i.emoji} {i.name} × {i.qty} {tr(i.unit)}
            </span>
            <span className="shrink-0 text-ink tabular">{money(i.unitPrice * i.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line px-4 py-3">
        <div className="min-w-0 text-xs text-muted">
          <div className="truncate">📍 {o.address}</div>
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
