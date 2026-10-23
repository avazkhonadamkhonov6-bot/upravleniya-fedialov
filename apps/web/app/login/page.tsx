"use client";

import { ArrowRight, Building2, ChefHat, Crown, Lock, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shell";
import { Button, ErrorBox, Field, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { LangSwitcher } from "@/components/lang-switcher";
import { tr } from "@/lib/i18n";

const DEMO = [
  { email: "chef@filialhub.tj", label: "Шеф", desc: "Ҳамаи филиалҳо", icon: Crown },
  { email: "manager1@filialhub.tj", label: "Менеҷер", desc: "Филиали Рӯдакӣ", icon: Building2 },
  { email: "waiter@filialhub.tj", label: "Официант", desc: "Фурӯш (POS)", icon: UserRound },
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function submit(e?: React.FormEvent, creds?: { email: string; password: string }) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(creds?.email ?? email, creds?.password ?? password);
      router.replace("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Hero */}
      <div className="relative hidden overflow-hidden bg-[#170d0f] p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -top-40 -left-40 size-[560px] rounded-full bg-[#e4002b] opacity-40 blur-[120px]" />
        <div className="absolute -right-24 -bottom-32 size-[420px] rounded-full bg-[#ff5a36] opacity-25 blur-[120px]" />
        <div className="relative">
          <Logo light />
        </div>
        <div className="relative mt-auto max-w-lg">
          <h1 className="text-5xl leading-[1.05] font-extrabold tracking-tight">
            {tr("Ҳамаи филиалҳо")}
            <br />
            <span className="bg-gradient-to-r from-[#ff5a6e] to-[#ffb36b] bg-clip-text text-transparent">{tr("дар як ҷо.")}</span>
          </h1>
          <p className="mt-5 text-lg text-white/60">
            {tr("Фурӯш, фоида ва кормандони ҳар филиал — рӯзона, ҳафтаина ва моҳона. Ҳисобот мустақим ба Telegram ва WhatsApp.")}
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              ["👑", tr("Шеф"), tr("ҳамаро мебинад")],
              ["🧑‍💼", tr("Менеҷер"), tr("филиали худ")],
              ["👨‍🍳", tr("Кормандон"), tr("ошпаз · официант · фаррош")],
            ].map(([e, t, d]) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="text-2xl">{e}</div>
                <div className="mt-2 text-sm font-semibold">{t}</div>
                <div className="text-xs text-white/50">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="relative flex items-center justify-center p-6 sm:p-12">
        <LangSwitcher className="absolute top-4 right-4 z-10" />
        <div className="rise w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-ink">{tr("Хуш омадед 👋")}</h2>
          <p className="mt-2 text-muted">{tr("Барои идома ба ҳисоби худ ворид шавед")}</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label={tr("Почтаи электронӣ")}>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@filialhub.tj" className="pl-10" autoComplete="email" />
              </div>
            </Field>
            <Field label={tr("Парол")}>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10" autoComplete="current-password" />
              </div>
            </Field>
            <ErrorBox message={error} />
            <Button type="submit" loading={busy} className="w-full">
              {tr("Ворид шудан")}{" "}<ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-10">
            <div className="mb-3 flex items-center gap-3 text-xs font-semibold tracking-wide text-muted uppercase">
              <span className="h-px flex-1 bg-line" /> {tr("Вуруди зуди демо")}{" "}<span className="h-px flex-1 bg-line" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  disabled={busy}
                  onClick={() => submit(undefined, { email: d.email, password: "demo1234" })}
                  className="group card flex cursor-pointer items-center gap-3 p-3 text-left transition hover:-translate-y-0.5 hover:border-brand/40 sm:flex-col sm:items-start"
                >
                  <div className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
                    <d.icon className="size-4" />
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
    </div>
  );
}
