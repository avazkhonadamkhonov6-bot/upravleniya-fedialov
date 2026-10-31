import type { Metadata } from "next";

// Сабади шахсӣ — дар Google лозим нест.
export const metadata: Metadata = {
  title: "Сабад",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
