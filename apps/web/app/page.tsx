import type { Metadata } from "next";
import Link from "next/link";
import { AuthRedirect } from "@/components/auth-redirect";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Саҳифаи ҷамъиятӣ — Server Component: HTML-и тайёр барои Google ва боркунии фаврӣ (бе JavaScript-и иловагӣ).
export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — CRM ва идоракунии филиалҳои тарабхона` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const FEATURES = [
  { icon: "📊", title: "Фурӯш ва фоида", text: "Рӯзона, ҳафтаина ва моҳона барои ҳар филиал: фурӯш, арзиши аслӣ, хароҷот ва фоидаи соф." },
  { icon: "🏪", title: "Ҳамаи филиалҳо", text: "Рейтинги филиалҳо, кормандон аз рӯи вазифа ва менеҷери ҳар филиал дар як экран." },
  { icon: "💵", title: "Касса (POS)", text: "Фурӯши зуд бо сабад, пардохти нақд ё корт, бонуси мизоҷ ва таърихи чекҳо." },
  { icon: "💛", title: "Мизоҷон ва бонус", text: "5% бонус аз ҳар харид, сегментҳо (VIP, доимӣ, нав), зодрӯзҳо." },
  { icon: "🗓️", title: "Ҷадвал ва давомот", text: "Сменаҳо, омад/рафт, дер омадан ва вазифаҳо дар Kanban." },
  { icon: "✉️", title: "Telegram ва WhatsApp", text: "Ҳисоботи рӯзона ба шеф ва менеҷерҳо, чат бо кормандон." },
];

const ROLES = [
  { icon: "👑", role: "Шеф", sees: "Ҳамаи филиалҳо, ҳамаи менеҷерҳо ва кормандон — илова, таҳрир ва нест кардан." },
  { icon: "🧑‍💼", role: "Менеҷер", sees: "Танҳо филиали худ: кормандон, фурӯш, мизоҷон, ҷадвал ва хароҷот." },
  { icon: "💵", role: "Кассир", sees: "Фурӯши нав ва сабад, таърихи фурӯш, профил." },
  { icon: "🍽️", role: "Официант", sees: "Меню ва нархҳо, профил." },
  { icon: "👨‍🍳", role: "Ошпаз ва фаррош", sees: "Профил, маош ва рӯзи гирифтани он." },
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

export default function Home() {
  return (
    <div className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <AuthRedirect />

      <section className="relative overflow-hidden bg-[#170d0f] text-white">
        <div className="pointer-events-none absolute -top-40 -left-40 size-[560px] rounded-full bg-[#e4002b] opacity-40 blur-[120px]" />
        <div className="pointer-events-none absolute -right-24 -bottom-32 size-[420px] rounded-full bg-[#ff5a36] opacity-25 blur-[120px]" />
        <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label={SITE_NAME}>
            <span className="brand-gradient grid size-10 place-items-center rounded-2xl text-xl shadow-lg shadow-red-500/30">🍗</span>
            <span className="text-lg font-extrabold tracking-tight">{SITE_NAME}</span>
          </Link>
          <Link href="/login" className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20">
            Даромадан
          </Link>
        </header>
        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-20 sm:px-6 sm:pt-16 sm:pb-28">
          <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70">
            CRM барои шабакаи тарабхонаҳо · Тоҷикистон
          </p>
          <h1 className="max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
            Ҳамаи филиалҳо{" "}
            <span className="bg-gradient-to-r from-[#ff5a6e] to-[#ffb36b] bg-clip-text text-transparent">дар як ҷо.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/65">
            Фурӯш, фоида ва кормандони ҳар филиал — рӯзона, ҳафтаина ва моҳона. Ҳар кас танҳо он чиро мебинад, ки ба кораш лозим аст.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="brand-gradient rounded-xl px-6 py-3 font-semibold shadow-lg shadow-red-500/30 transition hover:-translate-y-0.5">
              Ворид шудан →
            </Link>
            <a href="#roles" className="rounded-xl border border-white/15 px-6 py-3 font-semibold text-white/85 transition hover:bg-white/5">
              Кӣ чӣ мебинад?
            </a>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Имкониятҳо</h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="card card-hover p-5">
              <div className="text-3xl" aria-hidden>
                {f.icon}
              </div>
              <h3 className="mt-3 font-semibold text-ink">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </li>
          ))}
        </ul>

        <h2 id="roles" className="mt-20 scroll-mt-6 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Нақшҳо ва дастрасӣ
        </h2>
        <p className="mt-2 text-muted">Ҳуқуқҳо дар сервер санҷида мешаванд — на танҳо дар интерфейс.</p>
        <ul className="mt-8 grid gap-3">
          {ROLES.map((r) => (
            <li key={r.role} className="card flex items-center gap-4 p-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-2xl" aria-hidden>
                {r.icon}
              </span>
              <div>
                <h3 className="font-semibold text-ink">{r.role}</h3>
                <p className="text-sm text-muted">{r.sees}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="brand-gradient mt-20 flex flex-col items-start gap-4 rounded-3xl p-8 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold">Санҷед бо ҳисоби демо</h2>
            <p className="mt-1 text-white/80">Шеф, менеҷер, кассир, официант, ошпаз ё фаррош — парол: demo1234</p>
          </div>
          <Link href="/login" className="rounded-xl bg-white px-6 py-3 font-semibold text-[#e4002b] transition hover:-translate-y-0.5">
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
