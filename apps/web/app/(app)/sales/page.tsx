"use client";

import { isFractionalUnit, PAYMENT_LABELS, type Branch, type Order, type Paginated, type Period, type ReturnResult, type TimePoint } from "@filialhub/shared";
import { Banknote, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Plus, Printer, RotateCcw, ScanLine } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useEffect, useState } from "react";
import { bucketLabel } from "@/components/chart-label";
import { CashReportCard } from "@/components/cash-closing";
import { ExportButton } from "@/components/export-button";
import { SalesChart } from "@/components/charts-lazy";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, CardTitle, Empty, ErrorBox, Field, formatDate, Input, Modal, money, PageHeader, Segmented, Select, Skeleton, cn } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { printReceipt } from "@/lib/receipt";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { tr, locale } from "@/lib/i18n";
import { Glyph, ProductIcon } from "@/components/glyph";

const GRAN: { value: Period; label: string }[] = [
  { value: "day", label: "Рӯзона" },
  { value: "week", label: "Ҳафтаина" },
  { value: "month", label: "Моҳона" },
];

export default function SalesPage() {
  const { user } = useAuth();
  const isChef = user?.role === "CHEF";
  const isStaff = user?.role === "STAFF";
  const [branchId, setBranchId] = useState<number | undefined>();
  const { data: branches } = useApi<Branch[]>(isChef ? "/branches" : null);

  return (
    <>
      <PageHeader
        title={tr("Таърихи фурӯш")}
        subtitle={isStaff ? tr("Фармоишҳое, ки шумо сабт кардед") : tr("Фурӯш ва фоида рӯз ба рӯз, ҳафта ба ҳафта, моҳ ба моҳ")}
        actions={
          <>
            {isChef && (
              <Select value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value) || undefined)} className="w-56" aria-label={tr("Филиал")}>
                <option value="">{tr("Ҳамаи филиалҳо")}</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
            <ExportButton path="/orders/export" params={{ branchId }} name="sales" />
            <Link href="/pos">
              <Button>
                <Plus className="size-4" /> {tr("Фурӯши нав")}
              </Button>
            </Link>
          </>
        }
      />
      <Suspense>
        <ReceiptLookup />
      </Suspense>
      <CashReportCard branchId={branchId} />
      {!isStaff && <History branchId={branchId} />}
      <OrdersList branchId={branchId} showProfit={!isStaff} showBranch={isChef && !branchId} />
    </>
  );
}

