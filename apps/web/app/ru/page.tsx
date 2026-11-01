import type { Metadata } from "next";
import { HOME_RU_META, HomePage } from "@/components/home-page";
import { SITE_NAME } from "@/lib/site";

// Саҳифаи асосӣ бо забони русӣ — аксари ҷустуҷӯ дар Тоҷикистон бо русӣ аст.
export const metadata: Metadata = {
  title: { absolute: HOME_RU_META.title },
  description: HOME_RU_META.description,
  keywords: ["CRM", "филиалы", "ресторан", "магазин", "касса", "POS", "учёт продаж", "сотрудники", "Таджикистан", "Душанбе", "онлайн-маркет"],
  alternates: { canonical: "/ru", languages: { tg: "/", ru: "/ru", "x-default": "/" } },
  openGraph: { type: "website", siteName: SITE_NAME, title: HOME_RU_META.title, description: HOME_RU_META.description, url: "/ru", locale: "ru_RU" },
  twitter: { card: "summary", title: HOME_RU_META.title, description: HOME_RU_META.description },
};

export default function Page() {
  return <HomePage lang="ru" />;
}
