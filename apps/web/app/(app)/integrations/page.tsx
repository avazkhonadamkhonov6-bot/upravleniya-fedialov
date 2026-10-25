"use client";

import type { IntegrationStatus } from "@filialhub/shared";
import { CheckCircle2, CircleDashed, Clock, Send } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, CardTitle, Empty, ErrorBox, formatDate, PageHeader, Skeleton, TelegramIcon, WhatsAppIcon } from "@/components/ui";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { tr } from "@/lib/i18n";

interface Log {
  id: number;
  channel: "TELEGRAM" | "WHATSAPP";
  to: string;
  text: string;
  status: "SENT" | "DRY_RUN" | "FAILED";
  error: string | null;
  createdAt: string;
}

const STATUS = {
  SENT: { tone: "good" as const, label: "Фиристода шуд" },
  DRY_RUN: { tone: "neutral" as const, label: "Санҷишӣ (бе токен)" },
  FAILED: { tone: "brand" as const, label: "Хатогӣ" },
};

function cronLabel(cron: string) {
  const parts = cron.trim().split(/\s+/);
  const [, m, h] = parts.length === 6 ? parts : ["0", ...parts];
  if (/^\d+$/.test(h) && /^\d+$/.test(m)) return tr("ҳар рӯз соати {0}:{1}", h.padStart(2, "0"), m.padStart(2, "0"));
  return cron;
}

