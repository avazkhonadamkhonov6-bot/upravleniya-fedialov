"use client";

import { BUSINESS_TYPE_LABELS, BUSINESS_TYPES, type BusinessType, type StoreSummary } from "@filialhub/shared";
import { MapPin, Search, Store } from "lucide-react";
import Link from "next/link";
import { useState, ViewTransition } from "react";
import { ErrorBox, Input, cn } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";
import { storeTheme } from "@/lib/store-theme";
import { storePath } from "@/lib/store-url";
import { useApi } from "@/lib/use-api";
import { BusinessIcon, ProductIcon } from "@/components/glyph";

/** Саҳифаи 1: ҳамаи мағозаҳо ва тарабхонаҳо, аз рӯи навъ */
export default function StoresPage() {
  const { client } = useAuth();
  const { data, error } = useApi<StoreSummary[]>("/shop/stores");
  const [type, setType] = useState<BusinessType | "">("");
  const [q, setQ] = useState("");

  const byType = BUSINESS_TYPES.map((t) => ({ t, n: data?.filter((s) => s.type === t).length ?? 0 })).filter((x) => x.n > 0);
  const list = (data ?? []).filter((s) => (!type || s.type === type) && (!q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <>
      <section className="relative overflow-hidden rounded-[32px] bg-[#dc3b1c] p-6 text-white sm:p-10">
        <div className="pointer-events-none absolute -top-16 -right-16 size-[220px] rounded-full bg-[#ff7a1a] sm:size-[300px]" aria-hidden />
        <div className="float-y pointer-events-none absolute right-[30%] bottom-6 hidden size-20 rounded-full bg-[#ffc531] sm:block" aria-hidden />
        <p className="relative text-sm font-semibold text-[#ffe6da]">{client ? tr("Салом, {0}!", client.fullName.split(" ")[0]) : tr("Хуш омадед!")}</p>
        <h1 className="title-in relative mt-2 max-w-[620px] font-display text-[clamp(26px,5.6vw,44px)] leading-[1.1] font-extrabold tracking-[-0.025em]">{tr("Аз кадом мағоза фармоиш медиҳед?")}</h1>
        {data && (
          <p className="relative mt-4 text-[15px] text-[#ffe6da]">
            {tr("{0} мағоза · {1} навъ · {2} маҳсулот", data.length, byType.length, data.reduce((s, x) => s + x.products, 0))}
          </p>
        )}
        <div className="relative mt-5 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Ҷустуҷӯи мағоза…")} className="h-[50px] border-0 pl-10 text-ink" />
        </div>
      </section>

      <div className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip on={!type} onClick={() => setType("")}>
          <Store className="size-4" /> {tr("Ҳама")} <b className="tabular">{data?.length ?? 0}</b>
        </Chip>
        {byType.map(({ t, n }) => (
          <Chip key={t} on={type === t} onClick={() => setType(type === t ? "" : t)}>
            <BusinessIcon type={t} className="size-4" /> {tr(BUSINESS_TYPE_LABELS[t])} <b className="tabular">{n}</b>
          </Chip>
        ))}
      </div>

      <ErrorBox message={error} />
      {!data ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 skeleton rounded-3xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-10 text-center text-muted">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-surface-2"><Search className="size-8" /></div>
          <p className="mt-3">{tr("Мағоза ёфт нашуд")}</p>
        </div>
      ) : (
        <div className="stagger mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <StoreCard key={s.id} store={s} />
          ))}
        </div>
      )}
    </>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-bold whitespace-nowrap transition",
        on ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink hover:border-ink-2/40",
      )}
    >
      {children}
    </button>
  );
}

/** Корти мағоза — бо услуби навъи худ */
function StoreCard({ store }: { store: StoreSummary }) {
  const th = storeTheme(store.type);
  return (
    <Link
      href={storePath(store)}
      data-reveal
      data-tilt="10"
      className="group block overflow-hidden border border-line bg-surface shadow-card hover:shadow-2xl"
      style={{ borderRadius: th.radius }}
    >
      <ViewTransition name={`store-hero-${store.id}`} share="store-morph" default="none">
        <div className="relative h-[150px] overflow-hidden px-5 pt-4 text-white" style={{ background: th.hero, borderRadius: `${th.radius} ${th.radius} 0 0` }}>
          <span className={cn("absolute bottom-4 left-5 max-w-[70%] truncate text-[26px] leading-none", th.titleClass)} style={{ color: th.onAccent }} aria-hidden>
            {store.name}
          </span>
          <div className="absolute -right-2 -bottom-3 flex gap-1 text-4xl opacity-80 transition duration-500 group-hover:-translate-y-2 group-hover:scale-125 group-hover:-rotate-6" aria-hidden>
            {(store.preview.length ? store.preview : th.decor).slice(0, 3).map((e, i) => (
              <span key={e} className="float-y" style={{ animationDelay: `${i * 0.5}s` }}>
                <ProductIcon value={e} type={store.type} className="size-10 drop-shadow-lg" />
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold" style={{ background: th.soft, color: th.accent }}>
            <BusinessIcon type={store.type} className="size-3.5" /> {tr(BUSINESS_TYPE_LABELS[store.type])}
          </span>
        </div>
      </ViewTransition>
      <div className="p-5" data-depth>
        <h2 className={cn("text-lg text-ink", th.titleClass)}>{store.name}</h2>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">{store.description || tr(th.tagline)}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" /> {store.cities.join(", ")}
          </span>
          <span className="rounded-full px-2.5 py-1 font-semibold" style={{ background: th.soft, color: th.accent }}>
            {tr("{0} маҳсулот", store.products)}
          </span>
        </div>
      </div>
    </Link>
  );
}
