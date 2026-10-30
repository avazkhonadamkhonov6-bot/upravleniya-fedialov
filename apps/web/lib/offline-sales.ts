"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api, ApiError } from "./api";

/**
 * POS-и офлайн: агар интернет набошад, фурӯш дар браузер (localStorage) нигоҳ дошта мешавад
 * ва ҳангоми пайдо шудани интернет худкор фиристода мешавад. clientRef — рақами ягона,
 * то сервер фурӯшро ду бор сабт накунад.
 */
export interface QueuedSale {
  ref: string;
  payload: Record<string, unknown>;
  total: number;
  at: string;
  /** Сервер рад кард (масалан мол дигар нест) — кассир бояд бинад */
  error?: string;
}

const KEY = "fh-offline-sales";
const EVENT = "fh-offline-sales-change";

function read(): QueuedSale[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QueuedSale[];
  } catch {
    return [];
  }
}

function write(list: QueuedSale[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
  cached = null;
  window.dispatchEvent(new Event(EVENT));
}

export function newRef() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Интернет нест ё сервер дастрас нест — на хатои маълумот (мисли «мол тамом шуд») */
export async function isOffline(e: unknown) {
  if (!(e instanceof ApiError)) return false;
  if ([0, 502, 503, 504].includes(e.status)) return true;
  // 500: ё хатои худи API, ё API хоб/хомӯш аст (прокси-и Next 500 медиҳад) — /api/health ҳалл мекунад
  if (e.status !== 500) return false;
  try {
    return !(await fetch("/api/health", { cache: "no-store" })).ok;
  } catch {
    return true;
  }
}

export function queueSale(sale: Omit<QueuedSale, "at">) {
  write([...read(), { ...sale, at: new Date().toISOString(), payload: { ...sale.payload, soldAt: new Date().toISOString() } }]);
}

export function dropSale(ref: string) {
  write(read().filter((s) => s.ref !== ref));
}

let flushing: Promise<number> | null = null;

/** Фурӯшҳои навбатро мефиристад; бармегардонад, ки чандто рафт */
export function flushSales() {
  flushing ??= (async () => {
    let sent = 0;
    for (const s of read()) {
      if (s.error) continue;
      try {
        await api("/orders", { method: "POST", json: { ...s.payload, clientRef: s.ref } });
        dropSale(s.ref);
        sent++;
      } catch (e) {
        if (await isOffline(e)) break;
        write(read().map((x) => (x.ref === s.ref ? { ...x, error: (e as Error).message } : x)));
      }
    }
    return sent;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

let cached: QueuedSale[] | null = null;
const snapshot = () => (cached ??= read());
const subscribe = (fn: () => void) => {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cached = null;
      fn();
    }
  };
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", onStorage);
  };
};
const EMPTY: QueuedSale[] = [];

/** Навбати фурӯшҳо + фиристодани худкор (ҳангоми пайдо шудани интернет ва ҳар 30 сония) */
export function useOfflineSales() {
  const list = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const pending = list.some((s) => !s.error);
  useEffect(() => {
    if (!pending) return;
    const go = () => void flushSales();
    window.addEventListener("online", go);
    const t = setInterval(go, 30_000);
    go();
    return () => {
      window.removeEventListener("online", go);
      clearInterval(t);
    };
  }, [pending]);
  return list;
}

/** Рӯйхати мол барои POS-и офлайн (пас аз аз нав кушодани саҳифа бе интернет) */
const PRODUCTS_KEY = "fh-pos-products";
export function saveProducts(data: unknown) {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(data));
  } catch {}
}
export function savedProducts<T>(): T | undefined {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}