export default function IntegrationsPage() {
  const { data: status } = useApi<IntegrationStatus>("/integrations/status");
  const { data: logs, reload } = useApi<Log[]>("/integrations/logs");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function run(kind: "test" | "all") {
    setBusy(kind);
    setError(null);
    setInfo(null);
    try {
      if (kind === "test") {
        const r = await api<{ text: string }>("/integrations/test-report", { method: "POST" });
        setPreview(r.text);
      } else {
        const r = await api<{ recipients: number }>("/integrations/daily-report", { method: "POST" });
        setInfo(tr("Ҳисобот ба {0} нафар (шеф ва менеҷерҳо) фиристода шуд.", r.recipients));
      }
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader title="Telegram & WhatsApp" subtitle={tr("Ҳисоботи рӯзона, огоҳиномаҳо ба кормандон ва боти омор")} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <div className="flex items-start justify-between">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#229ed9]/12 text-[#229ed9]">
              <TelegramIcon className="size-6" />
            </span>
            {!status ? null : status.telegram.configured ? <Badge tone="good"><CheckCircle2 className="size-3" /> {tr("Пайваст")}</Badge> : <Badge><CircleDashed className="size-3" /> {tr("Токен нест")}</Badge>}
          </div>
          <div className="mt-4 text-lg font-bold text-ink">{tr("Telegram бот")}</div>
          {!status ? (
            <Skeleton className="mt-2 h-10" />
          ) : (
            <div className="mt-1 space-y-1 text-sm text-muted">
              <div>
                {tr("Бот:")}{" "}
                {status.telegram.botUsername ? (
                  <a className="font-semibold text-[#229ed9]" href={`https://t.me/${status.telegram.botUsername}`} target="_blank" rel="noopener noreferrer">
                    @{status.telegram.botUsername}
                  </a>
                ) : (
                  "—"
                )}
              </div>
              <div>
                {tr("Ҳисобҳои пайвастшуда:")}{" "}<b className="text-ink">{status.telegram.linkedUsers}</b>
              </div>
            </div>
          )}
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <span className="grid size-12 place-items-center rounded-2xl bg-[#1fa855]/12 text-[#1fa855]">
              <WhatsAppIcon className="size-6" />
            </span>
            {!status ? null : status.whatsapp.configured ? <Badge tone="good"><CheckCircle2 className="size-3" /> {tr("Пайваст")}</Badge> : <Badge><CircleDashed className="size-3" /> {tr("Токен нест")}</Badge>}
          </div>
          <div className="mt-4 text-lg font-bold text-ink">WhatsApp Cloud API</div>
          <div className="mt-1 text-sm text-muted">{tr("Паём ба рақами телефони ҳар корманд фиристода мешавад.")}</div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Clock className="size-6" />
            </span>
          </div>
          <div className="mt-4 text-lg font-bold text-ink">{tr("Ҳисоботи рӯзона")}</div>
          <div className="mt-1 text-sm text-muted">
            {status ? cronLabel(status.dailyReportCron) : "…"} {tr("— ба шеф (ҳамаи филиалҳо) ва ба ҳар менеҷер (филиали худаш).")}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_1fr]">
        <Card>
          <CardTitle>{tr("Санҷиш")}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run("test")} loading={busy === "test"}>
              <Send className="size-4" /> {tr("Ҳисоботро ба ман фирист")}
            </Button>
            <Button variant="outline" onClick={() => run("all")} loading={busy === "all"}>
              {tr("Ба ҳамаи менеҷерҳо фирист")}
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            <ErrorBox message={error} />
            {info && <div className="rounded-xl bg-good-soft px-4 py-3 text-sm font-medium text-good">{info}</div>}
            {preview && (
              <div className="rounded-2xl bg-[#e7f3ec] p-4 dark:bg-[#15291d]">
                <div className="mb-2 text-xs font-semibold text-muted">{tr("Пешнамоиши паём")}</div>
                <div
                  className="max-w-md rounded-2xl rounded-tl-sm bg-white p-3.5 text-sm leading-relaxed whitespace-pre-wrap text-[#111] shadow-sm dark:bg-[#1f3a2b] dark:text-white"
                  dangerouslySetInnerHTML={{ __html: preview.replace(/<(?!\/?b>)[^>]+>/g, "") }}
                />
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>{tr("Чӣ тавр пайваст кардан")}</CardTitle>
          <ol className="space-y-3 text-sm text-ink-2">
            <li>
              <b className="text-ink">1. Telegram:</b> {tr("дар @BotFather бот созед ва токенро ба")}{" "}<code className="rounded bg-surface-2 px-1">apps/api/.env</code> →{" "}
              <code className="rounded bg-surface-2 px-1">TELEGRAM_BOT_TOKEN</code> {tr("гузоред.")}
            </li>
            <li>
              <b className="text-ink">2. WhatsApp:</b> {tr("дар Meta for Developers → WhatsApp → API Setup токен ва Phone Number ID гиред:")}{" "}
              <code className="rounded bg-surface-2 px-1">WHATSAPP_TOKEN</code>, <code className="rounded bg-surface-2 px-1">WHATSAPP_PHONE_NUMBER_ID</code>.
            </li>
            <li>
              <b className="text-ink">3.</b> {tr("API-ро аз нав сар кунед. Ҳар корманд ботро кушода")}{" "}<code className="rounded bg-surface-2 px-1">/start</code> {tr("менависад ва рақамашро мефиристад — ҳисобаш худкор пайваст мешавад.")}
            </li>
            <li>
              <b className="text-ink">4.</b> {tr("Командаҳо:")}{" "}<code className="rounded bg-surface-2 px-1">/today</code> <code className="rounded bg-surface-2 px-1">/week</code>{" "}
              <code className="rounded bg-surface-2 px-1">/month</code> <code className="rounded bg-surface-2 px-1">/branches</code> <code className="rounded bg-surface-2 px-1">/me</code>{" "}
              <code className="rounded bg-surface-2 px-1">/help</code>. {tr("Дар WhatsApp бе «/» ҳам кор мекунад: «имрӯз», «ҳафта», «моҳ», «ман», «кӯмак».")}
            </li>
            <li>
              <b className="text-ink">5. {tr("Боти WhatsApp:")}</b> {tr("Meta → WhatsApp → Configuration → Webhook: Callback URL")}{" "}
              <code className="rounded bg-surface-2 px-1">https://&lt;api&gt;/api/whatsapp/webhook</code>, Verify token —{" "}
              <code className="rounded bg-surface-2 px-1">WHATSAPP_VERIFY_TOKEN</code>, {tr("field «messages»-ро обуна кунед. Барои амният")}{" "}
              <code className="rounded bg-surface-2 px-1">WHATSAPP_APP_SECRET</code> {tr("гузоред. Пас матн, овоз ва видео аз WhatsApp ба чати сайт меоянд.")}
            </li>
          </ol>
        </Card>
      </div>

      <Card className="mt-6 p-0">
        <div className="border-b border-line p-5">
          <h2 className="text-base font-semibold text-ink">{tr("Паёмҳои охирин")}</h2>
          <p className="text-sm text-muted">{tr("Ҳамаи огоҳиномаҳо ва ҳисоботҳои фиристодашуда")}</p>
        </div>
        <div className="p-2">
          {!logs ? (
            <Skeleton className="m-3 h-32" />
          ) : logs.length === 0 ? (
            <Empty icon="📭" title={tr("Ҳоло паём нест")} text={tr("Корманди нав илова кунед ё ҳисоботи санҷиширо фиристед.")} />
          ) : (
            <ul className="divide-y divide-line">
              {logs.map((l) => (
                <li key={l.id} className="flex items-start gap-3 px-3 py-3">
                  <span className={l.channel === "TELEGRAM" ? "mt-0.5 text-[#229ed9]" : "mt-0.5 text-[#1fa855]"}>
                    {l.channel === "TELEGRAM" ? <TelegramIcon className="size-5" /> : <WhatsAppIcon className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="font-semibold text-ink-2 tabular">{l.to}</span>
                      <span>{formatDate(l.createdAt, true)}</span>
                      <Badge tone={STATUS[l.status].tone}>{tr(STATUS[l.status].label)}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-ink">{l.text.replace(/<[^>]+>/g, "")}</p>
                    {l.error && <p className="mt-1 text-xs text-brand">{l.error}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </>
  );
}
