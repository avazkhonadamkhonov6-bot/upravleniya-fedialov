"use client";

import { PAYMENT_LABELS, type Supplier, type SupplierDetail } from "@filialhub/shared";
import { Banknote, CreditCard, Phone, Plus, Search, Truck } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, cn, Empty, ErrorBox, Field, formatDate, Input, Modal, money, PageHeader, Segmented, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";

/**
 * Таъминкунандагон: аз кӣ мол мехарем ва чӣ қадар ба онҳо қарздорем.
 * Харид дар «Анбор → Қабули мол» бо номи таъминкунанда сабт мешавад; «ба қарз» — қарз меафзояд, пардохт — кам.
 */
export default function SuppliersPage() {
  const { user } = useAuth();
  const { data, error, reload } = useApi<Supplier[]>(user?.role !== "STAFF" ? "/suppliers" : null);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  if (user?.role === "STAFF") return <Empty icon="🔒" title={tr("Ин саҳифа барои шеф ва менеҷер аст")} />;

  const q = query.trim().toLowerCase();
  const list = (data ?? []).filter((s) => !q || `${s.name} ${s.phone}`.toLowerCase().includes(q));
  const totalDebt = (data ?? []).reduce((s, x) => s + x.debt, 0);
  const owed = (data ?? []).filter((s) => s.debt > 0).length;

  return (
    <>
      <PageHeader
        title={tr("Таъминкунандагон")}
        subtitle={tr("Аз кӣ мол мехарем ва чӣ қадар ба онҳо қарздорем")}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> {tr("Таъминкунандаи нав")}
          </Button>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <div className="text-sm text-muted">{tr("Қарзи мо (ҳамагӣ)")}</div>
          <div className={cn("mt-1 text-2xl font-bold tabular", totalDebt > 0 ? "text-brand" : "text-ink")}>{data ? money(totalDebt) : "…"}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-muted">{tr("Ба кӣ қарздорем")}</div>
          <div className="mt-1 text-2xl font-bold text-ink tabular">{data ? owed : "…"}</div>
        </div>
        <div className="card hidden p-5 lg:block">
          <div className="text-sm text-muted">{tr("Ҳамаи таъминкунандагон")}</div>
          <div className="mt-1 text-2xl font-bold text-ink tabular">{data ? data.length : "…"}</div>
        </div>
      </div>

      <ErrorBox message={error} />
      <Card className="p-2">
        <label className="m-3 flex h-11 items-center gap-2 rounded-[14px] border-[1.5px] border-line bg-surface px-3 focus-within:border-brand">
          <Search className="size-4 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("Ҷустуҷӯ: ном ё телефон")}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted focus-visible:outline-none"
          />
        </label>
        {!data ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <Empty
            icon="🚚"
            title={tr("Ҳоло таъминкунанда нест")}
            text={tr("Дар «Анбор → Қабули мол» номи таъминкунандаро нависед — ӯ худкор дар ин ҷо пайдо мешавад.")}
          />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => setOpen(s.id)} className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left hover:bg-surface-2">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                    <Truck className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{s.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {s.phone && `${s.phone} · `}
                      {tr("харид: {0}", money(s.purchased))}
                      {s.lastPurchaseAt && ` · ${tr("охирин: {0}", formatDate(s.lastPurchaseAt))}`}
                    </span>
                  </span>
                  {s.debt > 0 ? <Badge tone="brand">{tr("қарз {0}", money(s.debt))}</Badge> : <Badge tone="good">{tr("қарз нест")}</Badge>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title={tr("Таъминкунандаи нав")}>
        {creating && (
          <CreateForm
            onDone={() => {
              setCreating(false);
              reload();
            }}
          />
        )}
      </Modal>
      <Modal open={open !== null} onClose={() => setOpen(null)} title={data?.find((s) => s.id === open)?.name ?? ""} wide>
        {open !== null && <SupplierCard id={open} onChange={reload} />}
      </Modal>
    </>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await api("/suppliers", { method: "POST", json: { name, phone: phone || undefined, note: note || undefined } });
          onDone();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <ErrorBox message={error} />
      <Field label={tr("Ном")}>
        <Input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("Масалан: «Сомон-Трейд»")} autoFocus />
      </Field>
      <Field label={tr("Телефон")} hint={tr("Ихтиёрӣ")}>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} inputMode="tel" />
      </Field>
      <Field label={tr("Эзоҳ")} hint={tr("Ихтиёрӣ")}>
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </Field>
      <Button type="submit" className="w-full" loading={busy} disabled={busy}>
        {tr("Илова кардан")}
      </Button>
    </form>
  );
}

