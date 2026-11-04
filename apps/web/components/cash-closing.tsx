"use client";

import { canSell, type CashReport, type ZReport } from "@filialhub/shared";
import { Lock, Vault } from "lucide-react";
import { useState } from "react";
import { api, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToday } from "@/lib/use-today";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import { useToast } from "./toast";
import { Avatar, Button, Card, CardTitle, cn, Empty, ErrorBox, Field, Input, Modal, money, Skeleton } from "./ui";

const diffTone = (d: number) => (d === 0 ? "text-good" : d < 0 ? "text-brand" : "text-warn");

/**
 * Z-ҳисобот: фурӯши нақд/корт/қарз ва пардохтҳои қарз барои ҳар кассир дар як рӯз,
 * пули интизоршуда, пули ҳисобшуда ва фарқ. Кассир — қатори худ, менеҷер/шеф — ҳама.
 */
export function CashReportCard({ branchId }: { branchId?: number }) {
  const { user } = useAuth();
  const today = useToday();
  const [picked, setDate] = useState<string | null>(null);
  const date = picked ?? today;
  const [closing, setClosing] = useState(false);
  const { data, error, reload } = useApi<ZReport>(user && canSell(user) && date ? `/cash/z${qs({ date, branchId })}` : null);
  if (!user || !canSell(user)) return null;
  const mine = data?.rows.find((r) => r.userId === user.id);
  const canClose = !!user.branchId && !!today && date === today;

  return (
    <Card className="mb-6">
      <CardTitle
        extra={
          <div className="flex items-center gap-2">
            <Input type="date" value={date} max={today || undefined} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-9 w-40 text-sm" aria-label={tr("Сана")} />
            {canClose && (
              <Button size="sm" onClick={() => setClosing(true)}>
                <Lock className="size-4" /> {mine?.closing ? tr("Аз нав пӯшидан") : tr("Пӯшидани касса")}
              </Button>
            )}
          </div>
        }
      >
        <span className="inline-flex items-center gap-2">
          <Vault className="size-5 text-brand" /> {tr("Касса (Z-ҳисобот)")}
        </span>
      </CardTitle>
      <ErrorBox message={error} />
      {!data ? (
        <Skeleton className="h-24" />
      ) : data.rows.length === 0 ? (
        <Empty icon="🧾" title={tr("Дар ин рӯз фурӯш нест")} />
      ) : (
        <>
          <div className={cn("mb-3 grid grid-cols-2 gap-2", data.totals.returns ? "sm:grid-cols-5" : "sm:grid-cols-4")}>
            {(
              [
                [tr("Нақд (бояд дар касса)"), money(data.totals.expectedCash)],
                [tr("Корт"), money(data.totals.cardSales + data.totals.debtPaidCard - data.totals.refundCard)],
                [tr("Ба қарз"), money(data.totals.debtSales - data.totals.refundDebt)],
                [tr("Чекҳо"), String(data.totals.orders)],
                // Возврат алоҳида: чанд чек ва чанд пул баргашт (нақд аз касса, корт ба корти мизоҷ)
                ...(data.totals.returns
                  ? [[tr("Возврат ({0})", data.totals.returns), `−${money(data.totals.refundCash + data.totals.refundCard + data.totals.refundDebt)}`] as const]
                  : []),
              ] as const
            ).map(([l, v]) => (
              <div key={l} className="rounded-xl bg-surface-2 p-3">
                <div className="text-xs text-muted">{l}</div>
                <div className="text-lg font-bold text-ink tabular">{v}</div>
              </div>
            ))}
          </div>
          <ul className="divide-y divide-line">
            {data.rows.map((r) => (
              <Row key={r.userId} r={r} />
            ))}
          </ul>
        </>
      )}
      <Modal open={closing} onClose={() => setClosing(false)} title={tr("Пӯшидани касса")}>
        {closing && (
          <CloseForm
            mine={mine}
            onDone={() => {
              setClosing(false);
              reload();
            }}
          />
        )}
      </Modal>
    </Card>
  );
}

