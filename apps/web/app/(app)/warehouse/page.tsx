"use client";

import { STOCK_REASON_LABELS, type Branch, type Product, type StockMove } from "@filialhub/shared";
import { ArrowLeftRight, ClipboardCheck, ClipboardList, PackagePlus, Search, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ProductVisual } from "@/components/product-visual";
import { ReorderList } from "@/components/reorder-list";
import { qtyIn, StockForm } from "@/components/stock-form";
import { StockInsights } from "@/components/stock-insights";
import { StocktakeForm, TransferForm } from "@/components/stock-transfer";
import { useServerEvent } from "@/lib/events";
import { Badge, Button, Card, CardTitle, cn, Empty, ErrorBox, formatDate, Modal, money, PageHeader, Segmented, Select, Skeleton } from "@/components/ui";
import { qs } from "@/lib/api";
import { useAuth, useBusiness } from "@/lib/auth";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";

type Filter = "all" | "low" | "out";

/**
 * Анбор: чанд мол дар ҳар филиал монд, чӣ кам монд ё тамом шуд, арзиши анбор ва охирин тағйирҳо.
 * Ҳар фурӯш (POS ва онлайн) боқимондаро худкор кам мекунад; «Қабули мол» — зиёд.
 * Шеф ҳамаи филиалҳоро мебинад; менеҷер ва анбордор — филиали худ.
 */
