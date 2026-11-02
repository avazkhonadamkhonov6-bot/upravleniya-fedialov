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
import Link from "next/link";
import { AuthRedirect } from "@/components/auth-redirect";
import { BrandMark } from "@/components/brand-mark";
import { ForceLang } from "@/components/force-lang";
import { LangSwitcher } from "@/components/lang-switcher";
import { PAID_PLANS, PLAN_INFO } from "@filialhub/shared";
import { T } from "@/lib/i18n";
import { trServer } from "@/lib/i18n-server";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Саҳифаи ҷамъиятӣ — Server Component: HTML-и тайёр барои Google (/ — тоҷикӣ, /ru — русӣ).
// Услуб: дизайни FilialHub (сурх, сиёҳ, зард, крем).

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

/** Саволу ҷавоб: дар саҳифа намоён ва ҳамон матн дар FAQPage (Google онро дар натиҷаҳо нишон медиҳад) */
const FAQ: { q: string; a: string }[] = [
  { q: "FilialHub ройгон аст?", a: "Сабти ном ва тарифи «Озмоишӣ» (1 филиал, 4 корманд) ҳамеша ройгон аст — ҳамаи имкониятҳоро санҷед. Барои филиал ва кормандони бештар тарифҳо аз 150 сомонӣ дар як моҳ." },
  {
    q: "Барои кадом бизнес мувофиқ аст?",
    a: "Тарабхона ва қаҳвахона, мағозаи хӯрокворӣ, либос, электроника, сантехника, дорухона ва маводи сохтмонӣ — бо як ё якчанд филиал.",
  },
  {
    q: "Дар телефон кор мекунад?",
    a: "Ҳа, дар браузери телефон ва компютер. Сайтро ҳамчун барнома насб кардан мумкин аст ва касса бе интернет ҳам кушода мешавад.",
  },
  { q: "Ҳисобот чӣ тавр меояд?", a: "Ҳар шаб ҳисоботи фурӯш, фоида ва давомот худкор ба Telegram ва WhatsApp-и соҳиб фиристода мешавад." },
  {
    q: "Мизоҷон чӣ тавр онлайн мехаранд?",
    a: "Мағозаи шумо дар бозори FilialHub пайдо мешавад: мизоҷ маҳсулотро интихоб мекунад, фармоиш медиҳад ва ҳолати онро пайгирӣ мекунад.",
  },
];

export type HomeLang = "tg" | "ru";

/** Саҳифаи русӣ (/ru) барои ҷустуҷӯи русӣ: матн дар сервер тарҷума мешавад, на дар браузер */
export const HOME_RU_META = {
  title: `${SITE_NAME} — CRM для филиалов, касса и онлайн-маркет`,
  description:
    "FilialHub — CRM для ресторанов, магазинов и сетей филиалов в Таджикистане: продажи и прибыль, касса (POS), сотрудники, клиенты и бонусы, график и посещаемость, отчёты в Telegram и WhatsApp. Бесплатно.",
};

function jsonLd(lang: HomeLang, t: (k: string) => string) {
  const url = lang === "ru" ? `${SITE_URL}/ru` : `${SITE_URL}/`;
  const description = lang === "ru" ? HOME_RU_META.description : SITE_DESCRIPTION;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#org`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/icon-512.png`,
        areaServed: "TJ",
      },
      { "@type": "WebSite", "@id": `${SITE_URL}/#site`, name: SITE_NAME, url: `${SITE_URL}/`, publisher: { "@id": `${SITE_URL}/#org` }, inLanguage: ["tg", "ru"] },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Android, iOS",
        url,
        description,
        inLanguage: lang,
        publisher: { "@id": `${SITE_URL}/#org` },
        offers: { "@type": "Offer", price: "0", priceCurrency: "TJS" },
      },
      {
        "@type": "FAQPage",
        inLanguage: lang,
        mainEntity: FAQ.map((f) => ({ "@type": "Question", name: t(f.q), acceptedAnswer: { "@type": "Answer", text: t(f.a) } })),
      },
    ],
  };
}

