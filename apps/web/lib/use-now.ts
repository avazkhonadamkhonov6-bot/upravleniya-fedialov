"use client";

import { useEffect, useState } from "react";

/** Вақти ҷорӣ, ки ҳар `intervalMs` нав мешавад — render-ро тоза (pure) нигоҳ медорад. */
export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
