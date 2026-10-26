"use client";

import type { DeliveryStatus, TelegramLinkInfo } from "@filialhub/shared";
import { CheckCircle2, ExternalLink, Link2Off, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { useToast } from "./toast";
import { Badge, Button, Card, CardTitle, TelegramIcon, WhatsAppIcon } from "./ui";

interface Channels {
  telegram: TelegramLinkInfo;
  whatsapp: { configured: boolean; number: string };
}

const RESULT: Record<DeliveryStatus, string> = {
  SENT: "расид",
  DRY_RUN: "сервер токен надорад — фиристода нашуд",
  FAILED: "хатогӣ",
  NOT_LINKED: "пайваст нест",
};

/**
 * Профил → «WhatsApp ва Telegram»: ҳар корбар Telegram-ро бо як пахш пайваст мекунад
 * (пайванди t.me/<бот>?start=<код>) ва бо паёми санҷишӣ месанҷад, ки паёмҳои сайт ба ӯ мерасанд.
 */
export function ChannelsCard({ whatsappNumber }: { whatsappNumber: string }) {
  const toast = useToast();
  const [data, setData] = useState<Channels | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let alive = true;
    const pull = () =>
      api<Channels>("/auth/channels")
        .then((d) => {
          if (!alive) return;
          setData(d);
          if (d.telegram.linked) setWaiting(false);
        })
        .catch(() => {});
    pull();
    // Пас аз пахши «Пайваст кардан» ҳар 3 сония месанҷем, то корбар дар Telegram /start-ро пахш кунад.
    const t = waiting ? setInterval(pull, 3000) : undefined;
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [waiting, whatsappNumber]);

  async function unlink() {
    await api("/auth/channels/telegram", { method: "DELETE" });
    setData((d) => (d ? { ...d, telegram: { ...d.telegram, linked: false } } : d));
    toast.info(tr("Telegram ҷудо карда шуд"));
  }

  async function test() {
    setTesting(true);
    try {
      const res = await api<{ channel: "TELEGRAM" | "WHATSAPP"; status: DeliveryStatus }[]>("/auth/channels/test", { method: "POST" });
      const text = res.map((r) => `${r.channel === "TELEGRAM" ? "Telegram" : "WhatsApp"}: ${tr(RESULT[r.status])}`).join(" · ");
      (res.some((r) => r.status === "SENT") ? toast.success : toast.info)(tr("Паёми санҷишӣ"), text);
    } catch (e) {
      toast.error(tr("Хатогӣ"), (e as Error).message);
    } finally {
      setTesting(false);
    }
  }

  const tg = data?.telegram;
  return (
    <Card>
      <CardTitle>{tr("WhatsApp ва Telegram")}</CardTitle>
      <p className="-mt-2 mb-4 text-sm text-muted">{tr("Паёмҳо, овозҳо ва видеоҳое, ки ба шумо дар сайт менависанд, ба ин ҷо низ меоянд.")}</p>

      <div className="space-y-3">
        <div className="rounded-2xl border border-line p-4 transition hover:border-[#229ed9]/40">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#229ed9]/12 text-[#229ed9]">
              <TelegramIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-ink">Telegram</div>
              <div className="truncate text-sm text-muted">{tg?.botUsername ? `@${tg.botUsername}` : tr("Бот")}</div>
            </div>
            {tg?.linked ? (
              <Badge tone="good" className="gap-1">
                <CheckCircle2 className="size-3.5" /> {tr("Пайваст")}
              </Badge>
            ) : (
              <Badge tone="warn">{tr("Пайваст нест")}</Badge>
            )}
          </div>
          {tg && !tg.configured ? (
            <p className="mt-3 rounded-xl bg-surface-2 p-3 text-xs text-muted">{tr("Боти Telegram ҳоло дар сервер танзим нашудааст. Ба шеф гӯед, ки TELEGRAM_BOT_TOKEN-ро гузорад.")}</p>
          ) : tg?.linked ? (
            <button onClick={unlink} className="mt-3 flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand">
              <Link2Off className="size-3.5" /> {tr("Ҷудо кардан")}
            </button>
          ) : tg?.link ? (
            <>
              <a
                href={tg.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setWaiting(true)}
                className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#229ed9] text-sm font-semibold text-white shadow-md shadow-[#229ed9]/30 transition hover:bg-[#1b8cc3] active:scale-[0.98]"
              >
                <TelegramIcon className="size-4" /> {tr("Пайваст кардани Telegram")} <ExternalLink className="size-3.5 opacity-70" />
              </a>
              <p className="mt-2 text-xs text-muted">
                {waiting ? tr("Дар Telegram тугмаи «Start»-ро пахш кунед — ин саҳифа худаш нав мешавад…") : tr("Telegram кушода мешавад — танҳо «Start»-ро пахш кунед.")}
              </p>
            </>
          ) : null}
        </div>

        <div className="rounded-2xl border border-line p-4 transition hover:border-[#1fa855]/40">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#1fa855]/12 text-[#1fa855]">
              <WhatsAppIcon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-ink">WhatsApp</div>
              <div className="truncate text-sm text-muted tabular">{whatsappNumber}</div>
            </div>
            {data && <Badge tone={data.whatsapp.configured ? "good" : "warn"}>{data.whatsapp.configured ? tr("Фаъол") : tr("Токен нест")}</Badge>}
          </div>
          <p className="mt-3 text-xs text-muted">{tr("Рақамро дар формаи «Таҳрири маълумот» иваз кунед.")}</p>
        </div>
      </div>

      <Button variant="outline" onClick={test} loading={testing} className="mt-4 w-full">
        <Send className="size-4" /> {tr("Ба худам паёми санҷишӣ фиристодан")}
      </Button>
    </Card>
  );
}
