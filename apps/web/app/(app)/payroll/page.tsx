"use client";

import { POSITION_LABELS, ROLE_LABELS, type Branch, type Payroll } from "@filialhub/shared";
import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { Avatar, Button, Card, Empty, ErrorBox, Input, money, PageHeader, Select, Skeleton, cn } from "@/components/ui";
import { getToken, qs } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToday } from "@/lib/use-today";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";

/**
 * Маош аз рӯи давомот: барои ҳар корманд дар моҳ — маош, сменаҳо, омадан/наомадан, соатҳо, дер омадан
 * ва маблағи пешниҳодшуда (маош × омад / ҷадвал). Шеф — ҳамаи филиалҳо, менеҷер — филиали худ.
 */
export default function PayrollPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isChef = user?.role === "CHEF";
  const thisMonth = useToday().slice(0, 7);
  const [picked, setMonth] = useState<string | null>(null);
  const month = picked ?? thisMonth;
  const [branchId, setBranchId] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  const { data: branches } = useApi<Branch[]>(isChef ? "/branches" : null);
  const { data, error } = useApi<Payroll>(month ? `/payroll${qs({ month, branchId })}` : null);

  async function download() {
    setBusy(true);
    try {
      const token = getToken();
      const res = await fetch(`/api/payroll/export${qs({ month, branchId })}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error(tr("Хатогӣ ({0})", res.status));
      const url = URL.createObjectURL(await res.blob());
      Object.assign(document.createElement("a"), { href: url, download: `payroll-${month}.xlsx` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      toast.error(tr("Файл сохта нашуд"), (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={tr("Маош аз рӯи давомот")}
        subtitle={tr("Маош × (омад / сменаҳои ҷадвал). Корманди бе ҷадвал маоши пурра мегирад. Ин пешниҳод аст — пеш аз додан тафтиш кунед.")}
        actions={
          <>
            {isChef && (
              <Select value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value) || undefined)} className="w-48" aria-label={tr("Филиал")}>
                <option value="">{tr("Ҳамаи филиалҳо")}</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
            <Input type="month" value={month} max={thisMonth || undefined} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-40" aria-label={tr("Моҳ")} />
            <Button variant="outline" onClick={download} loading={busy}>
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
          </>
        }
      />

      {data && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              [tr("Маош (ҳамагӣ)"), money(data.totals.salary), ""],
              [tr("Аз рӯи давомот"), money(data.totals.suggestedPay), "text-brand"],
              [tr("Соатҳои кор"), String(data.totals.hours), ""],
              [tr("Дер омадан / наомадан"), `${data.totals.lateCount} / ${data.totals.absent}`, data.totals.lateCount + data.totals.absent ? "text-warn" : "text-good"],
            ] as const
          ).map(([label, value, cls]) => (
            <div key={label} className="card p-4">
              <div className="text-sm text-muted">{label}</div>
              <div className={cn("mt-1 text-2xl font-bold text-ink tabular", cls)}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <ErrorBox message={error} />
      <Card className="overflow-hidden p-0">
        {!data ? (
          <Skeleton className="m-4 h-64" />
        ) : data.rows.length === 0 ? (
          <Empty icon="👥" title={tr("Корманд нест")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-semibold tracking-wide text-muted uppercase">
                  <th className="px-4 py-3">{tr("Корманд")}</th>
                  <th className="px-3 py-3 text-right">{tr("Маош")}</th>
                  <th className="px-3 py-3 text-center">{tr("Омад / ҷадвал")}</th>
                  <th className="px-3 py-3 text-center">{tr("Рӯзҳо")}</th>
                  <th className="px-3 py-3 text-center">{tr("Соат")}</th>
                  <th className="px-3 py-3 text-center">{tr("Дер")}</th>
                  <th className="px-3 py-3 text-center">{tr("Наомад")}</th>
                  <th className="px-4 py-3 text-right">{tr("Аз рӯи давомот")}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.userId} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.fullName} size={32} />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink">{r.fullName}</div>
                          <div className="truncate text-xs text-muted">
                            {r.position ? tr(POSITION_LABELS[r.position]) : tr(ROLE_LABELS[r.role])}
                            {r.branchName && ` · ${r.branchName}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 text-right tabular">{money(r.salary)}</td>
                    <td className="px-3 text-center tabular">{r.planned ? `${r.attended} / ${r.planned}` : <span className="text-muted">{tr("бе ҷадвал")}</span>}</td>
                    <td className="px-3 text-center tabular">{r.workedDays}</td>
                    <td className="px-3 text-center tabular">{r.hours}</td>
                    <td className={cn("px-3 text-center tabular", r.lateCount > 0 && "font-semibold text-warn")}>
                      {r.lateCount ? tr("{0} бор · {1} дақ", r.lateCount, r.lateMinutes) : "—"}
                    </td>
                    <td className={cn("px-3 text-center tabular", r.absent > 0 && "font-semibold text-brand")}>{r.absent || "—"}</td>
                    <td className={cn("px-4 text-right font-bold tabular", r.suggestedPay < r.salary ? "text-brand" : "text-ink")}>{money(r.suggestedPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
