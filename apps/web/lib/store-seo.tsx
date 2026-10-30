import { BUSINESS_TYPE_LABELS, type BusinessType, type StoreDetail } from "@filialhub/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ForceLang } from "@/components/force-lang";
import { StoreView } from "@/components/store-view";
import { getStore } from "./shop-data";
import { SITE_NAME, SITE_URL } from "./site";
import { storeIdFrom, storePath } from "./store-url";

// Саҳифаи мағоза барои Google бо ду забон: /shop/12-nom (тоҷикӣ) ва /ru/shop/12-nom (русӣ).
// Ном, меню ва нарх ҳамонанд; сарлавҳа, тавсиф ва JSON-LD ба забони саҳифа.
export type SeoLang = "tg" | "ru";
export type StoreProps = { params: Promise<{ store: string }> };

const RU_TYPES: Record<BusinessType, string> = {
  RESTAURANT: "ресторан / кафе",
  GROCERY: "продуктовый магазин",
  CLOTHING: "магазин одежды",
  PLUMBING: "магазин сантехники",
  ELECTRONICS: "магазин техники",
  PHARMACY: "аптека",
  BUILDING: "стройматериалы",
  OTHER: "магазин",
};

const pathFor = (s: { id: number; name: string }, lang: SeoLang) => (lang === "ru" ? `/ru${storePath(s)}` : storePath(s));

export async function loadStore(params: StoreProps["params"]) {
  const id = storeIdFrom((await params).store);
  return id ? getStore(id) : null;
}

/** Як ҷумла барои Google: «Бургерҳо, Нӯшокиҳо — 24 маҳсулот. Душанбе. Фармоиши онлайн.» */
function describe(s: StoreDetail, lang: SeoLang) {
  const categories = [...new Set(s.catalog.map((p) => p.category))].slice(0, 4).join(", ");
  if (lang === "ru") {
    const base = s.description?.trim() || `${s.name} — ${RU_TYPES[s.type]}`;
    return `${base}. ${categories ? `${categories} — ` : ""}${s.products} товаров. ${s.cities.join(", ")}. Онлайн-заказ на ${SITE_NAME}.`.slice(0, 300);
  }
  const base = s.description?.trim() || `${s.name} — ${BUSINESS_TYPE_LABELS[s.type].toLowerCase()}`;
  return `${base}. ${categories ? `${categories} — ` : ""}${s.products} маҳсулот. ${s.cities.join(", ")}. Фармоиши онлайн дар ${SITE_NAME}.`.slice(0, 300);
}

export async function storeMetadata(params: StoreProps["params"], lang: SeoLang): Promise<Metadata> {
  const store = await loadStore(params);
  if (!store) return { title: lang === "ru" ? "Магазин не найден" : "Мағоза ёфт нашуд", robots: { index: false } };
  const restaurant = store.type === "RESTAURANT";
  const city = store.cities[0] ? ` · ${store.cities[0]}` : "";
  const title =
    lang === "ru" ? `${store.name} — ${restaurant ? "меню" : "товары"} и цены${city}` : `${store.name} — ${restaurant ? "меню" : "мол"} ва нархҳо${city}`;
  const description = describe(store, lang);
  const url = pathFor(store, lang);
  return {
    title,
    description,
    alternates: {
      canonical: url,
      // Google ҳар забонро ба корбари худ нишон медиҳад
      languages: { tg: pathFor(store, "tg"), ru: pathFor(store, "ru"), "x-default": pathFor(store, "tg") },
    },
    openGraph: { type: "website", title, description, url, siteName: SITE_NAME, locale: lang === "ru" ? "ru_RU" : "tg_TJ" },
    twitter: { card: "summary_large_image", title, description },
  };
}

// schema.org: тарабхона — Restaurant бо меню; мағозаҳо — навъи мағоза бо рӯйхати мол
const SCHEMA_TYPE: Record<BusinessType, string> = {
  RESTAURANT: "Restaurant",
  GROCERY: "GroceryStore",
  CLOTHING: "ClothingStore",
  PLUMBING: "HardwareStore",
  ELECTRONICS: "ElectronicsStore",
  PHARMACY: "Pharmacy",
  BUILDING: "HardwareStore",
  OTHER: "Store",
};

function jsonLd(s: StoreDetail, lang: SeoLang) {
  const url = `${SITE_URL}${pathFor(s, lang)}`;
  const offers = s.catalog.slice(0, 100).map((p) => ({
    "@type": "Offer",
    price: p.price,
    priceCurrency: "TJS",
    availability: p.soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    itemOffered: { "@type": "Product", name: p.name, category: p.category, ...(p.imageId ? { image: `${SITE_URL}/api/images/${p.imageId}` } : {}) },
  }));
  return {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPE[s.type],
    "@id": url,
    name: s.name,
    description: describe(s, lang),
    url,
    inLanguage: lang,
    telephone: s.branchList[0]?.phone,
    ...(s.rating !== null && s.reviewCount > 0
      ? {
          aggregateRating: { "@type": "AggregateRating", ratingValue: s.rating, reviewCount: s.reviewCount, bestRating: 5, worstRating: 1 },
          review: s.reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.author || (lang === "ru" ? "Покупатель" : "Мизоҷ") },
            datePublished: r.createdAt.slice(0, 10),
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            ...(r.text ? { reviewBody: r.text } : {}),
          })),
        }
      : {}),
    address: s.branchList.map((b) => ({ "@type": "PostalAddress", streetAddress: b.address, addressLocality: b.city, addressCountry: "TJ" })),
    ...(s.type === "RESTAURANT"
      ? { hasMenu: { "@type": "Menu", name: lang === "ru" ? `Меню ${s.name}` : `Менюи ${s.name}`, hasMenuSection: menuSections(s) } }
      : { hasOfferCatalog: { "@type": "OfferCatalog", name: lang === "ru" ? `Товары ${s.name}` : `Маҳсулоти ${s.name}`, itemListElement: offers } }),
  };
}

function menuSections(s: StoreDetail) {
  const byCat = new Map<string, StoreDetail["catalog"]>();
  for (const p of s.catalog) byCat.set(p.category, [...(byCat.get(p.category) ?? []), p]);
  return [...byCat].map(([name, items]) => ({
    "@type": "MenuSection",
    name,
    hasMenuItem: items.slice(0, 50).map((p) => ({
      "@type": "MenuItem",
      name: p.name,
      ...(p.imageId ? { image: `${SITE_URL}/api/images/${p.imageId}` } : {}),
      offers: { "@type": "Offer", price: p.price, priceCurrency: "TJS" },
    })),
  }));
}

async function Store({ params, lang }: StoreProps & { lang: SeoLang }) {
  const store = await loadStore(params);
  if (!store) notFound();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(store, lang)).replace(/</g, "\\u003c") }} />
      {lang === "ru" && <ForceLang lang="ru" />}
      <StoreView store={store} />
    </>
  );
}

export function StorePage({ params, lang }: StoreProps & { lang: SeoLang }) {
  return (
    <Suspense fallback={<div className="h-64 skeleton rounded-3xl" />}>
      <Store params={params} lang={lang} />
    </Suspense>
  );
}
