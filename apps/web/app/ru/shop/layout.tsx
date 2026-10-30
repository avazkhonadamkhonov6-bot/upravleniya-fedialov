import type { Metadata } from "next";
import { ShopShell } from "@/components/shop-shell";

export const metadata: Metadata = {
  title: { default: "Онлайн-маркет", template: "%s · Онлайн-маркет FilialHub" },
  description: "Рестораны и магазины Таджикистана в одном месте: выберите, закажите онлайн и следите за статусом заказа.",
};

export default function RuShopLayout({ children }: { children: React.ReactNode }) {
  return <ShopShell>{children}</ShopShell>;
}
