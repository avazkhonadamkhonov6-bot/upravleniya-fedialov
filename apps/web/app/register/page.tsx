"use client";

import { BUSINESS_TYPE_LABELS, BUSINESS_TYPES, type BusinessType } from "@filialhub/shared";
import { ArrowLeft, ArrowRight, Crown, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LangSwitcher } from "@/components/lang-switcher";
import { BrandMark } from "@/components/brand-mark";
import { Logo } from "@/components/shell";
import { Button, ErrorBox, Field, Input, cn } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { tr } from "@/lib/i18n";
import { BusinessIcon } from "@/components/glyph";

type Role = "chef" | "client";

/** Ранги ҳар навъи бизнес (аз дизайн) */
const TYPE_DOT: Record<BusinessType, string> = {
  RESTAURANT: "#DC3B1C",
  GROCERY: "#1E7A45",
  CLOTHING: "#16120F",
  PLUMBING: "#1F5FAD",
  ELECTRONICS: "#2B2F5C",
  PHARMACY: "#2BA597",
  BUILDING: "#E0A500",
  OTHER: "#FF7A1A",
};

/**
 * Сабти ном бо ду нақш:
 * — Шеф (соҳиби бизнес): ширкат (ном + навъи кор) ва ҳисоби шеф; кормандонро баъд худи шеф илова мекунад.
 * — Мизоҷ: аз мағозаҳо фармоиш медиҳад.
 */
export default function RegisterPage() {
  return (
    <Suspense>
      <Register />
    </Suspense>
  );
}

