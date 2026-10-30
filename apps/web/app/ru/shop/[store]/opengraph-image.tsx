import { BUSINESS_TYPE_LABELS } from "@filialhub/shared";
import { getStore } from "@/lib/shop-data";
import { ogImage, OG_SIZE } from "@/lib/og";
import { storeTheme } from "@/lib/store-theme";
import { storeIdFrom } from "@/lib/store-url";

export const alt = "Магазин в онлайн-маркете FilialHub";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ store: string }> }) {
  const id = storeIdFrom((await params).store);
  const store = id ? await getStore(id).catch(() => null) : null;
  if (!store) return ogImage({ title: "Бозори онлайн", subtitle: "Тарабхонаҳо ва мағозаҳо дар як ҷо", badge: "FilialHub" });
  const categories = [...new Set(store.catalog.map((p) => p.category))].slice(0, 3).join(" · ");
  return ogImage({
    title: store.name,
    subtitle: `${categories || `${store.products} маҳсулот`}${store.cities[0] ? ` — ${store.cities[0]}` : ""}`,
    badge: BUSINESS_TYPE_LABELS[store.type],
    accent: storeTheme(store.type).accent,
  });
}
