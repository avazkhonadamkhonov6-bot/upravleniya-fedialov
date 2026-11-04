"use client";

import { ArrowLeft, KeyRound, Lock, Mail, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LangSwitcher } from "@/components/lang-switcher";
import { Logo } from "@/components/shell";
import { useToast } from "@/components/toast";
import { Button, ErrorBox, Field, Input } from "@/components/ui";
import { api } from "@/lib/api";
import { tr } from "@/lib/i18n";

/**
 * Паролро фаромӯш кардед: 1) почта → код ба Telegram/WhatsApp; 2) код + пароли нав.
 * Ҷавоби сервер ҳамеша якхела аст — аз он фаҳмидан мумкин нест, ки почта дар система ҳаст ё не.
 */
export default function ForgotPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ message: string }>("/auth/forgot", { method: "POST", json: { email: email.trim() } });
      setInfo(r.message);
      setStep("code");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== repeat) {
      setError(tr("Паролҳо мувофиқ нестанд"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/auth/reset", { method: "POST", json: { email: email.trim(), code: code.trim(), password } });
      toast.success(tr("Парол иваз шуд"), tr("Акнун бо пароли нав ворид шавед"));
      router.replace("/login");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-6 sm:p-12">
      <Link
        href="/login"
        className="group absolute top-4 left-4 z-10 inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted transition hover:bg-surface-2 hover:text-ink"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> {tr("Ба воридшавӣ")}
      </Link>
      <LangSwitcher className="absolute top-4 right-4 z-10" />
      <div className="w-full max-w-md pt-12 sm:pt-0">
        <div className="mb-8">
          <Logo />
        </div>
        <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">{tr("Барқарор кардани парол")}</h1>
        <p className="mt-2 text-muted">
          {step === "email"
            ? tr("Почтаи худро нависед — коди 6-рақама ба Telegram ё WhatsApp-и шумо меояд.")
            : tr("Кодро аз Telegram ё WhatsApp нависед ва пароли нав гузоред.")}
        </p>

        {step === "email" ? (
          <form onSubmit={sendCode} className="mt-8 space-y-4">
            <Field label={tr("Почтаи электронӣ")}>
              <div className="group relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@filialhub.tj" className="pl-10" autoComplete="email" autoFocus />
              </div>
            </Field>
            <ErrorBox message={error} />
            <Button type="submit" loading={busy} disabled={busy} className="w-full">
              <Send className="size-4" /> {tr("Кодро фиристед")}
            </Button>
            <p className="text-xs leading-relaxed text-muted">
              {tr("Код танҳо ба Telegram-и пайвастшуда (Профил → «WhatsApp ва Telegram») ва ба WhatsApp-и рақами шумо меравад. Агар ҳеҷ кадом пайваст набошад — аз менеҷер ё шеф хоҳиш кунед, ки паролро дар «Кормандон» иваз кунад.")}
            </p>
          </form>
        ) : (
          <form onSubmit={reset} className="mt-8 space-y-4">
            {info && <p className="rounded-xl bg-good-soft px-4 py-3 text-sm text-good">{tr(info)}</p>}
            <Field label={tr("Код (6 рақам)")}>
              <div className="group relative">
                <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <Input
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="pl-10 tracking-[0.4em] tabular"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
            </Field>
            <Field label={tr("Пароли нав")} hint={tr("Камаш 8 аломат")}>
              <div className="group relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" autoComplete="new-password" />
              </div>
            </Field>
            <Field label={tr("Пароли навро такрор кунед")}>
              <div className="group relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
                <Input type="password" required minLength={8} value={repeat} onChange={(e) => setRepeat(e.target.value)} className="pl-10" autoComplete="new-password" />
              </div>
            </Field>
            <ErrorBox message={error} />
            <Button type="submit" loading={busy} disabled={busy || code.length !== 6} className="w-full">
              {tr("Паролро иваз кунед")}
            </Button>
            <button type="button" onClick={() => setStep("email")} className="w-full cursor-pointer text-center text-sm font-semibold text-brand hover:underline">
              {tr("Код наомад? Аз нав фиристед")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