function Register() {
  const { register, registerClient, user, client } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<Role>(useSearchParams().get("as") === "client" ? "client" : "chef");
  const [type, setType] = useState<BusinessType | null>(null);
  const [f, setF] = useState({ businessName: "", fullName: "", email: "", phone: "", address: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Саҳифа пинҳон нигоҳ дошта мешавад — ҳангоми баромадан ҳолати «интизорӣ» ва паролро тоза мекунем.
  useEffect(
    () => () => {
      setBusy(false);
      setF((x) => ({ ...x, password: "" }));
    },
    [],
  );

  useEffect(() => {
    if (busy) return;
    if (user) router.replace("/branches");
    else if (client) router.replace("/shop");
  }, [user, client, busy, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (role === "chef" && !type) return setError(tr("Навъи корро интихоб кунед"));
    setBusy(true);
    setError(null);
    try {
      if (role === "chef") {
        await register({ businessName: f.businessName, businessType: type!, fullName: f.fullName, email: f.email, phone: f.phone, password: f.password });
        // Бизнеси нав интизори тасдиқи супер-админ аст — AppShell экрани интизориро нишон медиҳад.
        router.replace("/branches?welcome=1");
      } else {
        await registerClient({ fullName: f.fullName, email: f.email, phone: f.phone, address: f.address, password: f.password });
        router.replace("/shop");
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.2fr]">
      {/* Қисми сурх (дизайни FilialHub) */}
      <aside className="relative hidden overflow-hidden bg-[#dc3b1c] px-12 py-10 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:gap-10">
        <Link href="/" className="relative flex items-center gap-2.5" aria-label="FilialHub">
          <BrandMark dark className="size-9" />
          <span className="font-display text-xl font-bold">FilialHub</span>
        </Link>
        <div className="pointer-events-none absolute -right-20 -bottom-20 size-[360px] rounded-full bg-[#ff7a1a]" aria-hidden />
        <div className="float-y pointer-events-none absolute top-[110px] right-[56px] size-[90px] rounded-full bg-[#ffc531]" aria-hidden />
        <div className="relative flex max-w-[520px] flex-col gap-5">
          <h2 className="reveal-up font-display text-[clamp(40px,4.6vw,72px)] leading-[1.02] font-extrabold tracking-[-0.035em] uppercase">{tr("Хуш омадед ба кор.")}</h2>
          <p className="reveal-up text-lg leading-relaxed text-[#ffe6da]" style={{ animationDelay: "0.15s" }}>
            {tr("Бизнеси худро созед. Филиалҳо, кормандон ва касса баъдтар ҳам илова мешаванд.")}
          </p>
        </div>
        <div className="relative flex flex-wrap gap-2.5">
          {[tr("Тоҷикӣ · Русӣ · English"), tr("Равшан ва тира")].map((t) => (
            <span key={t} className="rounded-full bg-[#16120f]/20 px-3.5 py-2.5 text-sm font-semibold">
              {t}
            </span>
          ))}
        </div>
      </aside>
    <div className="relative flex justify-center overflow-hidden p-4 sm:p-12">
      <LangSwitcher className="absolute top-4 right-4 z-10" />
      <div className="relative w-full max-w-2xl pt-10 sm:pt-0">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Logo />
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> {tr("Даромадан")}
          </Link>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{tr("Сабти ном")}</h1>
        <p className="mt-2 text-muted">{tr("Шумо кистед?")}</p>

        <div className="mt-5 grid grid-cols-2 gap-3" role="tablist">
          {(
            [
              { value: "chef", icon: Crown, title: tr("Шеф"), text: tr("Соҳиби бизнес: филиалҳо, кормандон, маҳсулот") },
              { value: "client", icon: ShoppingCart, title: tr("Мизоҷ"), text: tr("Аз мағозаҳо ва тарабхонаҳо фармоиш медиҳам") },
            ] as const
          ).map((r) => (
            <button
              key={r.value}
              data-tilt="10"
              type="button"
              role="tab"
              aria-selected={role === r.value}
              onClick={() => {
                setRole(r.value);
                setError(null);
              }}
              className={cn(
                "card flex cursor-pointer flex-col items-start gap-2 p-4 text-left",
                role === r.value && "border-brand ring-4 ring-brand/15",
              )}
            >
              <span className={cn("grid size-10 place-items-center rounded-xl", role === r.value ? "brand-gradient text-white" : "bg-surface-2 text-ink-2")}>
                <r.icon className="size-5" />
              </span>
              <span className="font-semibold text-ink">{r.title}</span>
              <span className="text-xs text-muted sm:text-sm">{r.text}</span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-8 space-y-6">
          {role === "chef" && (
            <div>
              <div className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{tr("Бизнеси шумо чист?")}</div>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    aria-pressed={type === t}
                    className={cn(
                      "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3.5 text-sm font-semibold transition",
                      type === t ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink hover:border-ink-2/40",
                    )}
                  >
                    <span className="size-2.5 rounded-full" style={{ background: TYPE_DOT[t] }} aria-hidden />
                    <BusinessIcon type={t} className="size-4" />
                    {tr(BUSINESS_TYPE_LABELS[t])}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {role === "chef" && (
              <Field label={tr("Номи бизнес")}>
                <Input required minLength={2} value={f.businessName} onChange={set("businessName")} placeholder={tr("Масалан: Мағозаи Баракат")} />
              </Field>
            )}
            <Field label={tr("Ному насаби шумо")}>
              <Input required minLength={3} value={f.fullName} onChange={set("fullName")} autoComplete="name" />
            </Field>
            <Field label={tr("Почтаи электронӣ")}>
              <Input type="email" required value={f.email} onChange={set("email")} autoComplete="email" />
            </Field>
            <Field label={tr("Телефон")}>
              <Input type="tel" required minLength={7} value={f.phone} onChange={set("phone")} placeholder="+992 …" autoComplete="tel" />
            </Field>
            {role === "client" && (
              <Field label={tr("Суроғаи расонидан")}>
                <Input value={f.address} onChange={set("address")} placeholder={tr("Шаҳр, кӯча, хона")} autoComplete="street-address" />
              </Field>
            )}
            <Field label={tr("Парол")} hint={tr("Камаш 6 аломат")}>
              <Input type="password" required minLength={6} value={f.password} onChange={set("password")} autoComplete="new-password" />
            </Field>
          </div>

          <ErrorBox message={error} />
          <Button type="submit" loading={busy} className="group w-full sm:w-auto">
            {role === "chef" ? tr("Бизнесро сохтан") : tr("Сабти ном ва харид")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <p className="text-xs text-muted">
            {role === "chef"
              ? `${tr("Шумо соҳиби бизнес (шеф) мешавед. Кормандонро ба филиалҳо танҳо шумо илова мекунед. Маълумоти бизнеси шуморо ҳеҷ кас аз бизнесҳои дигар намебинад.")} ${tr("Бизнес пас аз тасдиқи супер-админ кушода мешавад — хабар ба WhatsApp ва Telegram меояд.")}`
              : tr("Пас аз сабти ном мағозаҳоро интихоб карда, фармоиш медиҳед ва ҳолати онро мебинед.")}
          </p>
        </form>
      </div>
    </div>
    </div>
  );
}
