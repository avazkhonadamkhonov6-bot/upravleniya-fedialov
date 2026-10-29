"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { tr } from "@/lib/i18n";
import { Button } from "./ui";

/** Экрани хато барои error.tsx: ба ҷои саҳифаи сафед — паём ва тугмаи «Аз нав кӯшиш» */
export function ErrorView({ error, retry, home = "/" }: { error: unknown; retry: () => void; home?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-5 grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand">
        <TriangleAlert className="size-7" />
      </div>
      <h2 className="font-display text-xl font-bold text-ink">{tr("Чизе нодуруст шуд")}</h2>
      <p className="mt-2 text-sm text-muted">{tr("Ин қисми саҳифа бор нашуд. Аз нав кӯшиш кунед — агар такрор шавад, саҳифаро нав кунед.")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={retry}>
          <RotateCw className="size-4" />
          {tr("Аз нав кӯшиш")}
        </Button>
        <Link href={home} className="inline-flex h-12 items-center rounded-[14px] border-[1.5px] border-line bg-surface px-5 text-[15px] font-bold text-ink transition hover:border-ink">
          {tr("Ба саҳифаи асосӣ")}
        </Link>
      </div>
    </div>
  );
}
