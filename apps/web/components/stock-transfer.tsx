"use client";

import { isFractionalUnit, type Product, type StocktakeResult } from "@filialhub/shared";
import { ArrowLeftRight, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { freeIn, qtyIn } from "@/components/stock-form";
import { useToast } from "@/components/toast";
import { Button, cn, ErrorBox, Field, Input, money, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";

type BranchName = { id: number; name: string };

/**
 * Интиқоли мол байни филиалҳо. Аз манбаъ танҳо моли озод мебарояд (фармоишҳои онлайни банд дар ҷояшон мемонанд).
 * Шеф — аз ҳар филиал; менеҷер ва анбордор — аз филиали худ ба ҳар филиали ширкат.
 */
export function TransferForm({ product, fromBranchId, onDone }: { product: Product; fromBranchId?: number; onDone: () => void }) {
  const toast = useToast();
  const { data: branches } = useApi<BranchName[]>("/branches/names");
  const [from, setFrom] = useState<number | undefined>(fromBranchId);
  const [to, setTo] = useState<number | undefined>();
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const source = from ?? branches?.find((b) => freeIn(product, b.id) > 0)?.id;
  const free = source ? freeIn(product, source) : 0;
  const amount = Number(qty) || 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!source || !to) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/products/${product.id}/transfer`, { method: "POST", json: { fromBranchId: source, toBranchId: to, qty: amount, note: note.trim() || undefined } });
      toast.success(tr("Интиқол шуд"), `${product.name}: ${amount} ${tr(product.unit)}`);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorBox message={error} />
      <div className="text-sm font-semibold text-ink">{product.name}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <Field label={tr("Аз филиал")}>
          <Select value={source ?? ""} onChange={(e) => setFrom(Number(e.target.value) || undefined)} disabled={fromBranchId !== undefined}>
            {branches?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {freeIn(product, b.id)}
              </option>
            ))}
          </Select>
        </Field>
        <ArrowLeftRight className="mb-3.5 size-4 text-muted" />
        <Field label={tr("Ба филиал")}>
          <Select value={to ?? ""} onChange={(e) => setTo(Number(e.target.value) || undefined)} required>
            <option value="">{tr("Интихоб кунед")}</option>
            {branches
              ?.filter((b) => b.id !== source)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {qtyIn(product, b.id)}
                </option>
              ))}
          </Select>
        </Field>
      </div>
      <Field label={tr("Миқдор ({0})", tr(product.unit))} hint={tr("Озод барои интиқол: {0}", free)}>
        <Input
          type="number"
          min={0}
          max={free}
          step={isFractionalUnit(product.unit) ? "0.001" : "1"}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          required
          autoFocus
        />
      </Field>
      <Field label={tr("Эзоҳ (ихтиёрӣ)")}>
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </Field>
      <Button type="submit" className="w-full" disabled={busy || !source || !to || amount <= 0 || amount > free}>
        <ArrowLeftRight className="size-4" /> {busy ? tr("Сабт…") : tr("Интиқол")}
      </Button>
    </form>
  );
}

/**
 * Инвентаризатсия: дар як филиал молҳоро шумуред ва рақами воқеиро нависед.
 * Холӣ — шумурда нашуд (тағйир намеёбад). Натиҷа: камомад ва зиёдатӣ бо арзиши аслӣ.
 */
export function StocktakeForm({ products, branchId, showCost, onDone }: { products: Product[]; branchId: number; showCost: boolean; onDone: () => void }) {
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StocktakeResult | null>(null);
  const filled = products.filter((p) => counts[p.id] !== undefined && counts[p.id] !== "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<StocktakeResult>("/products/stocktake", {
        method: "POST",
        json: { branchId, note: note.trim() || undefined, counts: filled.map((p) => ({ productId: p.id, qty: Number(counts[p.id]) })) },
      });
      setResult(r);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const diffs = result.lines.filter((l) => l.diff !== 0);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="text-xs text-muted">{tr("Шумурда шуд")}</div>
            <div className="text-xl font-bold text-ink tabular">{result.lines.length}</div>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <div className="text-xs text-muted">{tr("Бо фарқ")}</div>
            <div className={cn("text-xl font-bold tabular", diffs.length ? "text-warn" : "text-good")}>{diffs.length}</div>
          </div>
          {showCost && (
            <>
              <div className="rounded-xl bg-brand-soft p-3">
                <div className="text-xs text-muted">{tr("Камомад")}</div>
                <div className="text-xl font-bold text-brand tabular">{money(-result.shortage)}</div>
              </div>
              <div className="rounded-xl bg-good-soft p-3">
                <div className="text-xs text-muted">{tr("Зиёдатӣ")}</div>
                <div className="text-xl font-bold text-good tabular">{money(result.surplus)}</div>
              </div>
            </>
          )}
        </div>
        {diffs.length === 0 ? (
          <p className="text-center text-sm text-good">{tr("Ҳама чиз мувофиқ аст — фарқ нест")}</p>
        ) : (
          <ul className="max-h-72 divide-y divide-line overflow-y-auto text-sm">
            {diffs.map((l) => (
              <li key={l.productId} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-ink">{l.name}</span>
                <span className="shrink-0 text-right tabular">
                  <span className="text-muted">
                    {l.before} → {l.counted}{" "}
                  </span>
                  <b className={l.diff < 0 ? "text-brand" : "text-good"}>
                    {l.diff > 0 ? "+" : ""}
                    {l.diff} {tr(l.unit)}
                  </b>
                  {showCost && <span className="block text-xs text-muted">{money(l.value)}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Button className="w-full" onClick={onDone}>
          {tr("Тайёр")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorBox message={error} />
      <p className="text-sm text-muted">{tr("Молҳоро дар раф шумуред ва рақами воқеиро нависед. Холӣ — шумурда нашуд ва тағйир намеёбад.")}</p>
      <div className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
        {products.map((p) => {
          const system = qtyIn(p, branchId);
          const v = counts[p.id];
          const diff = v !== undefined && v !== "" ? Math.round((Number(v) - system) * 1000) / 1000 : null;
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                <div className="text-xs text-muted tabular">
                  {tr("Дар система: {0}", `${system} ${tr(p.unit)}`)}
                  {diff !== null && diff !== 0 && <b className={cn("ml-2", diff < 0 ? "text-brand" : "text-good")}>{diff > 0 ? `+${diff}` : diff}</b>}
                </div>
              </div>
              <Input
                type="number"
                min={0}
                step={isFractionalUnit(p.unit) ? "0.001" : "1"}
                value={v ?? ""}
                placeholder={String(system)}
                onChange={(e) => setCounts((c) => ({ ...c, [p.id]: e.target.value }))}
                className="w-24 text-right"
                aria-label={tr("Шумориш: {0}", p.name)}
              />
            </div>
          );
        })}
      </div>
      <Field label={tr("Эзоҳ (ихтиёрӣ)")}>
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={tr("Масалан: инвентаризатсияи моҳи ноябр")} />
      </Field>
      <Button type="submit" className="w-full" disabled={busy || !filled.length}>
        <ClipboardCheck className="size-4" /> {busy ? tr("Сабт…") : tr("Сабт кунед ({0} мол)", filled.length)}
      </Button>
    </form>
  );
}
