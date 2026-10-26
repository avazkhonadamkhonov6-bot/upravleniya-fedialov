import type { Metadata } from "next";
import { SITE_DESCRIPTION } from "@/lib/site";

export const metadata: Metadata = {
  title: "Сабти ном",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
