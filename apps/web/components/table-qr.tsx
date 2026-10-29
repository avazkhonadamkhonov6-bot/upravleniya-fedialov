"use client";

import type { Branch } from "@filialhub/shared";
import { Printer } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";
import { storePath } from "@/lib/store-url";
import { useApi } from "@/lib/use-api";
import { Button, Field, Input, Select } from "./ui";

/**
 * QR барои мизҳои тарабхона: мизоҷ скан мекунад → менюи мағоза бо рақами миз → фармоиш бе сабти ном.
 * Варақаҳо барои чоп (A4, 6 то дар саҳифа).
 */
export function TableQr() {
  const { user } = useAuth();
  const org = user?.organization;
  const { data: branches } = useApi<Branch[]>(user?.role === "CHEF" ? "/branches" : null);
  const active = branches?.filter((b) => b.isActive);
  const [branchId, setBranchId] = useState<number | undefined>(user?.branchId ?? undefined);
  const [count, setCount] = useState(10);
  const [codes, setCodes] = useState<{ table: number; svg: string }[]>([]);
  const branch = branchId ?? active?.[0]?.id;
  const branchName = active?.find((b) => b.id === branch)?.name ?? user?.branch?.name ?? "";

  useEffect(() => {
    if (!org || !branch) return;
    let alive = true;
    const base = `${location.origin}${storePath(org)}`;
    const n = Math.min(Math.max(count, 1), 100);
    Promise.all(
      Array.from({ length: n }, async (_, i) => ({
        table: i + 1,
        svg: await QRCode.toString(`${base}?table=${i + 1}&b=${branch}`, { type: "svg", margin: 1, errorCorrectionLevel: "M" }),
      })),
    ).then((list) => alive && setCodes(list));
    return () => {
      alive = false;
    };
  }, [org, branch, count]);

  if (!org) return null;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted print:hidden">
        {tr("Ҳар мизро бо QR-и худ чоп кунед. Мизоҷ онро бо камераи телефон скан мекунад, менюро мебинад ва фармоиш медиҳад — бе сабти ном. Фармоиш бо рақами миз дар ин саҳифа фавран пайдо мешавад.")}
      </p>
      {!org.isPublic && (
        <div className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn print:hidden">
          {tr("Мағоза дар бозори онлайн пинҳон аст — QR кор намекунад. Дар «Профил» онро кушоед.")}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        {active && active.length > 1 && (
          <Field label={tr("Филиал")}>
            <Select value={branch ?? ""} onChange={(e) => setBranchId(Number(e.target.value))} className="w-60">
              {active.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label={tr("Шумораи мизҳо")}>
          <Input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} className="w-32" />
        </Field>
        <Button onClick={() => window.print()} disabled={!codes.length}>
          <Printer className="size-4" /> {tr("Чоп кардан")}
        </Button>
      </div>
      <div className="table-qr-sheet grid grid-cols-2 gap-4 sm:grid-cols-3">
        {codes.map((c) => (
          <div key={c.table} className="flex break-inside-avoid flex-col items-center rounded-2xl border border-line bg-white p-4 text-center text-[#16120f]">
            <div className="text-xs font-semibold tracking-wide uppercase opacity-60">{org.name}</div>
            <div className="mt-1 text-2xl font-extrabold">{tr("Мизи {0}", c.table)}</div>
            <div className="my-3 w-full max-w-44" dangerouslySetInnerHTML={{ __html: c.svg }} />
            <div className="text-sm font-semibold">{tr("Скан кунед ва фармоиш диҳед")}</div>
            {branchName && <div className="mt-0.5 text-[11px] opacity-60">{branchName}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
