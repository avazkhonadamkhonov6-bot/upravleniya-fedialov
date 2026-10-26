"use client";

import type { Client, OnlineOrder } from "@filialhub/shared";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { NeedClient } from "@/components/shop-shell";
import { useToast } from "@/components/toast";
import { Avatar, Button, Card, CardTitle, ErrorBox, Field, Input, money } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { tr, locale } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";

/** Саҳифаи 4: профили мизоҷ */
export default function ClientProfilePage() {
  return (
    <NeedClient>
      <Profile />
    </NeedClient>
  );
}

function Profile() {
  const { client, setClient, logout } = useAuth();
  const toast = useToast();
  const { data: orders } = useApi<OnlineOrder[]>("/shop/orders");
  const [f, setF] = useState({ fullName: client?.fullName ?? "", phone: client?.phone ?? "", address: client?.address ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!client) return null;

  const done = orders?.filter((o) => o.status === "DELIVERED") ?? [];
  const spent = done.reduce((s, o) => s + o.total, 0);
  const stores = new Set(orders?.map((o) => o.store.id)).size;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setClient(await api<Client>("/shop/me", { method: "PATCH", json: f }));
      toast.success(tr("Захира шуд"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card className="text-center">
          <div className="flex justify-center">
            <Avatar name={client.fullName} size={72} />
          </div>
          <h1 className="mt-3 text-xl font-bold text-ink">{client.fullName}</h1>
          <p className="text-sm text-muted">{client.email}</p>
          <p className="mt-1 text-xs text-muted">
            {tr("Мизоҷ аз")} {new Date(client.createdAt).toLocaleDateString(locale())}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              [orders?.length ?? 0, tr("фармоиш")],
              [stores, tr("мағоза")],
              [money(spent), tr("харид")],
            ].map(([v, l]) => (
              <div key={String(l)} className="rounded-xl bg-surface-2 p-2.5">
                <div className="truncate text-base font-bold text-ink tabular">{v}</div>
                <div className="text-[11px] text-muted">{l}</div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="mt-5 w-full" onClick={logout}>
            <LogOut className="size-4" /> {tr("Баромад")}
          </Button>
        </Card>
      </div>
      <Card>
        <CardTitle>{tr("Маълумоти ман")}</CardTitle>
        <form onSubmit={save} className="space-y-4">
          <Field label={tr("Ному насаб")}>
            <Input required minLength={3} value={f.fullName} onChange={set("fullName")} autoComplete="name" />
          </Field>
          <Field label={tr("Телефон")}>
            <Input type="tel" required minLength={7} value={f.phone} onChange={set("phone")} autoComplete="tel" />
          </Field>
          <Field label={tr("Суроғаи расонидан")} hint={tr("Дар ҳар фармоиши нав худкор пур мешавад")}>
            <Input value={f.address} onChange={set("address")} placeholder={tr("Шаҳр, кӯча, хона")} autoComplete="street-address" />
          </Field>
          <ErrorBox message={error} />
          <Button type="submit" loading={busy}>
            {tr("Захира кардан")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
