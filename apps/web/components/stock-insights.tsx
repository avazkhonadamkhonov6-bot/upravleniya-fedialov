"use client";

import type { ProductInsight, ProductInsights } from "@filialhub/shared";
import { useState } from "react";
import { ProductIcon } from "@/components/glyph";
import { Badge, cn, Empty, ErrorBox, formatDate, money, Segmented, Skeleton } from "@/components/ui";
import { qs } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";

const FLAG: Record<ProductInsight["flags"][number], { label: string; tone: "brand" | "warn" }> = {
  dead: { label: "Намефурӯшад", tone: "brand" },
  slow: { label: "Суст", tone: "warn" },
  loss: { label: "Зарар", tone: "brand" },
  low: { label: "Маржаи паст", tone: "warn" },
};

type Filter = "problems" | "all";

/**
 * Таҳлили мол: кадом мол дар раф пулро «мехобонад» (намефурӯшад ё барои 90+ рӯз мерасад)
 * ва кадом фоида намедиҳад (нарх ≤ арзиш ё маржа < 15%). Маслиҳат: аксия, интиқол ё харид накардан.
 */
export function StockInsights({ branchId }: { branchId?: number }) {
  const [days, setDays] = useState<"30" | "60" | "90">("30");
  const [filter, setFilter] = useState<Filter>("problems");
  const { data, error } = useApi<ProductInsights>(`/products/insights${qs({ days, branchId })}`);

  if (error) return <ErrorBox message={error} />;
  const list = data ? (filter === "problems" ? data.items.filter((i) => i.flags.length) : data.items) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={days}
          onChange={setDays}
          options={[
            { value: "30", label: "30 рӯз" },
            { value: "60", label: "60 рӯз" },
            { value: "90", label: "90 рӯз" },
          ]}
        />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "problems", label: "Мушкилот" },
            { value: "all", label: "Ҳама" },
          ]}
        />
      </div>
      {!data ? (
        <Skeleton className="h-60" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label={tr("Пули хобида дар раф")} value={money(data.frozen)} tone={data.frozen > 0 ? "brand" : undefined} />
            <Tile label={tr("Намефурӯшад")} value={String(data.dead)} tone={data.dead ? "brand" : undefined} />
            <Tile label={tr("Зарар")} value={String(data.loss)} tone={data.loss ? "brand" : undefined} />
            <Tile label={tr("Маржаи паст")} value={String(data.low + data.slow)} tone={data.low + data.slow ? "warn" : undefined} />
          </div>
          {list.length === 0 ? (
            <Empty icon="✅" title={tr("Мушкилот нест — ҳама мол мефурӯшад ва фоида медиҳад")} />
          ) : (
            <ul className="max-h-[55vh] divide-y divide-line overflow-y-auto text-sm">
              {list.map((i) => (
                <li key={i.productId} className="flex items-start gap-3 py-2.5">
                  <ProductIcon value={i.emoji} className="mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-ink">{i.name}</span>
                      {i.flags.map((f) => (
                        <Badge key={f} tone={FLAG[f].tone}>
                          {tr(FLAG[f].label)}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-0.5 text-xs text-muted tabular">
                      {tr("Фурӯш: {0} {1}", i.soldQty, tr(i.unit))} · {tr("фоида")} {money(i.profit)} · {tr("маржа")} {i.margin}%
                      {i.stock !== null && ` · ${tr("дар раф")} ${i.stock} (${money(i.stockValue)})`}
                      {i.daysOfStock !== null && ` · ${tr("барои {0} рӯз", i.daysOfStock)}`}
                      {` · ${i.lastSoldAt ? tr("охирин фурӯш: {0}", formatDate(i.lastSoldAt)) : tr("фурӯш набуд")}`}
                    </div>
                    {i.flags.length > 0 && <div className="mt-1 text-xs text-ink-2">{advice(i)}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/** Маслиҳати кӯтоҳ барои ҳар мушкил */
function advice(i: ProductInsight) {
  if (i.flags.includes("loss")) return tr("💡 Нархро баланд кунед ё таъминкунандаи арзонтар ёбед — ҳар фурӯш зарар аст.");
  if (i.flags.includes("dead")) return tr("💡 Аксия гузоред, ба филиали дигар интиқол диҳед ё дигар нахаред.");
  if (i.flags.includes("slow")) return tr("💡 Камтар харед — мол зиёд аст ва пулро мехобонад.");
  return tr("💡 Маржа паст: нархро каме баланд кунед ё бо маҳсулоти фоиданок якҷоя фурӯшед.");
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "brand" | "warn" }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className={cn("text-lg font-bold tabular", tone === "brand" ? "text-brand" : tone === "warn" ? "text-warn" : "text-ink")}>{value}</div>
    </div>
  );
}
