import { DICT } from "./i18n-dict";

// Тарҷума дар сервер (Server Components): саҳифаи /ru бо матни тайёри русӣ ба Google меравад.
// Луғат танҳо дар сервер аст — ба браузер фиристода намешавад. Қоидаҳо ҳамонанд, ки tr() дар lib/i18n.tsx.
export function trServer(lang: "tg" | "ru" | "en", key: string, ...args: (string | number | null | undefined)[]): string {
  const bar = key.indexOf("|");
  let s = bar > 0 ? key.slice(0, bar) : key;
  if (lang !== "tg") {
    const hit = DICT[key];
    if (hit) s = hit[lang === "ru" ? 0 : 1];
  }
  return args.length ? s.replace(/\{(\d+)\}/g, (m, i) => (+i < args.length ? String(args[+i] ?? "") : m)) : s;
}
