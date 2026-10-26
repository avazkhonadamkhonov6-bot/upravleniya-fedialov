"use client";

import { BUSINESS_TYPE_EMOJI, BUSINESS_TYPE_LABELS, isFractionalUnit, type StoreDetail } from "@filialhub/shared";
import { ArrowLeft, MapPin, Minus, Phone, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ErrorBox, money, cn } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { tr } from "@/lib/i18n";
import { storeTheme } from "@/lib/store-theme";
import { useApi } from "@/lib/use-api";

export default function StorePage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-surface-2" />}>
      <Store />
    </Suspense>
  );
}

/** Мағоза: ҳар навъ услуби худро дорад (рангҳо, кунҷҳо, ҳарфҳо, ороиш) */
function Store() {
  const id = Number(useSearchParams().get("id"));
  const { data: store, error } = useApi<StoreDetail>(id ? `/shop/stores/${id}` : null);
  const cart = useCart();
  const [category, setCategory] = useState("");
  const [picked, setPicked] = useState<number>();

  if (error) return <ErrorBox message={error} />;
  if (!store) return <div className="h-64 animate-pulse rounded-3xl bg-surface-2" />;

  const th = storeTheme(store.type);
  const categories = [...new Set(store.catalog.map((p) => p.category))];
  const list = store.catalog.filter((p) => !category || p.category === category);
  const mine = cart.stores.find((s) => s.storeId === store.id);
  const total = mine?.lines.reduce((s, l) => s + l.price * l.qty, 0) ?? 0;
  const meta = { storeId: store.id, storeName: store.name, type: store.type, branchId: mine?.branchId ?? picked ?? store.branchList[0]?.id };
  const step = (unit: string) => (isFractionalUnit(unit) ? 0.5 : 1);

  return (
    <div style={{ "--store-accent": th.accent } as React.CSSProperties}>
      <Link href="/shop" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {tr("Ҳамаи мағозаҳо")}
      </Link>

      <section className="rise relative overflow-hidden p-6 text-white sm:p-10" style={{ background: th.hero, borderRadius: th.radius }}>
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 grid-cols-2 place-items-center gap-2 text-6xl opacity-30 sm:grid" aria-hidden>
          {th.decor.map((e, i) => (
            <span key={e} className="float-y" style={{ animationDelay: `${i * 0.4}s` }}>
              {e}
            </span>
          ))}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
          {BUSINESS_TYPE_EMOJI[store.type]} {tr(BUSINESS_TYPE_LABELS[store.type])}
        </span>
        <h1 className={cn("relative mt-3 text-3xl sm:text-4xl", th.titleClass)}>{store.name}</h1>
        <p className="relative mt-2 max-w-lg text-white/80">{store.description || tr(th.tagline)}</p>
        <div className="relative mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/75">
          <span className="flex items-center gap-1">
            <MapPin className="size-4" /> {store.cities.join(", ")}
          </span>
          {store.branchList[0] && (
            <a href={`tel:${store.branchList[0].phone.replace(/\s/g, "")}`} className="flex items-center gap-1 hover:text-white">
              <Phone className="size-4" /> {store.branchList[0].phone}
            </a>
          )}
        </div>
      </section>

      {store.branchList.length > 1 && (
        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{tr("Аз кадом филиал?")}</div>
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
            {store.branchList.map((b) => {
              const on = meta.branchId === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    setPicked(b.id);
                    if (mine) cart.setBranch(store.id, b.id);
                  }}
                  className="shrink-0 cursor-pointer border px-3 py-2 text-left text-sm transition"
                  style={{ borderRadius: th.radius, borderColor: on ? th.accent : "var(--line)", background: on ? th.soft : "var(--surface)", color: on ? th.accent : undefined }}
                >
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-xs opacity-75">
                    {b.city}, {b.address}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="scrollbar-none sticky top-16 z-20 -mx-4 mt-5 flex gap-2 overflow-x-auto bg-bg/90 px-4 py-2 backdrop-blur">
        {["", ...categories].map((c) => {
          const on = category === c;
          return (
            <button
              key={c || "all"}
              onClick={() => setCategory(c)}
              className="shrink-0 cursor-pointer border px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition"
              style={{ borderRadius: th.radius, background: on ? th.accent : "var(--surface)", color: on ? th.onAccent : "var(--ink-2)", borderColor: on ? th.accent : "var(--line)" }}
            >
              {c ? tr(c) : tr("Ҳама")}
            </button>
          );
        })}
      </div>

      <div className="stagger mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => {
          const qty = cart.qtyOf(store.id, p.id);
          const line = { productId: p.id, name: p.name, emoji: p.emoji, unit: p.unit, price: p.price };
          return (
            <div key={p.id} className="rise flex flex-col border border-line bg-surface p-3 shadow-card sm:p-4" style={{ borderRadius: th.radius }}>
              <div className="grid aspect-[4/3] place-items-center text-5xl sm:text-6xl" style={{ background: th.soft, borderRadius: `calc(${th.radius} * 0.75)` }}>
                {p.emoji}
              </div>
              <div className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold text-ink">{p.name}</div>
              <div className="mt-1 text-base font-bold tabular" style={{ color: th.accent }}>
                {money(p.price)} <span className="text-xs font-medium text-muted">/ {tr(p.unit)}</span>
              </div>
              <div className="mt-auto pt-3">
                {qty === 0 ? (
                  <button
                    onClick={() => cart.add(meta, line, step(p.unit))}
                    className="flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 text-sm font-semibold transition active:scale-95"
                    style={{ background: th.accent, color: th.onAccent, borderRadius: `calc(${th.radius} * 0.6)` }}
                  >
                    <Plus className="size-4" /> {tr("Ба сабад")}
                  </button>
                ) : (
                  <div className="flex h-10 items-center justify-between px-1" style={{ background: th.soft, borderRadius: `calc(${th.radius} * 0.6)` }}>
                    <button onClick={() => cart.add(meta, line, -step(p.unit))} className="grid size-8 cursor-pointer place-items-center" style={{ color: th.accent }} aria-label={tr("Кам")}>
                      <Minus className="size-4" />
                    </button>
                    <span className="text-sm font-bold text-ink tabular">
                      {qty} {tr(p.unit)}
                    </span>
                    <button onClick={() => cart.add(meta, line, step(p.unit))} className="grid size-8 cursor-pointer place-items-center" style={{ color: th.accent }} aria-label={tr("Зиёд")}>
                      <Plus className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {mine && mine.lines.length > 0 && (
        <Link
          href="/shop/cart"
          className="pop fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-md items-center justify-between px-5 py-3.5 text-sm font-semibold shadow-2xl md:bottom-6"
          style={{ background: th.accent, color: th.onAccent, borderRadius: th.radius }}
        >
          <span className="flex items-center gap-2">
            <ShoppingCart className="size-5" /> {tr("{0} маҳсулот", mine.lines.length)}
          </span>
          <span className="tabular">
            {money(total)} → {tr("Сабад")}
          </span>
        </Link>
      )}
    </div>
  );
}