/** Як таъминкунанда: қарз, пардохт, қарзи дастӣ ва таърихи харидҳо */
function SupplierCard({ id, onChange }: { id: number; onChange: () => void }) {
  const toast = useToast();
  const { data, error, reload } = useApi<SupplierDetail>(`/suppliers/${id}`);
  const [mode, setMode] = useState<"pay" | "debt">("pay");
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState<"CASH" | "CARD">("CASH");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Skeleton className="h-60" />;
  const s = data.supplier;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await api(`/suppliers/${id}/${mode}`, { method: "POST", json: { amount: Number(amount), ...(mode === "pay" ? { payment } : {}), note: note.trim() || undefined } });
      toast.success(mode === "pay" ? tr("Пардохт сабт шуд") : tr("Қарз сабт шуд"), `${s.name}: ${money(Number(amount))}`);
      setAmount("");
      setNote("");
      reload();
      onChange();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-brand-soft p-3">
          <div className="text-xs text-muted">{tr("Қарзи мо")}</div>
          <div className="text-2xl font-bold text-brand tabular">{money(s.debt)}</div>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <div className="text-xs text-muted">{tr("Ҳамаи харидҳо")}</div>
          <div className="text-2xl font-bold text-ink tabular">{money(s.purchased)}</div>
        </div>
      </div>
      {s.phone && (
        <a href={`tel:${s.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
          <Phone className="size-4" /> {s.phone}
        </a>
      )}

      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line p-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "pay", label: "Мо пардохт кардем" },
            { value: "debt", label: "Қарзи кӯҳна" },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tr("Маблағ (сомонӣ)")} hint={mode === "pay" && s.debt > 0 ? tr("Қарз: {0}", money(s.debt)) : undefined}>
            <Input type="number" min={0.01} step="0.01" max={mode === "pay" ? s.debt : undefined} required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          {mode === "pay" && (
            <Field label={tr("Чӣ тавр")}>
              <Segmented
                value={payment}
                onChange={setPayment}
                options={[
                  { value: "CASH", label: "Нақд" },
                  { value: "CARD", label: "Корт" },
                ]}
              />
            </Field>
          )}
        </div>
        <Field label={tr("Эзоҳ")} hint={tr("Ихтиёрӣ")}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </Field>
        <ErrorBox message={formError} />
        <Button type="submit" className="w-full" loading={busy} disabled={busy || !(Number(amount) > 0) || (mode === "pay" && s.debt <= 0)}>
          {mode === "pay" ? tr("Пардохтро сабт кунед") : tr("Қарзро сабт кунед")}
        </Button>
      </form>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">{tr("Ҳаракати қарз")}</h3>
        {data.entries.length === 0 ? (
          <p className="text-sm text-muted">{tr("Ҳоло нест")}</p>
        ) : (
          <ul className="max-h-56 divide-y divide-line overflow-y-auto text-sm">
            {data.entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-ink">{e.note || (e.amount < 0 ? tr("Пардохт") : tr("Қарз"))}</span>
                  <span className="block text-xs text-muted">
                    {formatDate(e.createdAt, true)}
                    {e.userName && ` · ${e.userName}`}
                    {e.payment && (
                      <>
                        {" · "}
                        {e.payment === "CARD" ? <CreditCard className="inline size-3" /> : <Banknote className="inline size-3" />} {tr(PAYMENT_LABELS[e.payment])}
                      </>
                    )}
                  </span>
                </span>
                <b className={cn("shrink-0 tabular", e.amount < 0 ? "text-good" : "text-brand")}>
                  {e.amount < 0 ? "−" : "+"}
                  {money(Math.abs(e.amount))}
                </b>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">{tr("Харидҳо (Қабули мол)")}</h3>
        {data.purchases.length === 0 ? (
          <p className="text-sm text-muted">{tr("Ҳоло нест")}</p>
        ) : (
          <ul className="max-h-56 divide-y divide-line overflow-y-auto text-sm">
            {data.purchases.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-ink">
                    {p.productName} × {p.qty} {tr(p.unit)}
                  </span>
                  <span className="block text-xs text-muted">
                    {formatDate(p.createdAt, true)} · {p.branchName}
                  </span>
                </span>
                <b className="shrink-0 text-ink tabular">{p.unitCost !== null ? money(p.unitCost * p.qty) : "—"}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
