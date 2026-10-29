"use client";

import type { Product } from "@filialhub/shared";
import { PackagePlus, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { ProductForm } from "@/components/forms";
import { Badge, Button, Card, Empty, ErrorBox, Modal, money, PageHeader, Skeleton, cn } from "@/components/ui";
import { useAuth, useBusiness } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { tr } from "@/lib/i18n";
import { ProductVisual } from "@/components/product-visual";
import { StockForm } from "@/components/stock-form";

export default function ProductsPage() {
  const { user } = useAuth();
  const { restaurant, type } = useBusiness();
  const isChef = user?.role === "CHEF";
  const showCost = user?.role !== "STAFF";
  const { data, error, reload } = useApi<Product[]>("/products");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [receiving, setReceiving] = useState<Product | null>(null);
  // Анборро шеф, менеҷер ва анбордор пур мекунанд
  const canStock = user?.role !== "STAFF" || user?.position === "STOREKEEPER";
  const tracksStock = data?.some((p) => p.stock !== null) ?? false;
  const lowCount = data?.filter((p) => p.isActive && p.stock !== null && p.stock <= (p.lowStock ?? 0)).length ?? 0;
  const [category, setCategory] = useState<string>("");

  const categories = [...new Set(data?.map((p) => p.category))];
  const list = data?.filter((p) => !category || p.category === category) ?? [];
  const active = data?.filter((p) => p.isActive) ?? [];
  const avgMargin = active.length ? active.reduce((s, p) => s + p.margin, 0) / active.length : 0;
  const best = [...active].sort((a, b) => b.profit - a.profit)[0];

  return (
    <>
      <PageHeader
        title={restaurant ? tr("Меню ва нархҳо") : tr("Маҳсулот ва нархҳо")}
        subtitle={isChef ? tr("Нархҳо барои ҳамаи филиалҳо як хел аст. Фоида = нарх − арзиши аслӣ.") : tr("Нархҳои ҳамаи филиалҳо")}
        actions={
          isChef && (
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" /> {tr("Маҳсулоти нав")}
            </Button>
          )
        }
      />

      {showCost && data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <div className="text-sm text-muted">{tr("Маҳсулоти фаъол")}</div>
            <div className="mt-1 text-3xl font-bold text-ink tabular">{active.length}</div>
          </div>
          <div className="card p-5">
            <div className="text-sm text-muted">{tr("Маржаи миёна")}</div>
            <div className="mt-1 text-3xl font-bold tabular" style={{ color: "var(--chart-profit)" }}>
              {avgMargin.toFixed(1)}%
            </div>
          </div>
          <div className="card p-5">
            <div className="text-sm text-muted">{tr("Фоиданоктарин (1 дона)")}</div>
            <div className="mt-1 truncate text-xl font-bold text-ink">
              {best ? best.name : "—"}
            </div>
            {best && <div className="text-sm text-muted">{money(best.profit)}</div>}
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {["", ...categories].map((c) => (
          <button
            key={c || "all"}
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition",
              category === c ? "bg-ink text-surface" : "bg-surface text-ink-2 ring-1 ring-line hover:text-ink",
            )}
          >
            {c ? tr(c) : tr("Ҳама")}
          </button>
        ))}
      </div>

      {lowCount > 0 && (
        <div className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">
          {tr("{0} мол кам монд ё тамом шуд — анборро пур кунед", lowCount)}
        </div>
      )}
      <ErrorBox message={error} />
      <Card className="p-2">
        {!data ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <Empty icon={restaurant ? "🍽" : "📦"} title={tr("Ҳоло маҳсулот нест")} text={isChef ? tr("«Маҳсулоти нав»-ро пахш карда, моли худро илова кунед.") : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted uppercase">
                  <th className="px-3 py-3 font-semibold">{tr("Маҳсулот")}</th>
                  <th className="px-3 py-3 font-semibold">{tr("Категория")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{tr("Нарх")}</th>
                  {tracksStock && <th className="px-3 py-3 text-right font-semibold">{tr("Анбор")}</th>}
                  {showCost && (
                    <>
                      <th className="px-3 py-3 text-right font-semibold">{tr("Арзиши аслӣ")}</th>
                      <th className="px-3 py-3 text-right font-semibold">{tr("Фоида")}</th>
                      <th className="px-3 py-3 font-semibold">{tr("Маржа")}</th>
                    </>
                  )}
                  {isChef && <th className="px-3 py-3" />}
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className={cn("border-t border-line hover:bg-surface-2", !p.isActive && "opacity-45")}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-soft text-brand">
                          <ProductVisual imageId={p.imageId} emoji={p.emoji} name={p.name} type={type} iconClass="size-5" />
                        </span>
                        <span className="font-semibold text-ink">{p.name}</span>
                        {!p.isActive && <Badge tone="warn">{tr("пинҳон")}</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink-2">{tr(p.category)}</td>
                    <td className="px-3 py-3 text-right font-bold whitespace-nowrap text-ink tabular">
                      {money(p.price)}
                      <span className="block text-[11px] font-medium text-muted">/ {tr(p.unit)}</span>
                    </td>
                    {tracksStock && (
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        {p.stock === null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <span className={cn("font-bold tabular", p.stock <= 0 ? "text-brand" : p.stock <= (p.lowStock ?? 0) ? "text-warn" : "text-ink")}>
                              {p.stock} <span className="text-[11px] font-medium text-muted">{tr(p.unit)}</span>
                            </span>
                            {canStock && (
                              <button onClick={() => setReceiving(p)} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink" aria-label={tr("Қабули мол")}>
                                <PackagePlus className="size-4" />
                              </button>
                            )}
                          </span>
                        )}
                      </td>
                    )}
                    {showCost && (
                      <>
                        <td className="px-3 py-3 text-right whitespace-nowrap text-muted tabular">{money(p.cost)}</td>
                        <td className="px-3 py-3 text-right font-semibold whitespace-nowrap tabular" style={{ color: "var(--chart-profit)" }}>
                          +{money(p.profit)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(p.margin, 100)}%`, background: "var(--chart-profit)" }} />
                            </div>
                            <span className="text-xs font-semibold text-ink-2 tabular">{p.margin}%</span>
                          </div>
                        </td>
                      </>
                    )}
                    {isChef && (
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => setEditing(p)} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink" aria-label={tr("Таҳрир")}>
                          <Pencil className="size-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? tr("Маҳсулоти нав") : tr("Таҳрири маҳсулот")}>
        {editing && (
          <ProductForm
            product={editing === "new" ? undefined : editing}
            onDone={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>

      <Modal open={!!receiving} onClose={() => setReceiving(null)} title={tr("Қабули мол")}>
        {receiving && (
          <StockForm
            product={receiving}
            onDone={() => {
              setReceiving(null);
              reload();
            }}
          />
        )}
      </Modal>
    </>
  );
}
