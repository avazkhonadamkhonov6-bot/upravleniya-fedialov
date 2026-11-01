"use client";

import type { Shift } from "@filialhub/shared";
import { CheckCircle2, LogIn, ScanLine } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { timeOf } from "@/components/shift-button";
import { Button, Card, ErrorBox, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";

/** QR-и девори филиал ин саҳифаро мекушояд: корманд «Омадам»-ро бо коди филиал сабт мекунад. */
export default function CheckinPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <Checkin />
    </Suspense>
  );
}

function Checkin() {
  const code = useSearchParams().get("c") ?? "";
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Shift | null>(null);
  const boss = user?.role === "MANAGER" ? tr("шеф") : tr("менеҷер");

  async function go() {
    setBusy(true);
    setError(null);
    try {
      setDone(await api<Shift>("/shifts/check-in", { method: "POST", json: { code, note: note.trim() || undefined } }));
      window.dispatchEvent(new Event("fh-shift-change"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <Card className="text-center">
        {done ? (
          <>
            <CheckCircle2 className="mx-auto size-14 text-good" />
            <div className="mt-3 text-lg font-bold text-ink">{tr("Омадани шумо сабт шуд — {0}", timeOf(done.checkInAt!))}</div>
            <p className="mt-1 text-sm text-muted">
              {done.lateMinutes > 0
                ? tr("{0} дақиқа дер — {1} огоҳ шуд", done.lateMinutes, boss)
                : done.earlyMinutes > 0
                  ? tr("{0} дақиқа барвақт — {1} огоҳ шуд", done.earlyMinutes, boss)
                  : tr("{0} огоҳ шуд", boss)}
            </p>
          </>
        ) : (
          <>
            <ScanLine className="mx-auto size-14 text-brand" />
            <div className="mt-3 text-lg font-bold text-ink">{tr("QR-и филиал скан шуд")}</div>
            <p className="mt-1 text-sm text-muted">{tr("«Омадам»-ро пахш кунед — вақт худкор сабт мешавад ва {0} хабар мегирад.", boss)}</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder={tr("Паём ба {0} (ихтиёрӣ)", boss)}
              className="mt-4 w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand/50 focus:bg-surface"
            />
            <div className="mt-3 text-left">
              <ErrorBox message={!code ? tr("Дар суроға коди QR нест — QR-и девори филиалро аз нав скан кунед.") : error} />
            </div>
            <Button onClick={go} loading={busy} disabled={!code} className="mt-3 h-12 w-full text-base">
              <LogIn className="size-4" /> {tr("Омадам")}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
