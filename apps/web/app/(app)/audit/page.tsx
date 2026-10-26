"use client";

import { AUDIT_ENTITY_LABELS, type AuditEntry } from "@filialhub/shared";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { timeAgo } from "@/components/alerts-bell";
import { Avatar, Badge, Button, Card, Empty, ErrorBox, formatDate, PageHeader, Skeleton, cn } from "@/components/ui";
import { qs } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { tr, locale } from "@/lib/i18n";
import { Glyph } from "@/components/glyph";

const ACTION: Record<AuditEntry["action"], { label: string; tone: "good" | "blue" | "brand"; emoji: string }> = {
  CREATE: { label: "Сохт", tone: "good", emoji: "➕" },
  UPDATE: { label: "Тағйир дод", tone: "blue", emoji: "✏️" },
  DELETE: { label: "Нест кард", tone: "brand", emoji: "🗑" },
};

export default function AuditPage() {
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const { data, error } = useApi<{ items: AuditEntry[]; total: number }>(`/audit${qs({ entity, page })}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / 30)) : 1;

  // Гурӯҳбандӣ аз рӯи рӯз (сабтҳо на ҳамеша аз рӯи вақт пай дар пай меоянд — як рӯз ду гурӯҳ намешавад)
  const byDay = new Map<string, AuditEntry[]>();
  for (const e of data?.items ?? []) {
    const day = new Date(e.createdAt).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }
  const groups = [...byDay].map(([day, items]) => ({ day, items }));

  return (
    <>
      <PageHeader title={tr("Таърихи амалҳо")} subtitle={tr("Кӣ, кай ва чӣ тағйир дод — нарх, корманд, филиал, вазифа, хароҷот")} />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {["", ...Object.keys(AUDIT_ENTITY_LABELS)].map((k) => (
          <button
            key={k || "all"}
            onClick={() => {
              setEntity(k);
              setPage(1);
            }}
            className={cn(
              "shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition",
              entity === k ? "bg-ink text-surface" : "bg-surface text-ink-2 ring-1 ring-line hover:text-ink",
            )}
          >
            {k ? tr(AUDIT_ENTITY_LABELS[k]) : tr("Ҳама")}
          </button>
        ))}
      </div>
      <ErrorBox message={error} />
      <Card className="p-0">
        {!data ? (
          <Skeleton className="m-4 h-96" />
        ) : data.items.length === 0 ? (
          <Empty icon="🕓" title={tr("Ҳоло амал сабт нашудааст")} />
        ) : (
          <div className="p-5">
            {groups.map((g) => (
              <section key={g.day} className="mb-6 last:mb-0">
                <h3 className="mb-3 text-xs font-bold tracking-wide text-muted uppercase first-letter:uppercase">{g.day}</h3>
                <ol className="relative space-y-3 border-l-2 border-line pl-6">
                  {g.items.map((e) => {
                    const a = ACTION[e.action] ?? ACTION.UPDATE;
                    return (
                      <li key={e.id} className="relative">
                        <span className="absolute top-2 -left-[33px] grid size-4 place-items-center rounded-full border-2 border-surface bg-brand" />
                        <div className="flex flex-col gap-2 rounded-2xl border border-line p-3.5 sm:flex-row sm:items-center">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            {e.userName ? <Avatar name={e.userName} size={34} /> : <span className="grid size-[34px] place-items-center rounded-full bg-surface-2 text-muted"><Glyph e="⚙️" className="size-4" /></span>}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                                <b className="text-ink">{e.userName ?? tr("Система")}</b>
                                <Badge tone={a.tone}>
                                  <Glyph e={a.emoji} className="size-3.5" /> {tr(a.label)}
                                </Badge>
                                <Badge>{tr(AUDIT_ENTITY_LABELS[e.entity]) ?? e.entity}</Badge>
                              </div>
                              <p className="mt-1 text-sm text-ink-2">{e.summary}</p>
                            </div>
                          </div>
                          <div className="shrink-0 text-xs text-muted sm:text-right" title={formatDate(e.createdAt, true)}>
                            {timeAgo(e.createdAt)}
                            <div className="tabular">{new Date(e.createdAt).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
        {data && data.total > 30 && (
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
    </>
  );
}
