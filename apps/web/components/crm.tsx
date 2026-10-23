"use client";

import {
  PRIORITY_LABELS,
  SEGMENT_LABELS,
  type Customer,
  type Priority,
  type Segment,
} from "@filialhub/shared";
import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "./toast";
import { Badge, Button, ErrorBox, Field, Input } from "./ui";
import { tr } from "@/lib/i18n";

export const SEGMENT_STYLE: Record<Segment, { emoji: string; tone: "brand" | "good" | "blue" | "warn" }> = {
  VIP: { emoji: "👑", tone: "brand" },
  REGULAR: { emoji: "⭐", tone: "good" },
  NEW: { emoji: "🌱", tone: "blue" },
  SLEEPING: { emoji: "😴", tone: "warn" },
};

export function SegmentBadge({ segment }: { segment: Segment }) {
  const s = SEGMENT_STYLE[segment];
  return (
    <Badge tone={s.tone}>
      {s.emoji} {tr(SEGMENT_LABELS[segment])}
    </Badge>
  );
}

export const PRIORITY_STYLE: Record<Priority, { dot: string; tone: "neutral" | "warn" | "brand" }> = {
  LOW: { dot: "bg-ink-2/40", tone: "neutral" },
  MEDIUM: { dot: "bg-warn", tone: "warn" },
  HIGH: { dot: "bg-brand", tone: "brand" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge tone={PRIORITY_STYLE[priority].tone}>
      <span className={`size-1.5 rounded-full ${PRIORITY_STYLE[priority].dot}`} />
      {tr(PRIORITY_LABELS[priority])}
    </Badge>
  );
}

/** +992901234567 → +992 90 123 4567 */
export function prettyPhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("992")) return `+992 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return p;
}

export function CustomerForm({
  customer,
  initialPhone,
  onDone,
}: {
  customer?: Customer;
  initialPhone?: string;
  onDone: (c: Customer) => void;
}) {
  const toast = useToast();
  const [f, setF] = useState({
    fullName: customer?.fullName ?? "",
    phone: customer ? prettyPhone(customer.phone) : (initialPhone ?? "+992 "),
    email: customer?.email ?? "",
    birthday: customer?.birthday?.slice(0, 10) ?? "",
    note: customer?.note ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { ...f, birthday: f.birthday ? new Date(f.birthday).toISOString() : "" };
      const c = customer
        ? await api<Customer>(`/customers/${customer.id}`, { method: "PATCH", json: body })
        : await api<Customer>("/customers", { method: "POST", json: body });
      toast.success(customer ? tr("Маълумот захира шуд") : tr("Мизоҷи нав сабт шуд"), c.fullName);
      onDone(c);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field label={tr("Ному насаб")}>
        <Input required minLength={2} value={f.fullName} onChange={set("fullName")} placeholder={tr("Мадина Каримова")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("Телефон")} hint={tr("Бонус бо ҳамин рақам ҷамъ мешавад")}>
          <Input required value={f.phone} onChange={set("phone")} inputMode="tel" />
        </Field>
        <Field label={tr("Зодрӯз (ихтиёрӣ)")}>
          <Input type="date" value={f.birthday} onChange={set("birthday")} />
        </Field>
      </div>
      <Field label={tr("Почтаи электронӣ (ихтиёрӣ)")}>
        <Input type="email" value={f.email} onChange={set("email")} />
      </Field>
      <Field label={tr("Эзоҳ")}>
        <textarea
          value={f.note}
          onChange={set("note")}
          rows={3}
          maxLength={500}
          className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/10"
          placeholder={tr("Масалан: тундро дӯст медорад")}
        />
      </Field>
      <ErrorBox message={error} />
      <Button type="submit" loading={busy} className="w-full">
        {customer ? tr("Захира кардан") : tr("Сабт кардан")}
      </Button>
    </form>
  );
}
