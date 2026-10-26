"use client";

import { BUSINESS_TYPE_EMOJI, isFractionalUnit, type OnlineOrder } from "@filialhub/shared";
import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NeedClient } from "@/components/shop-shell";
import { useToast } from "@/components/toast";
import { Button, ErrorBox, Field, Input, money } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCart, type CartStore } from "@/lib/cart";
import { tr } from "@/lib/i18n";
import { storeTheme } from "@/lib/store-theme";

/** Саҳифаи 2: сабад — аз чанд мағоза ва чанд маҳсулот; ҳар мағоза фармоиши алоҳида */
export default function CartPage() {
  const { stores } = useCart();
  const items = stores.reduce((s, st) => s + st.lines.length, 0);
  const total = stores.reduce((s, st) => s + st.lines.reduce((a, l) => a + l.price * l.qty, 0), 0);

  return (
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{tr("Сабад")}</h1>
      {stores.length === 0 ? (
        <div className="card mt-6 p-10 text-center">
          <div className="text-6xl">🛒</div>
          <p className="mt-4 font-semibold text-ink">{tr("Сабад холӣ аст")}</p>
          <Link href="/shop" className="brand-gradient mt-5 inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold text-white">
            {tr("Ба мағозаҳо")}
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">{tr("Аз {0} мағоза · {1} маҳсулот · {2}", stores.length, items, money(total))}</p>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {stores.map((s) => (
              <StoreCart key={s.storeId} store={s} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function StoreCart({ store }: { store: CartStore }) {
  const cart = useCart();
  const { client } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const th = storeTheme(store.type);
  const [address, setAddress] = useState(client?.address ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = store.lines.reduce((s, l) => s + l.price * l.qty, 0);

  async function order(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const o = await api<OnlineOrder>("/shop/orders", {
        method: "POST",
        json: { storeId: store.storeId, branchId: store.branchId, address, phone, note, items: store.lines.map((l) => ({ productId: l.productId, qty: l.qty })) },
      });
      cart.clearStore(store.storeId);
      toast.success(tr("Фармоиш #{0} фиристода шуд", o.id));
      router.push("/shop/orders");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <section className="rise overflow-hidden border border-line bg-surface shadow-card" style={{ borderRadius: th.radius }}>
      <div className="flex items-center justify-between px-5 py-4 text-white" style={{ background: th.hero }}>
        <Link href={`/shop/store?id=${store.storeId}`} className="font-bold hover:underline">
          {BUSINESS_TYPE_EMOJI[store.type]} {store.storeName}
        </Link>
        <span className="text-sm text-white/80">{tr("{0} маҳсулот", store.lines.length)}</span>
      </div>
      <ul className="divide-y divide-line px-3">
        {store.lines.map((l) => {
          const step = isFractionalUnit(l.unit) ? 0.5 : 1;
          return (
            <li key={l.productId} className="flex items-center gap-3 py-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: th.soft }}>
                {l.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{l.name}</div>
                <div className="text-xs text-muted tabular">
                  {money(l.price)} × {l.qty} {tr(l.unit)} = <b className="text-ink">{money(l.price * l.qty)}</b>
                </div>
              </div>
              <div className="flex items-center gap-0.5 rounded-xl bg-surface-2 p-1">
                <button onClick={() => cart.add(store, l, -step)} className="grid size-7 cursor-pointer place-items-center rounded-lg hover:bg-surface" aria-label={tr("Кам")}>
                  {l.qty <= step ? <Trash2 className="size-3.5 text-brand" /> : <Minus className="size-3.5" />}
                </button>
                {isFractionalUnit(l.unit) ? (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.001"
                    value={l.qty}
                    onChange={(e) => cart.setQty(store.storeId, l.productId, Number(e.target.value))}
                    className="w-14 rounded-md bg-surface px-1 text-center text-sm font-bold tabular outline-none"
                    aria-label={tr("Миқдор ({0})", tr(l.unit))}
                  />
                ) : (
                  <span className="w-7 text-center text-sm font-bold tabular">{l.qty}</span>
                )}
                <button onClick={() => cart.add(store, l, step)} className="grid size-7 cursor-pointer place-items-center rounded-lg hover:bg-surface" aria-label={tr("Зиёд")}>
                  <Plus className="size-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-line p-5">
        <NeedClient>
          <form onSubmit={order} className="space-y-3">
            <Field label={tr("Суроғаи расонидан")}>
              <Input required minLength={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={tr("Шаҳр, кӯча, хона")} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={tr("Телефон")}>
                <Input type="tel" required minLength={7} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label={tr("Эзоҳ")}>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("Масалан: зангӣ надорад")} />
              </Field>
            </div>
            <ErrorBox message={error} />
            <Button type="submit" loading={busy} className="w-full" style={{ background: th.accent, color: th.onAccent }}>
              {tr("Фармоиш додан")} · {money(total)}
            </Button>
          </form>
        </NeedClient>
      </div>
    </section>
  );
}
