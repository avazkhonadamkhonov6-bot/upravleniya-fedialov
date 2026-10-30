"use client";

import { useEffect } from "react";
import { useLang } from "@/lib/i18n";

/** Саҳифаи /ru/…: корбаре, ки аз ҷустуҷӯи русӣ омад, сайтро бо забони русӣ мебинад */
export function ForceLang({ lang }: { lang: "ru" }) {
  const { lang: current, setLang } = useLang();
  useEffect(() => {
    if (current !== lang) setLang(lang);
  }, [current, lang, setLang]);
  return null;
}