export default function WarehousePage() {
  const { user } = useAuth();
  const { type } = useBusiness();
  const isChef = user?.role === "CHEF";
  const showCost = user?.role !== "STAFF";
  const { data: products, error, reload } = useApi<Product[]>("/products");
  const { data: branches } = useApi<Branch[]>(isChef ? "/branches" : null);
  const active = branches?.filter((b) => b.isActive) ?? [];
  const [branchId, setBranchId] = useState<number | undefined>();
  const { data: moves, reload: reloadMoves } = useApi<StockMove[]>(`/products/moves${qs({ branchId })}`);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [receiving, setReceiving] = useState<Product | null>(null);
  const [moving, setMoving] = useState<Product | null>(null);
  const [counting, setCounting] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [reorder, setReorder] = useState(false);
  // Фурӯш, возврат ё интиқол дар ҷои дигар — рақамҳо фавран нав мешаванд
  useServerEvent("stock", () => {
    reload();
    reloadMoves();
  });
  // Интиқол ва инвентаризатсия: шеф, менеҷер ва анбордор
  const canManage = user?.role !== "STAFF" || user?.position === "STOREKEEPER";
  // Инвентаризатсия дар як филиал: шеф — филиали интихобшуда, дигарон — филиали худ
  const countBranch = isChef ? (branchId ?? (active.length === 1 ? active[0].id : undefined)) : (user?.branchId ?? undefined);
  const afterChange = () => {
    reload();
    reloadMoves();
  };

  // Шеф: ҳамаи филиалҳо ё як филиал; дигарон — филиали худ
  const qtyOf = (p: Product) => (isChef && !branchId ? (p.stock ?? 0) : qtyIn(p, isChef ? branchId : user?.branchId));
  const limitOf = (p: Product) => p.lowStock ?? 0;
  // Дар «Ҳамаи филиалҳо» ҳолат аз бадтарин филиал аст: агар дар ягон филиал тамом шуда бошад — «Тамом шуд»
  const branchesWhere = (p: Product, test: (q: number) => boolean) => active.filter((b) => test(qtyIn(p, b.id))).length;
  const statusOf = (p: Product): Filter => {
    if (isChef && !branchId && active.length) {
      if (branchesWhere(p, (q) => q <= 0)) return "out";
      return branchesWhere(p, (q) => q <= limitOf(p)) ? "low" : "all";
    }
    const q = qtyOf(p);
    if (q <= 0) return "out";
    return q <= limitOf(p) ? "low" : "all";
  };

  // Шеф бо якчанд филиал: ҳар филиал сутуни худро дорад — дида мешавад, ки дар куҷо чӣ қадар ҳаст
  const matrix = isChef && !branchId && active.length > 1;
  const cellTone = (p: Product, q: number) => (q <= 0 ? "text-brand" : q <= limitOf(p) ? "text-warn" : "text-ink");

  const tracked = products?.filter((p) => p.isActive && p.stock !== null) ?? [];
  // Ҷамъбасти ҳар филиал: чанд мол ҳаст, чандтааш тамом шуд ва арзиши анбор
  const perBranch = active.map((b) => {
    const qs = tracked.map((p) => ({ p, q: qtyIn(p, b.id) }));
    return {
      branch: b,
      inStock: qs.filter((x) => x.q > 0).length,
      low: qs.filter((x) => x.q > 0 && x.q <= limitOf(x.p)).length,
      out: qs.filter((x) => x.q <= 0).length,
      value: qs.reduce((s, x) => s + Math.max(0, x.q) * x.p.cost, 0),
    };
  });
  const untracked = products?.filter((p) => p.isActive && p.stock === null).length ?? 0;
  const outCount = tracked.filter((p) => statusOf(p) === "out").length;
  const lowCount = tracked.filter((p) => statusOf(p) === "low").length;
  const value = tracked.reduce((s, p) => s + Math.max(0, qtyOf(p)) * p.cost, 0);
  const q = query.trim().toLowerCase();
  const list = tracked
    .filter((p) => filter === "all" || statusOf(p) === filter)
    .filter((p) => !q || `${p.name} ${p.category} ${p.barcode ?? ""}`.toLowerCase().includes(q))
    .sort((a, b) => qtyOf(a) - limitOf(a) - (qtyOf(b) - limitOf(b)) || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader
        title={tr("Анбор")}
        subtitle={tr("Боқимондаи мол дар ҳар филиал. Ҳар фурӯш онро худкор кам мекунад.")}
        actions={
          <>
            {showCost && (
              <Button variant="outline" onClick={() => setAnalysing(true)}>
                <TrendingDown className="size-4" /> {tr("Таҳлил")}
              </Button>
            )}
            {canManage && (
              <Button
                variant="outline"
                onClick={() => setCounting(true)}
                disabled={!countBranch}
                title={countBranch ? undefined : tr("Аввал филиалро интихоб кунед")}
              >
                <ClipboardCheck className="size-4" /> {tr("Инвентаризатсия")}
              </Button>
            )}
            <Button variant="outline" onClick={() => setReorder(true)}>
              <ClipboardList className="size-4" /> {tr("Рӯйхати харид")}
              {outCount + lowCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">{outCount + lowCount}</span>}
            </Button>
          </>
        }
      />

      {isChef && active.length > 1 && (
        <div className="mb-4 max-w-xs">
          <Select value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value) || undefined)} aria-label={tr("Филиал")}>
            <option value="">{tr("Ҳамаи филиалҳо")}</option>
            {active.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className={cn("mb-6 grid gap-4", showCost ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3")}>
        <Stat label={tr("Моли ҳисобшаванда")} value={products ? tracked.length : "…"} />
        <Stat label={tr("Кам монд")} value={products ? lowCount : "…"} tone={lowCount ? "warn" : undefined} onClick={() => setFilter("low")} />
        <Stat label={tr("Тамом шуд|мол")} value={products ? outCount : "…"} tone={outCount ? "brand" : undefined} onClick={() => setFilter("out")} />
        {showCost && <Stat label={tr("Арзиши анбор")} value={products ? money(value) : "…"} hint={tr("бо арзиши аслӣ")} />}
      </div>

      {isChef && active.length > 1 && products && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {perBranch.map(({ branch, inStock, low, out, value: v }) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => setBranchId(branchId === branch.id ? undefined : branch.id)}
              className={cn("card cursor-pointer p-4 text-left transition hover:ring-1 hover:ring-line", branchId === branch.id && "ring-2 ring-brand")}
            >
              <div className="truncate font-semibold text-ink">{branch.name}</div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="text-ink-2">
                  {tr("Ҳаст")}: <b className="text-ink tabular">{inStock}</b>
                </span>
                <span className="text-ink-2">
                  {tr("Кам монд")}: <b className={cn("tabular", low ? "text-warn" : "text-ink")}>{low}</b>
                </span>
                <span className="text-ink-2">
                  {tr("Тамом шуд|мол")}: <b className={cn("tabular", out ? "text-brand" : "text-ink")}>{out}</b>
                </span>
              </div>
              {showCost && <div className="mt-1 text-xs text-muted">{tr("Арзиши анбор")}: {money(v)}</div>}
            </button>
          ))}
        </div>
      )}

      <ErrorBox message={error} />

      <div className={cn("grid gap-6", !matrix && "xl:grid-cols-[1fr_380px]")}>
        <Card className="p-2">
          <div className="flex flex-wrap items-center gap-3 p-3">
            <label className="flex h-11 min-w-0 flex-1 basis-56 items-center gap-2 rounded-[14px] border-[1.5px] border-line bg-surface px-3 focus-within:border-brand">
              <Search className="size-4 shrink-0 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tr("Ҷустуҷӯ: ном, категория, штрих-код")}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted focus-visible:outline-none"
              />
            </label>
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "Ҳама" },
                { value: "low", label: "Кам монд" },
                { value: "out", label: "Тамом шуд|мол" },
              ]}
            />
          </div>

          {!products ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : tracked.length === 0 ? (
            <Empty
              icon="📦"
              title={tr("Ҳоло моли ҳисобшаванда нест")}
              text={tr("Дар «Маҳсулот» молро таҳрир карда, миқдори анборро нависед — баъд ин ҷо пайдо мешавад.")}
            />
          ) : list.length === 0 ? (
            <Empty icon="🔍" title={tr("Чизе ёфт нашуд")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 560 + (matrix ? active.length * 110 : 0) }}>
                <thead>
                  <tr className="text-left text-xs tracking-wide text-muted uppercase">
                    <th className={cn("px-3 py-3 font-semibold", matrix && "sticky left-0 z-10 bg-surface")}>{tr("Маҳсулот")}</th>
                    {matrix &&
                      active.map((b) => (
                        <th key={b.id} className="max-w-32 px-3 py-3 text-right font-semibold normal-case" title={b.name}>
                          <span className="line-clamp-2">{b.name}</span>
                        </th>
                      ))}
                    <th className="px-3 py-3 text-right font-semibold">{matrix ? tr("Ҳамагӣ") : tr("Боқимонда")}</th>
                    <th className="px-3 py-3 font-semibold">{tr("Ҳолат")}</th>
                    {showCost && <th className="px-3 py-3 text-right font-semibold">{tr("Арзиш")}</th>}
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const qty = qtyOf(p);
                    const st = statusOf(p);
                    return (
                      <tr key={p.id} className="group/row border-t border-line hover:bg-surface-2">
                        {/* Бо сутунҳои филиалҳо ҷадвал ба паҳлӯ мелағжад — номи мол дар ҷояш мемонад */}
                        <td className={cn("px-3 py-3", matrix && "sticky left-0 z-10 max-w-56 bg-surface group-hover/row:bg-surface-2")}>
                          <div className="flex items-center gap-3">
                            <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-soft text-brand">
                              <ProductVisual imageId={p.imageId} emoji={p.emoji} name={p.name} type={type} iconClass="size-5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-ink">{p.name}</span>
                              <span className="block text-xs text-muted">{tr(p.category)}</span>
                            </span>
                          </div>
                        </td>
                        {matrix &&
                          active.map((b) => {
                            const bq = qtyIn(p, b.id);
                            return (
                              <td key={b.id} className="px-3 py-3 text-right whitespace-nowrap">
                                <span className={cn("font-bold tabular", cellTone(p, bq))}>{Math.max(0, bq)}</span>
                              </td>
                            );
                          })}
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <span className={cn("text-base font-bold tabular", st === "out" ? "text-brand" : st === "low" ? "text-warn" : "text-ink")}>{Math.max(0, qty)}</span>{" "}
                          <span className="text-xs text-muted">{tr(p.unit)}</span>
                        </td>
                        <td className="px-3 py-3">
                          {st === "out" ? (
                            <Badge tone="brand">{matrix ? tr("Дар {0} филиал тамом", branchesWhere(p, (q) => q <= 0)) : tr("Тамом шуд|мол")}</Badge>
                          ) : st === "low" ? (
                            <Badge tone="warn">{matrix ? tr("Дар {0} филиал кам", branchesWhere(p, (q) => q <= limitOf(p))) : tr("Кам монд")}</Badge>
                          ) : (
                            <Badge tone="good">{tr("Ҳаст")}</Badge>
                          )}
                          {p.lowStock !== null && <span className="mt-0.5 block text-[11px] text-muted">{tr("ҳад: {0}", p.lowStock)}</span>}
                        </td>
                        {showCost && <td className="px-3 py-3 text-right whitespace-nowrap text-ink-2 tabular">{money(Math.max(0, qty) * p.cost)}</td>}
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <Button size="sm" variant="outline" onClick={() => setReceiving(p)}>
                            <PackagePlus className="size-4" /> <span className="hidden sm:inline">{tr("Қабули мол")}</span>
                          </Button>
                          {canManage && (
                            <Button size="sm" variant="outline" className="ml-1.5" onClick={() => setMoving(p)} aria-label={tr("Интиқол")} title={tr("Интиқол ба филиали дигар")}>
                              <ArrowLeftRight className="size-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {untracked > 0 && (
            <p className="px-3 pt-2 pb-3 text-xs text-muted">
              {tr("{0} мол ҳисоб карда намешавад.", untracked)}{" "}
              <Link href="/products" className="font-semibold text-brand hover:underline">
                {tr("Дар «Маҳсулот» миқдорро нависед")}
              </Link>
            </p>
          )}
        </Card>

        <Card>
          <CardTitle>{tr("Охирин тағйирҳо")}</CardTitle>
          {!moves ? (
            <Skeleton className="h-40" />
          ) : moves.length === 0 ? (
            <Empty icon="📦" title={tr("Ҳоло тағйир нест")} />
          ) : (
            <ul className="max-h-[640px] divide-y divide-line overflow-y-auto text-sm">
              {moves.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{m.product?.name ?? "—"}</div>
                    <div className="truncate text-xs text-muted">
                      {tr(STOCK_REASON_LABELS[m.reason])}
                      {m.orderId && ` #${m.orderId}`}
                      {m.supplier && ` · ${m.supplier}`} · {formatDate(m.createdAt, true)}
                      {m.userName && ` · ${m.userName}`}
                      {isChef && ` · ${m.branchName}`}
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular">
                    <div className={cn("font-bold", m.qty > 0 ? "text-good" : "text-brand")}>
                      {m.qty > 0 ? "+" : "−"}
                      {Math.abs(m.qty)} <span className="text-[11px] font-medium text-muted">{m.product ? tr(m.product.unit) : ""}</span>
                    </div>
                    <div className="text-[11px] text-muted">
                      {tr("монд")} {m.balance}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={reorder} onClose={() => setReorder(false)} title={tr("Рӯйхати харид")}>
        {reorder && <ReorderList />}
      </Modal>

      <Modal open={!!moving} onClose={() => setMoving(null)} title={tr("Интиқол ба филиали дигар")}>
        {moving && (
          <TransferForm
            product={moving}
            fromBranchId={isChef ? branchId : (user?.branchId ?? undefined)}
            onDone={() => {
              setMoving(null);
              afterChange();
            }}
          />
        )}
      </Modal>

      <Modal open={analysing} onClose={() => setAnalysing(false)} title={tr("Моли мурда ва фоиданашаванда")} wide>
        {analysing && <StockInsights branchId={isChef ? branchId : undefined} />}
      </Modal>

      <Modal open={counting} onClose={() => setCounting(false)} title={tr("Инвентаризатсия")} wide>
        {counting && countBranch && (
          <StocktakeForm
            products={tracked}
            branchId={countBranch}
            showCost={showCost}
            onDone={() => {
              setCounting(false);
              afterChange();
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
              reloadMoves();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function Stat({ label, value, hint, tone, onClick }: { label: string; value: React.ReactNode; hint?: string; tone?: "warn" | "brand"; onClick?: () => void }) {
  const body = (
    <>
      <div className="text-sm text-muted">{label}</div>
      <div className={cn("mt-1 text-2xl font-bold break-words tabular", tone === "warn" ? "text-warn" : tone === "brand" ? "text-brand" : "text-ink")}>{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="card cursor-pointer p-5 text-left transition hover:ring-1 hover:ring-line">
      {body}
    </button>
  ) : (
    <div className="card p-5">{body}</div>
  );
}
