"use client";

import { POSITION_LABELS, ROLE_LABELS, telegramLink, whatsappLink, type User } from "@filialhub/shared";
import { Building2, CalendarDays, Mail, Pencil, Phone } from "lucide-react";
import { useState } from "react";
import { SalaryCard } from "@/components/salary-card";
import { Avatar, Badge, Button, Card, CardTitle, ErrorBox, Field, Input, PageHeader, TelegramIcon, WhatsAppIcon } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { tr, locale } from "@/lib/i18n";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    whatsapp: user?.whatsapp ?? "",
    telegram: user?.telegram ?? "",
    currentPassword: "",
    newPassword: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  if (!user) return null;

  const role = user.position ? tr(POSITION_LABELS[user.position]) : tr(ROLE_LABELS[user.role]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  // Барои иваз кардани почта ё парол пароли ҳозира лозим аст.
  const emailChanged = f.email.trim().toLowerCase() !== user.email;
  const needsPassword = emailChanged || !!f.newPassword;

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
          whatsapp: f.whatsapp,
          telegram: f.telegram,
          ...(emailChanged ? { email: f.email } : {}),
          ...(f.newPassword ? { newPassword: f.newPassword } : {}),
          ...(needsPassword ? { currentPassword: f.currentPassword } : {}),
        },
      });
      setUser(updated);
      setF({ ...f, email: updated.email, whatsapp: updated.whatsapp, telegram: updated.telegram, currentPassword: "", newPassword: "" });
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
  ];

  return (
    <>
      <PageHeader title={tr("Профил")} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="text-center">
            <div className="flex justify-center">
              <Avatar name={user.fullName} size={88} />
            </div>
            <div className="mt-4 text-xl font-bold text-ink">{user.fullName}</div>
            <div className="mt-2 flex justify-center">
              <Badge tone="brand">{role}</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                document.getElementById("profile-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                document.getElementById("profile-name")?.focus({ preventScroll: true });
              }}
            >
              <Pencil className="size-4" /> {tr("Таҳрири профил")}
            </Button>
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
          {user.role !== "CHEF" && <SalaryCard user={user} />}
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
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={whatsappLink(user.whatsapp || user.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#1fa855]/10 px-3 py-2.5 text-sm font-semibold text-[#1fa855] transition hover:bg-[#1fa855]/20"
              >
                <WhatsAppIcon /> WhatsApp
              </a>
              <a
                href={telegramLink(user.telegram || user.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#229ed9]/10 px-3 py-2.5 text-sm font-semibold text-[#229ed9] transition hover:bg-[#229ed9]/20"
              >
                <TelegramIcon className="size-4" /> Telegram
              </a>
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
          <form id="profile-form" onSubmit={save} className="max-w-2xl space-y-6">
            <Section title={tr("Маълумоти шахсӣ")}>
              <Field label={tr("Ному насаб")}>
                <Input id="profile-name" required minLength={3} value={f.fullName} onChange={set("fullName")} autoComplete="name" />
              </Field>
              <div className="grid gap-4 xl:grid-cols-2">
                <Field label={tr("Почтаи электронӣ")} hint={emailChanged ? tr("Барои иваз кардани почта пароли ҳозираро нависед") : tr("Барои воридшавӣ")}>
                  <Input required type="email" value={f.email} onChange={set("email")} autoComplete="email" />
                </Field>
                <Field label={tr("Рақами телефон")}>
                  <Input required type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" />
                </Field>
              </div>
            </Section>

            <Section title={tr("WhatsApp ва Telegram")}>
              <div className="grid gap-4 xl:grid-cols-2">
                <Field label="WhatsApp" hint={tr("Агар холӣ бошад — рақами телефон")}>
                  <Input type="tel" value={f.whatsapp} onChange={set("whatsapp")} placeholder="+992 90 123 4567" />
                </Field>
                <Field label="Telegram" hint={tr("@номи_корбар ё рақам")}>
                  <Input value={f.telegram} onChange={set("telegram")} placeholder="@username" />
                </Field>
              </div>
            </Section>

            <Section title={tr("Иваз кардани парол")}>
              <div className="grid gap-4 xl:grid-cols-2">
                <Field label={tr("Пароли нав")} hint={tr("Камаш 6 аломат")}>
                  <Input type="password" minLength={6} value={f.newPassword} onChange={set("newPassword")} autoComplete="new-password" />
                </Field>
                <Field label={tr("Пароли ҳозира")} hint={needsPassword ? tr("Лозим аст") : tr("Танҳо барои иваз кардани почта ё парол")}>
                  <Input
                    type="password"
                    required={needsPassword}
                    value={f.currentPassword}
                    onChange={set("currentPassword")}
                    autoComplete="current-password"
                  />
                </Field>
              </div>
            </Section>
            <ErrorBox message={error} />
            {ok && <div className="rounded-xl bg-good-soft px-4 py-3 text-sm font-medium text-good">{tr("Маълумот захира шуд ✅")}</div>}
            <Button type="submit" loading={busy} className="w-full sm:w-auto sm:px-8">
              {tr("Захира кардан")}
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-line p-4 sm:p-5">
      <legend className="px-2 text-sm font-semibold text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}
