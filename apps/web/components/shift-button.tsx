"use client";

import type { Shift } from "@filialhub/shared";
import { LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import { useNow } from "@/lib/use-now";
import { useToast } from "./toast";
import { Button, cn, Modal } from "./ui";
import { tr, locale } from "@/lib/i18n";

export function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
}

/**
 * Тугмаи «Омадам / Рафтам» барои менеҷер ва ҳар корманд. Вақти омад ва рафтан сабт мешавад,
 * хабар ба менеҷер (аз менеҷер — ба шеф) меравад; паёми ихтиёрӣ ба чати ӯ. Ҷадвал набошад ҳам кор мекунад.
 */
export function ShiftButton({ compact }: { compact?: boolean }) {
  const toast = useToast();
  const { user } = useAuth();
  const { data: shift, reload } = useApi<Shift | null>("/shifts/mine");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const now = useNow();

  // Дигар тугмаҳои смена дар ҳамин саҳифа низ нав шаванд.
  useEffect(() => {
    window.addEventListener("fh-shift-change", reload);
    return () => window.removeEventListener("fh-shift-change", reload);
  }, [reload]);

  if (shift === undefined || !user || user.role === "CHEF") return null;

  const onShift = shift?.state === "ON_SHIFT";
  const boss = user.role === "MANAGER" ? tr("шеф") : tr("менеҷер");
  // Пешнамоиш: нисбат ба сменаи ҷадвалшуда барвақт ё дер (агар смена то 8 соат баъд бошад)
  const startsIn = shift && !onShift ? Math.round((new Date(shift.startsAt).getTime() - now) / 60000) : null;
  const preview =
    startsIn === null || startsIn > 8 * 60
      ? tr("Ҷадвал нест — смена аз ҳозир сар мешавад")
      : startsIn > 0
        ? tr("Смена {0}–{1} · {2} дақ барвақт", timeOf(shift!.startsAt), timeOf(shift!.endsAt), startsIn)
        : startsIn < -10
          ? tr("Смена {0}–{1} · {2} дақ дер", timeOf(shift!.startsAt), timeOf(shift!.endsAt), -startsIn)
          : tr("Смена {0}–{1} · сари вақт", timeOf(shift!.startsAt), timeOf(shift!.endsAt));

  async function act() {
    setBusy(true);
    try {
      const s = await api<Shift>(onShift ? "/shifts/check-out" : "/shifts/check-in", { method: "POST", json: { note: note.trim() || undefined } });
      if (onShift) toast.success(tr("Рафтани шумо сабт шуд — {0}", timeOf(s.checkOutAt!)), tr("Шумо {0} соат кор кардед. {1} огоҳ шуд.", s.hoursWorked, boss));
      else if (s.lateMinutes > 0) toast.info(tr("Омадани шумо сабт шуд — {0}", timeOf(s.checkInAt!)), tr("{0} дақиқа дер — {1} огоҳ шуд", s.lateMinutes, boss));
      else if (s.earlyMinutes > 0) toast.success(tr("Омадани шумо сабт шуд — {0}", timeOf(s.checkInAt!)), tr("{0} дақиқа барвақт — {1} огоҳ шуд", s.earlyMinutes, boss));
      else toast.success(tr("Омадани шумо сабт шуд — {0}", timeOf(s.checkInAt!)), tr("{0} огоҳ шуд", boss));
      setOpen(false);
      setNote("");
      window.dispatchEvent(new Event("fh-shift-change"));
    } catch (e) {
      toast.error(tr("Хатогӣ"), (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const clock = new Date(now).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition",
          onShift ? "bg-good-soft text-good hover:brightness-95" : "brand-gradient text-white hover:brightness-110",
        )}
      >
        {onShift ? (
          <>
            <span className="live-dot size-2 rounded-full bg-good" />
            <span className={compact ? "hidden sm:inline" : ""}>{tr("Дар кор аз {0}", timeOf(shift!.checkInAt!))}</span>
            <LogOut className="size-4" />
          </>
        ) : (
          <>
            <LogIn className="size-4" />
            <span className={compact ? "hidden sm:inline" : ""}>{tr("Омадам")}</span>
          </>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={onShift ? tr("Рафтам") : tr("Омадам")}>
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-2 p-4 text-center">
            <div className="text-4xl font-extrabold text-ink tabular">{clock}</div>
            <div className="mt-1 text-sm text-muted">
              {onShift ? tr("Омадед: {0} · смена то {1}", timeOf(shift!.checkInAt!), timeOf(shift!.endsAt)) : preview}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-2">{tr("Паём ба {0} (ихтиёрӣ)", boss)}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder={onShift ? tr("Масалан: корҳо тамом шуд, фардо барвақт меоям") : tr("Масалан: барвақт омадам, анборро тартиб медиҳам")}
              className="w-full resize-none rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-brand/50 focus:bg-surface"
            />
          </label>
          <p className="text-xs text-muted">{tr("Вақт худкор сабт мешавад ва {0} фавран хабар мегирад.", boss)}</p>
          <Button onClick={act} loading={busy} className="h-12 w-full text-base">
            {onShift ? <LogOut className="size-4" /> : <LogIn className="size-4" />} {onShift ? tr("Рафтамро сабт кардан") : tr("Омадамро сабт кардан")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
