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
    // Ҳар мағоза бо ду забон; hreflang ба Google мегӯяд, ки кадомаш барои кӣ
    ...stores.flatMap((s) => {
      const tg = `${SITE_URL}${storePath(s)}`;
      const ru = `${SITE_URL}/ru${storePath(s)}`;
      const alternates = { languages: { tg, ru } };
      return [
        { url: tg, changeFrequency: "daily" as const, priority: 0.8, alternates },
        { url: ru, changeFrequency: "daily" as const, priority: 0.7, alternates },
      ];
    }),
  ];
}
