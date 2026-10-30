"use client";

import { WEEKDAY_SHORT, type PromoCode } from "@filialhub/shared";
import { Pencil, Plus, TicketPercent } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, Empty, ErrorBox, Field, formatDate, Input, Modal, money, PageHeader, Segmented, Skeleton, cn } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";

/** Кодҳои тахфиф ва аксияҳо: «WELCOME10», −20% дар рӯзи ҷумъа ва ғ. */
export default function PromosPage() {
  const { user } = useAuth();
  const isChef = user?.role === "CHEF";
  const { data, error, reload } = useApi<PromoCode[]>("/promos");
  const [editing, setEditing] = useState<PromoCode | "new" | null>(null);

  return (
    <>
      <PageHeader
        title={tr("Аксияҳо ва кодҳои тахфиф")}
        subtitle={tr("Кассир кодро дар «Фурӯши нав», мизоҷ — дар сабади онлайн ворид мекунад.")}
        actions={
          isChef && (
            <Button onClick={() => setEditing("new")}>
              <Plus className="size-4" /> {tr("Коди нав")}
            </Button>
          )
        }
      />
      <ErrorBox message={error} />
      <Card className="p-2">
        {!data ? (
          <Skeleton className="m-3 h-32" />
        ) : data.length === 0 ? (
          <Empty icon="🎟️" title={tr("Ҳоло аксия нест")} text={tr("Масалан WELCOME10 — −10% барои мизоҷони нав, ё FRIDAY20 — −20% дар рӯзи ҷумъа.")} />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((p) => (
              <li key={p.id} className={cn("flex flex-wrap items-center gap-3 px-3 py-3", !p.isActive && "opacity-50")}>
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <TicketPercent className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-extrabold tracking-wide text-ink">{p.code}</span>
                    <Badge tone="brand">{p.percent ? `−${p.percent}%` : `−${money(p.amount ?? 0)}`}</Badge>
                    {!p.isActive && <Badge tone="neutral">{tr("хомӯш")}</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{describe(p)}</div>
                </div>
                <div className="text-right text-xs text-muted tabular">
                  {tr("Истифода")}: <b className="text-ink">{p.uses}</b>
                  {p.maxUses !== null && ` / ${p.maxUses}`}
                </div>
                {isChef && (
                  <button onClick={() => setEditing(p)} className="grid size-8 cursor-pointer place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink" aria-label={tr("Таҳрир")}>
                    <Pencil className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? tr("Коди нав") : tr("Таҳрири код")}>
        {editing && (
          <PromoForm
            promo={editing === "new" ? undefined : editing}
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

function describe(p: PromoCode) {
  const parts = [
    p.pos && p.online ? tr("Касса ва онлайн") : p.pos ? tr("Танҳо касса") : tr("Танҳо онлайн"),
    p.minTotal > 0 && tr("аз {0}", money(p.minTotal)),
    p.weekdays.length > 0 && p.weekdays.map((d) => tr(WEEKDAY_SHORT[d - 1])).join(", "),
    p.endsAt && tr("то {0}", formatDate(p.endsAt)),
  ];
  return parts.filter(Boolean).join(" · ");
}

function PromoForm({ promo, onDone }: { promo?: PromoCode; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    code: promo?.code ?? "",
    kind: (promo?.amount ? "amount" : "percent") as "percent" | "amount",
    value: String(promo?.percent ?? promo?.amount ?? 10),
    minTotal: String(promo?.minTotal ?? 0),
    weekdays: promo?.weekdays ?? [],
    endsAt: promo?.endsAt?.slice(0, 10) ?? "",
    maxUses: promo?.maxUses ? String(promo.maxUses) : "",
    where: (promo ? (promo.pos && promo.online ? "both" : promo.pos ? "pos" : "online") : "both") as "both" | "pos" | "online",
    isActive: promo?.isActive ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const value = Number(f.value) || 0;
    const body = {
      code: f.code.trim(),
      percent: f.kind === "percent" ? Math.round(value) : null,
      amount: f.kind === "amount" ? value : null,
      minTotal: Number(f.minTotal) || 0,
      weekdays: f.weekdays,
      // Охири рӯзи интихобшуда бо вақти Душанбе
      endsAt: f.endsAt ? new Date(`${f.endsAt}T23:59:59+05:00`).toISOString() : null,
      maxUses: f.maxUses ? Number(f.maxUses) : null,
      pos: f.where !== "online",
      online: f.where !== "pos",
      isActive: f.isActive,
    };
    try {
      await (promo ? api(`/promos/${promo.id}`, { method: "PATCH", json: body }) : api("/promos", { method: "POST", json: body }));
      toast.success(tr("Захира шуд"), body.code.toUpperCase());
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!promo || !confirm(tr("«{0}» нест карда шавад?", promo.code))) return;
    await api(`/promos/${promo.id}`, { method: "DELETE" });
    onDone();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label={tr("Код")} hint={tr("Ҳарфҳои лотинӣ ва рақам, масалан WELCOME10")}>
        <Input required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} maxLength={20} className="font-mono uppercase" />
      </Field>
      <div className="grid grid-cols-[auto_1fr] items-end gap-3">
        <Segmented
          value={f.kind}
          onChange={(kind) => setF({ ...f, kind })}
          options={[
            { value: "percent", label: "%" },
            { value: "amount", label: "сомонӣ" },
          ]}
        />
        <Input type="number" required min={f.kind === "percent" ? 1 : 0.01} max={f.kind === "percent" ? 90 : undefined} step={f.kind === "percent" ? 1 : 0.01} value={f.value} onChange={set("value")} aria-label={tr("Андоза")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label={tr("Аз маблағи харид")}>
          <Input type="number" min={0} step="0.01" value={f.minTotal} onChange={set("minTotal")} />
        </Field>
        <Field label={tr("Чанд бор (холӣ — бемаҳдуд)")}>
          <Input type="number" min={1} step={1} value={f.maxUses} onChange={set("maxUses")} />
        </Field>
      </div>
      <Field label={tr("Рӯзҳо (холӣ — ҳар рӯз)")}>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAY_SHORT.map((d, i) => {
            const n = i + 1;
            const on = f.weekdays.includes(n);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setF({ ...f, weekdays: on ? f.weekdays.filter((x) => x !== n) : [...f.weekdays, n] })}
                className={cn("h-9 w-11 cursor-pointer rounded-xl text-sm font-bold transition", on ? "bg-brand text-white" : "bg-surface-2 text-ink-2 hover:text-ink")}
              >
                {tr(d)}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={tr("То сана (ихтиёрӣ)")}>
          <Input type="date" value={f.endsAt} onChange={set("endsAt")} />
        </Field>
        <Field label={tr("Дар куҷо")}>
          <Segmented
            value={f.where}
            onChange={(where) => setF({ ...f, where })}
            options={[
              { value: "both", label: "Ҳама" },
              { value: "pos", label: "Касса" },
              { value: "online", label: "Онлайн" },
            ]}
          />
        </Field>
      </div>
      {promo && (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm font-medium text-ink">
          <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} className="size-4 accent-[var(--brand)]" />
          {tr("Фаъол")}
        </label>
      )}
      <ErrorBox message={error} />
      <div className="flex gap-2">
        {promo && (
          <Button type="button" variant="danger" onClick={remove}>
            {tr("Нест кардан")}
          </Button>
        )}
        <Button type="submit" loading={busy} className="flex-1">
          {tr("Захира кардан")}
        </Button>
      </div>
    </form>
  );
}
