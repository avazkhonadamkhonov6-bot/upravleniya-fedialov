import { connection } from "next/server";
import { Suspense } from "react";
import { StoresList } from "@/components/stores-list";
import { getStores } from "@/lib/shop-data";
import { SITE_URL } from "@/lib/site";
import { storePath } from "@/lib/store-url";

/**
 * Бозор: рӯйхати мағозаҳо дар сервер сохта мешавад (аз кеш) — Google номҳо ва ссылкаҳоро дар HTML мебинад,
 * мизоҷ рӯйхатро фавран мебинад; ҷустуҷӯ ва филтр дар браузер.
 */
export default function ShopPage() {
  return (
    <Suspense fallback={<StoresList initial={[]} />}>
      <Stores />
    </Suspense>
  );
}

async function Stores() {
  // Дар вақти дархост (аз кеш), на ҳангоми build — build аз дастрас будани API вобаста намешавад
  await connection();
  const stores = await getStores();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "FilialHub — бозори онлайн",
    numberOfItems: stores.length,
    itemListElement: stores.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}${storePath(s)}`, name: s.name })),
  };
  return (
    <>
      {stores.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      <StoresList initial={stores} />
    </>
  );
}
