import {
  ArrowRight,
  BarChart3,
  BrickWall,
  Building2,
  CalendarClock,
  ChefHat,
  Coffee,
  Crown,
  Droplets,
  HeartHandshake,
  MessagesSquare,
  Pill,
  Rocket,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Store,
  UserRound,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthRedirect } from "@/components/auth-redirect";
import { HeroFX } from "@/components/hero-fx";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Саҳифаи ҷамъиятӣ — Server Component: HTML-и тайёр барои Google; эффектҳои курсор дар HeroFX (client).
export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — CRM, филиалҳо ва бозори онлайн` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: BarChart3, title: "Фурӯш ва фоида", text: "Рӯзона, ҳафтаина ва моҳона барои ҳар филиал: фурӯш, арзиши аслӣ, хароҷот ва фоидаи соф." },
  { icon: Building2, title: "Ҳамаи филиалҳо", text: "Рейтинги филиалҳо, кормандон аз рӯи вазифа ва менеҷери ҳар филиал дар як экран." },
  { icon: Wallet, title: "Касса (POS)", text: "Фурӯши зуд бо сабад, пардохти нақд ё корт, бонуси мизоҷ ва таърихи чекҳо." },
  { icon: HeartHandshake, title: "Мизоҷон ва бонус", text: "5% бонус аз ҳар харид, сегментҳо (VIP, доимӣ, нав), зодрӯзҳо." },
  { icon: CalendarClock, title: "Ҷадвал ва давомот", text: "Сменаҳо, омад/рафт, дер омадан ва вазифаҳо дар Kanban." },
  { icon: MessagesSquare, title: "Telegram ва WhatsApp", text: "Ҳисоботи рӯзона ба шеф ва менеҷерҳо, чат бо кормандон." },
];

/** Лентаи навъҳои бизнес (такрор — барои давомнокии беканор) */
const BUSINESSES: [LucideIcon, string][] = [
  [UtensilsCrossed, "Тарабхона"],
  [ShoppingBasket, "Хӯрокворӣ"],
  [Shirt, "Либос"],
  [Droplets, "Сантехника"],
  [Smartphone, "Техника"],
  [Pill, "Дорухона"],
  [BrickWall, "Маводи сохтмонӣ"],
  [Coffee, "Қаҳвахона"],
  [Store, "Мағоза"],
];

const STATS = [
  { value: "8", label: "навъи бизнес" },
  { value: "3", label: "забон" },
  { value: "24/7", label: "бозори онлайн" },
  { value: "100%", label: "ҷудоии маълумот" },
];

const ROLES: { icon: LucideIcon; role: string; sees: string }[] = [
  { icon: Crown, role: "Шеф", sees: "Ҳамаи филиалҳо, ҳамаи менеҷерҳо ва кормандон — илова, таҳрир ва нест кардан." },
  { icon: UserRound, role: "Менеҷер", sees: "Танҳо филиали худ: кормандон, фурӯш, мизоҷон, ҷадвал ва хароҷот." },
  { icon: Wallet, role: "Кассир ва фурӯшанда", sees: "Фурӯши нав ва сабад, фармоишҳои онлайн, таърихи фурӯш, профил." },
  { icon: UtensilsCrossed, role: "Официант", sees: "Меню ва нархҳо, профил." },
  { icon: ChefHat, role: "Ошпаз ва фаррош", sees: "Профил, маош ва рӯзи гирифтани он." },
  { icon: ShoppingBag, role: "Мизоҷ", sees: "Мағозаҳо, сабад, фармоишҳо ва профил — пардохт пас аз гирифтан." },
];

/** Плиткаҳои шинокунанда: [иконка, ҷой, андоза, чуқурии parallax, кунҷ, таъхир] */
const FLOATERS: [LucideIcon, string, string, string, string, string][] = [
  [UtensilsCrossed, "top-[20%] right-[12%]", "size-20", "3", "-10deg", "0s"],
  [ShoppingBasket, "top-[50%] right-[25%]", "size-16", "2", "8deg", "1.2s"],
  [Shirt, "top-[13%] right-[33%]", "size-14", "-1", "12deg", "2.1s"],
  [Droplets, "top-[64%] right-[7%]", "size-16", "-2", "-6deg", "0.6s"],
  [Pill, "top-[38%] right-[3%]", "size-12", "1", "14deg", "1.7s"],
  [Smartphone, "top-[72%] right-[38%]", "size-12", "3", "-12deg", "0.9s"],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: ["tg", "ru", "en"],
  offers: { "@type": "Offer", price: "0", priceCurrency: "TJS" },
};

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <AuthRedirect />

      <HeroFX className="relative overflow-hidden bg-[#0e080a] text-white">
        <div className="grid-pan pointer-events-none absolute inset-0 opacity-60" />
        <div className="blob-drift pointer-events-none absolute -top-40 -left-40 size-[560px] rounded-full bg-[#e4002b] opacity-40 blur-[120px]" />
        <div className="blob-drift-slow pointer-events-none absolute -right-24 -bottom-32 size-[460px] rounded-full bg-[#7c3aed] opacity-30 blur-[120px]" />
        <div className="blob-drift pointer-events-none absolute top-1/3 left-1/2 size-[300px] rounded-full bg-[#f59e0b] opacity-15 blur-[110px]" />

        {/* Плиткаҳои шишагӣ: шино мекунанд ва ба тарафи курсор мераванд */}
        <div className="pointer-events-none absolute inset-0 hidden select-none lg:block" aria-hidden>
          {FLOATERS.map(([Icon, pos, size, depth, r, delay], i) => (
            <div key={i} className={`absolute ${pos}`} data-parallax={depth}>
              <div className="float-y" style={{ "--r": r, animationDelay: delay } as React.CSSProperties}>
                <span className={`glass-tile ${size}`}>
                  <Icon className="size-1/2" strokeWidth={1.6} />
                </span>
              </div>
            </div>
          ))}
        </div>

        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label={SITE_NAME}>
            <span className="brand-gradient grid size-10 place-items-center rounded-2xl shadow-lg shadow-red-500/30 transition duration-500 hover:rotate-[-12deg]">
              <Store className="size-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">{SITE_NAME}</span>
          </Link>
          <Link href="/login" className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20">
            Даромадан
          </Link>
        </header>

        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-16 sm:pb-20">
          <p className="reveal-up mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/75 backdrop-blur">
            <span className="live-dot size-2 rounded-full bg-[#3ccf7f]" /> CRM ва бозори онлайн · Тоҷикистон
          </p>
          <h1 className="reveal-up max-w-3xl text-4xl leading-[1.02] font-extrabold tracking-tight sm:text-7xl" style={{ animationDelay: "80ms" }}>
            Бизнеси шумо — <span className="text-aurora">дар як ҷо.</span>
          </h1>
          <p className="reveal-up mt-6 max-w-2xl text-lg text-white/65" style={{ animationDelay: "160ms" }}>
            Тарабхона, мағозаи хӯрокворӣ, либос ё сантехника: филиалҳо, кормандон, фурӯш ва фоида — рӯзона, ҳафтаина ва моҳона. Мизоҷон бошанд аз
            бозори онлайн фармоиш медиҳанд ва пас аз гирифтан пардохт мекунанд.
          </p>
          <div className="reveal-up mt-9 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
            <Link
              href="/login"
              data-magnetic
              className="fx-btn brand-gradient inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold shadow-lg shadow-red-500/30"
            >
              Ворид шудан <ArrowRight className="size-4" />
            </Link>
            <Link href="/shop" data-magnetic className="fx-btn fx-shine inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-[#e4002b]">
              <ShoppingBag className="size-4" /> Харид аз мағозаҳо
            </Link>
            <Link href="/register" data-magnetic className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 font-semibold text-white/85 hover:bg-white/5">
              <Rocket className="size-4" /> Бизнеси худро созед
            </Link>
            <a href="#roles" className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-white/85 transition hover:bg-white/5">
              Кӣ чӣ мебинад?
            </a>
          </div>

          <dl className="reveal-up mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4" style={{ animationDelay: "320ms" }}>
            {STATS.map((x) => (
              <div key={x.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/10">
                <dt className="text-xs text-white/55">{x.label}</dt>
                <dd className="mt-1 text-2xl font-extrabold tracking-tight">{x.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Лентаи навъҳои бизнес */}
        <div className="relative overflow-hidden border-y border-white/10 bg-white/[0.03] py-4 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="marquee gap-3">
            {[...BUSINESSES, ...BUSINESSES].map(([Icon, name], i) => (
              <span
                key={i}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white/80"
              >
                <Icon className="size-4 text-[#ff8a96]" /> {name}
              </span>
            ))}
          </div>
        </div>
      </HeroFX>

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 data-reveal className="text-2xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Ҳама чиз барои <span className="text-aurora">кори шумо</span>
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <li key={f.title} data-reveal data-tilt="9" className="card p-6" style={{ "--reveal-delay": `${(i % 3) * 90}ms` } as React.CSSProperties}>
              <div data-depth className="brand-gradient grid size-14 place-items-center rounded-2xl text-white shadow-[0_14px_30px_-12px_var(--brand)]">
                <f.icon className="size-7" />
              </div>
              <h3 className="mt-4 font-semibold text-ink">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </li>
          ))}
        </ul>

        <h2 id="roles" data-reveal className="mt-24 scroll-mt-6 text-2xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Нақшҳо ва дастрасӣ
        </h2>
        <p className="mt-2 text-muted">Ҳуқуқҳо дар сервер санҷида мешаванд — на танҳо дар интерфейс.</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {ROLES.map((r, i) => (
            <li key={r.role} data-reveal className="card flex items-center gap-4 p-4" style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties}>
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
                <r.icon className="size-6" />
              </span>
              <div>
                <h3 className="font-semibold text-ink">{r.role}</h3>
                <p className="text-sm text-muted">{r.sees}</p>
              </div>
            </li>
          ))}
        </ul>

        <div
          data-reveal
          className="glow-border brand-gradient relative mt-24 flex flex-col items-start gap-4 overflow-hidden rounded-3xl p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10"
        >
          <Rocket className="pointer-events-none absolute -top-6 -right-4 size-40 opacity-15" aria-hidden />
          <div>
            <h2 className="text-2xl font-extrabold">Санҷед бо ҳисоби демо</h2>
            <p className="mt-1 text-white/80">Шеф, менеҷер, кассир, мағоза ё мизоҷ — парол: demo1234</p>
          </div>
          <Link href="/login" className="fx-btn fx-shine relative rounded-xl bg-white px-6 py-3 font-semibold text-[#e4002b] transition hover:-translate-y-0.5">
            Даромадан
          </Link>
        </div>
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        © {SITE_NAME} · Душанбе, Тоҷикистон
      </footer>
    </div>
  );
}
