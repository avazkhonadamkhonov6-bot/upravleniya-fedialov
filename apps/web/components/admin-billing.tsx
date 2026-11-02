"use client";

import {
  effectivePlan,
  PLAN_INFO,
  PLAN_PAYMENT_STATUS_LABELS,
  PLANS,
  type AdminBusiness,
  type PaymentCard,
  type Plan,
  type PlanPayment,
} from "@filialhub/shared";
import { Check, CreditCard, Gift, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";
import { useToast } from "./toast";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Empty,
  ErrorBox,
  Field,
  Input,
  Modal,
  Segmented,
  Select,
  Skeleton,
  cn,
  formatDate,
} from "./ui";

/** Супер-админ: пардохтҳое, ки соҳибон фиристоданд — пулро дар DC/Alif санҷед ва тасдиқ кунед */
export function PaymentsPanel({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const [view, setView] = useState<"PENDING" | "ALL">("PENDING");
  const { data, error, reload } = useApi<PlanPayment[]>(
    `/admin/billing/payments${view === "PENDING" ? "?status=PENDING" : ""}`,
  );
  const [busy, setBusy] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<PlanPayment | null>(null);
  const [note, setNote] = useState("");

  const decide = async (p: PlanPayment, approve: boolean, reason = "") => {
    setBusy(p.id);
    try {
      await api(
        `/admin/billing/payments/${p.id}/${approve ? "approve" : "reject"}`,
        { method: "POST", json: approve ? {} : { note: reason } },
      );
      toast.success(
        approve
          ? tr("«{0}» — тариф кушода шуд", p.organizationName)
          : tr("Пардохт рад шуд"),
      );
      setRejecting(null);
      setNote("");
      reload();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardTitle
        extra={
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "PENDING", label: "Интизор" },
              { value: "ALL", label: "Ҳама" },
            ]}
          />
        }
      >
        {tr("Пардохтҳо")}
      </CardTitle>
      <ErrorBox message={error} />
      {!data ? (
        <Skeleton className="h-20" />
      ) : data.length === 0 ? (
        <Empty
          icon={<CreditCard className="size-7" />}
          title={
            view === "PENDING"
              ? tr("Пардохти нав нест")
              : tr("Ҳоло пардохт нашудааст")
          }
          text={tr(
            "Вақте ки соҳиб «Ман пул фиристодам»-ро пахш кунад, дар ин ҷо ва дар Telegram пайдо мешавад.",
          )}
        />
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-surface-2/50 p-4 md:flex-row md:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-ink">
                    {p.organizationName}
                  </span>
                  <span className="text-xs text-muted">
                    #{p.organizationId}
                  </span>
                  {p.status !== "PENDING" && (
                    <Badge tone={p.status === "APPROVED" ? "good" : "neutral"}>
                      {tr(PLAN_PAYMENT_STATUS_LABELS[p.status])}
                    </Badge>
                  )}
                </div>
                <div className="mt-1 text-sm text-ink-2">
                  <b className="text-ink">{tr("{0} сомонӣ", p.amount)}</b> ·{" "}
                  {tr(PLAN_INFO[p.plan].name)} · {tr("{0} моҳ", p.months)} ·{" "}
                  {formatDate(p.createdAt, true)}
                </div>
                <div className="mt-0.5 text-sm text-muted">
                  {tr("Чек / рақам")}:{" "}
                  <b className="text-ink-2">{p.reference}</b>
                  {p.owner && ` · ${p.owner.fullName} · ${p.owner.phone}`}
                </div>
                {p.note && (
                  <div className="mt-0.5 text-sm text-brand">{p.note}</div>
                )}
              </div>
              {p.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    loading={busy === p.id}
                    onClick={() => decide(p, true)}
                  >
                    <Check className="size-4" /> {tr("Пул омад")}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busy === p.id}
                    onClick={() => setRejecting(p)}
                  >
                    <X className="size-4" /> {tr("Наомад")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={tr("Пардохтро рад кардан")}
      >
        <div className="space-y-4">
          <Field label={tr("Сабаб (ба соҳиб фиристода мешавад)")}>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={tr("масалан: пул ба ҳисоб наомад")}
              maxLength={300}
            />
          </Field>
          <Button
            className="w-full"
            variant="danger"
            loading={busy === rejecting?.id}
            disabled={!note.trim()}
            onClick={() => rejecting && decide(rejecting, false, note)}
          >
            {tr("Рад кардан")}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

/** Ба куҷо мизоҷон пул фиристанд */
export function CardSettings() {
  const { data } = useApi<PaymentCard>("/admin/billing/card");
  return (
    <Card>
      <CardTitle>{tr("Ба куҷо пул фиристанд")}</CardTitle>
      {data ? <CardForm initial={data} /> : <Skeleton className="h-32" />}
    </Card>
  );
}

function CardForm({ initial }: { initial: PaymentCard }) {
  const toast = useToast();
  const [form, setForm] = useState<PaymentCard>(initial);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setForm(
        await api<PaymentCard>("/admin/billing/card", {
          method: "PUT",
          json: form,
        }),
      );
      toast.success(tr("Нигоҳ дошта шуд"));
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const set =
    (k: keyof PaymentCard) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <Field label={tr("Рақами телефон (DC, Alif)")}>
        <Input
          value={form.phone}
          onChange={set("phone")}
          maxLength={30}
          placeholder="+992…"
        />
      </Field>
      <Field label={tr("Рақами корт (ихтиёрӣ)")}>
        <Input
          value={form.number}
          onChange={set("number")}
          maxLength={40}
          placeholder="4444 …"
        />
      </Field>
      <Field label={tr("Номи соҳиби корт")}>
        <Input value={form.holder} onChange={set("holder")} maxLength={80} />
      </Field>
      <Field label={tr("Бонк / ҳамёнҳо")}>
        <Input value={form.bank} onChange={set("bank")} maxLength={80} />
      </Field>
      <div className="sm:col-span-2">
        <Field label={tr("Эзоҳ барои мизоҷ")}>
          <Input value={form.note} onChange={set("note")} maxLength={300} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" loading={busy}>
          {tr("Нигоҳ доштан")}
        </Button>
      </div>
    </form>
  );
}

/** Нишони тариф дар рӯйхати бизнесҳо ва тугмаи «Тариф додан» (тӯҳфа, шартнома, демо) */
export function PlanControl({
  business,
  onDone,
}: {
  business: AdminBusiness;
  onDone: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<Plan>(
    business.plan === "FREE" ? "START" : business.plan,
  );
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const eff = effectivePlan(business);

  const save = async () => {
    setBusy(true);
    try {
      await api(`/admin/billing/businesses/${business.id}/plan`, {
        method: "POST",
        json: { plan, days: days ? Number(days) : undefined },
      });
      toast.success(tr("Тариф нав шуд"));
      setOpen(false);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="cursor-pointer"
        title={tr("Тариф додан")}
      >
        <Badge
          tone={eff === "FREE" ? "neutral" : "good"}
          className={cn(
            business.plan !== "FREE" && eff === "FREE" && "line-through",
          )}
        >
          {tr(PLAN_INFO[business.plan].name)}
          {business.plan !== "FREE" &&
            (business.planUntil
              ? ` · ${formatDate(business.planUntil)}`
              : ` · ∞`)}
        </Badge>
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={tr("Тариф барои «{0}»", business.name)}
      >
        <div className="space-y-4">
          <Field label={tr("Тариф")}>
            <Select
              value={plan}
              onChange={(e) => setPlan(e.target.value as Plan)}
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {tr(PLAN_INFO[p].name)} — {PLAN_INFO[p].price} {tr("сомонӣ")}
                </option>
              ))}
            </Select>
          </Field>
          {plan !== "FREE" && (
            <Field
              label={tr("Чанд рӯз")}
              hint={tr("Холӣ монед — бемӯҳлат (масалан барои демо ё шарик)")}
            >
              <Input
                type="number"
                min={1}
                max={3650}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </Field>
          )}
          <p className="text-xs text-muted">
            {tr(
              "Ин пардохт ҳисоб намешавад — танҳо тарифро дастӣ мегузорад. Соҳиб хабар мегирад.",
            )}
          </p>
          <Button className="w-full" loading={busy} onClick={save}>
            <Gift className="size-4" /> {tr("Нигоҳ доштан")}
          </Button>
        </div>
      </Modal>
    </>
  );
}
