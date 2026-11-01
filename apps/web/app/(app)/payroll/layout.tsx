import type { Metadata } from "next";

export const metadata: Metadata = { title: "Маош аз рӯи давомот" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
