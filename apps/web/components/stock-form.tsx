"use client";

import { STOCK_REASON_LABELS, type Branch, type Product, type StockMove } from "@filialhub/shared";
import { useState } from "react";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import { useToast } from "./toast";
import { Button, cn, Empty, ErrorBox, Field, formatDate, Input, money, Segmented, Select, Skeleton } from "./ui";

/** Боқимондаи мол дар филиал (0, агар сатр набошад) */
export const qtyIn = (p: Product, branchId: number | null | undefined) => p.branchStock.find((b) => b.branchId === branchId)?.qty ?? 0;

/**
 * Қабули мол ба анбори филиал (+ миқдор, бо таъминкунанда ва нархи харид) ё ҳисоби дастӣ (миқдори ҳозира).
 * Дар поён — таърихи анбор: кӣ, кай, чаро ва чанд.
 */
export function StockForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const isChef = user?.role === "CHEF";
  const canCost = user?.role !== "STAFF";
  const { data: branches } = useApi<Branch[]>(isChef ? "/branches" : null);
  const { data: suppliers } = useApi<string[]>("/products/suppliers");
  const active = branches?.filter((b) => b.isActive) ?? [];
  const [picked, setPicked] = useState<number | undefined>();
  const branchId = isChef ? (picked ?? active[0]?.id) : (user?.branchId ?? undefined);
  const [mode, setMode] = useState<"add" | "set">("add");
  const [qty, setQty] = useState("");
  const [supplier, setSupplier] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [updateCost, setUpdateCost] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: moves, reload: reloadMoves } = useApi<StockMove[]>(`/products/${product.id}/moves${qs({ branchId: isChef ? branchId : undefined })}`);
  const n = Number(qty);
  const current = qtyIn(product, branchId);
  const after = mode === "add" ? current + (n || 0) : n || 0;
  const purchase = mode === "add" && n > 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!qty || !Number.isFinite(n)) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/products/${product.id}/stock`, {
        method: "POST",
        json: {
          branchId,
          ...(mode === "add" ? { add: n } : { set: n }),
          ...(purchase && supplier.trim() ? { supplier: supplier.trim() } : {}),
          ...(purchase && unitCost !== "" ? { unitCost: Number(unitCost), updateCost: canCost && updateCost } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      });
      toast.success(tr("Анбор нав шуд"), `${product.name}: ${after} ${tr(product.unit)}`);
      reloadMoves();
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
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
        <Field label={mode === "add" ? tr("Чанд {0} омад?", tr(product.unit)) : tr("Дар анбор ҳоло чанд {0} аст?", tr(product.unit))} hint={mode === "add" ? tr("Хориҷ (вайрон, гум): бо минус, масалан −2") : undefined}>
          <Input type="number" step="any" min={mode === "set" ? 0 : undefined} required autoFocus value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        {purchase && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={tr("Таъминкунанда")} hint={tr("Ихтиёрӣ")}>
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} maxLength={80} list="fh-suppliers" placeholder={tr("Масалан: «Сомон-Трейд»")} />
              <datalist id="fh-suppliers">
                {suppliers?.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label={tr("Нархи харид (1 {0})", tr(product.unit))} hint={tr("Ихтиёрӣ")}>
              <Input type="number" step="0.01" min={0} value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
            </Field>
          </div>
        )}
        {purchase && canCost && unitCost !== "" && Number(unitCost) !== product.cost && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-2 p-3 text-sm">
            <input type="checkbox" checked={updateCost} onChange={(e) => setUpdateCost(e.target.checked)} className="mt-0.5 size-4 accent-[var(--brand)]" />
            <span>
              {tr("Арзиши аслиро нав кардан: {0} → {1}", money(product.cost), money(Number(unitCost)))}
              <span className="block text-xs text-muted">{tr("Фоида аз фурӯшҳои оянда бо нархи нав ҳисоб мешавад.")}</span>
            </span>
          </label>
        )}
        <Field label={tr("Эзоҳ")} hint={tr("Ихтиёрӣ")}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </Field>
        {qty && (
          <div className="text-sm text-muted">
            {tr("Пас аз захира")}: <b className="text-ink tabular">{after}</b> {tr(product.unit)}
            {purchase && unitCost !== "" && ` · ${tr("ҷамъ")} ${money(n * Number(unitCost))}`}
          </div>
        )}
        <ErrorBox message={error} />
        <Button type="submit" loading={busy} className="w-full">
          {tr("Захира кардан")}
        </Button>
      </form>

      <div>
        <div className="mb-2 text-sm font-semibold text-ink">{tr("Таърихи анбор")}</div>
        {!moves ? (
          <Skeleton className="h-24" />
        ) : moves.length === 0 ? (
          <Empty icon="📦" title={tr("Ҳоло тағйир нест")} />
        ) : (
          <ul className="max-h-72 divide-y divide-line overflow-y-auto text-sm">
            {moves.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="font-semibold text-ink">
                    {tr(STOCK_REASON_LABELS[m.reason])}
                    {m.orderId && ` #${m.orderId}`}
                    {m.supplier && ` · ${m.supplier}`}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {formatDate(m.createdAt, true)}
                    {m.userName && ` · ${m.userName}`}
                    {isChef && ` · ${m.branchName}`}
                    {m.unitCost !== null && ` · ${money(m.unitCost)}/${tr(product.unit)}`}
                    {m.note && ` · ${m.note}`}
                  </div>
                </div>
                <div className="shrink-0 text-right tabular">
                  <div className={cn("font-bold", m.qty > 0 ? "text-good" : "text-brand")}>
                    {m.qty > 0 ? "+" : "−"}
                    {Math.abs(m.qty)}
                  </div>
                  <div className="text-[11px] text-muted">
                    {tr("монд")} {m.balance}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
