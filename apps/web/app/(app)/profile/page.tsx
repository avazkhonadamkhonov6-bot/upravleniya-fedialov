"use client";

import { POSITION_LABELS, ROLE_LABELS, type User } from "@filialhub/shared";
import { Building2, CalendarDays, Mail, Phone, Wallet } from "lucide-react";
import { useState } from "react";
import { Avatar, Badge, Button, Card, CardTitle, ErrorBox, Field, Input, money, PageHeader, TelegramIcon } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { tr, locale } from "@/lib/i18n";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({ fullName: user?.fullName ?? "", phone: user?.phone ?? "", currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  if (!user) return null;

  const role = user.position ? tr(POSITION_LABELS[user.position]) : tr(ROLE_LABELS[user.role]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(false);
    try {
      const updated = await api<User>("/auth/me", {
        method: "PATCH",
        json: {
          fullName: f.fullName,
          phone: f.phone,
          ...(f.newPassword ? { currentPassword: f.currentPassword, newPassword: f.newPassword } : {}),
        },
      });
      setUser(updated);
      setF({ ...f, currentPassword: "", newPassword: "" });
      setOk(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const facts = [
    { icon: Mail, label: tr("Почта"), value: user.email },
    { icon: Phone, label: tr("Телефон"), value: user.phone },
    { icon: Building2, label: tr("Филиал"), value: user.branch?.name ?? tr("Ҳамаи филиалҳо") },
    { icon: CalendarDays, label: tr("Аз санаи"), value: new Date(user.hiredAt).toLocaleDateString(locale()) },
    ...(user.role !== "CHEF" ? [{ icon: Wallet, label: tr("Маош"), value: money(user.salary) }] : []),
  ];

  return (
    <>
      <PageHeader title={tr("Профил")} />
      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="text-center">
            <div className="flex justify-center">
              <Avatar name={user.fullName} size={88} />
            </div>
            <div className="mt-4 text-xl font-bold text-ink">{user.fullName}</div>
            <div className="mt-2 flex justify-center">
              <Badge tone="brand">{role}</Badge>
            </div>
            <ul className="mt-6 space-y-3 text-left">
              {facts.map((x) => (
                <li key={x.label} className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
                  <x.icon className="size-4 text-muted" />
                  <span className="text-sm text-muted">{x.label}</span>
                  <span className="ml-auto truncate text-sm font-semibold text-ink">{x.value}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#229ed9]/12 text-[#229ed9]">
                <TelegramIcon className="size-5" />
              </span>
              <div>
                <div className="font-semibold text-ink">Telegram</div>
                <div className="text-sm text-muted">{user.telegramLinked ? tr("Пайваст аст ✅") : tr("Пайваст нест")}</div>
              </div>
            </div>
            {!user.telegramLinked && (
              <p className="mt-3 text-sm text-muted">
                {tr("Ботро кушоед,")}{" "}<code className="rounded bg-surface-2 px-1">/start</code> {tr("нависед ва рақами")}{" "}<b className="text-ink">{user.phone}</b>{tr("-ро фиристед.")}
              </p>
            )}
          </Card>
        </div>

        <Card>
          <CardTitle>{tr("Таҳрири маълумот")}</CardTitle>
          <form onSubmit={save} className="max-w-xl space-y-4">
            <Field label={tr("Ному насаб")}>
              <Input required value={f.fullName} onChange={set("fullName")} />
            </Field>
            <Field label={tr("Рақами телефон")} hint={tr("Ҳамин рақам барои WhatsApp ва Telegram истифода мешавад")}>
              <Input required value={f.phone} onChange={set("phone")} />
            </Field>
            <div className="border-t border-line pt-4">
              <div className="mb-3 text-sm font-semibold text-ink">{tr("Иваз кардани парол")}</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={tr("Пароли ҳозира")}>
                  <Input type="password" value={f.currentPassword} onChange={set("currentPassword")} autoComplete="current-password" />
                </Field>
                <Field label={tr("Пароли нав")}>
                  <Input type="password" minLength={6} value={f.newPassword} onChange={set("newPassword")} autoComplete="new-password" />
                </Field>
              </div>
            </div>
            <ErrorBox message={error} />
            {ok && <div className="rounded-xl bg-good-soft px-4 py-3 text-sm font-medium text-good">{tr("Маълумот захира шуд ✅")}</div>}
            <Button type="submit" loading={busy}>
              {tr("Захира кардан")}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
