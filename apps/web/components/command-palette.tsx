"use client";

import type { SearchResult } from "@filialhub/shared";
import { ArrowRight, Building2, CornerDownLeft, Search, UserRound, UtensilsCrossed, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, qs } from "@/lib/api";
import { cn } from "./ui";
import { tr } from "@/lib/i18n";

export interface PaletteLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TYPE_ICON: Record<SearchResult["type"], React.ComponentType<{ className?: string }>> = {
  user: UserRound,
  customer: Users,
  branch: Building2,
  product: UtensilsCrossed,
};
const TYPE_LABEL: Record<SearchResult["type"], string> = {
  user: "Корманд",
  customer: "Мизоҷ",
  branch: "Филиал",
  product: "Меню",
};

/** Ҷустуҷӯи умумӣ: Ctrl+K (ё ⌘K). Саҳифаҳо фавран, маълумот аз API бо таъхири 200 мс. */
export function CommandPalette({ open, onClose, links }: { open: boolean; onClose: () => void; links: PaletteLink[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<{ q: string; items: SearchResult[] }>({ q: "", items: [] });
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, [open]);

  const term = q.trim();
  useEffect(() => {
    if (term.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api<SearchResult[]>(`/search${qs({ q: term })}`)
        .then((items) => !cancelled && setRemote({ q: term, items }))
        .catch(() => !cancelled && setRemote({ q: term, items: [] }));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term]);

  const results = useMemo(() => {
    const lower = term.toLowerCase();
    const pages = links
      .filter((l) => !lower || tr(l.label).toLowerCase().includes(lower) || l.label.toLowerCase().includes(lower))
      .map((l) => ({ key: `p:${l.href}`, href: l.href, title: tr(l.label), subtitle: tr("Саҳифа"), icon: l.icon }));
    const data =
      term.length >= 2 && remote.q === term
        ? remote.items.map((r) => ({ key: `${r.type}:${r.id}`, href: r.href, title: r.title, subtitle: `${tr(TYPE_LABEL[r.type])} · ${r.subtitle}`, icon: TYPE_ICON[r.type] }))
        : [];
    return [...data, ...pages].slice(0, 14);
  }, [links, remote, term]);

  const loading = term.length >= 2 && remote.q !== term;

  const go = (href: string) => {
    onClose();
    setQ("");
    router.push(href);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div className="rise w-full max-w-xl overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search className="size-5 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === "Enter" && results[active]) go(results[active].href);
            }}
            placeholder={tr("Ҷустуҷӯ: корманд, мизоҷ, филиал, маҳсулот, саҳифа…")}
            className="h-14 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
            aria-label={tr("Ҷустуҷӯ")}
          />
          <span className="kbd">Esc</span>
        </div>
        <ul className="max-h-[52vh] overflow-y-auto p-2">
          {loading && <li className="px-3 py-2 text-xs text-muted">{tr("Ҷустуҷӯ…")}</li>}
          {!loading && results.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">{tr("Ҳеҷ чиз ёфт нашуд")}</li>}
          {results.map((r, i) => (
            <li key={r.key}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r.href)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                  i === active ? "bg-brand-soft" : "hover:bg-surface-2",
                )}
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", i === active ? "bg-brand text-white" : "bg-surface-2 text-ink-2")}>
                  <r.icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{r.title}</span>
                  <span className="block truncate text-xs text-muted">{r.subtitle}</span>
                </span>
                {i === active ? <CornerDownLeft className="size-4 text-brand" /> : <ArrowRight className="size-4 text-muted" />}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-4 border-t border-line px-5 py-2.5 text-[11px] text-muted">
          <span><span className="kbd">↑</span> <span className="kbd">↓</span> {tr("интихоб")}</span>
          <span><span className="kbd">Enter</span> {tr("кушодан")}</span>
        </div>
      </div>
    </div>
  );
}
