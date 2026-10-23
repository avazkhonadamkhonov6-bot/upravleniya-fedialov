"use client";

import { POSITION_EMOJI, POSITION_LABELS, POSITIONS, type Branch } from "@filialhub/shared";
import { ArrowUpRight, MapPin, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BranchForm } from "@/components/forms";
import { Badge, Button, ContactButtons, Empty, ErrorBox, Modal, PageHeader, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import { tr } from "@/lib/i18n";

export default function BranchesPage() {
  const { data, error, reload } = useApi<Branch[]>("/branches");
  const [editing, setEditing] = useState<Branch | "new" | null>(null);

  const totalStaff = data?.reduce((s, b) => s + (b.staffCount ?? 0) + (b.manager ? 1 : 0), 0);

  return (
    <>
      <PageHeader
        title={tr("Филиалҳо")}
        subtitle={data ? tr("{0} филиали фаъол · {1} корманд", data.filter((b) => b.isActive).length, totalStaff) : tr("Боркунӣ…")}
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> {tr("Филиали нав")}
          </Button>
        }
      />
      <ErrorBox message={error} />

      {!data ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Empty icon="🏪" title={tr("Ҳоло филиал нест")} text={tr("Филиали аввалинро илова кунед.")} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.map((b, i) => (
            <div key={b.id} className="rise card group flex flex-col overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="relative h-24 overflow-hidden bg-[#170d0f] px-5 pt-4">
                <div className="absolute -top-10 -right-6 size-40 rounded-full bg-[#e4002b] opacity-50 blur-2xl" />
                <div className="absolute -bottom-12 left-10 size-32 rounded-full bg-[#ff5a36] opacity-30 blur-2xl" />
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                    <MapPin className="size-3.5" /> {b.city}
                  </div>
                  {b.isActive ? <Badge tone="good">{tr("Фаъол")}</Badge> : <Badge tone="warn">{tr("Ғайрифаъол")}</Badge>}
                </div>
                <div className="relative mt-2 text-xl font-bold text-white">{b.name}</div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm text-muted">{b.address}</p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {POSITIONS.map((p) => (
                    <div key={p} className="rounded-xl bg-surface-2 p-2.5 text-center">
                      <div className="text-lg">{POSITION_EMOJI[p]}</div>
                      <div className="text-lg font-bold text-ink tabular">{b.staffByPosition?.[p] ?? 0}</div>
                      <div className="text-[11px] text-muted">{tr(POSITION_LABELS[p])}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-xl border border-line p-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{tr("Менеҷер")}</div>
                    <div className="truncate text-sm font-semibold text-ink">{b.manager?.fullName ?? tr("Таъин нашудааст")}</div>
                    {b.manager && <div className="text-xs text-muted">{b.manager.phone}</div>}
                  </div>
                  {b.manager && <ContactButtons phone={b.manager.phone} email={b.manager.email} name={b.manager.fullName} />}
                </div>

                <div className="mt-auto flex gap-2 pt-5">
                  <Link
                    href={`/branches/view?id=${b.id}`}
                    className="brand-gradient flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white hover:brightness-110"
                  >
                    {tr("Омор ва кормандон")}{" "}<ArrowUpRight className="size-4" />
                  </Link>
                  <Button variant="outline" size="sm" className="h-10" onClick={() => setEditing(b)} aria-label={tr("Таҳрир")}>
                    <Pencil className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? tr("Филиали нав") : tr("Таҳрири филиал")}>
        {editing && (
          <BranchForm
            branch={editing === "new" ? undefined : editing}
            onDone={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>
    </>
  );
}
