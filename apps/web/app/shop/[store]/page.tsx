import { BUSINESS_TYPE_LABELS, type BusinessType, type StoreDetail } from "@filialhub/shared";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StoreView } from "@/components/store-view";
import { getStore } from "@/lib/shop-data";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { storeIdFrom, storePath } from "@/lib/store-url";

type Props = { params: Promise<{ store: string }> };

// Саҳифа аз рӯи суроға сохта мешавад, ва layout-ҳо (ShopShell, MotionFX) usePathname()-ро бе Suspense мехонанд —
// роҳи «блоккунанда»-ро иҷозат медиҳем (Google ба ҳар ҳол HTML-и пурра мегирад).
export const instant = false;

async function load(params: Props["params"]) {
  const id = storeIdFrom((await params).store);
  return id ? getStore(id) : null;
}

/** Як ҷумла барои Google: «Бургерҳо, Нӯшокиҳо — 24 маҳсулот. Душанбе. Фармоиши онлайн.» */
function describe(s: StoreDetail) {
  const categories = [...new Set(s.catalog.map((p) => p.category))].slice(0, 4).join(", ");
  const base = s.description?.trim() || `${s.name} — ${BUSINESS_TYPE_LABELS[s.type].toLowerCase()}`;
  return `${base}. ${categories ? `${categories} — ` : ""}${s.products} маҳсулот. ${s.cities.join(", ")}. Фармоиши онлайн дар ${SITE_NAME}.`.slice(0, 300);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const store = await load(params);
  if (!store) return { title: "Мағоза ёфт нашуд", robots: { index: false } };
  const title = `${store.name} — ${store.type === "RESTAURANT" ? "меню" : "мол"} ва нархҳо${store.cities[0] ? ` · ${store.cities[0]}` : ""}`;
  const description = describe(store);
  return {
    // template-и /shop: «… · Бозори онлайн»
    title,
    description,
    alternates: { canonical: storePath(store) },
    openGraph: { type: "website", title, description, url: storePath(store), siteName: SITE_NAME, locale: "tg_TJ" },
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

function jsonLd(s: StoreDetail) {
  const url = `${SITE_URL}${storePath(s)}`;
  const type = SCHEMA_TYPE[s.type];
  const offers = s.catalog.slice(0, 100).map((p) => ({
    "@type": "Offer",
    price: p.price,
    priceCurrency: "TJS",
    availability: p.soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    itemOffered: { "@type": "Product", name: p.name, category: p.category, ...(p.imageId ? { image: `${SITE_URL}/api/images/${p.imageId}` } : {}) },
  }));
  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": url,
    name: s.name,
    description: describe(s),
    url,
    telephone: s.branchList[0]?.phone,
    address: s.branchList.map((b) => ({ "@type": "PostalAddress", streetAddress: b.address, addressLocality: b.city, addressCountry: "TJ" })),
    ...(s.type === "RESTAURANT"
      ? { hasMenu: { "@type": "Menu", name: `Менюи ${s.name}`, hasMenuSection: menuSections(s) } }
      : { hasOfferCatalog: { "@type": "OfferCatalog", name: `Маҳсулоти ${s.name}`, itemListElement: offers } }),
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

async function Store({ params }: Props) {
  const store = await load(params);
  if (!store) notFound();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(store)).replace(/</g, "\\u003c") }} />
      <StoreView store={store} />
    </>
  );
}

export default function StorePage(props: Props) {
  return (
    <Suspense fallback={<div className="h-64 skeleton rounded-3xl" />}>
      <Store {...props} />
    </Suspense>
  );
}
