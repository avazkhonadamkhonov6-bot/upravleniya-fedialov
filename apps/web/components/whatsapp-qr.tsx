"use client";

import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";

type Qr = { type: string; message: string };

/**
 * QR-и Green-API: телефон бо WhatsApp → «Связанные устройства» → «Привязка устройства» скан мекунад.
 * QR ҳар 20 сония нав мешавад — мо ҳар 5 сония мегирем. Пас аз пайвастшавӣ onLinked даъват мешавад.
 */
export function WhatsAppQr({ path, onLinked }: { path: string; onLinked?: () => void }) {
  const [qr, setQr] = useState<Qr | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const pull = () =>
      api<Qr>(path)
        .then((r) => {
          if (!alive) return;
          setQr(r);
          setError(null);
          if (r.type === "alreadyLogged") onLinked?.();
        })
        .catch((e: Error) => alive && setError(e.message));
    pull();
    const t = setInterval(pull, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [path, onLinked]);

  if (qr?.type === "alreadyLogged") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-good-soft px-4 py-3 text-sm font-semibold text-good">
        <CheckCircle2 className="size-4" /> {tr("WhatsApp пайваст шуд")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface-2 p-4 sm:flex-row sm:items-center">
      <div className="grid size-[200px] shrink-0 place-items-center self-center rounded-xl bg-white p-2">
        {qr?.type === "qrCode" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`data:image/png;base64,${qr.message}`} alt={tr("QR барои WhatsApp")} className="size-full" />
        ) : (
          <Loader2 className="size-8 animate-spin text-muted" />
        )}
      </div>
      <ol className="space-y-2 text-sm text-ink-2">
        <li className="flex gap-2 font-semibold text-ink">
          <Smartphone className="size-4 shrink-0 translate-y-0.5" /> {tr("Бо телефон скан кунед:")}
        </li>
        <li>1. {tr("WhatsApp-ро кушоед")}</li>
        <li>2. {tr("⋮ (iPhone: Настройки) → Связанные устройства")}</li>
        <li>3. {tr("«Привязка устройства» → QR-ро скан кунед")}</li>
        <li className="text-xs text-muted">{tr("QR ҳар 20 сония нав мешавад — саҳифаро нагузоред.")}</li>
        {(error || qr?.type === "error") && <li className="break-words text-xs text-brand">{error ?? qr?.message}</li>}
      </ol>
    </div>
  );
}
