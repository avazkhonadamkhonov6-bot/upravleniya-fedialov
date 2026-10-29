"use client";

import type { BusinessWhatsApp } from "@filialhub/shared";
import { CheckCircle2, ExternalLink, Unlink } from "lucide-react";
import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import { useToast } from "./toast";
import { Badge, Button, Card, CardTitle, ErrorBox, Field, Input, WhatsAppIcon } from "./ui";
import { WhatsAppQr } from "./whatsapp-qr";

/**
 * Профил → «WhatsApp-и бизнес» (танҳо шеф): рақами WhatsApp-и худи бизнес тавассути Green-API.
 * Агар пайваст накунад — паёмҳо аз рақами умумии FilialHub мераванд.
 */
export function BusinessWhatsAppCard() {
  const toast = useToast();
  const { data, error, reload } = useApi<BusinessWhatsApp>("/auth/organization/whatsapp");
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ idInstance: "", apiToken: "", apiUrl: "", mediaUrl: "" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const onLinked = useCallback(() => reload(), [reload]);

  function startEdit() {
    setF({ idInstance: data?.idInstance ?? "", apiToken: "", apiUrl: data?.apiUrl ?? "", mediaUrl: data?.mediaUrl ?? "" });
    setFormError(null);
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      await api<BusinessWhatsApp>("/auth/organization/whatsapp", {
        method: "PUT",
        json: { idInstance: f.idInstance.trim(), apiToken: f.apiToken.trim() || undefined, apiUrl: f.apiUrl.trim(), mediaUrl: f.mediaUrl.trim() || undefined },
      });
      toast.success(tr("WhatsApp-и бизнес захира шуд"));
      setEditing(false);
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(tr("Рақами WhatsApp-и бизнесро ҷудо кунем? Паёмҳо аз рақами умумии FilialHub мераванд."))) return;
    await api("/auth/organization/whatsapp", { method: "DELETE" });
    reload();
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Card>
      <CardTitle
        extra={
          data &&
          (data.own ? (
            data.state === "authorized" ? (
              <Badge tone="good"><CheckCircle2 className="size-3" /> {tr("Пайваст")}</Badge>
            ) : (
              <Badge tone="warn">{tr("QR-ро скан кунед")}</Badge>
            )
          ) : (
            <Badge>{data.platform ? tr("Рақами FilialHub") : tr("Пайваст нест")}</Badge>
          ))
        }
      >
        <WhatsAppIcon className="size-4 text-[#1fa855]" /> {tr("WhatsApp-и бизнес")}
      </CardTitle>
      <ErrorBox message={error} />

      {data && !editing && (
        <div className="space-y-3 text-sm">
          <p className="text-muted">
            {data.own
              ? tr("Паёмҳо ба кормандон аз рақами WhatsApp-и худи бизнеси шумо мераванд.")
              : tr("Ҳоло паёмҳо аз рақами умумии FilialHub мераванд. Метавонед рақами WhatsApp-и худи бизнесро пайваст кунед — бе Facebook, бо Green-API.")}
          </p>
          {data.own && data.state !== "authorized" && <WhatsAppQr path="/auth/organization/whatsapp/qr" onLinked={onLinked} />}
          {data.error && <div className="break-words text-xs text-brand">{data.error}</div>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={data.own ? "outline" : "primary"} onClick={startEdit}>
              {data.own ? tr("Калидҳоро иваз кардан") : tr("Рақами худро пайваст кардан")}
            </Button>
            {data.own && (
              <Button size="sm" variant="ghost" onClick={remove}>
                <Unlink className="size-4" /> {tr("Ҷудо кардан")}
              </Button>
            )}
          </div>
        </div>
      )}

      {editing && (
        <form onSubmit={save} className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-xs text-muted">
            <li>
              <a href="https://console.green-api.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand hover:underline">
                console.green-api.com <ExternalLink className="size-3" />
              </a>{" "}
              → {tr("сабти ном → Create an instance → Developer (ройгон)")}
            </li>
            <li>{tr("Аз саҳифаи instance чор қиматро нусха гиред ва ин ҷо гузоред")}</li>
            <li>{tr("Баъд аз захира QR ин ҷо пайдо мешавад — бо телефон скан кунед")}</li>
          </ol>
          <Field label="idInstance">
            <Input required inputMode="numeric" value={f.idInstance} onChange={set("idInstance")} placeholder="7107…" autoComplete="off" />
          </Field>
          <Field label="apiTokenInstance" hint={data?.tokenSet ? tr("Холӣ монед — токени пешина боқӣ мемонад") : undefined}>
            <Input type="password" required={!data?.tokenSet} value={f.apiToken} onChange={set("apiToken")} autoComplete="new-password" />
          </Field>
          <Field label="apiUrl">
            <Input required type="url" value={f.apiUrl} onChange={set("apiUrl")} placeholder="https://7107.api.greenapi.com" autoComplete="off" />
          </Field>
          <Field label="mediaUrl" hint={tr("Холӣ — ҳамон apiUrl")}>
            <Input type="url" value={f.mediaUrl} onChange={set("mediaUrl")} placeholder="https://7107.api.greenapi.com" autoComplete="off" />
          </Field>
          <ErrorBox message={formError} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={busy}>{tr("Захира ва санҷидан")}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>{tr("Бекор")}</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
