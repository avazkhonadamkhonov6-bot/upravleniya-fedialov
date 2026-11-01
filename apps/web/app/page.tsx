import type { Metadata } from "next";
import { HomePage } from "@/components/home-page";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — CRM, филиалҳо ва бозори онлайн` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/", languages: { tg: "/", ru: "/ru", "x-default": "/" } },
};

export default function Page() {
  return <HomePage lang="tg" />;
}
