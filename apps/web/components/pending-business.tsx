"use client";

import { BUSINESS_TYPE_LABELS, ORG_STATUS_LABELS, type Organization, type User } from "@filialhub/shared";
import { Ban, Clock, LogOut, RefreshCw, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import { ChannelsCard } from "./channels-card";
import { BusinessIcon } from "./glyph";
import { Logo } from "./shell";
import { Badge, Button, Card, CardTitle, ErrorBox, cn } from "./ui";

/**
 * Бизнеси тасдиқнашуда: то тасдиқи супер-админ ба ҷои панел ин экран нишон дода мешавад.
 * Ҳар 20 сония ҳолат санҷида мешавад — пас аз тасдиқ панел худ аз худ мекушояд.
 */
export function PendingBusiness({ user }: { user: User }) {
  const { setUser, logout } = useAuth();
  const org = user.organization!;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: businesses } = useApi<(Organization & { current: boolean })[]>(user.role === "CHEF" ? "/auth/businesses" : null);
  const others = businesses?.filter((b) => !b.current) ?? [];

  useEffect(() => {
    const t = setInterval(() => {
      api<User>("/auth/me").then(setUser).catch(() => {});
    }, 20000);
    return () => clearInterval(t);
  }, [setUser]);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      setUser(await api<User>("/auth/me"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function switchTo(id: number) {
    setError(null);
    try {
      setUser(await api<User>(`/auth/businesses/${id}/switch`, { method: "POST" }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const pending = org.status === "PENDING";
  const Icon = pending ? Clock : org.status === "BLOCKED" ? Ban : XCircle;

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:py-14">
      <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-[#ff7a1a]" />
      <div className="float-y pointer-events-none absolute top-40 right-16 size-12 rounded-full bg-[#ffc531]" />
      <div className="relative mx-auto w-full max-w-xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Logo org={org} />
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="size-4" /> {tr("Баромад")}
          </Button>
        </div>

        <Card className="rise text-center">
          <div className={cn("mx-auto mb-4 grid size-16 place-items-center rounded-2xl", pending ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand")}>
            <Icon className={cn("size-8", pending && "animate-pulse")} />
          </div>
          <Badge tone={pending ? "warn" : "brand"}>{tr(ORG_STATUS_LABELS[org.status])}</Badge>
          <h1 className="mt-3 text-xl font-extrabold text-ink sm:text-2xl">
            {pending ? tr("Дархости шумо фиристода шуд") : org.status === "BLOCKED" ? tr("Бизнес баста шуд") : tr("Дархост рад шуд")}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {pending
              ? tr("Супер-админ бизнеси «{0}»-ро месанҷад. Пас аз тасдиқ панел худ аз худ кушода мешавад ва ба Telegram ва WhatsApp-и шумо хабар меояд.", org.name)
              : tr("Барои маълумот ба супер-админи FilialHub муроҷиат кунед.")}
          </p>
          {org.statusNote && (
            <div className="mx-auto mt-4 max-w-md rounded-xl bg-surface-2 px-4 py-3 text-left text-sm text-ink-2">
              <span className="font-semibold text-ink">{tr("Сабаб")}:</span> {org.statusNote}
            </div>
          )}
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
            <BusinessIcon type={org.type} className="size-4" /> {org.name} · {tr(BUSINESS_TYPE_LABELS[org.type])}
          </div>
          <div className="mt-5">
            <ErrorBox message={error} />
            <Button variant="outline" onClick={refresh} loading={busy} className="mt-3">
              <RefreshCw className="size-4" /> {tr("Санҷидан")}
            </Button>
          </div>
        </Card>

        {others.length > 0 && (
          <Card>
            <CardTitle>{tr("Дигар бизнесҳои шумо")}</CardTitle>
            <div className="space-y-2">
              {others.map((b) => (
                <button
                  key={b.id}
                  onClick={() => switchTo(b.id)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface-2 p-3 text-left transition hover:border-brand/40"
                >
                  <BusinessIcon type={b.type} className="size-5 text-brand" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">{b.name}</span>
                  <Badge tone={b.status === "APPROVED" ? "good" : b.status === "PENDING" ? "warn" : "brand"}>{tr(ORG_STATUS_LABELS[b.status])}</Badge>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Telegram-ро пайваст кунед — хабари тасдиқ фавран меояд */}
        <ChannelsCard whatsappNumber={user.whatsapp || user.phone} />
      </div>
    </div>
  );
}
