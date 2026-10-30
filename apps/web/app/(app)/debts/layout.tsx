import type { Metadata } from "next";

export const metadata: Metadata = { title: "Дафтари қарз" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
