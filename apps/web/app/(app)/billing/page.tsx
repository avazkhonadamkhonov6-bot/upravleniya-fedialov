"use client";

import {
  BILLING_PERIODS,
  PAID_PLANS,
  PERIOD_DISCOUNT,
  PLAN_GRACE_DAYS,
  PLAN_INFO,
  PLAN_PAYMENT_STATUS_LABELS,
  planPrice,
  type BillingInfo,
  type BillingPeriod,
  type Plan,
  type PlanPaymentStatus,
} from "@filialhub/shared";
import { Building2, Check, Clock, Copy, CreditCard, Gift, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { Badge, Button, Card, CardTitle, ErrorBox, Field, Input, Modal, PageHeader, Segmented, Skeleton, cn, formatDate } from "@/components/ui";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";
import { useApi } from "@/lib/use-api";

/** Имкониятҳое, ки дар ҳама тарифҳо ҳастанд — фарқ танҳо дар шумори филиал ва корманд */
const EVERYWHERE = [
  "Касса (POS), анбор ва фурӯш",
  "Мағозаи онлайн ва фармоишҳо",
  "Дафтари қарз ва мизоҷон",
  "Ҳисобот ба Telegram ва WhatsApp",
];

const STATUS_TONE: Record<PlanPaymentStatus, "warn" | "good" | "brand" | "neutral"> = {
  PENDING: "warn",
  APPROVED: "good",
  REJECTED: "brand",
  CANCELLED: "neutral",
};

/** Шеф: тарифи ҳозира, истифода, интихоби тариф ва «Ман пул фиристодам» */
export default function BillingPage() {
  const { data, error, reload } = useApi<BillingInfo>("/billing");
  const [months, setMonths] = useState<BillingPeriod>(1);
  const [chosen, setChosen] = useState<Exclude<Plan, "FREE"> | null>(null);

  return (
    <>
      <PageHeader title={tr("Тариф ва пардохт")} subtitle={tr("Озмоишӣ ройгон аст. Барои филиал ва кормандони бештар тариф интихоб кунед — маълумоти шумо ҳеҷ гоҳ нест намешавад.")} />
      <ErrorBox message={error} />

      {!data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : (
        <div className="space-y-6">
          <CurrentPlan data={data} onChanged={reload} />

          {data.isDemo ? (
            <Card className="flex items-center gap-3">
              <Gift className="size-6 shrink-0 text-good" />
              <p className="text-sm text-ink-2">{tr("Ин ҳисоб (демо ё бизнеси супер-админ) ройгон аст: ҳамаи имкониятҳо бемаҳдуд кушодаанд.")}</p>
            </Card>
          ) : (
            <Card>
              <CardTitle
                extra={
                  <div className="scrollbar-none -mx-1 max-w-full overflow-x-auto px-1">
                    <Segmented
                      value={String(months)}
                      onChange={(v) => setMonths(Number(v) as BillingPeriod)}
                      options={BILLING_PERIODS.map((m) => ({
                        value: String(m),
                        label: `${tr("{0} моҳ", m)}${PERIOD_DISCOUNT[m] ? ` −${PERIOD_DISCOUNT[m]}%` : ""}`,
                      }))}
                    />
                  </div>
                }
              >
                {tr("Тарифҳо")}
              </CardTitle>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {PAID_PLANS.map((p) => (
                  <PlanCard key={p} plan={p} months={months} current={data.effective === p} onChoose={() => setChosen(p)} disabled={!!data.pending} />
                ))}
              </div>
              <ul className="mt-5 grid gap-2 text-sm text-ink-2 sm:grid-cols-2">
                {EVERYWHERE.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-good" /> {tr(f)}
                  </li>
                ))}
                <li className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-good" /> {tr("Тарифро ҳар вақт иваз кардан мумкин — рӯзҳои боқимонда гум намешаванд")}
                </li>
              </ul>
              {data.pending && <p className="mt-4 text-sm font-medium text-warn">{tr("Пардохти шумо ҳоло санҷида мешавад — пас аз санҷиш тариф кушода мешавад.")}</p>}
            </Card>
          )}

          <Faq />

          {data.history.length > 0 && (
            <Card>
              <CardTitle>{tr("Таърихи пардохтҳо")}</CardTitle>
              <div className="divide-y divide-line">
                {data.history.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                    <span className="font-bold text-ink">{tr(PLAN_INFO[p.plan].name)}</span>
                    <span className="text-muted">{tr("{0} моҳ", p.months)}</span>
                    <span className="font-semibold text-ink">{tr("{0} сомонӣ", p.amount)}</span>
                    <span className="text-muted">{formatDate(p.createdAt, true)}</span>
                    <Badge tone={STATUS_TONE[p.status]} className="ml-auto">{tr(PLAN_PAYMENT_STATUS_LABELS[p.status])}</Badge>
                    {p.note && <span className="w-full text-brand">{tr("Сабаб")}: {p.note}</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {data && chosen && <PayModal data={data} plan={chosen} months={months} onClose={() => setChosen(null)} onDone={() => { setChosen(null); reload(); }} />}
    </>
  );
}

function CurrentPlan({ data, onChanged }: { data: BillingInfo; onChanged: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const info = PLAN_INFO[data.effective];
  const expired = data.plan !== "FREE" && data.effective === "FREE";
  const inGrace = data.daysLeft !== null && data.daysLeft <= 0 && !expired;
  const overStaff = data.limits.employees !== null && data.usage.employees > data.limits.employees;

  const cancel = async () => {
    if (!data.pending) return;
    setBusy(true);
    try {
      await api(`/billing/payments/${data.pending.id}/cancel`, { method: "POST" });
      toast.success(tr("Пардохт бекор шуд"));
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="brand-gradient grid size-12 place-items-center rounded-2xl text-white">
            <Sparkles className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold tracking-wide text-muted uppercase">{tr("Тарифи ҳозира")}</div>
            <div className="font-display text-2xl font-extrabold text-ink">{tr(info.name)}</div>
          </div>
          {expired ? (
            <Badge tone="brand">{tr("Мӯҳлат тамом шуд")}</Badge>
          ) : data.effective === "FREE" ? (
            <Badge>{tr("Ройгон")}</Badge>
          ) : inGrace ? (
            <Badge tone="warn">{tr("Рӯзҳои имтиёзӣ")}</Badge>
          ) : (
            <Badge tone="good">{tr("Фаъол")}</Badge>
          )}
        </div>
        {data.effective !== "FREE" && (
          <p className="mt-3 text-sm text-ink-2">
            {data.planUntil
              ? tr("То {0} · {1} рӯз монд", formatDate(data.planUntil), Math.max(data.daysLeft ?? 0, 0))
              : tr("Бемӯҳлат")}
          </p>
        )}
        {inGrace && <p className="mt-2 text-sm font-medium text-warn">{tr("Мӯҳлат тамом шуд, вале {0} рӯз ҳама чиз кор мекунад. Пардохтро дар ин муддат кунед.", PLAN_GRACE_DAYS)}</p>}
        {expired && <p className="mt-2 text-sm font-medium text-brand">{tr("Тарифи «{0}» тамом шуд — ҳоло маҳдудияти ройгон амал мекунад. Маълумот нигоҳ дошта шудааст; пас аз пардохт ҳама чиз фавран кушода мешавад.", tr(PLAN_INFO[data.plan].name))}</p>}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Usage icon={Building2} label={tr("Филиалҳо")} used={data.usage.branches} limit={data.limits.branches} />
          <Usage icon={Users} label={tr("Кормандон")} used={data.usage.employees} limit={data.limits.employees} />
        </div>
        {overStaff && (
          <p className="mt-4 rounded-xl bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
            {tr("{0} корманди охир иловашуда то пардохт ворид шуда наметавонанд. Тарифро дароз кунед — онҳо фавран кушода мешаванд.", data.usage.employees - (data.limits.employees ?? 0))}
          </p>
        )}
      </Card>

      {data.pending ? (
        <Card className="ring-2 ring-warn/40">
          <div className="flex items-center gap-2 text-sm font-bold text-warn">
            <Clock className="size-5" /> {tr("Пардохт санҷида мешавад")}
          </div>
          <div className="mt-3 font-display text-3xl font-extrabold text-ink">{tr("{0} сомонӣ", data.pending.amount)}</div>
          <p className="mt-1 text-sm text-ink-2">
            {tr(PLAN_INFO[data.pending.plan].name)} · {tr("{0} моҳ", data.pending.months)} · {formatDate(data.pending.createdAt, true)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {tr("Чек / рақам")}: {data.pending.reference}
          </p>
          <p className="mt-3 text-sm text-ink-2">{tr("Вақте ки пул ба ҳисоб расид, тариф худ кушода мешавад ва ба шумо хабар меояд.")}</p>
          <Button variant="ghost" size="sm" className="mt-3" loading={busy} onClick={cancel}>
            {tr("Бекор кардан")}
          </Button>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <ShieldCheck className="size-5 text-good" /> {tr("Чӣ тавр пардохт кунам?")}
          </div>
          <ol className="mt-3 space-y-2 text-sm text-ink-2">
            <li>1. {tr("Тариф ва мӯҳлатро интихоб кунед.")}</li>
            <li>2. {tr("Маблағро ба рақами {0} гузаронед (DC, Alif Mobi ё Alif Visa).", data.card.phone || data.card.number)}</li>
            <li>3. {tr("Рақами чек ё 4 рақами охири корти худро нависед ва «Ман пул фиристодам»-ро пахш кунед.")}</li>
            <li>4. {tr("Пас аз санҷиш тариф кушода мешавад ва ба Telegram/WhatsApp хабар меояд.")}</li>
          </ol>
        </Card>
      )}
    </div>
  );
}

function Usage({ icon: Icon, label, used, limit }: { icon: React.ComponentType<{ className?: string }>; label: string; used: number; limit: number | null }) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const full = limit !== null && used >= limit;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold text-ink">
          <Icon className="size-4 text-muted" /> {label}
        </span>
        <span className={cn("font-bold", full ? "text-brand" : "text-ink")}>
          {used} / {limit === null ? "∞" : limit}
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full transition-all", full ? "bg-brand" : "bg-good")} style={{ width: limit === null ? "8%" : `${pct}%` }} />
      </div>
      {full && <p className="mt-1 text-xs text-brand">{tr("Ҳад пур шуд — барои иловаи нав тарифро калон кунед")}</p>}
    </div>
  );
}

function PlanCard({ plan, months, current, onChoose, disabled }: { plan: Exclude<Plan, "FREE">; months: BillingPeriod; current: boolean; onChoose: () => void; disabled: boolean }) {
  const info = PLAN_INFO[plan];
  const total = planPrice(plan, months);
  const full = info.price * months;
  return (
    <div className={cn("relative flex flex-col rounded-2xl border-[1.5px] bg-surface p-5 transition", info.popular ? "border-brand shadow-lg" : "border-line", current && "ring-2 ring-good/50")}>
      {info.popular && <span className="brand-gradient absolute -top-3 left-5 rounded-full px-3 py-0.5 text-xs font-bold text-white">{tr("Бештар интихоб мекунанд")}</span>}
      <div className="font-display text-xl font-extrabold text-ink">{tr(info.name)}</div>
      <div className="text-sm text-muted">{tr(info.tagline)}</div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-3xl font-extrabold text-ink">{info.price}</span>
        <span className="text-sm text-muted">{tr("сомонӣ / моҳ")}</span>
      </div>
      <div className="mt-1 min-h-5 text-xs text-ink-2">
        {months > 1 && (
          <>
            {tr("{0} моҳ: {1} сомонӣ", months, total)} <s className="text-muted">{full}</s>
          </>
        )}
      </div>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-2">
        <li className="flex items-center gap-2">
          <Building2 className="size-4 text-muted" /> {info.branches === null ? tr("Филиалҳо бемаҳдуд") : tr("то {0} филиал", info.branches)}
        </li>
        <li className="flex items-center gap-2">
          <Users className="size-4 text-muted" /> {info.employees === null ? tr("Кормандон бемаҳдуд") : tr("то {0} корманд", info.employees)}
        </li>
      </ul>
      <Button className="mt-5 w-full" variant={info.popular ? "primary" : "outline"} onClick={onChoose} disabled={disabled}>
        {current ? tr("Дароз кардан") : tr("Интихоб")}
      </Button>
    </div>
  );
}

function PayModal({ data, plan, months, onClose, onDone }: { data: BillingInfo; plan: Exclude<Plan, "FREE">; months: BillingPeriod; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = planPrice(plan, months);
  const switching = data.effective !== "FREE" && data.effective !== plan && (data.daysLeft ?? 0) > 0;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text.replace(/\s/g, ""));
      toast.success(tr("Нусха гирифта шуд"));
    } catch {
      toast.error(tr("Нусха гирифта нашуд — дастӣ нависед"));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/billing/payments", { method: "POST", json: { plan, months, reference } });
      toast.success(tr("Ташаккур! Пардохт санҷида мешавад"));
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={tr("Тарифи «{0}» — {1} моҳ", tr(PLAN_INFO[plan].name), months)}>
      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-2xl bg-surface-2 p-4 text-center">
          <div className="text-sm text-muted">{tr("Ба ин рақам гузаронед")}</div>
          <div className="mt-1 font-display text-4xl font-extrabold text-ink">{tr("{0} сомонӣ", amount)}</div>
        </div>

        {[data.card.phone && { label: tr("Рақами телефон (DC, Alif)"), value: data.card.phone }, data.card.number && { label: tr("Рақами корт"), value: data.card.number }]
          .filter((x): x is { label: string; value: string } => !!x)
          .map((x) => (
            <div key={x.label} className="flex items-center gap-3 rounded-2xl border border-line p-4">
              <CreditCard className="size-6 shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted">{x.label}</div>
                <div className="font-mono text-lg font-bold tracking-wide text-ink">{x.value}</div>
                {data.card.holder && <div className="text-xs text-ink-2">{data.card.holder}</div>}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => copy(x.value)} aria-label={tr("Нусха")}>
                <Copy className="size-4" />
              </Button>
            </div>
          ))}
        {(data.card.bank || data.card.note) && (
          <p className="text-sm text-ink-2">
            {data.card.bank && <b>{data.card.bank}. </b>}
            {data.card.note}
          </p>
        )}
        {switching && <p className="rounded-xl bg-good-soft px-4 py-3 text-sm text-good">{tr("Рӯзҳои боқимондаи тарифи ҳозира гум намешаванд — онҳо ба тарифи нав илова мешаванд.")}</p>}

        <Field label={tr("Рақами чек ё 4 рақами охири корт / телефони шумо")} hint={tr("То мо пули шуморо зуд ёбем")}>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={tr("масалан: 4821 ё чек №123456")} required minLength={3} maxLength={120} />
        </Field>
        <ErrorBox message={error} />
        <Button type="submit" className="w-full" loading={busy}>
          {tr("Ман пул фиристодам")}
        </Button>
        <p className="text-center text-xs text-muted">{tr("Тариф пас аз санҷиши пардохт кушода мешавад (одатан дар давоми рӯз).")}</p>
      </form>
    </Modal>
  );
}

function Faq() {
  const items: [string, string][] = [
    ["Агар пардохт накунам, чӣ мешавад?", "Ҳеҷ чиз нест намешавад. Бизнес ба тарифи ройгон мегузарад: филиал ва корманди нав илова карда намешавад, кормандони зиёдатӣ то пардохт ворид шуда наметавонанд."],
    ["Пеш аз тамом шудан хабар медиҳед?", "Ҳа: 3 рӯз ва 1 рӯз пеш ба Telegram ва WhatsApp хабар меояд. Пас аз мӯҳлат боз 3 рӯз ҳама чиз кор мекунад."],
    ["Тарифро иваз карда метавонам?", "Ҳар вақт. Пули рӯзҳои боқимонда гум намешавад — ба тарифи нав табдил дода мешавад."],
  ];
  return (
    <Card>
      <CardTitle>{tr("Саволҳо")}</CardTitle>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map(([q, a]) => (
          <div key={q}>
            <div className="font-semibold text-ink">{tr(q)}</div>
            <p className="mt-1 text-sm text-ink-2">{tr(a)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
