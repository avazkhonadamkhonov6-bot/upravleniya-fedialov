"use client";

import { Printer, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { api, qs } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import { useToast } from "./toast";
import { Button } from "./ui";

type Qr = { branchId: number; code: string; required: boolean };

/**
 * QR-и давомот барои девори филиал: корманд скан мекунад → /checkin → «Омадам».
 * «Танҳо бо QR» — аз хона «Омадам» пахш кардан мумкин нест. «Коди нав» — QR-и кӯҳна кор намекунад.
 */
export function AttendanceQr({ branchId, branchName }: { branchId?: number; branchName: string }) {
  const toast = useToast();
  const { data, reload } = useApi<Qr>(`/shifts/qr${qs({ branchId })}`);
  const [svg, setSvg] = useState("");
  const [busy, setBusy] = useState(false);
  const url = data ? `${typeof location === "undefined" ? "" : location.origin}/checkin?c=${encodeURIComponent(data.code)}` : "";

  useEffect(() => {
    if (!url) return;
    let alive = true;
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then((s) => alive && setSvg(s));
    return () => {
      alive = false;
    };
  }, [url]);

  async function update(json: { required?: boolean; rotate?: boolean }) {
    setBusy(true);
    try {
      await api<Qr>("/shifts/qr", { method: "PATCH", json: { branchId, ...json } });
      reload();
      toast.success(json.rotate ? tr("Коди нав сохта шуд — QR-и навро чоп кунед") : tr("Захира шуд"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function print() {
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(
      `<!doctype html><meta charset="utf-8"><title>QR</title><body style="font-family:sans-serif;text-align:center;padding:40px">` +
        `<h1 style="margin:0 0 8px">${tr("Омадам / Рафтам")}</h1><p style="margin:0 0 24px;color:#555">${branchName}</p>` +
        `<div style="width:340px;margin:0 auto">${svg}</div><p style="margin-top:24px;font-size:18px">${tr("Бо камераи телефон скан кунед ва «Омадам»-ро пахш кунед")}</p>` +
        `<script>window.onload=()=>{window.print()}</script></body>`,
    );
    w.document.close();
  }

  if (!data) return <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />;
  return (
    <div className="space-y-4">
      <div className="mx-auto w-60 rounded-2xl bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="text-center text-sm text-muted">{tr("Чоп кунед ва дар даромадгоҳи филиал часпонед. Корманд бо камераи телефон скан мекунад ва «Омадам»-ро пахш мекунад.")}</p>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface-2 p-3 text-sm">
        <input type="checkbox" checked={data.required} disabled={busy} onChange={(e) => void update({ required: e.target.checked })} className="mt-0.5 size-4 accent-[var(--brand)]" />
        <span>
          <b className="text-ink">{tr("«Омадам» танҳо бо QR")}</b>
          <span className="block text-xs text-muted">{tr("Корманд аз хона «Омадам» пахш карда наметавонад — бояд дар филиал QR-ро скан кунад.")}</span>
        </span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={print} disabled={!svg}>
          <Printer className="size-4" /> {tr("Чоп кардан")}
        </Button>
        <Button variant="outline" onClick={() => confirm(tr("QR-и кӯҳна дигар кор намекунад. Коди нав созам?")) && void update({ rotate: true })} loading={busy}>
          <RefreshCw className="size-4" /> {tr("Коди нав")}
        </Button>
      </div>
    </div>
  );
}
