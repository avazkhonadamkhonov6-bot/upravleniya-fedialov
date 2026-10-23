import type { Metadata } from "next";

export const metadata: Metadata = { title: "Фурӯши нав" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
