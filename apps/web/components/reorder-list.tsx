"use client";

import type { ReorderItem } from "@filialhub/shared";
import { Printer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import { Button, Empty, ErrorBox, money, Skeleton } from "./ui";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Рӯйхати харид: моли кам монда бо миқдори пешниҳодшуда ва охирин таъминкунанда/нарх — барои чоп */
export function ReorderList() {
  const { user } = useAuth();
  const isChef = user?.role === "CHEF";
  const { data, error } = useApi<ReorderItem[]>("/products/reorder");
  const total = (data ?? []).reduce((s, r) => s + (r.lastUnitCost ?? 0) * r.suggested, 0);

  function print() {
    if (!data) return;
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    const rows = data
      .map(
        (r) =>
          `<tr><td>${esc(r.name)}</td>${isChef ? `<td>${esc(r.branchName)}</td>` : ""}<td>${r.qty} ${esc(r.unit)}</td><td><b>${r.suggested} ${esc(r.unit)}</b></td>` +
          `<td>${esc(r.lastSupplier ?? "")}</td><td>${r.lastUnitCost !== null ? money(r.lastUnitCost) : ""}</td><td style="width:60px"></td></tr>`,
      )
      .join("");
    w.document.write(
      `<!doctype html><meta charset="utf-8"><title>${tr("Рӯйхати харид")}</title><body style="font-family:sans-serif;padding:24px">` +
        `<h2 style="margin:0 0 4px">${tr("Рӯйхати харид")}</h2><p style="margin:0 0 16px;color:#555">${new Date().toLocaleDateString()}</p>` +
        `<table style="width:100%;border-collapse:collapse;font-size:14px" border="1" cellpadding="6"><thead><tr><th>${tr("Мол")}</th>${isChef ? `<th>${tr("Филиал")}</th>` : ""}` +
        `<th>${tr("Ҳоло")}</th><th>${tr("Харидан")}</th><th>${tr("Таъминкунанда")}</th><th>${tr("Нархи охирин")}</th><th>✓</th></tr></thead><tbody>${rows}</tbody></table>` +
        `<script>window.onload=()=>{window.print()}</script></body>`,
    );
    w.document.close();
  }

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Skeleton className="h-40" />;
  if (!data.length) return <Empty icon="✅" title={tr("Ҳама мол кофӣ аст")} text={tr("Ягон мол ба ҳадди «кам монд» нарасидааст.")} />;
  return (
    <div className="space-y-4">
      <ul className="max-h-[55vh] divide-y divide-line overflow-y-auto text-sm">
        {data.map((r) => (
          <li key={`${r.productId}-${r.branchId}`} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="truncate font-semibold text-ink">
                {r.emoji} {r.name}
              </div>
              <div className="truncate text-xs text-muted">
                {isChef && `${r.branchName} · `}
                {tr("ҳоло")} <b className={r.qty <= 0 ? "text-brand" : "text-warn"}>{r.qty}</b> {tr(r.unit)} · {tr("ҳад")} {r.lowStock}
                {r.lastSupplier && ` · ${r.lastSupplier}`}
              </div>
            </div>
            <div className="shrink-0 text-right tabular">
              <div className="font-bold text-ink">
                +{r.suggested} {tr(r.unit)}
              </div>
              {r.lastUnitCost !== null && <div className="text-[11px] text-muted">≈ {money(r.lastUnitCost * r.suggested)}</div>}
            </div>
          </li>
        ))}
      </ul>
      {total > 0 && (
        <div className="rounded-xl bg-surface-2 p-3 text-sm">
          {tr("Тахминан бо нархҳои охирин")}: <b className="tabular">{money(total)}</b>
        </div>
      )}
      <Button onClick={print} className="w-full">
        <Printer className="size-4" /> {tr("Чоп кардан")}
      </Button>
    </div>
  );
}
