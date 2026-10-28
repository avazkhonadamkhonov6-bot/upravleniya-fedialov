"use client";

import { ORG_STATUS_LABELS, type AdminBusiness, type OrgStatus } from "@filialhub/shared";
import { Ban, Check, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { useToast } from "./toast";
import { Badge, Button, ErrorBox, Field, Modal } from "./ui";

export const STATUS_TONE: Record<OrgStatus, "warn" | "good" | "brand" | "neutral"> = {
  PENDING: "warn",
  APPROVED: "good",
  REJECTED: "brand",
  BLOCKED: "neutral",
};

export function StatusBadge({ status }: { status: OrgStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{tr(ORG_STATUS_LABELS[status])}</Badge>;
}

type Decision = "approve" | "reject" | "block";

/** Тугмаҳои тасдиқ / рад / бастан; барои рад ва бастан сабаб пурсида мешавад */
export function ReviewActions({ business, onDone, size = "sm" }: { business: AdminBusiness; onDone: (b: AdminBusiness) => void; size?: "sm" | "md" }) {
  const toast = useToast();
  const [busy, setBusy] = useState<Decision | null>(null);
  const [asking, setAsking] = useState<"reject" | "block" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(decision: Decision, reason?: string) {
    setBusy(decision);
    setError(null);
    try {
      const b = await api<AdminBusiness>(`/admin/businesses/${business.id}/${decision}`, { method: "POST", json: { note: reason } });
      toast.success(decision === "approve" ? tr("«{0}» тасдиқ шуд", b.name) : tr("«{0}» — {1}", b.name, tr(ORG_STATUS_LABELS[b.status])));
      setAsking(null);
      setNote("");
      onDone(b);
    } catch (e) {
      if (asking) setError((e as Error).message);
      else toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const s = business.status;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {s !== "APPROVED" && (
          <Button size={size} onClick={() => run("approve")} loading={busy === "approve"} disabled={!!busy}>
            {s === "PENDING" ? <Check className="size-4" /> : <RotateCcw className="size-4" />} {s === "PENDING" ? tr("Тасдиқ") : tr("Аз нав кушодан")}
          </Button>
        )}
        {s === "PENDING" && (
          <Button size={size} variant="danger" onClick={() => setAsking("reject")} disabled={!!busy}>
            <X className="size-4" /> {tr("Рад")}
          </Button>
        )}
        {s === "APPROVED" && (
          <Button size={size} variant="outline" onClick={() => setAsking("block")} disabled={!!busy}>
            <Ban className="size-4" /> {tr("Бастан")}
          </Button>
        )}
      </div>
      <Modal open={!!asking} onClose={() => setAsking(null)} title={asking === "reject" ? tr("Рад кардани «{0}»", business.name) : tr("Бастани «{0}»", business.name)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (asking) void run(asking, note);
          }}
        >
          <Field label={tr("Сабаб")} hint={tr("Ба соҳиби бизнес дар Telegram ва WhatsApp фиристода мешавад")}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required
              maxLength={300}
              rows={3}
              autoFocus
              className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/10"
            />
          </Field>
          <ErrorBox message={error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAsking(null)}>
              {tr("Бекор")}
            </Button>
            <Button type="submit" variant="danger" loading={!!busy} disabled={!note.trim()}>
              {asking === "reject" ? tr("Рад кардан") : tr("Бастан")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
