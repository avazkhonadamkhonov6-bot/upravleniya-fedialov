import type { Metadata } from "next";

export const metadata: Metadata = { title: "Telegram & WhatsApp" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
