"use client";

import type { Branch, Product } from "@filialhub/shared";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import { useToast } from "./toast";
import { Button, ErrorBox, Field, Input, Segmented, Select } from "./ui";

/** Боқимондаи мол дар филиал (0, агар сатр набошад) */
export const qtyIn = (p: Product, branchId: number | null | undefined) => p.branchStock.find((b) => b.branchId === branchId)?.qty ?? 0;

/** Қабули мол ба анбори филиал (+ миқдор) ё ҳисоби дастӣ (миқдори ҳозира) */
export function StockForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const isChef = user?.role === "CHEF";
  const { data: branches } = useApi<Branch[]>(isChef ? "/branches" : null);
  const active = branches?.filter((b) => b.isActive) ?? [];
  const [picked, setPicked] = useState<number | undefined>();
  const branchId = isChef ? (picked ?? active[0]?.id) : (user?.branchId ?? undefined);
  const [mode, setMode] = useState<"add" | "set">("add");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const n = Number(qty);
  const current = qtyIn(product, branchId);
  const after = mode === "add" ? current + (n || 0) : n || 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!qty || !Number.isFinite(n)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/products/${product.id}/stock`, { method: "POST", json: { branchId, ...(mode === "add" ? { add: n } : { set: n }) } });
      toast.success(tr("Анбор нав шуд"), `${product.name}: ${after} ${tr(product.unit)}`);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="rounded-2xl bg-surface-2 p-4">
        <div className="text-sm font-semibold text-ink">{product.name}</div>
        {isChef && active.length > 1 ? (
          <ul className="mt-2 space-y-0.5 text-xs text-muted">
            {active.map((b) => (
              <li key={b.id} className="flex justify-between gap-3">
                <span>{b.name}</span>
                <b className="text-ink tabular">
                  {qtyIn(product, b.id)} {tr(product.unit)}
                </b>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-muted">
            {tr("Ҳоло дар анбор")}: <b className="tabular">{current}</b> {tr(product.unit)}
          </div>
        )}
      </div>
      {isChef && active.length > 1 && (
        <Field label={tr("Филиал")}>
          <Select value={branchId ?? ""} onChange={(e) => setPicked(Number(e.target.value))}>
            {active.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: "add", label: "Мол омад (+)" },
          { value: "set", label: "Ҳисоби дастӣ" },
        ]}
      />
      <Field label={mode === "add" ? tr("Чанд {0} омад?", tr(product.unit)) : tr("Дар анбор ҳоло чанд {0} аст?", tr(product.unit))}>
        <Input type="number" step="any" min={mode === "set" ? 0 : undefined} required autoFocus value={qty} onChange={(e) => setQty(e.target.value)} />
      </Field>
      {qty && (
        <div className="text-sm text-muted">
          {tr("Пас аз захира")}: <b className="text-ink tabular">{after}</b> {tr(product.unit)}
        </div>
      )}
      <ErrorBox message={error} />
      <Button type="submit" loading={busy} className="w-full">
        {tr("Захира кардан")}
      </Button>
    </form>
  );
}
