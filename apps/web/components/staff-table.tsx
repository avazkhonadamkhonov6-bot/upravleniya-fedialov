"use client";

import { POSITION_EMOJI, POSITION_LABELS, type Branch, type Position, type User } from "@filialhub/shared";
import { Pencil, Plus, Search, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { qs } from "@/lib/api";
import { useAuth, useBusiness } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { UserForm } from "./forms";
import { Avatar, Badge, Button, Card, ContactButtons, Empty, ErrorBox, Input, Modal, money, Select, Skeleton, cn } from "./ui";
import { tr } from "@/lib/i18n";

export function StaffTable({ fixedBranchId, compact }: { fixedBranchId?: number; compact?: boolean }) {
  const { user: me } = useAuth();
  const { positions } = useBusiness();
  const isChef = me?.role === "CHEF";
  const [branchId, setBranchId] = useState<number | undefined>(fixedBranchId);
  const [position, setPosition] = useState<Position | "">("");
  // Аз ҷустуҷӯи умумӣ (Ctrl+K) метавонад ?q=… биёяд.
  const [search, setSearch] = useState(() => (typeof window === "undefined" ? "" : (new URLSearchParams(location.search).get("q") ?? "")));
  const [inactive, setInactive] = useState(false);
  const [editing, setEditing] = useState<User | "new" | null>(null);

  const { data: branches } = useApi<Branch[]>("/branches");
  const { data, error, reload } = useApi<User[]>(
    `/users${qs({ branchId: fixedBranchId ?? branchId, position, search: search.trim() || undefined, includeInactive: inactive || undefined })}`,
  );

  const counts = positions.reduce(
    (acc, p) => ({ ...acc, [p]: data?.filter((u) => u.position === p && u.isActive).length ?? 0 }),
    {} as Record<Position, number>,
  );

  return (
    <Card className="p-0">
      <div className="flex flex-col gap-3 border-b border-line p-5 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("Ҷустуҷӯ: ном, телефон, почта…")} className="pl-10" />
        </div>
        {isChef && !fixedBranchId && (
          <Select value={branchId ?? ""} onChange={(e) => setBranchId(Number(e.target.value) || undefined)} className="w-full lg:w-56" aria-label={tr("Филиал")}>
            <option value="">{tr("Ҳамаи филиалҳо")}</option>
            {branches?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        )}
        <Select value={position} onChange={(e) => setPosition(e.target.value as Position | "")} className="w-full lg:w-44" aria-label={tr("Вазифа|position")}>
          <option value="">{tr("Ҳамаи вазифаҳо")}</option>
          {positions.map((p) => (
            <option key={p} value={p}>
              {tr(POSITION_LABELS[p])}
            </option>
          ))}
        </Select>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" /> {tr("Илова")}
        </Button>
      </div>

      {!compact && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3 text-sm">
          {positions.map((p) => (
            <button
              key={p}
              onClick={() => setPosition(position === p ? "" : p)}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 font-medium transition",
                position === p ? "bg-brand-soft text-brand" : "bg-surface-2 text-ink-2 hover:text-ink",
              )}
            >
              {POSITION_EMOJI[p]} {tr(POSITION_LABELS[p])} <b className="tabular">{counts[p]}</b>
            </button>
          ))}
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={inactive} onChange={(e) => setInactive(e.target.checked)} className="accent-[var(--brand)]" />
            {tr("Ғайрифаъолонро нишон деҳ")}
          </label>
        </div>
      )}

      <div className="p-2">
        <ErrorBox message={error} />
        {!data ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <Empty icon="👥" title={tr("Корманд ёфт нашуд")} text={tr("Филтрҳоро тағйир диҳед ё корманди нав илова кунед.")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-muted uppercase">
                  <th className="px-3 py-3 font-semibold">{tr("Корманд")}</th>
                  <th className="px-3 py-3 font-semibold">{tr("Вазифа|position")}</th>
                  {isChef && !fixedBranchId && <th className="px-3 py-3 font-semibold">{tr("Филиал")}</th>}
                  <th className="px-3 py-3 font-semibold">{tr("Телефон")}</th>
                  <th className="px-3 py-3 text-right font-semibold">{tr("Маош")}</th>
                  <th className="px-3 py-3 font-semibold">{tr("Тамос")}</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id} className={cn("border-t border-line transition hover:bg-surface-2", !u.isActive && "opacity-50")}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.fullName} size={36} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-semibold text-ink">
                            {u.fullName}
                            {u.telegramLinked && (
                              <span title={tr("Telegram пайваст аст")} className="text-[#229ed9]">
                                <Send className="size-3.5" />
                              </span>
                            )}
                          </div>
                          <div className="truncate text-xs text-muted">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {u.role === "MANAGER" ? (
                        <Badge tone="brand">{tr("🧑‍💼 Менеҷер")}</Badge>
                      ) : u.position ? (
                        <Badge>
                          {POSITION_EMOJI[u.position]} {tr(POSITION_LABELS[u.position])}
                        </Badge>
                      ) : (
                        <Badge tone="warn">{tr("👑 Шеф")}</Badge>
                      )}
                    </td>
                    {isChef && !fixedBranchId && <td className="px-3 py-2.5 text-ink-2">{u.branch?.name.replace("FilialHub ", "") ?? "—"}</td>}
                    <td className="px-3 py-2.5 whitespace-nowrap text-ink-2 tabular">{u.phone}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap text-ink-2 tabular">{money(u.salary)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <ContactButtons phone={u.phone} email={u.email} name={u.fullName} whatsapp={u.whatsapp} telegram={u.telegram} />
                        {u.id !== me?.id && (
                          <Link
                            href={`/messages?to=${u.id}`}
                            title={tr("Паём навиштан")}
                            aria-label={tr("Паём навиштан")}
                            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-brand"
                          >
                            <Send className="size-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {u.id !== me?.id && (isChef || u.role === "STAFF") && (
                        <button
                          onClick={() => setEditing(u)}
                          className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
                          aria-label={tr("Таҳрир")}
                        >
                          <Pencil className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? tr("Корманди нав") : tr("Таҳрири корманд")}>
        {editing && branches && (
          <UserForm
            user={editing === "new" ? undefined : editing}
            branches={branches}
            defaultBranchId={fixedBranchId ?? branchId}
            onDone={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>
    </Card>
  );
}
