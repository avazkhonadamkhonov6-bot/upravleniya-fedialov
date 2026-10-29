"use client";

import { useEffect, useRef } from "react";

/**
 * setInterval, ки ҳангоми пинҳон будани таб дархост намефиристад (серверро беҳуда бор намекунад)
 * ва ҳангоми баргаштан ба таб фавран як бор иҷро мешавад.
 */
export function useVisibleInterval(fn: () => void, ms: number) {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  }, [fn]);

  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && saved.current();
    const t = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [ms]);
}
