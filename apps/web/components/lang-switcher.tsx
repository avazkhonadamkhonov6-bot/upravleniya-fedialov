"use client";

import { usePathname, useRouter } from "next/navigation";
import { LANGS, tr, useLang, type Lang } from "@/lib/i18n";
import { cn } from "./ui";

/**
 * Ивази забон: ТҶ / RU / EN — се тугма дар як қатор (дизайни FilialHub).
 * routes — агар забон суроғаи худро дошта бошад (саҳифаи асосӣ: / ва /ru), ба он ҷо мегузарад.
 */
export function LangSwitcher({ className, routes }: { className?: string; routes?: Partial<Record<Lang, string>> }) {
  const { lang, setLang } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const pick = (code: Lang) => {
    setLang(code);
    const to = routes?.[code];
    if (to && to !== pathname) router.push(to);
  };
  return (
    <div className={className ?? "relative"}>
      <div role="group" aria-label={tr("Забон")} className="flex gap-0.5 rounded-[14px] bg-surface-2 p-1">
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => pick(l.code)}
            aria-pressed={l.code === lang}
            title={l.label}
            className={cn(
              "h-8 cursor-pointer rounded-[10px] px-2 text-[11px] font-bold transition sm:h-9 sm:px-2.5 sm:text-xs",
              l.code === lang ? "bg-ink text-bg" : "text-ink hover:bg-surface",
            )}
          >
            {l.code === "tg" ? "ТҶ" : l.short}
          </button>
        ))}
      </div>
    </div>
  );
}
