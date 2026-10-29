"use client";

import { useCallback, useEffect, useState } from "react";
import { api, getToken } from "./api";

interface State<T> {
  data: T | undefined;
  error: string | null;
  /** Калиди дархосте, ки ҷавобаш дар state аст: `${path}#${version}` */
  key: string | null;
}

// Кеши умумии ҷавобҳо: саҳифае, ки пештар кушода шуда буд, фавран нишон дода мешавад ва дар пас нав мешавад.
// Калид токенро дар бар мегирад, то пас аз ивази корбар/корхона маълумоти бегона нишон дода нашавад.
const MAX_ENTRIES = 150;
const cache = new Map<string, { data: unknown; at: number }>();
const inflight = new Map<string, Promise<unknown>>();
/** Пас аз баргаштан ба таб маълумоти аз ин кӯҳнатар нав карда мешавад */
const STALE_ON_FOCUS_MS = 30_000;

const cacheKey = (path: string) => `${getToken() ?? ""}|${path}`;

function readCache<T>(path: string) {
  return cache.get(cacheKey(path)) as { data: T; at: number } | undefined;
}

function writeCache(k: string, data: unknown) {
  cache.delete(k);
  cache.set(k, { data, at: Date.now() });
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
}

/** Як дархост барои якчанд компоненти ҳамзамон (масалан ду виджет бо ҳамон path) */
function load<T>(path: string, fresh: boolean): Promise<T> {
  const k = cacheKey(path);
  const running = inflight.get(k);
  // Пас аз reload() дархости кӯҳнаро истифода намебарем — шояд пеш аз тағйир фиристода шуда бошад
  if (running && !fresh) return running as Promise<T>;
  const p = api<T>(path)
    .then((data) => {
      writeCache(k, data);
      return data;
    })
    .finally(() => inflight.get(k) === p && inflight.delete(k));
  inflight.set(k, p);
  return p;
}

/** Ҳангоми баромадан аз аккаунт кешро тоза мекунем */
export function clearApiCache() {
  cache.clear();
  inflight.clear();
}

/** Хуки хурд барои гирифтани маълумот: { data, error, loading, reload }. path=null — дархост намефиристад. */
export function useApi<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<State<T>>({ data: undefined, error: null, key: null });
  const key = path ? `${path}#${version}` : null;
  const cached = path ? readCache<T>(path) : undefined;

  useEffect(() => {
    if (!path || !key) return;
    let cancelled = false;
    load<T>(path, version > 0)
      .then((data) => !cancelled && setState({ data, error: null, key }))
      .catch((e: Error) => !cancelled && setState((s) => ({ ...s, error: e.message, key })));
    return () => {
      cancelled = true;
    };
  }, [path, key, version]);

  // Баргаштан ба таб — агар маълумот кӯҳна бошад, дар пас нав мекунем
  useEffect(() => {
    if (!path) return;
    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      const c = readCache(path);
      if (!c || Date.now() - c.at > STALE_ON_FOCUS_MS) setVersion((v) => v + 1);
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [path]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const settled = key !== null && state.key === key;
  // То омадани ҷавоби нав: аввал кеш, баъд маълумоти кӯҳнаи ҳамин хук (масалан ҳангоми ивази саҳифа)
  const data = settled ? state.data : (cached?.data ?? state.data);
  return { data, error: settled ? state.error : null, loading: key !== null && !settled && !cached, reload };
}
