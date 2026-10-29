"use client";

import type { Product } from "@filialhub/shared";
import { useState } from "react";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { useToast } from "./toast";
import { Button, ErrorBox, Field, Input, Segmented } from "./ui";

/** Қабули мол ба анбор (+ миқдор) ё ҳисоби дастӣ (миқдори ҳозира) */
export function StockForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const toast = useToast();
  const [mode, setMode] = useState<"add" | "set">("add");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const n = Number(qty);
  const after = mode === "add" ? (product.stock ?? 0) + (n || 0) : n || 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!qty || !Number.isFinite(n)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/products/${product.id}/stock`, { method: "POST", json: mode === "add" ? { add: n } : { set: n } });
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
        <div className="text-xs text-muted">
          {tr("Ҳоло дар анбор")}: <b className="tabular">{product.stock ?? 0}</b> {tr(product.unit)}
        </div>
      </div>
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
