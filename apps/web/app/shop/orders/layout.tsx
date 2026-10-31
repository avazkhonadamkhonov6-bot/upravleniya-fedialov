import type { Metadata } from "next";

// Фармоишҳои мизоҷ — дар Google лозим нест.
export const metadata: Metadata = {
  title: "Фармоишҳо",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
