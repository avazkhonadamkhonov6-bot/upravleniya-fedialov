"use client";

import type { BusinessType } from "@filialhub/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/** Сабади мизоҷ: маҳсулот аз рӯи мағоза ҷудо (ҳар мағоза — фармоиши алоҳида). Дар браузер нигоҳ дошта мешавад. */
export interface CartLine {
  productId: number;
  name: string;
  emoji: string;
  unit: string;
  price: number;
  qty: number;
}

export interface CartStore {
  storeId: number;
  storeName: string;
  type: BusinessType;
  branchId?: number;
  lines: CartLine[];
}

const KEY = "fh-cart";

interface CartState {
  stores: CartStore[];
  /** Шумораи маҳсулоти гуногун дар сабад */
  count: number;
  qtyOf: (storeId: number, productId: number) => number;
  add: (store: Omit<CartStore, "lines">, line: Omit<CartLine, "qty">, delta: number) => void;
  setQty: (storeId: number, productId: number, qty: number) => void;
  setBranch: (storeId: number, branchId: number) => void;
  clearStore: (storeId: number) => void;
}

const CartContext = createContext<CartState | null>(null);

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<CartStore[]>([]);
  const [ready, setReady] = useState(false);

  // Аз localStorage пас аз гидратсия мехонем (то HTML-и сервер ва браузер якхела бошад)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setStores(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(stores));
    } catch {}
  }, [stores, ready]);

  const update = useCallback((storeId: number, fn: (lines: CartLine[]) => CartLine[], meta?: Omit<CartStore, "lines">) => {
    setStores((all) => {
      const existing = all.find((s) => s.storeId === storeId);
      const base = existing ?? (meta ? { ...meta, lines: [] } : undefined);
      if (!base) return all;
      const next = { ...base, lines: fn(base.lines).filter((l) => l.qty > 0) };
      // Мағоза ҷои худро дар рӯйхат нигоҳ медорад; нав — ба охир; холӣ — хориҷ
      const list = existing ? all.map((s) => (s === existing ? next : s)) : [...all, next];
      return list.filter((s) => s.lines.length > 0);
    });
  }, []);

  const value = useMemo<CartState>(
    () => ({
      stores,
      count: stores.reduce((s, st) => s + st.lines.length, 0),
      qtyOf: (storeId, productId) => stores.find((s) => s.storeId === storeId)?.lines.find((l) => l.productId === productId)?.qty ?? 0,
      add: (store, line, delta) =>
        update(
          store.storeId,
          (lines) => {
            const cur = lines.find((l) => l.productId === line.productId);
            if (!cur) return [...lines, { ...line, qty: round3(Math.max(0, delta)) }];
            return lines.map((l) => (l.productId === line.productId ? { ...l, ...line, qty: round3(Math.max(0, l.qty + delta)) } : l));
          },
          store,
        ),
      setQty: (storeId, productId, qty) =>
        update(storeId, (lines) => lines.map((l) => (l.productId === productId ? { ...l, qty: round3(Math.max(0, Number.isFinite(qty) ? qty : 0)) } : l))),
      setBranch: (storeId, branchId) => setStores((all) => all.map((s) => (s.storeId === storeId ? { ...s, branchId } : s))),
      clearStore: (storeId) => setStores((all) => all.filter((s) => s.storeId !== storeId)),
    }),
    [stores, update],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
