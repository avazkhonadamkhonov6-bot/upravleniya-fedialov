"use client";

import { CURRENCY } from "@filialhub/shared";
import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { DICT } from "./i18n-dict";

export const LANGS = [
  { code: "tg", label: "Тоҷикӣ", short: "TJ" },
  { code: "ru", label: "Русский", short: "RU" },
  { code: "en", label: "English", short: "EN" },
] as const;
export type Lang = (typeof LANGS)[number]["code"];

const LANG_KEY = "fh-lang";
const LANG_EVENT = "fh-lang-change";

// Забони ҷорӣ дар модул нигоҳ дошта мешавад, то tr() дар ҳама ҷо (ҳатто берун аз компонент) кор кунад.
// Ҳангоми иваз шудани забон LangProvider тамоми дарахтро аз нав месозад.
let current: Lang = "tg";

/**
 * Тарҷумаи матн. Калид — матни тоҷикӣ; {0}, {1} … бо args иваз мешаванд.
 * «Матн|контекст» — барои калимаҳои думаъно (масалан «Вазифа|position»); контекст нишон дода намешавад.
 */
export function tr(key: string, ...args: (string | number | null | undefined)[]): string {
  const bar = key.indexOf("|");
  let s = bar > 0 ? key.slice(0, bar) : key;
  if (current !== "tg") {
    const hit = DICT[key];
    if (hit) s = hit[current === "ru" ? 0 : 1];
  }
  return args.length ? s.replace(/\{(\d+)\}/g, (m, i) => (+i < args.length ? String(args[+i] ?? "") : m)) : s;
}

/** Локал барои toLocaleString / toLocaleDateString */
export function locale() {
  return current === "en" ? "en-GB" : "ru-RU";
}

export function formatMoney(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded.toLocaleString(locale(), { maximumFractionDigits: 2 })} ${tr(CURRENCY)}`;
}

function readLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === "tg" || v === "ru" || v === "en") return v;
  } catch {}
  return "tg";
}

const subscribeLang = (cb: () => void) => {
  window.addEventListener(LANG_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(LANG_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void } | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  // Дар сервер ва ҳангоми hydration ҳамеша "tg"; пас забони захирашуда (localStorage).
  const lang = useSyncExternalStore(subscribeLang, readLang, () => "tg" as Lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
    window.dispatchEvent(new Event(LANG_EVENT));
  }, []);

  // eslint-disable-next-line react-hooks/globals -- забон пеш аз рендери фарзандон гузошта мешавад
  current = lang;
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return (
    <LangContext.Provider value={value}>
      <Fragment key={lang}>{children}</Fragment>
    </LangContext.Provider>
  );
}

/** Матни тарҷумашаванда барои Server Component-ҳо (масалан саҳифаи асосӣ): дар сервер тоҷикӣ, дар браузер — забони интихобшуда */
export function T({ k, args = [] }: { k: string; args?: (string | number)[] }) {
  useLang();
  return tr(k, ...args);
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
