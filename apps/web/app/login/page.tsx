"use client";

import { homePath } from "@filialhub/shared";
import { ArrowRight, Banknote, Brush, Building2, ChefHat, Crown, Loader2, Lock, Mail, Shirt, ShoppingBag, ShoppingCart, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/shell";
import { Button, ErrorBox, Field, Input, cn } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { LangSwitcher } from "@/components/lang-switcher";
import { tr } from "@/lib/i18n";

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

/** Эмодзиҳои шинокунанда дар қисми тира: [эмодзи, мавқеъ, кунҷ, таъхир] */
const FLOATERS: [string, string, number, number][] = [
  ["🍗", "top-[18%] right-[14%] text-5xl", -12, 0],
  ["🍔", "top-[38%] right-[30%] text-4xl", 10, 1.2],
  ["🍟", "top-[12%] left-[42%] text-3xl", 8, 2.1],
  ["🥤", "top-[52%] right-[8%] text-4xl", -6, 0.6],
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
      {/* Hero */}
      <div className="relative hidden overflow-hidden bg-[#170d0f] p-12 text-white lg:flex lg:flex-col">
        <div className="grid-pan pointer-events-none absolute inset-0" />
        <div className="blob-drift absolute -top-40 -left-40 size-[560px] rounded-full bg-[#e4002b] opacity-40 blur-[120px]" />
        <div className="blob-drift-slow absolute -right-24 -bottom-32 size-[420px] rounded-full bg-[#ff5a36] opacity-25 blur-[120px]" />
        {FLOATERS.map(([emoji, pos, r, delay]) => (
          <div key={emoji} className={cn("pointer-events-none absolute select-none", pos)} aria-hidden>
            <div className="reveal-up" style={{ animationDelay: `${0.4 + delay / 3}s` }}>
              <div className="float-y drop-shadow-[0_12px_24px_rgba(228,0,43,0.35)]" style={{ "--r": `${r}deg`, animationDelay: `${delay}s` } as React.CSSProperties}>
                {emoji}
              </div>
            </div>
          </div>
        ))}
        <div className="reveal-up relative">
          <Logo light />
        </div>
        <div className="relative mt-auto max-w-lg">
          <h1 className="text-5xl leading-[1.05] font-extrabold tracking-tight">
            <span className="reveal-up block" style={{ animationDelay: "0.1s" }}>
              {tr("Ҳамаи филиалҳо")}
            </span>
            {/* Ду span: як унсур танҳо як animation дошта метавонад (пайдошавӣ + ҷило) */}
            <span className="reveal-up block" style={{ animationDelay: "0.25s" }}>
              <span className="text-shine bg-gradient-to-r from-[#ff5a6e] via-[#ffb36b] to-[#ff5a6e] bg-clip-text text-transparent">{tr("дар як ҷо.")}</span>
            </span>
          </h1>
          <p className="reveal-up mt-5 text-lg text-white/60" style={{ animationDelay: "0.4s" }}>
            {tr("Фурӯш, фоида ва кормандони ҳар филиал — рӯзона, ҳафтаина ва моҳона. Ҳисобот мустақим ба Telegram ва WhatsApp.")}
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              ["👑", tr("Шеф"), tr("ҳамаро мебинад")],
              ["🧑‍💼", tr("Менеҷер"), tr("филиали худ")],
              ["👨‍🍳", tr("Кормандон"), tr("ошпаз · официант · кассир · фаррош")],
            ].map(([e, t, d], i) => (
              <div
                key={t}
                className="reveal-up rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/10"
                style={{ animationDelay: `${0.55 + i * 0.1}s` }}
              >
                <div className="text-2xl">{e}</div>
                <div className="mt-2 text-sm font-semibold">{t}</div>
                <div className="text-xs text-white/50">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="relative flex items-center justify-center overflow-hidden p-6 sm:p-12">
        {/* Дар телефон қисми тира нест — доираҳои ранга дар паси форма */}
        <div className="blob-drift pointer-events-none absolute -top-32 -right-32 size-80 rounded-full bg-brand opacity-15 blur-3xl lg:hidden" />
        <div className="blob-drift-slow pointer-events-none absolute -bottom-32 -left-24 size-72 rounded-full bg-brand-2 opacity-15 blur-3xl lg:hidden" />
        <LangSwitcher className="absolute top-4 right-4 z-10" />
        <div className="login-stagger relative w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-ink">
              {hello}
              {wave && <span className="wave">{wave}</span>}
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
                    "group card flex cursor-pointer items-center gap-3 p-3 text-left transition duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_18px_40px_-18px_var(--brand)] disabled:cursor-wait sm:flex-col sm:items-start",
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
