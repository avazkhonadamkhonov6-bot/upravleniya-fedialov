"use client";

import { useSyncExternalStore } from "react";
import { dayKey } from "./due";

const noSubscribe = () => () => {};

/**
 * Санаи имрӯза «2026-11-01» — танҳо дар браузер. Дар сервер ва ҳангоми prerender "" (Next.js
 * `new Date()`-ро дар render-и Client Component ҳангоми prerender иҷозат намедиҳад).
 */
export function useToday(): string {
  return useSyncExternalStore(noSubscribe, () => dayKey(0), () => "");
}
