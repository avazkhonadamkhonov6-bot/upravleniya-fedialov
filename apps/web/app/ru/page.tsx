import type { Metadata } from "next";
import { HOME_RU_META, HomePage } from "@/components/home-page";
import { SITE_NAME } from "@/lib/site";

// Саҳифаи асосӣ бо забони русӣ — аксари ҷустуҷӯ дар Тоҷикистон бо русӣ аст.
export const metadata: Metadata = {
  title: { absolute: HOME_RU_META.title },
  description: HOME_RU_META.description,
  keywords: ["CRM", "филиалы", "ресторан", "магазин", "касса", "POS", "учёт продаж", "сотрудники", "Таджикистан", "Душанбе", "онлайн-маркет"],
  alternates: { canonical: "/ru", languages: { tg: "/", ru: "/ru", "x-default": "/" } },
  // openGraph-и худи саҳифа расми умумиро (app/opengraph-image) иваз мекунад — бе images пешнамоиш дар Telegram/WhatsApp холӣ мемонд
  openGraph: { type: "website", siteName: SITE_NAME, title: HOME_RU_META.title, description: HOME_RU_META.description, url: "/ru", locale: "ru_RU", images: ["/opengraph-image"] },
  twitter: { card: "summary_large_image", title: HOME_RU_META.title, description: HOME_RU_META.description, images: ["/opengraph-image"] },
};

export default function Page() {
  return <HomePage lang="ru" />;
}
