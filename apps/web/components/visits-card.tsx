"use client";

import type { StoreVisits } from "@filialhub/shared";
import { Eye } from "lucide-react";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";

/** Чанд нафар саҳифаи мағозаро дар бозори онлайн кушоданд (30 рӯз, сутунҳои хурд) */
export function VisitsCard() {
  const { data } = useApi<StoreVisits>("/online-orders/visits");
  if (!data) return null;
  const max = Math.max(1, ...data.series.map((d) => d.views));
  return (
    <div className="card mb-5 flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
      <div className="flex shrink-0 gap-6">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <Eye className="size-4" /> {tr("Имрӯз")}
          </div>
          <div className="mt-1 text-2xl font-bold text-ink tabular">{data.today}</div>
        </div>
        <div>
          <div className="text-sm text-muted">{tr("7 рӯз")}</div>
          <div className="mt-1 text-2xl font-bold text-ink tabular">{data.week}</div>
        </div>
        <div>
          <div className="text-sm text-muted">{tr("30 рӯз")}</div>
          <div className="mt-1 text-2xl font-bold text-ink tabular">{data.month}</div>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs text-muted">{tr("Мағозаи шуморо дар бозори онлайн кушоданд")}</div>
        <div className="flex h-12 items-end gap-[3px]" role="img" aria-label={tr("{0} кушодан дар 30 рӯз", data.month)}>
          {data.series.map((d) => (
            <div
              key={d.day}
              title={`${d.day}: ${d.views}`}
              className="flex-1 rounded-t-[3px] bg-brand/70"
              style={{ height: `${Math.max(d.views ? 8 : 3, (d.views / max) * 100)}%`, opacity: d.views ? 1 : 0.25 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
