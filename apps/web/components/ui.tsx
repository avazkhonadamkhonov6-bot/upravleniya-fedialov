"use client";

import { phoneDigits, telegramLink, whatsappLink } from "@filialhub/shared";
import { Loader2, Mail, Phone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatMoney, locale, tr } from "@/lib/i18n";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function money(n: number) {
  return formatMoney(n);
}

export function compactMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return tr("{0} млн", (n / 1_000_000).toFixed(1));
  if (Math.abs(n) >= 10_000) return tr("{0} ҳаз", Math.round(n / 1000));
  return Math.round(n).toLocaleString(locale());
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex gap-3">
        <span className="bar-grow brand-gradient mt-1 w-1.5 shrink-0 rounded-full sm:mt-1.5" aria-hidden />
        <div className="title-in">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="rise flex flex-wrap items-center gap-2" style={{ animationDelay: "120ms" }}>{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("card p-5", className)}>{children}</div>;
}

export function CardTitle({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        <span className="brand-gradient size-1.5 shrink-0 rounded-full" aria-hidden />
        {children}
      </h2>
      {extra}
    </div>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-4 text-sm",
        variant === "primary" &&
          "brand-gradient text-white shadow-[0_8px_20px_-8px_var(--brand)] hover:-translate-y-px hover:shadow-[0_14px_28px_-10px_var(--brand)] hover:brightness-110",
        variant === "outline" && "border border-line bg-surface text-ink hover:border-ink-2/25 hover:bg-surface-2",
        variant === "ghost" && "text-ink-2 hover:bg-surface-2",
        variant === "danger" && "bg-brand-soft text-brand hover:brightness-95",
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputCls =
  "h-11 rounded-xl border border-line bg-surface-2 px-3.5 text-sm text-ink outline-none transition placeholder:text-muted focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/10";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, widthOf(props.className), props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputCls, "cursor-pointer pr-8", widthOf(props.className), props.className)} />;
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "brand" | "good" | "warn" | "blue";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        tone === "neutral" && "bg-surface-2 text-ink-2 ring-1 ring-line",
        tone === "brand" && "bg-brand-soft text-brand",
        tone === "good" && "bg-good-soft text-good",
        tone === "warn" && "bg-warn-soft text-warn",
        tone === "blue" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        className,
      )}
    >
      {children}
    </span>
  );
}

const AVATAR_TONES = [
  "from-rose-500 to-orange-400",
  "from-violet-500 to-fuchsia-400",
  "from-sky-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-amber-500 to-yellow-400",
  "from-indigo-500 to-blue-400",
];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const tone = AVATAR_TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ring-2 ring-surface", tone)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

/** Тугмаҳои тамос (занг, WhatsApp, Telegram, почта). whatsapp / telegram — агар корманд худаш гузошта бошад; вагарна рақами телефон. */
export function ContactButtons({
  phone,
  email,
  name,
  whatsapp,
  telegram,
}: {
  phone: string;
  email?: string;
  name?: string;
  whatsapp?: string;
  telegram?: string;
}) {
  const greet = name ? tr("Салом, {0}!", name.split(" ")[0]) : undefined;
  const items = [
    { href: `tel:+${phoneDigits(phone)}`, label: tr("Занг задан"), icon: <Phone className="size-4" />, cls: "hover:text-ink" },
    {
      href: whatsappLink(whatsapp || phone, greet),
      label: "WhatsApp",
      icon: <WhatsAppIcon />,
      cls: "hover:text-[#1fa855]",
      external: true,
    },
    {
      href: telegramLink(telegram || phone),
      label: "Telegram",
      icon: <TelegramIcon />,
      cls: "hover:text-[#229ed9]",
      external: true,
    },
    ...(email ? [{ href: `mailto:${email}`, label: tr("Почта"), icon: <Mail className="size-4" />, cls: "hover:text-ink" }] : []),
  ];
  return (
    <div className="flex items-center gap-1">
      {items.map((i) => (
        <a
          key={i.label}
          href={i.href}
          title={i.label}
          aria-label={i.label}
          target={i.external ? "_blank" : undefined}
          rel={i.external ? "noopener noreferrer" : undefined}
          className={cn("grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2", i.cls)}
        >
          {i.icon}
        </a>
      ))}
    </div>
  );
}

export function WhatsAppIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.56.94.95-3.48-.22-.36A9.42 9.42 0 0 1 21.5 12.05a9.45 9.45 0 0 1-9.45 9.45M20.07 3.92A11.3 11.3 0 0 0 12.05.6 11.43 11.43 0 0 0 2.15 17.73L.53 23.6l6.01-1.58a11.4 11.4 0 0 0 5.5 1.4h.01A11.43 11.43 0 0 0 20.07 3.92" />
    </svg>
  );
}

export function TelegramIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.94 4.3 18.7 19.6c-.24 1.08-.88 1.35-1.78.84l-4.93-3.63-2.38 2.29c-.26.26-.48.48-.99.48l.35-5.02 9.14-8.26c.4-.35-.09-.55-.62-.2L6.2 13.2l-4.86-1.52c-1.06-.33-1.08-1.06.22-1.57L20.55 2.8c.88-.32 1.65.2 1.39 1.5" />
    </svg>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={cn(
          "modal-in max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-2xl sm:rounded-3xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="grid size-9 cursor-pointer place-items-center rounded-full text-muted hover:bg-surface-2" aria-label={tr("Пӯшидан")}>
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorBox({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return <div role="alert" className="rounded-xl bg-brand-soft px-4 py-3 text-sm font-medium text-brand">{message}</div>;
}

export function Empty({ icon, title, text }: { icon?: React.ReactNode; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="empty-float mb-3 text-4xl">{icon ?? "🍃"}</div>
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
    </div>
  );
}

/**
 * Рақам аз қимати пешина то қимати нав «медавад» (0,9 сония, суст шуда).
 * Агар корбар аниматсияро хомӯш карда бошад — фавран қимати охирин.
 */
export function CountUp({ value, format = money }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduce ? 0 : 900;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = duration ? Math.min((t - t0) / duration, 1) : 1;
      const eased = 1 - Math.pow(1 - p, 3);
      const n = start + (value - start) * eased;
      setShown(p < 1 ? Math.round(n) : value);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value]);
  return <>{format(shown)}</>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-xl bg-surface-2 p-1 ring-1 ring-line">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition",
            value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {tr(o.label)}
        </button>
      ))}
    </div>
  );
}

export function Delta({ now, prev }: { now: number; prev: number }) {
  if (!prev) return null;
  const pct = ((now - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span className={cn("text-xs font-semibold", up ? "text-good" : "text-brand")}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export function formatDate(iso: string, withTime = false) {
  const d = new Date(iso);
  return d.toLocaleString(locale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Агар ҳеҷ эни (w-…) дода нашуда бошад, майдон тамоми энро мегирад. */
function widthOf(className?: string) {
  return /(^|\s)([a-z]+:)?w-/.test(className ?? "") ? "" : "w-full";
}
