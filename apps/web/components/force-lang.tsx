"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useLang } from "@/lib/i18n";

// Суроғае, ки забонаш аллакай гузошта шуд. LangProvider ҳангоми ивази забон дарахтро аз нав месозад —
// бе ин ForceLang боз русиро мегузошт ва корбар дар /ru ба тоҷикӣ гузашта наметавонист.
let forcedPath: string | null = null;

/** Саҳифаи /ru/…: корбаре, ки аз ҷустуҷӯи русӣ омад, сайтро бо забони русӣ мебинад */
export function ForceLang({ lang }: { lang: "ru" }) {
  const { lang: current, setLang } = useLang();
  const pathname = usePathname();
  useEffect(() => {
    if (forcedPath === pathname) return;
    forcedPath = pathname;
    if (current !== lang) setLang(lang);
  }, [current, lang, setLang, pathname]);
  return null;
}
