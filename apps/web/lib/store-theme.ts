import type { BusinessType } from "@filialhub/shared";

/**
 * Услуби ҳар навъи мағоза дар бозори онлайн: рангҳо, шакли кортҳо ва ороиш.
 * Мизоҷ аз намуди саҳифа мефаҳмад, ки дар тарабхона ё мағозаи хӯрокворӣ/либос/сантехника аст.
 */
export interface StoreTheme {
  /** Ранги асосӣ (тугмаҳо, нархҳо) */
  accent: string;
  /** Ранги матн рӯи accent */
  onAccent: string;
  /** Заминаи равшани кортҳо ва чипҳо */
  soft: string;
  /** Градиенти сарлавҳаи мағоза */
  hero: string;
  /** Эмоҷиҳои ороишӣ дар сарлавҳа */
  decor: string[];
  /** Кунҷҳои кортҳо */
  radius: string;
  /** Услуби ҳарфҳои номи мағоза */
  titleClass: string;
  /** Шиор */
  tagline: string;
}

export const STORE_THEMES: Record<BusinessType, StoreTheme> = {
  RESTAURANT: {
    accent: "#e4002b",
    onAccent: "#ffffff",
    soft: "#fff1ec",
    hero: "linear-gradient(135deg, #2b0a0f 0%, #8a1020 55%, #ff5a36 100%)",
    decor: ["🍔", "🍟", "🍗", "🥤"],
    radius: "1.5rem",
    titleClass: "font-extrabold tracking-tight",
    tagline: "Гарм ва болаззат — зуд мерасонем",
  },
  GROCERY: {
    accent: "#16a34a",
    onAccent: "#ffffff",
    soft: "#ecfdf3",
    hero: "linear-gradient(135deg, #064e3b 0%, #15803d 55%, #a3e635 100%)",
    decor: ["🍎", "🥕", "🥛", "🍞"],
    radius: "1.25rem",
    titleClass: "font-extrabold tracking-tight",
    tagline: "Маҳсулоти тоза ҳар рӯз",
  },
  CLOTHING: {
    accent: "#111827",
    onAccent: "#ffffff",
    soft: "#fdf2f8",
    hero: "linear-gradient(135deg, #0b0b0f 0%, #3b0a2a 60%, #db2777 100%)",
    decor: ["👗", "👕", "👟", "🧣"],
    radius: "0.25rem",
    titleClass: "font-light uppercase tracking-[0.25em]",
    tagline: "Мӯд ва бароҳатӣ барои ҳама",
  },
  PLUMBING: {
    accent: "#0369a1",
    onAccent: "#ffffff",
    soft: "#eff6ff",
    hero: "linear-gradient(135deg, #0c1a2e 0%, #075985 55%, #38bdf8 100%)",
    decor: ["🚰", "🔧", "🚿", "🛁"],
    radius: "0.5rem",
    titleClass: "font-bold tracking-tight",
    tagline: "Ҳама чиз барои об ва ҳаммом",
  },
  ELECTRONICS: {
    accent: "#4f46e5",
    onAccent: "#ffffff",
    soft: "#eef2ff",
    hero: "linear-gradient(135deg, #020617 0%, #312e81 55%, #06b6d4 100%)",
    decor: ["📱", "💻", "🎧", "📺"],
    radius: "1rem",
    titleClass: "font-bold tracking-tight",
    tagline: "Техникаи нав бо кафолат",
  },
  PHARMACY: {
    accent: "#0d9488",
    onAccent: "#ffffff",
    soft: "#f0fdfa",
    hero: "linear-gradient(135deg, #042f2e 0%, #0f766e 55%, #5eead4 100%)",
    decor: ["💊", "🩺", "🧴", "🌿"],
    radius: "1rem",
    titleClass: "font-semibold tracking-tight",
    tagline: "Саломатии шумо — ғамхории мо",
  },
  BUILDING: {
    accent: "#d97706",
    onAccent: "#1c1917",
    soft: "#fffbeb",
    hero: "linear-gradient(135deg, #1c1917 0%, #57534e 55%, #f59e0b 100%)",
    decor: ["🧱", "🔨", "🪣", "🪚"],
    radius: "0.375rem",
    titleClass: "font-black uppercase tracking-wide",
    tagline: "Маводи боэътимод барои сохтмон",
  },
  OTHER: {
    accent: "#7c3aed",
    onAccent: "#ffffff",
    soft: "#f5f3ff",
    hero: "linear-gradient(135deg, #1e1b4b 0%, #6d28d9 55%, #f472b6 100%)",
    decor: ["🏪", "🎁", "✨", "🛍️"],
    radius: "1rem",
    titleClass: "font-bold tracking-tight",
    tagline: "Хуш омадед ба мағозаи мо",
  },
};

export function storeTheme(type: BusinessType | null | undefined): StoreTheme {
  return STORE_THEMES[type ?? "OTHER"] ?? STORE_THEMES.OTHER;
}
