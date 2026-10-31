import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Саҳифаҳои дохилӣ танҳо пас аз воридшавӣ кушода мешаванд — индекс кардан лозим нест.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login"],
      disallow: [
        "/api/",
        "/admin",
        "/dashboard",
        "/branches",
        "/staff",
        "/customers",
        "/debts",
        "/tasks",
        "/schedule",
        "/messages",
        "/online",
        "/pos",
        "/sales",
        "/products",
        "/promos",
        "/expenses",
        "/integrations",
        "/audit",
        "/profile",
        "/shop/cart",
        "/shop/orders",
        "/shop/profile",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
