"use client";

import { BellRing, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n";
import { disablePush, enablePush, pushEnabled, pushSupported } from "@/lib/push";
import { useToast } from "./toast";
import { Button } from "./ui";

/** «Огоҳӣ ба телефон»: фармоиш, паём, занг ва қарз — ҳатто вақте ки сайт пӯшида аст */
export function PushToggle() {
  const toast = useToast();
  const [state, setState] = useState<"unsupported" | "on" | "off" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!pushSupported()) {
      queueMicrotask(() => alive && setState("unsupported"));
    } else {
      void pushEnabled().then((on) => alive && setState(on ? "on" : "off"));
    }
    return () => {
      alive = false;
    };
  }, []);

  async function toggle() {
    setBusy(true);
    try {
      if (state === "on") {
        await disablePush();
        setState("off");
      } else if (await enablePush()) {
        setState("on");
        toast.success(tr("Огоҳӣ ба телефон фаъол шуд"));
      } else {
        toast.error(tr("Иҷозат дода нашуд"), tr("Дар танзимоти браузер огоҳиҳоро барои ин сайт иҷозат диҳед."));
      }
    } catch (e) {
      toast.error(tr("Фаъол нашуд"), (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (state === null) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
        {state === "on" ? <BellRing className="size-5" /> : <BellOff className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-ink">{tr("Огоҳӣ ба телефон")}</div>
        <div className="text-xs text-muted">
          {state === "unsupported"
            ? tr("Дар iPhone: сайтро «Ба экрани хона» илова кунед ва аз он ҷо кушоед.")
            : tr("Фармоиш, паём, занг ва қарз — ҳатто вақте ки сайт пӯшида аст.")}
        </div>
      </div>
      {state !== "unsupported" && (
        <Button size="sm" variant={state === "on" ? "outline" : "primary"} loading={busy} onClick={toggle}>
          {state === "on" ? tr("Хомӯш") : tr("Фаъол кардан")}
        </Button>
      )}
    </div>
  );
}
