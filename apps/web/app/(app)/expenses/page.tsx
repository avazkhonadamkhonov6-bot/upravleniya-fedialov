"use client";

import {
  EXPENSE_CATEGORIES,
  EXPENSE_LABELS,
  type Branch,
  type Expense,
  type ExpenseCategory,
  type Paginated,
  type ProfitAndLoss,
} from "@filialhub/shared";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useToast } from "@/components/toast";
import { Button, Card, CardTitle, compactMoney, Empty, ErrorBox, Field, formatDate, Input, Modal, money, PageHeader, Select, Skeleton, cn } from "@/components/ui";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { ExportButton } from "@/components/export-button";
import { tr } from "@/lib/i18n";
import { ExpenseIcon, Glyph } from "@/components/glyph";

const MONTHS = ["Январ", "Феврал", "Март", "Апрел", "Май", "Июн", "Июл", "Август", "Сентябр", "Октябр", "Ноябр", "Декабр"];
const monthLabel = (m: string) => `${tr(MONTHS[Number(m.slice(5, 7)) - 1])} ${m.slice(0, 4)}`;

export default function ExpensesPage() {
  const { user } = useAuth();
  const isChef = user?.role === "CHEF";
  const [branchId, setBranchId] = useState<number | undefined>();
  const [category, setCategory] = useState<ExpenseCategory | "">("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [monthIdx, setMonthIdx] = useState<number | null>(null);

  const { data: branches } = useApi<Branch[]>(isChef ? "/branches" : null);
  const { data: pnl, reload: reloadPnl } = useApi<ProfitAndLoss[]>(`/expenses/pnl${qs({ branchId, months: 6 })}`);
  const { data: list, error, reload } = useApi<Paginated<Expense> & { sum: number }>(`/expenses${qs({ branchId, category, page })}`);
  // Моҳҳое, ки хароҷот сабт нашудааст (масалан, моҳи нопурраи аввал), фоидаи сохта нишон медиҳанд — пинҳон мекунем.
  const withData = pnl?.filter((m) => m.revenue > 0 || m.expenses > 0) ?? [];
  const months = withData.some((m) => m.expenses > 0) ? withData.filter((m) => m.expenses > 0) : withData;
  const sel = months[monthIdx ?? months.length - 1];
  const pages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1;
  const refresh = () => {
    reload();
    reloadPnl();
  };

  return (
    <>
      <PageHeader
        title={tr("Хароҷот ва фоидаи соф")}
        subtitle={tr("Фоидаи соф = фурӯш − арзиши аслӣ − хароҷот (иҷора, маош, коммуналӣ ва ғ.)")}
        actions={
          <>
            {isChef && (
              <Select
                value={branchId ?? ""}
                onChange={(e) => {
                  setBranchId(Number(e.target.value) || undefined);
                  setPage(1);
                }}
                className="w-56"
                aria-label={tr("Филиал")}
              >
                <option value="">{tr("Ҳамаи филиалҳо")}</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
            <ExportButton path="/expenses/export" params={{ branchId, category: category || undefined }} name="expenses" />
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" /> {tr("Хароҷоти нав")}
            </Button>
          </>
        }
      />

      {/* P&L for selected month */}
      {!pnl ? (
        <Skeleton className="h-40" />
      ) : sel ? (
        <>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {months.map((m, i) => (
              <button
                key={m.month}
                onClick={() => setMonthIdx(i)}
                className={cn(
                  "shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition",
                  sel.month === m.month ? "bg-ink text-surface" : "bg-surface text-ink-2 ring-1 ring-line hover:text-ink",
                )}
              >
                {monthLabel(m.month)}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {(
              [
                [tr("Фурӯш"), sel.revenue, "💰", ""],
                [tr("Арзиши аслӣ"), -sel.cost, "🥩", "text-muted"],
                [tr("Фоидаи умумӣ"), sel.grossProfit, "📈", ""],
                [tr("Хароҷот"), -sel.expenses, "💸", "text-brand"],
              ] as const
            ).map(([label, value, emoji, cls], i) => (
              <div key={label} className="rise card p-5" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-center justify-between text-sm text-muted">
                  {label} <span className="grid size-8 place-items-center rounded-lg bg-surface-2 text-ink-2"><Glyph e={emoji} className="size-4" /></span>
                </div>
                <div className={cn("mt-2 text-xl font-bold text-ink tabular", cls)}>{money(value)}</div>
              </div>
            ))}
            <div className="rise relative overflow-hidden rounded-[20px] bg-[#16120f] p-5 text-white shadow-card" style={{ animationDelay: "200ms" }}>
              <div className="absolute -top-10 -right-10 size-32 rounded-full bg-[#dc3b1c]" />
              <div className="relative flex items-center justify-between text-sm text-white/60">
                {tr("Фоидаи соф")}{" "}<Glyph e="🏆" className="size-5" />
              </div>
              <div className={cn("relative mt-2 text-2xl font-extrabold tabular", sel.netProfit < 0 ? "text-[#ff8a8a]" : "text-[#8db8ff]")}>{money(sel.netProfit)}</div>
              <div className="relative text-xs text-white/50">
                {tr("маржаи соф")}{" "}{sel.revenue ? ((sel.netProfit / sel.revenue) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Card>
              <CardTitle>{tr("Фоидаи соф моҳ ба моҳ")}</CardTitle>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={months} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--line)" />
                    <XAxis dataKey="month" tickFormatter={(m: string) => monthLabel(m).slice(0, 3)} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={56} />
                    <Tooltip
                      cursor={{ fill: "var(--surface-2)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const m = payload[0].payload as ProfitAndLoss;
                        return (
                          <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs shadow-card">
                            <div className="mb-1 font-semibold text-ink">{monthLabel(m.month)}</div>
                            <div className="space-y-0.5 text-muted tabular">
                              <div>{tr("Фурӯш:")}{" "}<b className="text-ink">{money(m.revenue)}</b></div>
                              <div>{tr("Фоидаи умумӣ:")}{" "}<b className="text-ink">{money(m.grossProfit)}</b></div>
                              <div>{tr("Хароҷот:")}{" "}<b className="text-ink">{money(m.expenses)}</b></div>
                              <div>{tr("Фоидаи соф:")}{" "}<b className="text-ink">{money(m.netProfit)}</b></div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="netProfit" radius={[4, 4, 0, 0]} maxBarSize={48} onClick={(_, i) => setMonthIdx(i)} className="cursor-pointer">
                      {months.map((m) => (
                        <Cell key={m.month} fill={m.netProfit < 0 ? "var(--chart-revenue)" : "var(--chart-profit)"} fillOpacity={m.month === sel.month ? 1 : 0.45} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-muted">{tr("Ба сутун пахш кунед, то тафсилоти моҳро бинед.")}</p>
            </Card>
            <Card>
              <CardTitle extra={<span className="text-sm font-bold text-ink tabular">{money(sel.expenses)}</span>}>{tr("Хароҷот аз рӯи категория")}</CardTitle>
              <ul className="space-y-3">
                {EXPENSE_CATEGORIES.filter((c) => sel.byCategory[c] > 0)
                  .sort((a, b) => sel.byCategory[b] - sel.byCategory[a])
                  .map((c) => {
                    const pct = sel.expenses ? (sel.byCategory[c] / sel.expenses) * 100 : 0;
                    return (
                      <li key={c}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-ink">
                            <ExpenseIcon category={c} className="size-4 shrink-0" /> {tr(EXPENSE_LABELS[c])}
                          </span>
                          <span className="text-ink tabular">
                            {money(sel.byCategory[c])} <span className="text-xs text-muted">· {pct.toFixed(0)}%</span>
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--chart-revenue)" }} />
                        </div>
                      </li>
                    );
                  })}
                {sel.expenses === 0 && <Empty icon="🧾" title={tr("Дар ин моҳ хароҷот нест")} />}
              </ul>
            </Card>
          </div>
        </>
      ) : (
        <Empty icon="📊" title={tr("Ҳоло маълумот нест")} />
      )}

      {/* List */}
      <Card className="mt-6 p-0">
        <div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">{tr("Ҳамаи хароҷот")}</h2>
            {list && (
              <p className="text-sm text-muted">
                {list.total} {tr("сабт · ҳамагӣ")}{" "}<b className="text-ink tabular">{money(list.sum)}</b>
              </p>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(["", ...EXPENSE_CATEGORIES] as const).map((c) => (
              <button
                key={c || "all"}
                onClick={() => {
                  setCategory(c);
                  setPage(1);
                }}
                className={cn(
                  "shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  category === c ? "bg-brand-soft text-brand" : "bg-surface-2 text-ink-2 hover:text-ink",
                )}
              >
                {c ? <><ExpenseIcon category={c} className="size-3.5" /> {tr(EXPENSE_LABELS[c])}</> : tr("Ҳама")}
              </button>
            ))}
          </div>
        </div>
        <div className="p-2">
          <ErrorBox message={error} />
          {!list ? (
            <Skeleton className="m-3 h-48" />
          ) : list.items.length === 0 ? (
            <Empty icon="🧾" title={tr("Хароҷот нест")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs tracking-wide text-muted uppercase">
                    <th className="px-3 py-3 font-semibold">{tr("Сана")}</th>
                    <th className="px-3 py-3 font-semibold">{tr("Категория")}</th>
                    {isChef && !branchId && <th className="px-3 py-3 font-semibold">{tr("Филиал")}</th>}
                    <th className="px-3 py-3 font-semibold">{tr("Эзоҳ")}</th>
                    <th className="px-3 py-3 text-right font-semibold">{tr("Маблағ")}</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((e) => (
                    <tr key={e.id} className="border-t border-line hover:bg-surface-2">
                      <td className="px-3 py-3 whitespace-nowrap text-ink-2 tabular">{formatDate(e.date)}</td>
                      <td className="px-3 py-3 font-semibold whitespace-nowrap text-ink">
                        <ExpenseIcon category={e.category} className="mr-1 inline size-4 -mt-0.5 text-muted" />{tr(EXPENSE_LABELS[e.category])}
                      </td>
                      {isChef && !branchId && <td className="px-3 py-3 text-ink-2">{e.branchName.replace("FilialHub ", "")}</td>}
                      <td className="px-3 py-3 text-muted">
                        {e.note || "—"}
                        {e.createdBy && <span className="block text-[11px]">{e.createdBy}</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-bold whitespace-nowrap text-ink tabular">{money(e.amount)}</td>
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => setEditing(e)} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink" aria-label={tr("Таҳрир")}>
                          <Pencil className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {list && list.total > list.pageSize && (
          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3 text-sm text-muted">
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
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? tr("Хароҷоти нав") : tr("Таҳрири хароҷот")}>
        {editing && (
          <ExpenseForm
            expense={editing === "new" ? undefined : editing}
            branches={branches}
            defaultBranchId={branchId ?? branches?.[0]?.id}
            onDone={() => {
              setEditing(null);
              refresh();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function ExpenseForm({ expense, branches, defaultBranchId, onDone }: { expense?: Expense; branches?: Branch[]; defaultBranchId?: number; onDone: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const isChef = user?.role === "CHEF";
  const [f, setF] = useState({
    category: (expense?.category ?? "SUPPLIES") as ExpenseCategory,
    amount: expense?.amount ?? 0,
    date: (expense?.date ?? new Date().toISOString()).slice(0, 10),
    note: expense?.note ?? "",
    branchId: expense?.branchId ?? defaultBranchId ?? 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { category: f.category, amount: Number(f.amount), date: new Date(`${f.date}T12:00:00`).toISOString(), note: f.note };
    try {
      if (expense) await api(`/expenses/${expense.id}`, { method: "PATCH", json: body });
      else await api("/expenses", { method: "POST", json: { ...body, branchId: isChef ? Number(f.branchId) : undefined } });
      toast.success(expense ? tr("Хароҷот захира шуд") : tr("Хароҷот сабт шуд"), money(body.amount));
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!expense || !confirm(tr("Ин хароҷот нест карда шавад?"))) return;
    try {
      await api(`/expenses/${expense.id}`, { method: "DELETE" });
      toast.success(tr("Хароҷот нест шуд"));
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label={tr("Категория")}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {EXPENSE_CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setF({ ...f, category: c })}
              className={cn(
                "cursor-pointer rounded-xl border p-2.5 text-left text-sm font-semibold transition",
                f.category === c ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface-2 text-ink-2",
              )}
            >
              <ExpenseIcon category={c} className="mr-1 inline size-4 -mt-0.5" /> {tr(EXPENSE_LABELS[c])}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Маблағ (сомонӣ)")}>
          <Input type="number" min={0.01} step="0.01" required value={f.amount || ""} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} />
        </Field>
        <Field label={tr("Сана")}>
          <Input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
      </div>
      {isChef && !expense && (
        <Field label={tr("Филиал")}>
          <Select value={f.branchId} onChange={(e) => setF({ ...f, branchId: Number(e.target.value) })}>
            {branches?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={tr("Эзоҳ")}>
        <Input value={f.note} maxLength={300} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={tr("Масалан: Барқи моҳи октябр")} />
      </Field>
      <ErrorBox message={error} />
      <div className="flex gap-2">
        {expense && (
          <Button type="button" variant="danger" onClick={remove} aria-label={tr("Нест кардан")}>
            <Trash2 className="size-4" />
          </Button>
        )}
        <Button type="submit" loading={busy} className="flex-1">
          {tr("Захира кардан")}
        </Button>
      </div>
    </form>
  );
}
