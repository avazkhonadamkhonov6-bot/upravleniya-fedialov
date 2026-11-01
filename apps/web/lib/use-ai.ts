"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

// Тугмаҳои AI танҳо вақте намоёнанд, ки дар сервер калиди Claude (ANTHROPIC_API_KEY) гузошта шуда бошад.
// Як дархост барои тамоми сайт; то омадани ҷавоб пинҳон — мизоҷ тугмаи корнакунандаро намебинад.
let known: boolean | null = null;
let loading: Promise<boolean> | null = null;

export function useAiEnabled() {
  const [on, setOn] = useState(known ?? false);
  useEffect(() => {
    if (known !== null) return;
    loading ??= api<{ enabled: boolean }>("/ai/status")
      .then((r) => (known = r.enabled))
      .catch(() => {
        loading = null; // хатои шабака — дафъаи дигар аз нав мепурсем
        return false;
      });
    let alive = true;
    void loading.then((v) => alive && setOn(v));
    return () => {
      alive = false;
    };
  }, []);
  return on;
}
