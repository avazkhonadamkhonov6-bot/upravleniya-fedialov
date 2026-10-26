"use client";

import { ONLINE_NEXT, ONLINE_STATUS_LABELS, ONLINE_STATUSES, type OnlineOrder, type OnlineOrderStatus } from "@filialhub/shared";
import { Banknote, CreditCard, MapPin, MessageSquare, Phone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, Empty, ErrorBox, formatDate, money, PageHeader, Skeleton, cn } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import { ProductIcon, StatusIcon } from "@/components/glyph";

const TONE: Record<OnlineOrderStatus, "brand" | "warn" | "blue" | "good" | "neutral"> = {
  NEW: "brand",
  ACCEPTED: "warn",
  DELIVERING: "blue",
  DELIVERED: "good",
  CANCELLED: "neutral",
};

/** Фармоишҳои онлайни мизоҷон: қабул → дар роҳ → расонида шуд (баъд ба фурӯш ва фоида медарояд) */
export default function OnlineOrdersPage() {
  const [status, setStatus] = useState<OnlineOrderStatus | "">("");
  const { data, error, reload } = useApi<OnlineOrder[]>(`/online-orders${qs({ status })}`);
  const { data: all, reload: reloadAll } = useApi<OnlineOrder[]>("/online-orders");
  const refresh = useCallback(() => {
    reload();
    reloadAll();
  }, [reload, reloadAll]);

  useEffect(() => {
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [refresh]);

  const count = (s: OnlineOrderStatus) => all?.filter((o) => o.status === s).length ?? 0;

  return (
    <>
      <PageHeader title={tr("Фармоишҳои онлайн")} subtitle={tr("Фармоишҳои мизоҷон аз бозори онлайн. Ҳар 15 сония нав мешавад.")} />
      <div className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <FilterChip on={!status} onClick={() => setStatus("")}>
          {tr("Ҳама")} <b className="tabular">{all?.length ?? 0}</b>
        </FilterChip>
        {ONLINE_STATUSES.map((s) => (
          <FilterChip key={s} on={status === s} onClick={() => setStatus(s)}>
            <StatusIcon status={s} className="size-4" /> {tr(ONLINE_STATUS_LABELS[s])} <b className="tabular">{count(s)}</b>
          </FilterChip>
        ))}
      </div>
      <ErrorBox message={error} />
      {!data ? (
        <Skeleton className="h-48" />
      ) : data.length === 0 ? (
        <Empty icon="🛍️" title={tr("Фармоиши онлайн нест")} text={tr("Вақте мизоҷ аз мағозаи шумо фармоиш диҳад, дар ин ҷо пайдо мешавад.")} />
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onChange={refresh}
            />
          ))}
        </div>
      )}
    </>
  );
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition",
        on ? "bg-brand-soft text-brand" : "bg-surface-2 text-ink-2 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

const ACTION_LABEL: Partial<Record<OnlineOrderStatus, string>> = {
  ACCEPTED: "Қабул кардан",
  DELIVERING: "Фиристодан",
  DELIVERED: "Расонида шуд, пул гирифта шуд",
  CANCELLED: "Бекор",
};

function OrderCard({ order: o, onChange }: { order: OnlineOrder; onChange: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<OnlineOrderStatus | null>(null);

  async function move(status: OnlineOrderStatus) {
    if (status === "CANCELLED" && !confirm(tr("Фармоиш #{0} бекор карда шавад?", o.id))) return;
    if (status === "DELIVERED" && !confirm(tr("Мизоҷ {0} ({1}) пардохт кард?", money(o.total), o.payment === "CARD" ? tr("корт") : tr("нақд")))) return;
    setBusy(status);
    try {
      await api(`/online-orders/${o.id}`, { method: "PATCH", json: { status } });
      toast.success(status === "DELIVERED" ? tr("Расонида шуд — ба фурӯш илова гардид") : tr("Ҳолат нав шуд"));
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className={cn("rise flex flex-col", o.status === "NEW" && "glow-border")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold text-ink">#{o.id} · {o.client?.fullName ?? "—"}</div>
          <div className="text-xs text-muted">
            {formatDate(o.createdAt, true)}
            {o.branch && ` · ${o.branch.name}`}
          </div>
        </div>
        <Badge tone={TONE[o.status]}>
          <StatusIcon status={o.status} className="size-3.5" /> {tr(ONLINE_STATUS_LABELS[o.status])}
        </Badge>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {o.items.map((i, k) => (
          <li key={k} className="flex justify-between gap-2">
            <span className="truncate text-ink-2">
              <ProductIcon value={i.emoji} className="mr-1 inline size-4 -mt-0.5 text-muted" />{i.name} × {i.qty} {tr(i.unit)}
            </span>
            <span className="shrink-0 tabular">{money(i.unitPrice * i.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-1 rounded-xl bg-surface-2 p-3 text-xs text-ink-2">
        <div className="flex items-center gap-1.5 font-semibold text-ink">
          {o.payment === "CARD" ? <CreditCard className="size-3.5 shrink-0" /> : <Banknote className="size-3.5 shrink-0" />}
          {o.payment === "CARD" ? tr("Корт") : tr("Нақд")} · {o.status === "DELIVERED" ? tr("пардохт шуд") : tr("пардохт ҳангоми гирифтан")}
        </div>
        <div className="flex items-start gap-1.5"><MapPin className="mt-0.5 size-3.5 shrink-0" /> {o.address}</div>
        <a href={`tel:${o.phone.replace(/\s/g, "")}`} className="flex items-center gap-1 font-semibold text-brand">
          <Phone className="size-3.5" /> {o.phone}
        </a>
        {o.note && <div className="flex items-start gap-1.5"><MessageSquare className="mt-0.5 size-3.5 shrink-0" /> {o.note}</div>}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="text-lg font-extrabold text-ink tabular">{money(o.total)}</span>
        <div className="flex gap-2">
          {ONLINE_NEXT[o.status].map((s) => (
            <Button key={s} size="sm" variant={s === "CANCELLED" ? "outline" : "primary"} loading={busy === s} disabled={!!busy} onClick={() => move(s)}>
              {tr(ACTION_LABEL[s] ?? ONLINE_STATUS_LABELS[s])}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}
