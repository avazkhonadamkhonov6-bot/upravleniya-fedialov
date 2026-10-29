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
  /** Заминаи сарлавҳаи мағоза (дизайни FilialHub — якранг) */
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
    accent: "#dc3b1c",
    onAccent: "#ffffff",
    soft: "#ffe9dc",
    hero: "#dc3b1c",
    decor: ["🍔", "🍟", "🍗", "🥤"],
    radius: "1.75rem",
    titleClass: "font-display font-extrabold uppercase tracking-tight",
    tagline: "Гарм ва болаззат — зуд мерасонем",
  },
  GROCERY: {
    accent: "#1e7a45",
    onAccent: "#ffffff",
    soft: "#e3f4e9",
    hero: "#1e7a45",
    decor: ["🍎", "🥕", "🥛", "🍞"],
    radius: "1.5rem",
    titleClass: "font-display font-bold tracking-tight",
    tagline: "Маҳсулоти тоза ҳар рӯз",
  },
  CLOTHING: {
    accent: "#16120f",
    onAccent: "#ffffff",
    soft: "#f3ebdf",
    hero: "#16120f",
    decor: ["👗", "👕", "👟", "🧣"],
    radius: "0.375rem",
    titleClass: "font-serif font-bold uppercase tracking-[0.14em]",
    tagline: "Мӯд ва бароҳатӣ барои ҳама",
  },
  PLUMBING: {
    accent: "#1f5fad",
    onAccent: "#ffffff",
    soft: "#eaf1fb",
    hero: "#1f5fad",
    decor: ["🚰", "🔧", "🚿", "🛁"],
    radius: "1.125rem",
    titleClass: "font-extrabold tracking-tight",
    tagline: "Ҳама чиз барои об ва ҳаммом",
  },
  ELECTRONICS: {
    accent: "#2b2f5c",
    onAccent: "#ffffff",
    soft: "#e8ebff",
    hero: "#1c1f3d",
    decor: ["📱", "💻", "🎧", "📺"],
    radius: "0.875rem",
    titleClass: "font-display font-bold uppercase tracking-wide",
    tagline: "Техникаи нав бо кафолат",
  },
  PHARMACY: {
    accent: "#0e5a52",
    onAccent: "#ffffff",
    soft: "#ddf1ee",
    hero: "#0e5a52",
    decor: ["💊", "🩺", "🧴", "🌿"],
    radius: "1.875rem",
    titleClass: "font-bold tracking-tight",
    tagline: "Саломатии шумо — ғамхории мо",
  },
  BUILDING: {
    accent: "#16120f",
    onAccent: "#ffc531",
    soft: "#fff1c9",
    hero: "#16120f",
    decor: ["🧱", "🔨", "🪣", "🪚"],
    radius: "0.5rem",
    titleClass: "font-display font-extrabold uppercase tracking-tight",
    tagline: "Маводи боэътимод барои сохтмон",
  },
  OTHER: {
    accent: "#dc3b1c",
    onAccent: "#ffffff",
    soft: "#ffe9dc",
    hero: "#16120f",
    decor: ["🏪", "🎁", "✨", "🛍️"],
    radius: "1.25rem",
    titleClass: "font-display font-bold tracking-tight",
    tagline: "Хуш омадед ба мағозаи мо",
  },
};

export function storeTheme(type: BusinessType | null | undefined): StoreTheme {
  return STORE_THEMES[type ?? "OTHER"] ?? STORE_THEMES.OTHER;
}
