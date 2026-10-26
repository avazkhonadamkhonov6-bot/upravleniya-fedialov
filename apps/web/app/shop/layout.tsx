import type { Metadata } from "next";
import { ShopShell } from "@/components/shop-shell";

export const metadata: Metadata = {
  title: { default: "Бозори онлайн", template: "%s · Бозори онлайн" },
  description: "Тарабхонаҳо ва мағозаҳо дар як ҷо: интихоб кунед, фармоиш диҳед ва ҳолати фармоишро бинед.",
  alternates: { canonical: "/shop" },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <ShopShell>{children}</ShopShell>;
}
