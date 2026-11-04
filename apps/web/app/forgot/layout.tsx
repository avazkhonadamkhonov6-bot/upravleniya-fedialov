import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Барқарор кардани парол",
  // Саҳифаи хизматӣ — дар Google лозим нест
  robots: { index: false, follow: true },
  alternates: { canonical: "/forgot" },
};

export default function ForgotLayout({ children }: { children: React.ReactNode }) {
  return children;
}
