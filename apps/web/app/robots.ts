import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Саҳифаҳои дохилӣ танҳо пас аз воридшавӣ кушода мешаванд — индекс кардан лозим нест.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login"],
      disallow: ["/api/", "/dashboard", "/branches", "/staff", "/customers", "/tasks", "/schedule", "/messages", "/pos", "/sales", "/products", "/expenses", "/integrations", "/audit", "/profile"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
