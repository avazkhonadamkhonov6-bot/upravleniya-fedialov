"use client";

import type { Shift } from "@filialhub/shared";
import { LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useNow } from "@/lib/use-now";
import { useToast } from "./toast";
import { cn } from "./ui";
import { tr, locale } from "@/lib/i18n";

export function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
}

/** Тугмаи «Омадам / Рафтам» барои менеҷер ва кормандон. */
export function ShiftButton({ compact }: { compact?: boolean }) {
  const toast = useToast();
  const { data: shift, reload } = useApi<Shift | null>("/shifts/mine");
  const [busy, setBusy] = useState(false);
  const now = useNow();

  // Дигар тугмаҳои смена дар ҳамин саҳифа низ нав шаванд.
  useEffect(() => {
    window.addEventListener("fh-shift-change", reload);
    return () => window.removeEventListener("fh-shift-change", reload);
  }, [reload]);

  if (shift === undefined) return null;
  if (!shift) {
    return compact ? null : <span className="text-xs text-muted">{tr("Имрӯз смена нест")}</span>;
  }

  const startsSoon = new Date(shift.startsAt).getTime() - now < 2 * 3600000;
  const onShift = shift.state === "ON_SHIFT";
  if (!onShift && !startsSoon) {
    return compact ? null : (
      <span className="text-xs text-muted">
        {tr("Сменаи навбатӣ:")}{" "}{new Date(shift.startsAt).toLocaleDateString(locale(), { weekday: "short", day: "numeric" })} {timeOf(shift.startsAt)}
      </span>
    );
  }

  async function act() {
    if (onShift && !confirm(tr("Сменаро тамом мекунед?"))) return;
    setBusy(true);
    try {
      const s = await api<Shift>(onShift ? "/shifts/check-out" : "/shifts/check-in", { method: "POST" });
      if (onShift) toast.success(tr("Смена тамом шуд"), tr("Шумо {0} соат кор кардед", s.hoursWorked));
      else if (s.lateMinutes > 0) toast.info(tr("Омадани шумо сабт шуд"), tr("{0} дақиқа дер — менеҷер огоҳ карда шуд", s.lateMinutes));
      else toast.success(tr("Хуш омадед! Смена сар шуд"), `${timeOf(s.startsAt)} – ${timeOf(s.endsAt)}`);
      window.dispatchEvent(new Event("fh-shift-change"));
    } catch (e) {
      toast.error(tr("Хатогӣ"), (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={act}
      disabled={busy}
      className={cn(
        "flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition disabled:opacity-60",
        onShift ? "bg-good-soft text-good hover:brightness-95" : "brand-gradient text-white hover:brightness-110",
      )}
    >
      {onShift ? (
        <>
          <span className="live-dot size-2 rounded-full bg-good" />
          <span className={compact ? "hidden sm:inline" : ""}>{tr("Дар кор ·")}{" "}{timeOf(shift.checkInAt!)}</span>
          <LogOut className="size-4" />
        </>
      ) : (
        <>
          <LogIn className="size-4" />
          <span className={compact ? "hidden sm:inline" : ""}>{tr("Омадам ·")}{" "}{timeOf(shift.startsAt)}</span>
        </>
      )}
    </button>
  );
}
