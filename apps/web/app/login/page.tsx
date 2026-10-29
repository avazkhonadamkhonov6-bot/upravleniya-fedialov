"use client";

import { homePath } from "@filialhub/shared";
import { ArrowRight, Banknote, Brush, Building2, ChefHat, Crown, Loader2, Lock, Mail, Shirt, ShoppingBag, ShoppingCart, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { Logo } from "@/components/shell";
import { Button, ErrorBox, Field, Input, cn } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { LangSwitcher } from "@/components/lang-switcher";
import { tr } from "@/lib/i18n";
import { Glyph } from "@/components/glyph";

const DEMO = [
  { email: "chef@filialhub.tj", label: "Шеф", desc: "Ҳамаи филиалҳо", icon: Crown },
  { email: "manager1@filialhub.tj", label: "Менеҷер", desc: "Филиали Рӯдакӣ", icon: Building2 },
  { email: "cashier@filialhub.tj", label: "Кассир", desc: "Касса ва фурӯш", icon: Banknote },
  { email: "waiter@filialhub.tj", label: "Официант", desc: "Меню", icon: UserRound },
  { email: "cook@filialhub.tj", label: "Ошпаз", desc: "Профил ва маош", icon: ChefHat },
  { email: "cleaner@filialhub.tj", label: "Фаррош", desc: "Профил ва маош", icon: Brush },
  { email: "shop@filialhub.tj", label: "Мағозаи либос", desc: "Ширкати дигар", icon: Shirt },
  { email: "seller@filialhub.tj", label: "Фурӯшанда", desc: "Мағозаи либос", icon: ShoppingBag },
  { email: "grocery@filialhub.tj", label: "Хӯрокворӣ", desc: "Фармоишҳои онлайн", icon: Store },
  { email: "client@filialhub.tj", label: "Мизоҷ", desc: "Харид аз мағозаҳо", icon: ShoppingCart },
];


const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function LoginPage() {
  const { login, user, client } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<{ name: string; x: number; y: number } | null>(null);
  // Ҳангоми аниматсияи «Хуш омадед» худкор нагузарем — гузаришро худи аниматсия мекунад.
  const welcoming = useRef(false);

  // Next.js саҳифаи пештар дидашударо пинҳон нигоҳ медорад (state боқӣ мемонад). Ҳангоми баромадан аз саҳифа
  // экрани «Хуш омадед»-ро тоза мекунем — вагарна пас аз «Баромад» ҳамон экран боз намоён мешавад.
  useEffect(
    () => () => {
      welcoming.current = false;
      setWelcome(null);
      setBusy(null);
      setPassword("");
    },
    [],
  );

  useEffect(() => {
    if (welcoming.current) return;
    if (user) router.replace(homePath(user));
    else if (client) router.replace("/shop");
  }, [user, client, router]);

  async function submit(e: React.FormEvent | React.MouseEvent | undefined, creds?: { email: string; password: string }) {
    e?.preventDefault();
    // Доираи муваффақият аз ҷои пахш паҳн мешавад
    const target = (e?.nativeEvent as SubmitEvent | undefined)?.submitter ?? (e?.currentTarget as HTMLElement | undefined);
    const rect = target?.getBoundingClientRect?.();
    setBusy(creds?.email ?? "form");
    setError(null);
    welcoming.current = true;
    try {
      const acc = await login(creds?.email ?? email, creds?.password ?? password);
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      const who = acc.kind === "staff" ? acc.user : acc.client;
      setWelcome({ name: who.fullName.split(" ")[0], x, y });
      setTimeout(() => router.replace(acc.kind === "staff" ? homePath(acc.user) : "/shop"), reducedMotion() ? 0 : 1100);
    } catch (err) {
      welcoming.current = false;
      setError((err as Error).message);
      setShake(true);
      setBusy(null);
    }
  }

  const [hello, wave] = splitWave(tr("Хуш омадед 👋"));

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Қисми сурх (дизайни FilialHub): доираҳои норанҷӣ ва зард, сарлавҳаи калон */}
      <div className="relative hidden overflow-hidden bg-[#dc3b1c] px-12 py-10 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:gap-10">
        <Link href="/" className="reveal-up relative flex items-center gap-2.5" aria-label="FilialHub">
          <BrandMark dark className="size-9" />
          <span className="font-display text-xl font-bold">FilialHub</span>
        </Link>
        <div className="pointer-events-none absolute -right-20 -bottom-20 size-[360px] rounded-full bg-[#ff7a1a]" aria-hidden />
        <div className="float-y pointer-events-none absolute top-[110px] right-[56px] size-[90px] rounded-full bg-[#ffc531]" aria-hidden />
        <div className="relative flex max-w-[520px] flex-col gap-5">
          <h1 className="font-display text-[clamp(40px,4.4vw,62px)] leading-[1.08] font-extrabold tracking-[-0.03em]">
            <span className="reveal-up block" style={{ animationDelay: "0.1s" }}>
              {tr("Ҳамаи филиалҳо")}
            </span>
            <span className="reveal-up block text-[#16120f]" style={{ animationDelay: "0.25s" }}>
              {tr("дар як ҷо.")}
            </span>
          </h1>
          <p className="reveal-up text-lg leading-relaxed text-[#ffe6da]" style={{ animationDelay: "0.4s" }}>
            {tr("Фурӯш, фоида ва кормандони ҳар филиал — рӯзона, ҳафтаина ва моҳона. Ҳисобот мустақим ба Telegram ва WhatsApp.")}
          </p>
        </div>
        <div className="relative flex flex-wrap gap-2.5">
          {[tr("Тоҷикӣ · Русӣ · English"), tr("Равшан ва тира"), "Telegram · WhatsApp"].map((t) => (
            <span key={t} className="rounded-full bg-[#16120f]/20 px-3.5 py-2.5 text-sm font-semibold">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="relative flex items-center justify-center overflow-hidden p-6 sm:p-12">
        {/* Дар телефон қисми сурх нест — ду доираи хурд дар кунҷ */}
        <div className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-[#ff7a1a] opacity-90 lg:hidden" aria-hidden />
        <div className="pointer-events-none absolute top-16 right-20 size-10 rounded-full bg-[#ffc531] lg:hidden" aria-hidden />
        <LangSwitcher className="absolute top-4 right-4 z-10" />
        <div className="login-stagger relative w-full max-w-md pt-12 sm:pt-6">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          {/* Ворид шудан / Бизнеси нав — мисли ҷадвалаки дизайн */}
          <div role="tablist" aria-label={tr("Интихоб")} className="mb-8 grid grid-cols-2 rounded-2xl bg-surface-2 p-[5px]">
            <span role="tab" aria-selected className="grid h-12 place-items-center rounded-xl bg-surface text-[15px] font-bold text-ink shadow-[0_4px_12px_-4px_rgba(60,30,10,0.25)]">
              {tr("Ворид шудан")}
            </span>
            <Link role="tab" aria-selected={false} href="/register" className="grid h-12 place-items-center rounded-xl text-[15px] font-bold text-muted transition hover:text-ink">
              {tr("Бизнеси нав")}
            </Link>
          </div>
          <div>
            <h2 className="font-display text-[28px] font-bold tracking-tight text-ink">
              {hello}
              {wave && <span className="wave inline-block align-middle text-brand"><Glyph e={wave} className="size-8" /></span>}
            </h2>
            <p className="mt-2 text-muted">{tr("Барои идома ба ҳисоби худ ворид шавед")}</p>
          </div>

          <form onSubmit={submit} className="mt-8">
            <div className={cn("space-y-4", shake && "shake")} onAnimationEnd={(e) => e.target === e.currentTarget && setShake(false)}>
              <Field label={tr("Почтаи электронӣ")}>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted transition group-focus-within:scale-110 group-focus-within:text-brand" />
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@filialhub.tj" className="pl-10" autoComplete="email" />
                </div>
              </Field>
              <Field label={tr("Парол")}>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted transition group-focus-within:scale-110 group-focus-within:text-brand" />
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10" autoComplete="current-password" />
                </div>
              </Field>
              <ErrorBox message={error} />
              <Button type="submit" loading={busy === "form"} disabled={!!busy} className="group w-full">
                {tr("Ворид шудан")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </form>
          <p className="mt-4 text-center text-sm text-muted">
            {tr("Ҳисоб надоред?")}{" "}
            <Link href="/register" className="font-semibold text-brand hover:underline">
              {tr("Ширкати худро созед — ройгон")}
            </Link>
          </p>

          <div className="mt-10">
            <div className="mb-3 flex items-center gap-3 text-xs font-semibold tracking-wide text-muted uppercase">
              <span className="h-px flex-1 bg-line" /> {tr("Вуруди зуди демо")}{" "}<span className="h-px flex-1 bg-line" />
            </div>
            <div className="stagger grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  disabled={!!busy}
                  onClick={(e) => submit(e, { email: d.email, password: "demo1234" })}
                  className={cn(
                    "group card flex cursor-pointer items-center gap-3 p-3 text-left transition duration-200 hover:-translate-y-1 hover:border-brand/40 hover: disabled:cursor-wait sm:flex-col sm:items-start",
                    busy === d.email && "border-brand/50",
                  )}
                >
                  <div className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand transition duration-300 group-hover:scale-110 group-hover:-rotate-6 group-hover:bg-brand group-hover:text-white">
                    {busy === d.email ? <Loader2 className="size-4 animate-spin" /> : <d.icon className="size-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">{tr(d.label)}</div>
                    <div className="text-xs text-muted">{tr(d.desc)}</div>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
              <ChefHat className="size-3.5" /> {tr("Пароли ҳамаи ҳисобҳои демо:")}{" "}<code className="font-semibold text-ink-2">demo1234</code>
            </p>
          </div>
        </div>
      </div>

      {/* Воридшавии бомуваффақият */}
      {welcome && (
        <div
          className="success-circle brand-gradient fixed inset-0 z-[70] grid place-items-center text-white"
          style={{ "--x": `${welcome.x}px`, "--y": `${welcome.y}px` } as React.CSSProperties}
          role="status"
        >
          <div className="text-center">
            <div className="ring-pop mx-auto grid size-24 place-items-center rounded-full bg-white/15 ring-8 ring-white/10 backdrop-blur">
              <svg viewBox="0 0 24 24" className="size-12" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path className="check-draw" d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
            <div className="reveal-up mt-6 text-3xl font-extrabold tracking-tight" style={{ animationDelay: "0.5s" }}>
              {hello.trim()}, {welcome.name}!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** «Хуш омадед 👋» → ["Хуш омадед ", "👋"], то даст алоҳида ҷунбад */
function splitWave(s: string): [string, string] {
  const i = s.indexOf("👋");
  return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i)];
}
