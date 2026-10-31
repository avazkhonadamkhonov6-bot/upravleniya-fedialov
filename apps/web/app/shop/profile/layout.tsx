import type { Metadata } from "next";

// Профили мизоҷ — дар Google лозим нест.
export const metadata: Metadata = {
  title: "Профил",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