function History({ branchId }: { branchId?: number }) {
  const [g, setG] = useState<Period>("day");
  const { data, error } = useApi<TimePoint[]>(`/stats/timeseries${qs({ branchId, granularity: g })}`);
  const rows = data ? [...data].reverse() : [];
  const total = data?.reduce((s, p) => ({ r: s.r + p.revenue, p: s.p + p.profit, o: s.o + p.orders }), { r: 0, p: 0, o: 0 });
  const maxRev = Math.max(...rows.map((r) => r.revenue), 1);

  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card>
        <CardTitle extra={<Segmented value={g} onChange={setG} options={GRAN} />}>{tr("Графики фурӯш")}</CardTitle>
        <ErrorBox message={error} />
        {data ? <SalesChart data={data} granularity={g} height={340} /> : <Skeleton className="h-[360px]" />}
      </Card>
      <Card className="flex flex-col p-0">
        <div className="border-b border-line p-5">
          <h2 className="text-base font-semibold text-ink">
            {g === "day" ? tr("Аз рӯи рӯзҳо") : g === "week" ? tr("Аз рӯи ҳафтаҳо") : tr("Аз рӯи моҳҳо")}
          </h2>
          {total && (
            <p className="text-sm text-muted tabular">
              {tr("Ҳамагӣ")}{" "}{money(total.r)} {tr("· фоида")}{" "}{money(total.p)} · {total.o.toLocaleString(locale())} {tr("фармоиш")}
            </p>
          )}
        </div>
        <div className="max-h-[400px] flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-left text-xs tracking-wide text-muted uppercase">
                <th className="px-5 py-2.5 font-semibold">{g === "day" ? tr("Рӯз") : g === "week" ? tr("Ҳафта аз") : tr("Моҳ")}</th>
                <th className="px-3 py-2.5 text-right font-semibold">{tr("Фурӯш")}</th>
                <th className="px-3 py-2.5 text-right font-semibold">{tr("Фоида")}</th>
                <th className="px-5 py-2.5 text-right font-semibold">{tr("Фарм.")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.date} className="border-t border-line">
                  <td className="px-5 py-2.5">
                    <div className="font-medium text-ink">
                      {bucketLabel(r.date, g)}
                      {i === 0 && <Badge tone="brand" className="ml-2">{tr("ҷорӣ")}</Badge>}
                    </div>
                    <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full" style={{ width: `${(r.revenue / maxRev) * 100}%`, background: "var(--chart-revenue)" }} />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-ink tabular">{money(r.revenue)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap tabular" style={{ color: "var(--chart-profit)" }}>
                    {money(r.profit)}
                  </td>
                  <td className="px-5 py-2.5 text-right text-ink-2 tabular">{r.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function OrdersList({ branchId, showProfit, showBranch }: { branchId?: number; showProfit: boolean; showBranch: boolean }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);
  const [returning, setReturning] = useState<Order | null>(null);
  const { data, error, reload } = useApi<Paginated<Order>>(`/orders${qs({ branchId, page, pageSize: 15 })}`);
  // Возврат — танҳо шеф ва менеҷер
  const canReturn = user?.role !== "STAFF";
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-line p-5">
        <div>
          <h2 className="text-base font-semibold text-ink">{tr("Фармоишҳои охирин")}</h2>
          {data && <p className="text-sm text-muted">{data.total.toLocaleString(locale())} {tr("фармоиш")}</p>}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label={tr("Пештар")}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="tabular">
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label={tr("Баъдӣ")}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="p-2">
        <ErrorBox message={error} />
        {!data ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <Empty icon="🧾" title={tr("Ҳоло фармоиш нест")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted uppercase">
                  <th className="px-3 py-3 font-semibold">№</th>
                  <th className="px-3 py-3 font-semibold">{tr("Вақт")}</th>
                  {showBranch && <th className="px-3 py-3 font-semibold">{tr("Филиал")}</th>}
                  <th className="px-3 py-3 font-semibold">{tr("Корманд / мизоҷ")}</th>
                  <th className="px-3 py-3 font-semibold">{tr("Пардохт")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{tr("Маблағ")}</th>
                  {showProfit && <th className="px-3 py-3 text-right font-semibold">{tr("Фоида")}</th>}
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <Fragment key={o.id}>
                    <tr className="cursor-pointer border-t border-line hover:bg-surface-2" onClick={() => setOpen(open === o.id ? null : o.id)}>
                      <td className="px-3 py-3 font-semibold text-muted tabular">
                        #{o.id}
                        {o.returnOfId && (
                          <Badge tone="warn" className="ml-1.5">
                            <RotateCcw className="size-3" /> {tr("возврат №{0}", o.returnOfId)}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-ink-2 tabular">{formatDate(o.createdAt, true)}</td>
                      {showBranch && <td className="px-3 py-3 text-ink-2">{o.branchName.replace("FilialHub ", "")}</td>}
                      <td className="px-3 py-3 text-ink-2">
                        {o.userName}
                        {o.customerName && <span className="block text-xs font-medium text-warn"><Glyph e="🎁" className="mr-0.5 inline size-3 -mt-0.5" />{o.customerName}{o.pointsUsed ? ` · −${o.pointsUsed}` : ""}</span>}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={o.payment === "CARD" ? "blue" : "neutral"}>{o.payment === "CARD" ? <CreditCard className="size-3" /> : <Banknote className="size-3" />} {tr(PAYMENT_LABELS[o.payment])}</Badge>
                      </td>
                      <td className={cn("px-3 py-3 text-right font-bold whitespace-nowrap tabular", o.total < 0 ? "text-brand" : "text-ink")}>
                        {money(o.total)}
                        {o.refunded > 0 && <span className="block text-xs font-medium text-warn">−{money(o.refunded)} {tr("возврат")}</span>}
                      </td>
                      {showProfit && (
                        <td className="px-3 py-3 text-right font-semibold whitespace-nowrap tabular" style={{ color: "var(--chart-profit)" }}>
                          {money(o.profit)}
                        </td>
                      )}
                      <td className="px-3 py-3 text-right">
                        <ChevronDown className={cn("ml-auto size-4 text-muted transition", open === o.id && "rotate-180")} />
                      </td>
                    </tr>
                    {open === o.id && (
                      <tr className="bg-surface-2">
                        <td colSpan={8} className="px-6 py-3">
                          <div className="flex flex-wrap gap-2">
                            {o.items.map((i) => (
                              <span key={i.productId} className="rounded-xl bg-surface px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-line">
                                <ProductIcon value={i.emoji} className="mr-1 inline size-3.5 -mt-0.5" />{i.name} × {i.qty} {tr(i.unit)} = <b className="tabular">{money(i.unitPrice * i.qty)}</b>
                              </span>
                            ))}
                            <button
                              onClick={() => printReceipt(o, user?.organization?.name ?? "FilialHub")}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:ring-ink"
                            >
                              <Printer className="size-3.5" /> {tr("Чопи чек")}
                            </button>
                            {canReturn && !o.returnOfId && o.items.some((i) => (i.returned ?? 0) < i.qty) && (
                              <button
                                onClick={() => setReturning(o)}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-xs font-semibold text-brand ring-1 ring-line hover:ring-brand"
                              >
                                <RotateCcw className="size-3.5" /> {tr("Возврат")}
                              </button>
                            )}
                            {o.note && <span className="self-center text-xs text-muted">{o.note}</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={!!returning} onClose={() => setReturning(null)} title={returning ? tr("Возврат аз фурӯши №{0}", returning.id) : ""}>
        {returning && (
          <ReturnForm
            order={returning}
            onDone={() => {
              setReturning(null);
              reload();
            }}
          />
        )}
      </Modal>
    </Card>
  );
}

/**
 * Возврат: миқдори ҳар мол (пешфарз — ҳамаи боқимонда). Сервер пулро мутаносибан ба пардохти воқеӣ ҳисоб мекунад,
 * молро ба анбор, бонус ва қарзро ба мизоҷ бармегардонад.
 */
function ReturnForm({ order, onDone }: { order: Order; onDone: () => void }) {
  const toast = useToast();
  const left = (i: Order["items"][number]) => Math.round((i.qty - (i.returned ?? 0)) * 1000) / 1000;
  const [qty, setQty] = useState<Record<number, string>>(() => Object.fromEntries(order.items.map((i) => [i.productId, String(left(i))])));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = order.items.map((i) => ({ productId: i.productId, qty: Number(qty[i.productId]) || 0 })).filter((i) => i.qty > 0);
  // Тахминан: ҳамон таносуби тахфиф, ки дар чек буд (рақами дақиқро сервер медиҳад)
  const gross = order.items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const ratio = gross > 0 ? order.total / gross : 0;
  const estimate = items.reduce((s, it) => s + (order.items.find((i) => i.productId === it.productId)?.unitPrice ?? 0) * it.qty, 0) * ratio;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<ReturnResult>(`/orders/${order.id}/return`, { method: "POST", json: { items, note: note.trim() || undefined } });
      toast.success(
        tr("Возврат №{0} сабт шуд", r.order.id),
        r.debtReduced > 0 ? tr("Қарз −{0} · ба мизоҷ диҳед: {1}", money(r.debtReduced), money(r.cashBack)) : tr("Ба мизоҷ диҳед: {0}", money(r.cashBack)),
      );
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
      <div className="space-y-2">
        {order.items.map((i) => {
          const max = left(i);
          return (
            <div key={i.productId} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2">
              <ProductIcon value={i.emoji} className="size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{i.name}</div>
                <div className="text-xs text-muted tabular">
                  {tr("Фурӯхта: {0}", `${i.qty} ${tr(i.unit)}`)}
                  {(i.returned ?? 0) > 0 && ` · ${tr("баргашт: {0}", i.returned ?? 0)}`}
                </div>
              </div>
              <Input
                type="number"
                min={0}
                max={max}
                step={isFractionalUnit(i.unit) ? "0.001" : "1"}
                value={qty[i.productId] ?? ""}
                disabled={max <= 0}
                onChange={(e) => setQty((q) => ({ ...q, [i.productId]: e.target.value }))}
                className="w-24 text-right"
                aria-label={tr("Миқдори возврат: {0}", i.name)}
              />
            </div>
          );
        })}
      </div>
      <Field label={tr("Сабаб (ихтиёрӣ)")}>
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={tr("Масалан: вайрон буд, андоза мувофиқ наомад")} />
      </Field>
      <div className="flex items-center justify-between rounded-xl bg-warn-soft px-4 py-3 text-sm">
        <span className="text-ink-2">{tr("Ба мизоҷ бармегардад (тахминан)")}</span>
        <b className="text-lg text-ink tabular">{money(Math.round(estimate * 100) / 100)}</b>
      </div>
      <p className="text-xs text-muted">{tr("Мол ба анбори ҳамин филиал бармегардад. Бонус ва қарзи мизоҷ худкор ислоҳ мешаванд.")}</p>
      <Button type="submit" className="w-full" disabled={busy || !items.length}>
        <RotateCcw className="size-4" /> {busy ? tr("Сабт…") : tr("Возвратро сабт кунед")}
      </Button>
    </form>
  );
}

/** Рақам аз «123», «#123» ё суроғаи QR «…/sales?order=123» (сканери 2D QR-ро ҳамчун матн менависад) */
function receiptId(raw: string): number | null {
  const s = raw.trim();
  const m = /[?&]order=(\d+)/.exec(s) ?? /^#?(\d{1,10})$/.exec(s);
  return m ? Number(m[1]) : null;
}

/**
 * Чек аз QR ё рақам: менеҷер QR-и чекро бо камераи телефон скан мекунад → /sales?order=123 →
 * чек фавран бо тугмаи «Возврат» кушода мешавад. Кассир бо сканер ё дастӣ рақамро менависад.
 */
function ReceiptLookup() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const fromQr = receiptId(params.get("order") ?? "");
  const [query, setQuery] = useState("");
  // Рақами дастӣ (ҷустуҷӯ) ё аз суроғаи QR. Саҳифа пешакӣ бе ?order= сохта мешавад,
  // бинобар ин рақами QR дар state нигоҳ дошта намешавад — ҳар бор аз суроға гирифта мешавад
  const [typed, setId] = useState<number | null>(null);
  const id = typed ?? fromQr;
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const canReturn = user?.role !== "STAFF";

  useEffect(() => {
    if (!id) return;
    let alive = true;
    api<Order>(`/orders/${id}`)
      .then((o) => alive && (setOrder(o), setError(null)))
      .catch((e: Error) => alive && (setOrder(null), setError(e.message)));
    return () => {
      alive = false;
    };
  }, [id]);

  function close() {
    setId(null);
    setOrder(null);
    setReturning(false);
    // Суроғаро тоза мекунем — пас аз нав кардани саҳифа чек дубора кушода намешавад
    if (fromQr) router.replace("/sales");
  }

  const left = order ? order.items.some((i) => (i.returned ?? 0) < i.qty) : false;
  return (
    <>
      <form
        className="mb-4 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const n = receiptId(query);
          if (!n) return setError(tr("Рақами чекро нависед ё QR-ро скан кунед"));
          setError(null);
          setOrder(null);
          setId(n);
          setQuery("");
        }}
      >
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[14px] border-[1.5px] border-line bg-surface px-3 focus-within:border-brand">
          <ScanLine className="size-4 shrink-0 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("№ чек ё QR-и чек")}
            aria-label={tr("№ чек ё QR-и чек")}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted focus-visible:outline-none"
          />
        </label>
        <Button type="submit" variant="outline">
          {tr("Кушодан")}
        </Button>
      </form>
      {!id && error && <ErrorBox message={error} />}
      <Modal open={!!id} onClose={close} title={returning && order ? tr("Возврат аз фурӯши №{0}", order.id) : tr("Чек #{0}", id ?? "")}>
        {error ? (
          <ErrorBox message={error} />
        ) : !order ? (
          <Skeleton className="h-40" />
        ) : returning ? (
          <ReturnForm order={order} onDone={close} />
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-muted">
              {formatDate(order.createdAt, true)} · {order.branchName} · {order.userName}
              {order.customerName && ` · ${order.customerName}`}
            </div>
            {order.returnOfId && <Badge tone="warn">{tr("возврат №{0}", order.returnOfId)}</Badge>}
            <ul className="divide-y divide-line text-sm">
              {order.items.map((i) => (
                <li key={i.productId} className="flex justify-between gap-3 py-2">
                  <span className="text-ink">
                    {i.name} × {i.qty}
                    {(i.returned ?? 0) > 0 && <span className="ml-1 text-xs text-warn">({tr("баргашт: {0}", i.returned ?? 0)})</span>}
                  </span>
                  <b className="tabular">{money(i.unitPrice * i.qty)}</b>
                </li>
              ))}
            </ul>
            <div className="flex justify-between text-base font-bold">
              <span>{tr("Ҳамагӣ")} · {tr(PAYMENT_LABELS[order.payment])}</span>
              <span className="tabular">{money(order.total)}</span>
            </div>
            {order.refunded > 0 && <div className="text-right text-sm text-warn">−{money(order.refunded)} {tr("возврат")}</div>}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => printReceipt(order, user?.organization?.name ?? "FilialHub")}>
                <Printer className="size-4" /> {tr("Чопи чек")}
              </Button>
              {canReturn && !order.returnOfId && left ? (
                <Button onClick={() => setReturning(true)}>
                  <RotateCcw className="size-4" /> {tr("Возврат")}
                </Button>
              ) : (
                <Button variant="outline" onClick={close}>
                  {tr("Пӯшидан")}
                </Button>
              )}
            </div>
            {!canReturn && !order.returnOfId && left && <p className="text-xs text-muted">{tr("Возвратро менеҷер ё шеф мекунад.")}</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
