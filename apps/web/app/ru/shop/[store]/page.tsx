import type { Metadata } from "next";
import { StorePage, storeMetadata, type StoreProps } from "@/lib/store-seo";

// Нусхаи русии саҳифаи мағоза барои Google (ҷустуҷӯ бо забони русӣ); ҳамон маълумот, сарлавҳа ва тавсиф ба русӣ.
export const instant = false;

export function generateMetadata({ params }: StoreProps): Promise<Metadata> {
  return storeMetadata(params, "ru");
}

export default function Page(props: StoreProps) {
  return <StorePage {...props} lang="ru" />;
}