const H2 = "font-display text-[clamp(28px,5.6vw,46px)] leading-[1.1] font-extrabold tracking-[-0.025em]";

// Ивази забон дар саҳифаи асосӣ суроғаро ҳам иваз мекунад: русӣ — /ru, дигарҳо — /
const LANG_ROUTES = { tg: "/", ru: "/ru", en: "/" } as const;

export function HomePage({ lang }: { lang: HomeLang }) {
  // tg: <T> — забонро дар браузер иваз кардан мумкин; ru: матни тайёри русӣ дар HTML барои Google
  const t = (k: string, args: (string | number)[] = []) => (lang === "ru" ? trServer("ru", k, ...args) : <T k={k} args={args} />);
  const text = (k: string) => (lang === "ru" ? trServer("ru", k) : k);
  return (
    <div className="min-h-screen bg-[#fbf6ef] text-[#16120f]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(lang, text)).replace(/</g, "\\u003c") }} />
      {lang === "ru" && <ForceLang lang="ru" />}
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
            ["#pricing", "Нархҳо"],
            ["/shop", "Бозор"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-full px-3.5 py-2.5 text-[15px] font-medium transition hover:bg-[#f3ebdf]">
              {t(label)}
            </Link>
          ))}
        </nav>
        {/* Дар телефон — дар қатори логотип, дар компютер — пеш аз тугмаҳо */}
        <LangSwitcher className="ml-auto sm:ml-0" routes={LANG_ROUTES} />
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-[14px] border-[1.5px] border-[#16120f] px-4 py-2.5 text-[15px] font-semibold whitespace-nowrap transition hover:bg-[#16120f] hover:text-white"
          >
            {t("Ворид шудан")}
          </Link>
          <Link href="/register" className="rounded-[14px] bg-[#dc3b1c] px-4 py-3 text-[15px] font-bold whitespace-nowrap text-white transition hover:bg-[#c23215]">
            {t("Бизнес созед")}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-12 px-4 pt-6 pb-16 sm:px-8 sm:pt-8 sm:pb-[72px]">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-7">
          <span className="reveal-up inline-flex items-center gap-2 self-start rounded-full bg-[#ffe9dc] px-3.5 py-2 text-sm font-semibold text-[#a82a10]">
            <span className="size-2 rounded-full bg-[#dc3b1c]" /> {t("Платформа барои бизнесҳои Тоҷикистон")}
          </span>
          {/* Сарлавҳа ва матни аввал бе аниматсия: онҳо LCP-анд — Google вақти пайдо шудани онҳоро чен мекунад */}
          <h1 className="font-display text-[clamp(34px,8vw,52px)] leading-[1.08] font-extrabold tracking-[-0.03em] lg:text-[clamp(48px,4.6vw,68px)]">
            {t("Ҳамаи филиалҳо")}{" "}
            <span className="text-[#dc3b1c]">
              {t("дар як ҷо.")}
            </span>
          </h1>
          <p className="max-w-[560px] text-lg leading-relaxed text-[#4a3f35] sm:text-xl">
            {t("Фурӯш, касса, кормандон, хароҷот ва фармоишҳои онлайн — ҳама аз як панел. Мизоҷони шумо бошанд аз мағозаатон онлайн мехаранд.")}
          </p>
          <div className="reveal-up flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
            <Link href="/register" className="fx-btn inline-flex items-center gap-2.5 rounded-2xl bg-[#dc3b1c] px-6 py-4 text-[17px] font-bold text-white transition hover:bg-[#c23215]">
              {t("Бизнеси нав созед")} <ArrowRight className="size-[18px]" strokeWidth={2.4} />
            </Link>
            <Link href="/shop" className="fx-btn inline-flex items-center gap-2.5 rounded-2xl bg-[#16120f] px-6 py-4 text-[17px] font-bold text-white transition hover:bg-black">
              {t("Ба бозор равед")}
            </Link>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-[#4a3f35]">
            {["Тоҷикӣ, русӣ, англисӣ", "Компютер ва телефон", "Ҳисобот ба Telegram ва WhatsApp"].map((x) => (
              <li key={x} className="inline-flex items-center gap-2">
                <Check className="size-[18px] text-[#1e8a4c]" strokeWidth={2.4} /> {t(x)}
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
                <div className="text-[13px] font-medium text-[#6b5d50]">{t("Фурӯши имрӯз · ҳамаи филиалҳо")}</div>
                <div className="mt-1 font-display text-[36px] font-bold tracking-tight">
                  18 450 <span className="text-lg text-[#6b5d50]">
                    {t("с.")}
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-[#e3f4e9] px-2.5 py-1.5 text-[13px] font-bold text-[#17663a]">+12%</span>
            </div>
            <div className="flex h-[140px] items-end gap-2.5">
              {BARS.map(([d, h], i) => (
                <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <div className={`w-full rounded-lg ${i === 5 ? "bg-[#dc3b1c]" : i === 4 ? "bg-[#ff7a1a]" : "bg-[#f3ebdf]"}`} style={{ height: `${h}%` }} />
                  <span className="text-[11px] font-semibold text-[#6b5d50]">{t(d)}</span>
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
                    {t(l)}
                  </div>
                  <div className="mt-0.5 truncate text-[15px] font-bold sm:text-[17px]">
                    {v ? (
                      <>
                        {v} {t("с.")}
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
              <div className="text-sm font-bold">{t("Фармоиши нав #{0}", [1042])}</div>
              <div className="text-[13px] text-[#cfc4b8]">
                {t("Оши палов")} ×2 · 96 {t("с.")}
              </div>
            </div>
          </div>
          <div className="absolute right-0 bottom-[70px] rounded-[18px] bg-[#ffc531] px-4 py-3.5 font-bold shadow-[0_20px_40px_-16px_rgba(120,80,0,0.45)]">
            <div className="text-xs font-semibold">{t("Бонуси мизоҷ")}</div>
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
              <span className={`text-sm font-semibold ${p.topCls}`}>{t(p.top)}</span>
              <span className="font-display text-[clamp(22px,5.6vw,30px)] leading-[1.15] font-bold tracking-[-0.02em]">{t(p.big)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Барои кӣ */}
      <section id="who" className="mx-auto flex max-w-[1280px] scroll-mt-6 flex-col gap-8 px-4 pt-10 pb-20 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 data-reveal className={H2}>
            {t("Барои кӣ?")}
          </h2>
          <p className="max-w-[460px] text-[17px] leading-relaxed text-[#4a3f35]">
            {t("Ҳар кас метавонад бизнеси худро созад. Ҳар навъи мағоза дар бозор услуби худро мегирад.")}
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
                <div className="text-base font-extrabold [overflow-wrap:anywhere] sm:text-lg">{t(k.name)}</div>
                <div className="mt-1 text-[13px] opacity-85">{t(k.mood)}</div>
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
              {t("Ҳама чиз")}
              <br />
              <span className="text-[#dc3b1c]">
                {t("барои кор")}
              </span>
            </h2>
            <p className="max-w-[460px] text-[17px] leading-relaxed text-[#4a3f35]">
              {t("Панели корӣ барои соҳиб ва кормандон. На ҷадвали хушки бухгалтерӣ — балки асбоби зинда, ки ҳар рӯз бо он кор кардан осон аст.")}
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
                <h3 className="text-[17px] font-bold">{t(f.t)}</h3>
                <p className="text-sm leading-normal text-[#5a4e43]">{t(f.d)}</p>
              </li>
            ))}
            <li className="flex min-h-[160px] flex-col justify-between gap-3.5 rounded-[22px] bg-[#dc3b1c] p-[22px] text-white">
              <div className="font-display text-[22px] leading-tight font-bold">
                {t("Ҳамаашро худ санҷед")}
              </div>
              <Link href="/login" className="self-start rounded-xl bg-white px-4 py-3 font-bold text-[#16120f]">
                {t("Панелро бинед →")}
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
              {t("Ҳар шаб")}
            </span>
            <h2 data-reveal className={H2}>
              {t("Ҳисоботи рӯз ба Telegram ва WhatsApp")}
            </h2>
            <p className="max-w-[520px] text-[17px] leading-relaxed text-[#cfc4b8]">
              {t("Фурӯш, фоида, кӣ дер монд ва кадом филиал пеш аст — худаш меояд. Чат бо кормандон ҳам ба ин мессенҷерҳо пайваст аст: паёми овозӣ, видео, занги аудио ва видео.")}
            </p>
          </div>
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3 rounded-[28px] bg-[#241d18] p-6" aria-hidden>
            <div className="flex items-center gap-3 border-b border-[#3a2f27] pb-3">
              <BrandMark className="size-10" />
              <div>
                <div className="font-bold">
                  FilialHub · {t("Ҳисобот")}
                </div>
                <div className="text-[13px] text-[#a89c90]">
                  {t("бот")}
                </div>
              </div>
            </div>
            <div className="max-w-[380px] self-start rounded-[4px_18px_18px_18px] bg-[#322822] px-[18px] py-4 text-[15px] leading-[1.7]">
              <b>
                {t("Ҳисоботи имрӯз")}
              </b>
              <br />
              {t("Фурӯш")}:{" "}
              <b>
                18 450 {t("с.")}
              </b>{" "}
              (+12%)
              <br />
              {t("Фоидаи соф")}:{" "}
              <b>
                6 120 {t("с.")}
              </b>
              <br />
              {t("Беҳтарин филиал: Рӯдакӣ")}
              <br />
              {t("Дер монданд: {0} нафар", [2])}
              <br />
              {t("Фармоишҳои онлайн")}: 34
            </div>
            <div className="self-end rounded-[18px_4px_18px_18px] bg-[#dc3b1c] px-4 py-3 text-[15px]">
              {t("Раҳмат! Фардо менеҷерҳо ҷамъ шаванд.")}
            </div>
          </div>
        </div>
      </section>

      {/* Нақшҳо */}
      <section id="roles" className="mx-auto flex max-w-[1280px] scroll-mt-6 flex-col gap-8 px-4 py-20 sm:px-8 sm:py-[88px]">
        <h2 data-reveal className={`${H2} max-w-[900px]`}>
          {t("Ҳар кас танҳо")}{" "}
          <span className="text-[#dc3b1c]">
            {t("чизи ба худаш лозимиро")}
          </span>{" "}
          {t("мебинад")}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ROLES.map((r) => (
            <li key={r.n} data-reveal className={`flex min-h-[150px] flex-col gap-2.5 rounded-[22px] p-[22px] ${r.cls}`}>
              <span className="text-[13px] font-bold opacity-80">{r.n}</span>
              <span className="font-display text-lg font-bold [overflow-wrap:anywhere] sm:text-xl">{t(r.t)}</span>
              <span className="text-sm leading-normal">{t(r.d)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Бозор */}
      <section className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-8 sm:pb-[88px]">
        <div className="flex flex-wrap items-center gap-10 rounded-[36px] bg-white p-6 sm:p-12">
          <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-[18px]">
            <h2 className="font-display text-[clamp(24px,5vw,38px)] leading-[1.12] font-extrabold tracking-[-0.025em]">
              {t("Мизоҷон онлайн мехаранд")}
            </h2>
            <p className="text-[17px] leading-relaxed text-[#4a3f35]">
              {t("Маҳсулотро интихоб мекунанд, ба сабад мегузоранд ва ҳолати фармоишро то дами дар пайгирӣ мекунанд.")}
            </p>
            <Link href="/shop" className="self-start rounded-[14px] bg-[#16120f] px-[22px] py-4 font-bold text-white">
              {t("Бозорро кушоед")}
            </Link>
          </div>
          <ol className="grid min-w-0 flex-[1_1_520px] grid-cols-2 gap-2.5 sm:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className={`flex flex-col gap-2.5 rounded-[20px] p-[18px] ${s.box}`}>
                <span className={`grid size-8 place-items-center rounded-full font-extrabold ${s.dot}`}>{s.n}</span>
                <b>
                  {t(s.t)}
                </b>
                <span className="text-[13px] text-[#5a4e43]">{t(s.d)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Нархҳо */}
      <section id="pricing" className="mx-auto flex max-w-[1280px] scroll-mt-6 flex-col gap-8 px-4 pb-20 sm:px-8 sm:pb-[88px]">
        <div className="flex flex-col gap-3">
          <h2 data-reveal className={H2}>
            {t("Нархҳо")}
          </h2>
          <p className="max-w-[760px] text-[17px] leading-relaxed text-[#4a3f35]">
            {t("Озмоишӣ ҳамеша ройгон: 1 филиал ва 4 корманд. Ҳамаи имкониятҳо дар ҳама тарифҳо — фарқ танҳо дар шумори филиал ва корманд. Барои 12 моҳ −20%.")}
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PAID_PLANS.map((p) => {
            const info = PLAN_INFO[p];
            return (
              <li key={p} data-reveal className={`flex flex-col gap-2 rounded-[22px] p-6 ${info.popular ? "bg-[#16120f] text-white" : "bg-white"}`}>
                <span className="font-display text-xl font-bold">{t(info.name)}</span>
                <span className={`text-sm ${info.popular ? "text-[#d8cfc4]" : "text-[#5a4e43]"}`}>{t(info.tagline)}</span>
                <span className="mt-2 font-display text-4xl font-extrabold">
                  {info.price} <span className="text-base font-semibold">{t("сомонӣ / моҳ")}</span>
                </span>
                <span className="text-sm">{info.branches === null ? t("Филиалҳо бемаҳдуд") : t("то {0} филиал", [info.branches])}</span>
                <span className="text-sm">{info.employees === null ? t("Кормандон бемаҳдуд") : t("то {0} корманд", [info.employees])}</span>
              </li>
            );
          })}
        </ul>
        <Link href="/register" className="self-start rounded-[14px] bg-[#dc3b1c] px-[22px] py-4 font-bold text-white transition hover:bg-[#c23215]">
          {t("Ройгон оғоз кунед")}
        </Link>
      </section>

      {/* Саволҳо: <details> бе JavaScript кушода мешавад, матн дар HTML барои Google */}
      <section id="faq" className="mx-auto flex max-w-[960px] scroll-mt-6 flex-col gap-6 px-4 pb-20 sm:px-8 sm:pb-[88px]">
        <h2 data-reveal className={H2}>
          {t("Саволҳои зиёд додашаванда")}
        </h2>
        <div className="flex flex-col gap-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-[20px] bg-white p-5 sm:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-bold">
                {t(f.q)}
                <span className="grid size-8 flex-none place-items-center rounded-full bg-[#fbf6ef] text-xl transition group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-[#4a3f35]">{t(f.a)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#ffc531]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-8 px-4 py-20 sm:px-8 sm:py-[88px]">
          <h2 className="max-w-[760px] font-display text-[clamp(30px,6.4vw,60px)] leading-[1.06] font-extrabold tracking-[-0.03em]">
            {t("Бизнеси худро имрӯз созед.")}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="rounded-2xl bg-[#dc3b1c] px-6 py-4 text-[17px] font-bold text-white">
              {t("Бизнес созед")}
            </Link>
            <Link href="/login" className="rounded-2xl bg-[#16120f] px-6 py-4 text-[17px] font-bold text-white">
              {t("Ворид шудан")}
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
              {t("Имкониятҳо")}
            </Link>
            <Link href="/shop" className="hover:text-white">
              {t("Бозор")}
            </Link>
            <Link href="#roles" className="hover:text-white">
              {t("Нақшҳо")}
            </Link>
          </nav>
          <span className="text-sm">© 2026 {SITE_NAME} · {t("Душанбе|city")}
          </span>
        </div>
      </footer>
    </div>
  );
}
