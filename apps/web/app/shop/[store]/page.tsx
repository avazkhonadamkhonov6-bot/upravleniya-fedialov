import type { Metadata } from "next";
import { StorePage, storeMetadata, type StoreProps } from "@/lib/store-seo";

// Саҳифа аз рӯи суроға сохта мешавад, ва layout-ҳо (ShopShell, MotionFX) usePathname()-ро бе Suspense мехонанд —
// роҳи «блоккунанда»-ро иҷозат медиҳем (Google ба ҳар ҳол HTML-и пурра мегирад).
export const instant = false;

export function generateMetadata({ params }: StoreProps): Promise<Metadata> {
  return storeMetadata(params, "tg");
}

export default function Page(props: StoreProps) {
  return <StorePage {...props} lang="tg" />;
}
