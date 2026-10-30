"use client";

import { PAYMENT_LABELS, type Customer, type DebtEntry, type DebtSummary } from "@filialhub/shared";
import { BellRing, HandCoins, History, Plus, Search } from "lucide-react";
import { useState } from "react";
import { prettyPhone } from "@/components/crm";
import { useToast } from "@/components/toast";
import { Avatar, Button, Card, Empty, ErrorBox, Field, formatDate, Input, Modal, money, PageHeader, Segmented, Skeleton, cn } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";

type Action = { kind: "pay" | "add" | "history"; customer: Customer };

/** Дафтари қарз: кӣ чанд қарздор аст; пардохт, қарзи нав ва ёдрас ба WhatsApp */
export default function DebtsPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const { data: summary, reload: reloadSummary } = useApi<DebtSummary>("/debts/summary");
  const { data, error, reload } = useApi<Customer[]>(`/debts${qs({ q: q.trim() || undefined })}`);
  const [action, setAction] = useState<Action | null>(null);
  const [reminding, setReminding] = useState<number | null>(null);

  const refresh = () => {
    reload();
    reloadSummary();
  };

  async function remind(c: Customer) {
    setReminding(c.id);
    try {
      const r = await api<{ status: string }>(`/debts/${c.id}/remind`, { method: "POST" });
      if (r.status === "SENT") toast.success(tr("Ёдрас фиристода шуд"), c.fullName);
      else if (r.status === "DRY_RUN") toast.error(tr("WhatsApp пайваст нест"), tr("Дар «Профил» WhatsApp-и бизнесро пайваст кунед."));
      else toast.error(tr("Фиристода нашуд"), c.phone);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setReminding(null);
    }
  }

  return (
    <>
      <PageHeader title={tr("Дафтари қарз")} subtitle={tr("Мизоҷоне, ки ба қарз гирифтанд. Бот ба онҳо дар WhatsApp хабар медиҳад ва ҳар ҳафта то пардохт ёдрас мекунад.")} />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm text-muted">{tr("Ҳамагӣ қарз")}</div>
          <div className="mt-1 text-3xl font-bold text-brand tabular">{summary ? money(summary.total) : "—"}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">{tr("Қарздорон")}</div>
          <div className="mt-1 text-3xl font-bold text-ink tabular">{summary?.debtors ?? "—"}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">{tr("Ёдраси худкор")}</div>
          <div className={cn("mt-1 text-lg font-bold", summary?.whatsapp ? "text-good" : "text-warn")}>
            {summary ? (summary.whatsapp ? tr("WhatsApp — ҳар ҳафта") : tr("WhatsApp пайваст нест")) : "—"}
          </div>
          {summary && !summary.whatsapp && <div className="text-xs text-muted">{tr("Дар «Профил» WhatsApp-и бизнесро пайваст кунед.")}</div>}
        </div>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Ном ё рақами телефон")} className="pl-11" aria-label={tr("Ҷустуҷӯ")} />
      </div>

      <ErrorBox message={error} />
      <Card className="p-2">
        {!data ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <Empty icon="📒" title={q ? tr("Ёфт нашуд") : tr("Қарздор нест")} text={tr("Дар «Фурӯши нав» мизоҷро интихоб кунед ва «Қарз»-ро пахш кунед — фурӯш ба ин дафтар меояд.")} />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                <Avatar name={c.fullName} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-ink">{c.fullName}</div>
                  <div className="text-xs text-muted tabular">{prettyPhone(c.phone)}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-brand tabular">{money(c.debt)}</div>
                </div>
                <div className="flex w-full gap-1.5 sm:w-auto">
                  <Button size="sm" onClick={() => setAction({ kind: "pay", customer: c })}>
                    <HandCoins className="size-4" /> {tr("Пардохт")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remind(c)} loading={reminding === c.id} aria-label={tr("Ёдрас дар WhatsApp")}>
                    <BellRing className="size-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAction({ kind: "add", customer: c })} aria-label={tr("Қарзи нав")}>
                    <Plus className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAction({ kind: "history", customer: c })} aria-label={tr("Таърих")}>
                    <History className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={action ? `${action.customer.fullName} · ${action.kind === "pay" ? tr("Пардохти қарз") : action.kind === "add" ? tr("Қарзи нав") : tr("Таърихи қарз")}` : ""}
      >
        {action?.kind === "history" && <DebtHistory customerId={action.customer.id} />}
        {action && action.kind !== "history" && (
          <DebtForm
            action={action}
            onDone={() => {
              setAction(null);
              refresh();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function DebtForm({ action, onDone }: { action: Action; onDone: () => void }) {
  const toast = useToast();
  const pay = action.kind === "pay";
  const [amount, setAmount] = useState(pay ? String(action.customer.debt) : "");
  const [payment, setPayment] = useState<"CASH" | "CARD">("CASH");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const n = Number(amount) || 0;
  const after = pay ? Math.max(0, action.customer.debt - n) : action.customer.debt + n;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/debts/${action.customer.id}/${pay ? "pay" : "add"}`, { method: "POST", json: pay ? { amount: n, payment, note } : { amount: n, note } });
      toast.success(pay ? tr("Пардохт қабул шуд") : tr("Қарз илова шуд"), tr("Қарзи боқимонда: {0}", money(after)));
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="rounded-2xl bg-surface-2 p-4 text-sm">
        {tr("Қарзи ҳозира")}: <b className="text-brand tabular">{money(action.customer.debt)}</b>
      </div>
      <Field label={tr("Маблағ (сомонӣ)")}>
        <Input type="number" min={0.01} step="0.01" required autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      {pay && (
        <Segmented
          value={payment}
          onChange={setPayment}
          options={[
            { value: "CASH", label: PAYMENT_LABELS.CASH },
            { value: "CARD", label: PAYMENT_LABELS.CARD },
          ]}
        />
      )}
      <Field label={tr("Эзоҳ")} hint={tr("Ихтиёрӣ")}>
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </Field>
      {n > 0 && (
        <div className="text-sm text-muted">
          {tr("Пас аз захира")}: <b className="text-ink tabular">{money(after)}</b>
        </div>
      )}
      <p className="text-xs text-muted">{tr("Мизоҷ дар WhatsApp паём мегирад.")}</p>
      <ErrorBox message={error} />
      <Button type="submit" loading={busy} className="w-full">
        {pay ? tr("Пардохтро сабт кардан") : tr("Қарзро илова кардан")}
      </Button>
    </form>
  );
}

function DebtHistory({ customerId }: { customerId: number }) {
  const { data, error } = useApi<{ customer: Customer; entries: DebtEntry[] }>(`/debts/${customerId}`);
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Skeleton className="h-40" />;
  if (!data.entries.length) return <Empty icon="📒" title={tr("Таърих холӣ аст")} />;
  return (
    <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto text-sm">
      {data.entries.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <div className="font-semibold text-ink">
              {e.amount > 0 ? (e.orderId ? tr("Фурӯш ба қарз #{0}", e.orderId) : tr("Қарзи нав")) : tr("Пардохт · {0}", tr(PAYMENT_LABELS[e.payment ?? "CASH"]))}
            </div>
            <div className="truncate text-xs text-muted">
              {formatDate(e.createdAt, true)}
              {e.userName && ` · ${e.userName}`}
              {e.note && ` · ${e.note}`}
            </div>
          </div>
          <span className={cn("shrink-0 font-bold tabular", e.amount > 0 ? "text-brand" : "text-good")}>
            {e.amount > 0 ? "+" : "−"}
            {money(Math.abs(e.amount))}
          </span>
        </li>
      ))}
    </ul>
  );
}
