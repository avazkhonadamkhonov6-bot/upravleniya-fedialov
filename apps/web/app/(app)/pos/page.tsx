"use client";

import { PAYMENT_LABELS, POINTS_RATE, type Branch, type Customer, type Order, type Payment, type Product } from "@filialhub/shared";
import { CheckCircle2, Gift, Minus, Plus, Search, ShoppingCart, Trash2, UserPlus, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CustomerForm, prettyPhone, SegmentBadge } from "@/components/crm";
import { useToast } from "@/components/toast";
import { Avatar, Button, Card, Empty, ErrorBox, Input, Modal, money, PageHeader, Select, Skeleton, cn } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { tr } from "@/lib/i18n";

export default function PosPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Pos />
    </Suspense>
  );
}

function Pos() {
  const { user } = useAuth();
  const toast = useToast();
  const initialPhone = useSearchParams().get("phone") ?? "";
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const isChef = user?.role === "CHEF";
  const { data: products } = useApi<Product[]>("/products");
  const { data: branches } = useApi<Branch[]>(isChef ? "/branches" : null);
  const [branchId, setBranchId] = useState<number | undefined>();
  const [cart, setCart] = useState<Record<number, number>>({});
  const [payment, setPayment] = useState<Payment>("CASH");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Order | null>(null);

  const active = useMemo(() => products?.filter((p) => p.isActive) ?? [], [products]);
  const categories = [...new Set(active.map((p) => p.category))];
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: active.find((p) => p.id === Number(id))!, qty }))
    .filter((l) => l.product && l.qty > 0);
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const discount = customer && usePoints ? Math.min(customer.points, Math.floor(subtotal)) : 0;
  const total = subtotal - discount;
  const willEarn = customer ? Math.floor(total * POINTS_RATE) : 0;
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const activeBranches = branches?.filter((b) => b.isActive);
  const selectedBranch = isChef ? (branchId ?? activeBranches?.[0]?.id) : undefined;

  const add = (id: number, d: number) =>
    setCart((c) => {
      const next = { ...c, [id]: Math.max(0, (c[id] ?? 0) + d) };
      if (!next[id]) delete next[id];
      return next;
    });

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const order = await api<Order>("/orders", {
        method: "POST",
        json: {
          branchId: selectedBranch,
          payment,
          items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
          customerId: customer?.id,
          usePoints: discount || undefined,
        },
      });
      setDone(order);
      setCart({});
      setCustomer(null);
      setUsePoints(false);
      toast.success(tr("Фармоиш #{0} сабт шуд", order.id), order.customerName ? tr("{0}: +{1} балл 🎁", order.customerName, order.pointsEarned) : money(order.total));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={tr("Фурӯши нав")}
        subtitle={isChef ? tr("Филиалро интихоб кунед ва фармоишро сабт кунед") : user?.branch?.name}
        actions={
          isChef && (
            <Select value={selectedBranch ?? ""} onChange={(e) => setBranchId(Number(e.target.value))} className="w-60" aria-label={tr("Филиал")}>
              {activeBranches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {["", ...categories].map((c) => (
              <button
                key={c || "all"}
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition",
                  category === c ? "bg-ink text-surface" : "bg-surface text-ink-2 ring-1 ring-line hover:text-ink",
                )}
              >
                {c ? tr(c) : tr("Ҳама")}
              </button>
            ))}
          </div>
          {!products ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {active
                .filter((p) => !category || p.category === category)
                .map((p) => {
                  const qty = cart[p.id] ?? 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => add(p.id, 1)}
                      className={cn(
                        "card relative flex cursor-pointer flex-col items-start p-4 text-left transition hover:-translate-y-0.5 active:scale-[0.98]",
                        qty > 0 && "border-brand ring-4 ring-brand/10",
                      )}
                    >
                      {qty > 0 && (
                        <span className="brand-gradient absolute top-3 right-3 grid size-7 place-items-center rounded-full text-xs font-bold text-white">
                          {qty}
                        </span>
                      )}
                      <span className="text-4xl">{p.emoji}</span>
                      <span className="mt-3 line-clamp-2 text-sm font-semibold text-ink">{p.name}</span>
                      <span className="mt-auto pt-2 text-base font-bold text-brand tabular">{money(p.price)}</span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        <Card className="flex h-fit flex-col lg:sticky lg:top-10">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingCart className="size-5 text-brand" />
            <h2 className="text-base font-semibold text-ink">{tr("Фармоиш")}</h2>
            <span className="ml-auto text-sm text-muted">{count} {tr("дона")}</span>
          </div>

          {done ? (
            <div className="rise py-6 text-center">
              <CheckCircle2 className="mx-auto size-14 text-good" />
              <div className="mt-3 text-lg font-bold text-ink">{tr("Фармоиш #")}{done.id} {tr("сабт шуд!")}</div>
              <div className="text-sm text-muted">{done.branchName}</div>
              <div className="mt-2 text-2xl font-bold text-ink tabular">{money(done.total)}</div>
              {done.customerName && (
                <div className="pop mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-warn-soft px-3 py-1.5 text-sm font-semibold text-warn">
                  <Gift className="size-4" /> {done.customerName}: +{done.pointsEarned} {tr("балл")}
                  {done.pointsUsed > 0 && tr(" · −{0} истифода шуд", done.pointsUsed)}
                </div>
              )}
              <Button className="mt-5 w-full" onClick={() => setDone(null)}>
                {tr("Фармоиши нав")}
              </Button>
            </div>
          ) : lines.length === 0 ? (
            <Empty icon="🛒" title={tr("Сабад холӣ аст")} text={tr("Барои илова кардан ба маҳсулот пахш кунед.")} />
          ) : (
            <>
              <ul className="-mx-1 max-h-[340px] space-y-1 overflow-y-auto">
                {lines.map(({ product: p, qty }) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl px-1 py-2">
                    <span className="text-2xl">{p.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                      <div className="text-xs text-muted tabular">{money(p.price * qty)}</div>
                    </div>
                    <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1">
                      <button onClick={() => add(p.id, -1)} className="grid size-7 cursor-pointer place-items-center rounded-lg hover:bg-surface" aria-label={tr("Кам")}>
                        {qty === 1 ? <Trash2 className="size-3.5 text-brand" /> : <Minus className="size-3.5" />}
                      </button>
                      <span className="w-6 text-center text-sm font-bold tabular">{qty}</span>
                      <button onClick={() => add(p.id, 1)} className="grid size-7 cursor-pointer place-items-center rounded-lg hover:bg-surface" aria-label={tr("Зиёд")}>
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <CustomerPicker
                customer={customer}
                initialPhone={initialPhone}
                onChange={(c) => {
                  setCustomer(c);
                  setUsePoints(false);
                }}
              />
              {customer && customer.points > 0 && (
                <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm">
                  <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="size-4 accent-[var(--warn)]" />
                  <span className="flex-1 font-semibold text-warn">
                    {tr("Пардохт бо бонус: −")}{Math.min(customer.points, Math.floor(subtotal))} {tr("сомонӣ")}
                  </span>
                  <span className="text-xs text-warn/80">{tr("аз")}{" "}{customer.points}</span>
                </label>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {(["CASH", "CARD"] as Payment[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPayment(p)}
                    className={cn(
                      "cursor-pointer rounded-xl border p-2.5 text-sm font-semibold transition",
                      payment === p ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-2",
                    )}
                  >
                    {p === "CASH" ? "💵" : "💳"} {tr(PAYMENT_LABELS[p])}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-1 border-t border-dashed border-line pt-4 text-sm">
                {discount > 0 && (
                  <>
                    <div className="flex justify-between text-muted">
                      <span>{tr("Маблағ")}</span>
                      <span className="tabular">{money(subtotal)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-warn">
                      <span>{tr("🎁 Бонус")}</span>
                      <span className="tabular">−{money(discount)}</span>
                    </div>
                  </>
                )}
                <div className="flex items-end justify-between">
                  <span className="text-muted">{tr("Ҳамагӣ")}</span>
                  <span className="text-3xl font-extrabold text-ink tabular">{money(total)}</span>
                </div>
                {customer && <div className="text-right text-xs font-semibold text-good">+{willEarn} {tr("балл ба")}{" "}{customer.fullName.split(" ")[0]}</div>}
              </div>
              <div className="mt-3">
                <ErrorBox message={error} />
              </div>
              <Button className="mt-3 h-12 w-full text-base" loading={busy} onClick={submit}>
                {tr("Сабт кардан")}
              </Button>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

/** Ҷустуҷӯи мизоҷ аз рӯи рақам; агар набошад — сабти зуд. */
function CustomerPicker({ customer, initialPhone, onChange }: { customer: Customer | null; initialPhone: string; onChange: (c: Customer | null) => void }) {
  const [phone, setPhone] = useState(initialPhone);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [creating, setCreating] = useState(false);

  async function find(e?: React.FormEvent) {
    e?.preventDefault();
    if (phone.replace(/\D/g, "").length < 9) return;
    setBusy(true);
    setNotFound(false);
    try {
      const c = await api<Customer | null>(`/customers/lookup?phone=${encodeURIComponent(phone)}`);
      if (c) onChange(c);
      else setNotFound(true);
    } catch {
      setNotFound(true);
    } finally {
      setBusy(false);
    }
  }

  if (customer) {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3">
        <Avatar name={customer.fullName} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-ink">{customer.fullName}</span>
            <SegmentBadge segment={customer.segment} />
          </div>
          <div className="text-xs text-muted tabular">
            {prettyPhone(customer.phone)} · 🎁 {customer.points} {tr("балл")}
          </div>
        </div>
        <button onClick={() => onChange(null)} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink" aria-label={tr("Бекор кардан")}>
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <form onSubmit={find} className="flex gap-2">
        <div className="relative flex-1">
          <Gift className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setNotFound(false);
            }}
            placeholder={tr("Рақами мизоҷ (бонус)")}
            inputMode="tel"
            className="h-10 pl-9"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-10" loading={busy} aria-label={tr("Ёфтан")}>
          <Search className="size-4" />
        </Button>
      </form>
      {notFound && (
        <button
          onClick={() => setCreating(true)}
          className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-brand/40 p-2 text-sm font-semibold text-brand hover:bg-brand-soft"
        >
          <UserPlus className="size-4" /> {tr("Мизоҷ нест — сабт кардан")}
        </button>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title={tr("Мизоҷи нав")}>
        {creating && (
          <CustomerForm
            initialPhone={phone}
            onDone={(c) => {
              setCreating(false);
              onChange(c);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
