"use client";

import type { Alert } from "@filialhub/shared";
import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useVisibleInterval } from "@/lib/use-interval";
import { useServerEvent } from "@/lib/events";
import { cn } from "./ui";
import { tr, locale } from "@/lib/i18n";
import { Iconized } from "./glyph";

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return tr("ҳозир");
  if (s < 3600) return tr("{0} дақ пеш", Math.floor(s / 60));
  if (s < 86400) return tr("{0} соат пеш", Math.floor(s / 3600));
  if (s < 7 * 86400) return tr("{0} рӯз пеш", Math.floor(s / 86400));
  return new Date(iso).toLocaleDateString(locale());
}

/** Зангӯлаи огоҳиномаҳо: ҳар 30 сония нав мешавад. */
export function AlertsBell({ dark }: { dark?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data, reload } = useApi<{ items: Alert[]; unread: number }>("/alerts");
  const box = useRef<HTMLDivElement>(null);

  useServerEvent("alerts", reload);
  useVisibleInterval(reload, 60000);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const unread = data?.unread ?? 0;

  async function openAlert(a: Alert) {
    setOpen(false);
    if (!a.readAt) await api(`/alerts/${a.id}/read`, { method: "POST" }).catch(() => {});
    reload();
    if (a.link) router.push(a.link);
  }

  async function readAll() {
    await api("/alerts/read-all", { method: "POST" }).catch(() => {});
    reload();
  }

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative grid size-10 cursor-pointer place-items-center rounded-xl transition",
          dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-ink-2 hover:bg-surface-2",
        )}
        aria-label={tr("Огоҳиномаҳо{0}", unread ? tr(": {0} нав", unread) : "")}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span key={unread} className="pop brand-gradient absolute top-1 right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[11px] font-bold text-white ring-2 ring-surface">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        // Телефон: дар тамоми бари экран (занг дар мобайни сарлавҳа аст — панели ба рост часпида аз чап мебаромад)
        <div className="rise fixed inset-x-3 top-[4.5rem] z-50 overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="font-semibold text-ink">{tr("Огоҳиномаҳо")}</div>
            {unread > 0 && (
              <button onClick={readAll} className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-brand hover:underline">
                <CheckCheck className="size-3.5" /> {tr("Ҳамаро хондам")}
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {!data?.items.length && <li className="px-4 py-10 text-center text-sm text-muted"><Iconized text={tr("📭 Огоҳинома нест")} /></li>}
            {data?.items.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => openAlert(a)}
                  className={cn("flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-2", !a.readAt && "bg-brand-soft/40")}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-lg">{a.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{a.title}</span>
                    {a.body && <span className="block truncate text-xs text-muted">{a.body}</span>}
                    <span className="mt-0.5 block text-[11px] text-muted">{timeAgo(a.createdAt)}</span>
                  </span>
                  {!a.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
