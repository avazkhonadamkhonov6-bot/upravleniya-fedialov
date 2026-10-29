import {
  ArrowRight,
  BarChart3,
  BrickWall,
  CalendarClock,
  Check,
  ClipboardList,
  Droplets,
  Gift,
  History,
  MessagesSquare,
  Pill,
  Send,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  UtensilsCrossed,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthRedirect } from "@/components/auth-redirect";
import { BrandMark } from "@/components/brand-mark";
import { LangSwitcher } from "@/components/lang-switcher";
import { T } from "@/lib/i18n";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Саҳифаи ҷамъиятӣ — Server Component: HTML-и тайёр барои Google. Услуб: дизайни FilialHub (сурх, сиёҳ, зард, крем).
export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME} — CRM, филиалҳо ва бозори онлайн` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

const BARS = [
  ["Дш", 46],
  ["Сш", 58],
  ["Чш", 52],
  ["Пш", 70],
  ["Ҷм", 88],
  ["Шб", 100],
  ["Як", 74],
] as const;

/** Навъҳои бизнес — ҳар кадом ранги худро дар бозор дорад */
const KINDS: { name: string; mood: string; icon: LucideIcon; cls: string; chip: string }[] = [
  { name: "Тарабхона", mood: "Сурх ва гарм", icon: UtensilsCrossed, cls: "bg-[#dc3b1c] text-white", chip: "bg-white/20" },
  { name: "Хӯрокворӣ", mood: "Сабз ва тоза", icon: ShoppingBasket, cls: "bg-[#1e7a45] text-white", chip: "bg-white/20" },
  { name: "Либос", mood: "Сиёҳ ва мӯдбоб", icon: Shirt, cls: "bg-[#16120f] text-white", chip: "bg-white/15" },
  { name: "Сантехника", mood: "Кабуд ва равшан", icon: Droplets, cls: "bg-[#1f5fad] text-white", chip: "bg-white/20" },
  { name: "Электроника", mood: "Торик ва дақиқ", icon: Smartphone, cls: "bg-[#2b2f5c] text-white", chip: "bg-white/15" },
  { name: "Дорухона", mood: "Софу ором", icon: Pill, cls: "bg-[#ddf1ee] text-[#0e5a52]", chip: "bg-white" },
  { name: "Маводи сохтмонӣ", mood: "Зарду боқувват", icon: BrickWall, cls: "bg-[#ffc531] text-[#16120f]", chip: "bg-black/10" },
];

const FEATURES: { t: string; d: string; icon: LucideIcon; cls: string }[] = [
  { t: "Панели асосӣ", d: "Фурӯш, фоида ва хароҷот барои рӯз, ҳафта ва моҳ — бо графикҳо.", icon: BarChart3, cls: "bg-[#ffe9dc] text-[#c23215]" },
  { t: "Филиалҳо ва кормандон", d: "Рӯйхат, маълумот ва маоши ҳар корманд дар ҳар филиал.", icon: Users, cls: "bg-[#16120f] text-white" },
  { t: "Касса (POS)", d: "Фурӯши тез, пардохт бо нақд ё корт.", icon: Wallet, cls: "bg-[#fff1c9] text-[#7a5600]" },
  { t: "Мизоҷон ва бонус", d: "Аз ҳар харид 5% бонус худкор ҷамъ мешавад.", icon: Gift, cls: "bg-[#ffe9dc] text-[#c23215]" },
  { t: "Вазифаҳо", d: "Тахтаи Kanban: вазифа диҳед ва пешравиро бинед.", icon: ClipboardList, cls: "bg-[#e3f4e9] text-[#17663a]" },
  { t: "Ҷадвал ва давомот", d: "Кӣ кай омад, кай рафт ва кӣ дер монд.", icon: CalendarClock, cls: "bg-[#ffe9dc] text-[#c23215]" },
  { t: "Хароҷот ва фоидаи соф", d: "Ҳамаи хароҷотро нависед ва фоидаи аслиро бинед.", icon: Wallet, cls: "bg-[#16120f] text-white" },
  { t: "Фармоишҳои онлайн", d: "Фармоишҳо аз бозор рост ба панел меоянд.", icon: ShoppingBag, cls: "bg-[#fff1c9] text-[#7a5600]" },
  { t: "Чат бо кормандон", d: "Пайваст ба WhatsApp ва Telegram: овоз, видео, занг.", icon: MessagesSquare, cls: "bg-[#ffe9dc] text-[#c23215]" },
  { t: "Ҳисоботи ҳаррӯза", d: "Ҳар шаб ба Telegram ва WhatsApp меояд.", icon: Send, cls: "bg-[#e3f4e9] text-[#17663a]" },
  { t: "Таърих ва ҷустуҷӯ", d: "Таърихи амалҳо, огоҳиномаҳо ва ҷустуҷӯи умумӣ.", icon: History, cls: "bg-[#ffe9dc] text-[#c23215]" },
];

const ROLES: { n: string; t: string; d: string; cls: string }[] = [
  { n: "01", t: "Соҳиб", d: "Ҳама чизро мебинад.", cls: "bg-[#dc3b1c] text-white" },
  { n: "02", t: "Менеҷер", d: "Танҳо филиали худашро.", cls: "bg-[#16120f] text-white" },
  { n: "03", t: "Кассир", d: "Касса, таърихи фурӯш, профил.", cls: "bg-[#ffc531] text-[#16120f]" },
  { n: "04", t: "Пешхизмат", d: "Меню ва профил.", cls: "bg-white text-[#16120f]" },
  { n: "05", t: "Ошпаз · фаррош", d: "Профил ва маош.", cls: "bg-[#f3ebdf] text-[#16120f]" },
  { n: "06", t: "Мизоҷ", d: "Танҳо бозори онлайн.", cls: "bg-[#ffe9dc] text-[#16120f]" },
];

const STEPS: { n: string; t: string; d: string; box: string; dot: string }[] = [
  { n: "1", t: "Нав", d: "Фармоиш фиристода шуд", box: "bg-[#fbf6ef]", dot: "bg-[#16120f] text-white" },
  { n: "2", t: "Қабул шуд", d: "Мағоза тайёр мекунад", box: "bg-[#ffe9dc]", dot: "bg-[#dc3b1c] text-white" },
  { n: "3", t: "Дар роҳ", d: "Курйер меояд", box: "bg-[#fff1c9]", dot: "bg-[#ffc531] text-[#16120f]" },
  { n: "4", t: "Гирифта шуд", d: "+5% бонус ҷамъ шуд", box: "bg-[#e3f4e9]", dot: "bg-[#1e8a4c] text-white" },
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

const H2 = "font-display text-[clamp(28px,5.6vw,46px)] leading-[1.1] font-extrabold tracking-[-0.025em]";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fbf6ef] text-[#16120f]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <AuthRedirect />

      {/* Меню */}
      <header className="relative z-10 mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label={SITE_NAME}>
          <BrandMark className="size-9" />
          <span className="font-display text-xl font-bold tracking-tight">{SITE_NAME}</span>
        </Link>
        <nav aria-label="Менюи асосӣ" className="order-3 flex w-full flex-wrap gap-1 sm:order-none sm:w-auto sm:flex-1">
          {[
            ["#features", "Имкониятҳо"],
            ["#who", "Барои кӣ"],
            ["#roles", "Нақшҳо"],
            ["/shop", "Бозор"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-full px-3.5 py-2.5 text-[15px] font-medium transition hover:bg-[#f3ebdf]">
              <T k={label} />
            </Link>
          ))}
        </nav>
        {/* Дар телефон — дар қатори логотип, дар компютер — пеш аз тугмаҳо */}
        <LangSwitcher className="ml-auto sm:ml-0" />
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-[14px] border-[1.5px] border-[#16120f] px-4 py-2.5 text-[15px] font-semibold whitespace-nowrap transition hover:bg-[#16120f] hover:text-white"
          >
            <T k="Ворид шудан" />
          </Link>
          <Link href="/register" className="rounded-[14px] bg-[#dc3b1c] px-4 py-3 text-[15px] font-bold whitespace-nowrap text-white transition hover:bg-[#c23215]">
            <T k="Бизнес созед" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-12 px-4 pt-6 pb-16 sm:px-8 sm:pt-8 sm:pb-[72px]">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-7">
          <span className="reveal-up inline-flex items-center gap-2 self-start rounded-full bg-[#ffe9dc] px-3.5 py-2 text-sm font-semibold text-[#a82a10]">
            <span className="size-2 rounded-full bg-[#dc3b1c]" /> <T k="Платформа барои бизнесҳои Тоҷикистон" />
          </span>
          <h1
            className="reveal-up font-display text-[clamp(34px,8vw,52px)] leading-[1.08] font-extrabold tracking-[-0.03em] lg:text-[clamp(48px,4.6vw,68px)]"
            style={{ animationDelay: "80ms" }}
          >
            <T k="Ҳамаи филиалҳо" />{" "}
            <span className="text-[#dc3b1c]">
              <T k="дар як ҷо." />
            </span>
          </h1>
          <p className="reveal-up max-w-[560px] text-lg leading-relaxed text-[#4a3f35] sm:text-xl" style={{ animationDelay: "160ms" }}>
            <T k="Фурӯш, касса, кормандон, хароҷот ва фармоишҳои онлайн — ҳама аз як панел. Мизоҷони шумо бошанд аз мағозаатон онлайн мехаранд." />
          </p>
          <div className="reveal-up flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
            <Link href="/register" className="fx-btn inline-flex items-center gap-2.5 rounded-2xl bg-[#dc3b1c] px-6 py-4 text-[17px] font-bold text-white transition hover:bg-[#c23215]">
              <T k="Бизнеси нав созед" /> <ArrowRight className="size-[18px]" strokeWidth={2.4} />
            </Link>
            <Link href="/shop" className="fx-btn inline-flex items-center gap-2.5 rounded-2xl bg-[#16120f] px-6 py-4 text-[17px] font-bold text-white transition hover:bg-black">
              <T k="Ба бозор равед" />
            </Link>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-[#4a3f35]">
            {["Тоҷикӣ, русӣ, англисӣ", "Компютер ва телефон", "Ҳисобот ба Telegram ва WhatsApp"].map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <Check className="size-[18px] text-[#1e8a4c]" strokeWidth={2.4} /> <T k={t} />
              </li>
            ))}
          </ul>
        </div>

        {/* Намунаи панел */}
        <div className="relative min-h-[460px] min-w-0 flex-[1_1_480px] sm:min-h-[520px]" aria-hidden>
          <div className="absolute inset-[24px_0_0_40px] rounded-[36px] bg-[#dc3b1c]" />
          <div className="absolute top-0 right-6 size-[120px] rounded-full bg-[#ffc531]" />
          <div className="relative mt-[72px] mr-6 flex flex-col gap-[18px] rounded-3xl bg-white p-6 shadow-[0_30px_60px_-20px_rgba(80,30,10,0.35)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-[#6b5d50]"><T k="Фурӯши имрӯз · ҳамаи филиалҳо" /></div>
                <div className="mt-1 font-display text-[36px] font-bold tracking-tight">
                  18 450 <span className="text-lg text-[#6b5d50]">
                    <T k="с." />
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-[#e3f4e9] px-2.5 py-1.5 text-[13px] font-bold text-[#17663a]">+12%</span>
            </div>
            <div className="flex h-[140px] items-end gap-2.5">
              {BARS.map(([d, h], i) => (
                <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <div className={`w-full rounded-lg ${i === 5 ? "bg-[#dc3b1c]" : i === 4 ? "bg-[#ff7a1a]" : "bg-[#f3ebdf]"}`} style={{ height: `${h}%` }} />
                  <span className="text-[11px] font-semibold text-[#6b5d50]"><T k={d} /></span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                ["Фоида", "6 120"],
                ["Хароҷот", "3 980"],
                ["Фармоиш", ""],
              ].map(([l, v]) => (
                <div key={l} className="min-w-0 rounded-[14px] bg-[#fbf6ef] p-2.5 sm:p-3">
                  <div className="truncate text-xs text-[#6b5d50]">
                    <T k={l} />
                  </div>
                  <div className="mt-0.5 truncate text-[15px] font-bold sm:text-[17px]">
                    {v ? (
                      <>
                        {v} <T k="с." />
                      </>
                    ) : (
                      "34"
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute bottom-[18px] left-0 flex max-w-[280px] items-center gap-3 rounded-[18px] bg-[#16120f] px-4 py-3.5 text-white shadow-[0_20px_40px_-16px_rgba(0,0,0,0.5)]">
            <span className="grid size-10 flex-none place-items-center rounded-xl bg-[#ff7a1a] text-[#16120f]">
              <ShoppingBag className="size-5" strokeWidth={2.2} />
            </span>
            <div>
              <div className="text-sm font-bold"><T k="Фармоиши нав #{0}" args={[1042]} /></div>
              <div className="text-[13px] text-[#cfc4b8]">
                <T k="Оши палов" /> ×2 · 96 <T k="с." />
              </div>
            </div>
          </div>
          <div className="absolute right-0 bottom-[70px] rounded-[18px] bg-[#ffc531] px-4 py-3.5 font-bold shadow-[0_20px_40px_-16px_rgba(120,80,0,0.45)]">
            <div className="text-xs font-semibold"><T k="Бонуси мизоҷ" /></div>
            <div className="font-display text-[22px]">+5%</div>
          </div>
        </div>
      </section>

      {/* Се роҳ */}
      <section className="mx-auto max-w-[1280px] px-4 pt-6 pb-20 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { href: "/login", top: "Ман аллакай ҳисоб дорам", big: "Ворид шудан →", cls: "bg-[#16120f] text-white", topCls: "text-[#ffc531]" },
            { href: "/register", top: "Барои соҳибкор", big: "Бизнеси нав созед →", cls: "bg-[#dc3b1c] text-white", topCls: "text-[#ffe1d3]" },
            { href: "/shop", top: "Барои мизоҷ", big: "Ба бозор барои харид →", cls: "bg-[#ffc531] text-[#16120f]", topCls: "text-[#5a4200]" },
          ].map((p) => (
            <Link
              key={p.href}
              href={p.href}
              data-reveal
              className={`flex min-h-[220px] flex-col justify-between gap-6 rounded-[28px] p-8 transition hover:-translate-y-1 ${p.cls}`}
            >
              <span className={`text-sm font-semibold ${p.topCls}`}><T k={p.top} /></span>
              <span className="font-display text-[clamp(22px,5.6vw,30px)] leading-[1.15] font-bold tracking-[-0.02em]"><T k={p.big} /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* Барои кӣ */}
      <section id="who" className="mx-auto flex max-w-[1280px] scroll-mt-6 flex-col gap-8 px-4 pt-10 pb-20 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 data-reveal className={H2}>
            <T k="Барои кӣ?" />
          </h2>
          <p className="max-w-[460px] text-[17px] leading-relaxed text-[#4a3f35]">
            <T k="Ҳар кас метавонад бизнеси худро созад. Ҳар навъи мағоза дар бозор услуби худро мегирад." />
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {KINDS.map((k, i) => (
            <li
              key={k.name}
              data-reveal
              className={`flex min-h-[170px] flex-col justify-between rounded-[22px] p-5 ${k.cls}`}
              style={{ "--reveal-delay": `${i * 50}ms` } as React.CSSProperties}
            >
              <span className={`grid size-12 place-items-center rounded-[14px] ${k.chip}`}>
                <k.icon className="size-6" />
              </span>
              <div>
                <div className="text-base font-extrabold [overflow-wrap:anywhere] sm:text-lg"><T k={k.name} /></div>
                <div className="mt-1 text-[13px] opacity-85"><T k={k.mood} /></div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Имкониятҳо */}
      <section id="features" className="scroll-mt-6 rounded-t-[40px] bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-20 sm:px-8 sm:py-[88px]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 data-reveal className={H2}>
              <T k="Ҳама чиз" />
              <br />
              <span className="text-[#dc3b1c]">
                <T k="барои кор" />
              </span>
            </h2>
            <p className="max-w-[460px] text-[17px] leading-relaxed text-[#4a3f35]">
              <T k="Панели корӣ барои соҳиб ва кормандон. На ҷадвали хушки бухгалтерӣ — балки асбоби зинда, ки ҳар рӯз бо он кор кардан осон аст." />
            </p>
          </div>
          <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <li
                key={f.t}
                data-reveal
                className="flex min-h-[160px] flex-col gap-3.5 rounded-[22px] bg-[#fbf6ef] p-[22px]"
                style={{ "--reveal-delay": `${(i % 4) * 60}ms` } as React.CSSProperties}
              >
                <span className={`grid size-11 place-items-center rounded-[13px] ${f.cls}`}>
                  <f.icon className="size-[22px]" />
                </span>
                <h3 className="text-[17px] font-bold"><T k={f.t} /></h3>
                <p className="text-sm leading-normal text-[#5a4e43]"><T k={f.d} /></p>
              </li>
            ))}
            <li className="flex min-h-[160px] flex-col justify-between gap-3.5 rounded-[22px] bg-[#dc3b1c] p-[22px] text-white">
              <div className="font-display text-[22px] leading-tight font-bold">
                <T k="Ҳамаашро худ санҷед" />
              </div>
              <Link href="/login" className="self-start rounded-xl bg-white px-4 py-3 font-bold text-[#16120f]">
                <T k="Панелро бинед →" />
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* Ҳисобот */}
      <section className="bg-[#16120f] text-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-12 px-4 py-20 sm:px-8 sm:py-[88px]">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-5">
            <span className="text-sm font-bold tracking-[0.08em] text-[#ffc531] uppercase">
              <T k="Ҳар шаб" />
            </span>
            <h2 data-reveal className={H2}>
              <T k="Ҳисоботи рӯз ба Telegram ва WhatsApp" />
            </h2>
            <p className="max-w-[520px] text-[17px] leading-relaxed text-[#cfc4b8]">
              <T k="Фурӯш, фоида, кӣ дер монд ва кадом филиал пеш аст — худаш меояд. Чат бо кормандон ҳам ба ин мессенҷерҳо пайваст аст: паёми овозӣ, видео, занги аудио ва видео." />
            </p>
          </div>
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3 rounded-[28px] bg-[#241d18] p-6" aria-hidden>
            <div className="flex items-center gap-3 border-b border-[#3a2f27] pb-3">
              <BrandMark className="size-10" />
              <div>
                <div className="font-bold">
                  FilialHub · <T k="Ҳисобот" />
                </div>
                <div className="text-[13px] text-[#a89c90]">
                  <T k="бот" />
                </div>
              </div>
            </div>
            <div className="max-w-[380px] self-start rounded-[4px_18px_18px_18px] bg-[#322822] px-[18px] py-4 text-[15px] leading-[1.7]">
              <b>
                <T k="Ҳисоботи имрӯз" />
              </b>
              <br />
              <T k="Фурӯш" />:{" "}
              <b>
                18 450 <T k="с." />
              </b>{" "}
              (+12%)
              <br />
              <T k="Фоидаи соф" />:{" "}
              <b>
                6 120 <T k="с." />
              </b>
              <br />
              <T k="Беҳтарин филиал: Рӯдакӣ" />
              <br />
              <T k="Дер монданд: {0} нафар" args={[2]} />
              <br />
              <T k="Фармоишҳои онлайн" />: 34
            </div>
            <div className="self-end rounded-[18px_4px_18px_18px] bg-[#dc3b1c] px-4 py-3 text-[15px]">
              <T k="Раҳмат! Фардо менеҷерҳо ҷамъ шаванд." />
            </div>
          </div>
        </div>
      </section>

      {/* Нақшҳо */}
      <section id="roles" className="mx-auto flex max-w-[1280px] scroll-mt-6 flex-col gap-8 px-4 py-20 sm:px-8 sm:py-[88px]">
        <h2 data-reveal className={`${H2} max-w-[900px]`}>
          <T k="Ҳар кас танҳо" />{" "}
          <span className="text-[#dc3b1c]">
            <T k="чизи ба худаш лозимиро" />
          </span>{" "}
          <T k="мебинад" />
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ROLES.map((r) => (
            <li key={r.n} data-reveal className={`flex min-h-[150px] flex-col gap-2.5 rounded-[22px] p-[22px] ${r.cls}`}>
              <span className="text-[13px] font-bold opacity-80">{r.n}</span>
              <span className="font-display text-lg font-bold [overflow-wrap:anywhere] sm:text-xl"><T k={r.t} /></span>
              <span className="text-sm leading-normal"><T k={r.d} /></span>
            </li>
          ))}
        </ul>
      </section>

      {/* Бозор */}
      <section className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-8 sm:pb-[88px]">
        <div className="flex flex-wrap items-center gap-10 rounded-[36px] bg-white p-6 sm:p-12">
          <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-[18px]">
            <h2 className="font-display text-[clamp(24px,5vw,38px)] leading-[1.12] font-extrabold tracking-[-0.025em]">
              <T k="Мизоҷон онлайн мехаранд" />
            </h2>
            <p className="text-[17px] leading-relaxed text-[#4a3f35]">
              <T k="Маҳсулотро интихоб мекунанд, ба сабад мегузоранд ва ҳолати фармоишро то дами дар пайгирӣ мекунанд." />
            </p>
            <Link href="/shop" className="self-start rounded-[14px] bg-[#16120f] px-[22px] py-4 font-bold text-white">
              <T k="Бозорро кушоед" />
            </Link>
          </div>
          <ol className="grid min-w-0 flex-[1_1_520px] grid-cols-2 gap-2.5 sm:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className={`flex flex-col gap-2.5 rounded-[20px] p-[18px] ${s.box}`}>
                <span className={`grid size-8 place-items-center rounded-full font-extrabold ${s.dot}`}>{s.n}</span>
                <b>
                  <T k={s.t} />
                </b>
                <span className="text-[13px] text-[#5a4e43]"><T k={s.d} /></span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#ffc531]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-8 px-4 py-20 sm:px-8 sm:py-[88px]">
          <h2 className="max-w-[760px] font-display text-[clamp(30px,6.4vw,60px)] leading-[1.06] font-extrabold tracking-[-0.03em]">
            <T k="Бизнеси худро имрӯз созед." />
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="rounded-2xl bg-[#dc3b1c] px-6 py-4 text-[17px] font-bold text-white">
              <T k="Бизнес созед" />
            </Link>
            <Link href="/login" className="rounded-2xl bg-[#16120f] px-6 py-4 text-[17px] font-bold text-white">
              <T k="Ворид шудан" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#16120f] text-[#cfc4b8]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-8 px-4 py-12 sm:px-8">
          <div className="flex items-center gap-2.5 text-white">
            <BrandMark className="size-8" solid />
            <span className="font-display text-lg font-bold">{SITE_NAME}</span>
          </div>
          <nav aria-label="Пойин" className="flex flex-wrap gap-6 text-[15px]">
            <Link href="#features" className="hover:text-white">
              <T k="Имкониятҳо" />
            </Link>
            <Link href="/shop" className="hover:text-white">
              <T k="Бозор" />
            </Link>
            <Link href="#roles" className="hover:text-white">
              <T k="Нақшҳо" />
            </Link>
          </nav>
          <span className="text-sm">© 2026 {SITE_NAME} · <T k="Душанбе" />
          </span>
        </div>
      </footer>
    </div>
  );
}