function Row({ r }: { r: CashReport }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Avatar name={r.userName} size={34} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{r.userName}</div>
        <div className="text-xs text-muted tabular">
          {tr("{0} чек", r.orders)} · {tr("нақд")} {money(r.cashSales)} · {tr("корт")} {money(r.cardSales)} · {tr("қарз")} {money(r.debtSales)}
          {r.debtPaidCash + r.debtPaidCard > 0 && ` · ${tr("пардохти қарз")} ${money(r.debtPaidCash + r.debtPaidCard)}`}
          {r.returns > 0 && (
            <span className="text-brand">
              {" "}· {tr("возврат {0}", r.returns)}: {tr("нақд")} −{money(r.refundCash)}
              {r.refundCard > 0 && ` · ${tr("корт")} −${money(r.refundCard)}`}
              {r.refundDebt > 0 && ` · ${tr("қарз")} −${money(r.refundDebt)}`}
            </span>
          )}
        </div>
      </div>
      <div className="text-right text-sm tabular">
        <div className="text-xs text-muted">{tr("бояд")}: <b className="text-ink">{money(r.expectedCash)}</b></div>
        {r.closing ? (
          <div className={cn("font-bold", diffTone(r.closing.diff))}>
            {r.closing.diff === 0 ? tr("✓ бе фарқ") : `${r.closing.diff > 0 ? "+" : ""}${money(r.closing.diff)}`}
          </div>
        ) : (
          <div className="text-xs font-semibold text-warn">{tr("пӯшида нашудааст")}</div>
        )}
      </div>
    </li>
  );
}

function CloseForm({ mine, onDone }: { mine: CashReport | undefined; onDone: () => void }) {
  const toast = useToast();
  const expected = mine?.expectedCash ?? 0;
  const [counted, setCounted] = useState(mine?.closing ? String(mine.closing.countedCash) : "");
  const [note, setNote] = useState(mine?.closing?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const n = Number(counted);
  const diff = counted === "" ? null : Math.round((n - expected) * 100) / 100;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<CashReport>("/cash/close", { method: "POST", json: { countedCash: n, note } });
      const d = r.closing?.diff ?? 0;
      if (d === 0) toast.success(tr("Касса пӯшида шуд — бе фарқ"));
      else toast.info(tr("Касса пӯшида шуд"), tr("Фарқ: {0} — менеҷер огоҳ шуд", `${d > 0 ? "+" : ""}${money(d)}`));
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-surface-2 p-3">
          <div className="text-xs text-muted">{tr("Фурӯши нақд")}</div>
          <b className="tabular">{money(mine?.cashSales ?? 0)}</b>
        </div>
        <div className="rounded-xl bg-surface-2 p-3">
          <div className="text-xs text-muted">{tr("Пардохти нақди қарз")}</div>
          <b className="tabular">{money(mine?.debtPaidCash ?? 0)}</b>
        </div>
        {(mine?.refundCash ?? 0) > 0 && (
          <div className="col-span-2 rounded-xl bg-surface-2 p-3">
            <div className="text-xs text-muted">{tr("Возврати нақд (аз касса дода шуд)")}</div>
            <b className="text-brand tabular">−{money(mine?.refundCash ?? 0)}</b>
          </div>
        )}
        <div className="col-span-2 rounded-xl bg-brand-soft p-3">
          <div className="text-xs text-muted">{tr("Бояд дар касса бошад (нақд)")}</div>
          <div className="text-2xl font-extrabold text-brand tabular">{money(expected)}</div>
        </div>
      </div>
      <Field label={tr("Пули ҳисобшуда дар касса (сомонӣ)")}>
        <Input type="number" min={0} step="0.01" required autoFocus value={counted} onChange={(e) => setCounted(e.target.value)} />
      </Field>
      {diff !== null && (
        <div className={cn("text-sm font-semibold", diffTone(diff))}>
          {diff === 0 ? tr("Бе фарқ ✓") : diff < 0 ? tr("Камомад: {0}", money(-diff)) : tr("Зиёдатӣ: {0}", money(diff))}
        </div>
      )}
      <Field label={tr("Эзоҳ")} hint={tr("Ихтиёрӣ — масалан сабаби фарқ")}>
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      </Field>
      <ErrorBox message={error} />
      <Button type="submit" loading={busy} className="w-full">
        <Lock className="size-4" /> {tr("Кассаро пӯшидан")}
      </Button>
    </form>
  );
}
