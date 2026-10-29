import type { MetadataRoute } from "next";
import { getStores } from "@/lib/shop-data";
import { SITE_URL } from "@/lib/site";
import { storePath } from "@/lib/store-url";

// Ҳар мағозаи ҷамъиятӣ худкор дар sitemap — Google онро бе ссылка ҳам меёбад.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stores = await getStores();
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/login`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/register`, changeFrequency: "monthly", priority: 0.7 },
    ...stores.map((s) => ({ url: `${SITE_URL}${storePath(s)}`, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
