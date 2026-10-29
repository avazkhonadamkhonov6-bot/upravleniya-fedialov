"use client";

import { BUSINESS_TYPE_LABELS, isFractionalUnit, type StoreDetail } from "@filialhub/shared";
import { ArrowLeft, MapPin, Minus, Phone, Plus, ShoppingCart, Star } from "lucide-react";
import Link from "next/link";
import { useState, ViewTransition } from "react";
import { money, cn } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { flyToCart } from "@/lib/fx";
import { tr } from "@/lib/i18n";
import { storeTheme } from "@/lib/store-theme";
import { BusinessIcon, ProductIcon } from "@/components/glyph";
import { ProductVisual } from "@/components/product-visual";
import { Stars } from "@/components/stars";

/**
 * Мағоза: ҳар навъ услуби худро дорад (рангҳо, кунҷҳо, ҳарфҳо, ороиш).
 * Маълумот аз сервер меояд (app/shop/[store]/page.tsx) — ном, меню ва нарх дар HTML барои Google.
 */
export function StoreView({ store }: { store: StoreDetail }) {
  const cart = useCart();
  const [category, setCategory] = useState("");
  const [picked, setPicked] = useState<number>();

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

      <ViewTransition name={`store-hero-${store.id}`} share="store-morph" default="none">
        <section className="relative overflow-hidden p-6 text-white sm:p-10" style={{ background: th.hero, borderRadius: th.radius }}>
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 grid-cols-2 place-items-center gap-2 text-6xl opacity-30 sm:grid" aria-hidden>
            {th.decor.map((e, i) => (
              <span key={e} className="float-y" style={{ animationDelay: `${i * 0.4}s` }}>
                <ProductIcon value={e} type={store.type} className="size-16" />
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <BusinessIcon type={store.type} className="size-3.5" /> {tr(BUSINESS_TYPE_LABELS[store.type])}
          </span>
          <h1 className={cn("relative mt-3 text-3xl sm:text-4xl", th.titleClass)}>{store.name}</h1>
          <p className="relative mt-2 max-w-lg text-white/80">{store.description || tr(th.tagline)}</p>
          <div className="relative mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/75">
            <span className="flex items-center gap-1">
              <MapPin className="size-4" /> {store.cities.join(", ")}
            </span>
            {store.rating !== null && (
              <a href="#reviews" className="flex items-center gap-1 hover:text-white">
                <Star className="size-4 fill-[#ffb400] text-[#ffb400]" /> <b className="text-white">{store.rating.toFixed(1)}</b> ({tr("{0} баҳо", store.reviewCount)})
              </a>
            )}
            {store.branchList[0] && (
              <a href={`tel:${store.branchList[0].phone.replace(/\s/g, "")}`} className="flex items-center gap-1 hover:text-white">
                <Phone className="size-4" /> {store.branchList[0].phone}
              </a>
            )}
          </div>
        </section>
      </ViewTransition>

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
            <div key={p.id} data-tilt="7" className="group flex flex-col border border-line bg-surface p-3 shadow-card hover:shadow-xl sm:p-4" style={{ borderRadius: th.radius }}>
              <div className="relative grid aspect-[4/3] place-items-center overflow-hidden text-5xl sm:text-6xl" style={{ background: th.soft, borderRadius: `calc(${th.radius} * 0.75)` }}>
                {p.imageId ? (
                  <span className="size-full transition duration-500 group-hover:scale-105">
                    <ProductVisual imageId={p.imageId} emoji={p.emoji} name={p.name} type={store.type} />
                  </span>
                ) : (
                  <span data-depth className="transition duration-500 group-hover:scale-125 group-hover:-rotate-6" style={{ color: th.accent }}>
                    <ProductIcon value={p.emoji} type={store.type} className="size-12 sm:size-14" />
                  </span>
                )}
                {p.soldOut && (
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center text-xs font-bold text-white">{tr("Тамом шуд")}</span>
                )}
              </div>
              <div className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold text-ink">{p.name}</div>
              <div className="mt-1 text-base font-bold tabular" style={{ color: th.accent }}>
                {money(p.price)} <span className="text-xs font-medium text-muted">/ {tr(p.unit)}</span>
              </div>
              <div className="mt-auto pt-3">
                {p.soldOut && qty === 0 ? (
                  <div className="flex h-10 items-center justify-center text-sm font-semibold text-muted" style={{ background: "var(--surface-2)", borderRadius: `calc(${th.radius} * 0.6)` }}>
                    {tr("Дар анбор нест")}
                  </div>
                ) : qty === 0 ? (
                  <button
                    onClick={(e) => {
                      flyToCart(e.currentTarget, p.emoji);
                      cart.add(meta, line, step(p.unit));
                    }}
                    className="fx-btn fx-shine flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 text-sm font-semibold transition active:scale-95"
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
                    <button
                      onClick={(e) => {
                        flyToCart(e.currentTarget, p.emoji);
                        cart.add(meta, line, step(p.unit));
                      }}
                      className="grid size-8 cursor-pointer place-items-center"
                      style={{ color: th.accent }}
                      aria-label={tr("Зиёд")}
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {store.reviews.length > 0 && (
        <section id="reviews" className="mt-10 scroll-mt-24">
          <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
            {tr("Баҳои мизоҷон")}
            <span className="flex items-center gap-1 text-base font-semibold text-muted">
              <Star className="size-4 fill-[#ffb400] text-[#ffb400]" /> {store.rating?.toFixed(1)} · {tr("{0} баҳо", store.reviewCount)}
            </span>
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {store.reviews.map((r) => (
              <article key={r.id} className="border border-line bg-surface p-4" style={{ borderRadius: `calc(${th.radius} * 0.75)` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">{r.author}</span>
                  <Stars value={r.rating} className="size-3.5" />
                </div>
                {r.text && <p className="mt-2 text-sm text-ink-2">{r.text}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {mine && mine.lines.length > 0 && (
        <Link
          href="/shop/cart"
          data-cart-target
          className="pop fx-shine fixed inset-x-4 bottom-24 z-30 overflow-hidden mx-auto flex max-w-md items-center justify-between px-5 py-3.5 text-sm font-semibold shadow-2xl md:bottom-6"
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
