import type { StoreDetail, StoreSummary } from "@filialhub/shared";
import { cacheLife } from "next/cache";

// Маълумоти бозор дар сервер (барои SEO: HTML бо ном, меню ва нарх, sitemap).
// Бо кеш — Google ва мизоҷон API-ро ҳар дафъа бор намекунанд.
const API_URL = (process.env.API_URL ?? "http://localhost:4100").replace(/\/$/, "");

/** null — мағоза нест ё пинҳон аст; хатои шабака — throw (кеш намешавад) */
export async function getStore(id: number): Promise<StoreDetail | null> {
  "use cache";
  cacheLife("minutes");
  const res = await fetch(`${API_URL}/api/shop/stores/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function fetchStores(): Promise<StoreSummary[]> {
  "use cache";
  cacheLife("hours");
  const res = await fetch(`${API_URL}/api/shop/stores`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

/** Рӯйхати мағозаҳои ҷамъиятӣ; агар API дастрас набошад — рӯйхати холӣ (sitemap намешиканад, хато кеш намешавад) */
export async function getStores(): Promise<StoreSummary[]> {
  try {
    return await fetchStores();
  } catch {
    return [];
  }
}
