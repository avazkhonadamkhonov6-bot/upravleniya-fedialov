"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

interface State<T> {
  data: T | undefined;
  error: string | null;
  /** Калиди дархосте, ки ҷавобаш дар state аст: `${path}#${version}` */
  key: string | null;
}

/** Хуки хурд барои гирифтани маълумот: { data, error, loading, reload }. path=null — дархост намефиристад. */
export function useApi<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<State<T>>({ data: undefined, error: null, key: null });
  const key = path ? `${path}#${version}` : null;

  useEffect(() => {
    if (!path || !key) return;
    let cancelled = false;
    api<T>(path)
      .then((data) => !cancelled && setState({ data, error: null, key }))
      .catch((e: Error) => !cancelled && setState((s) => ({ ...s, error: e.message, key })));
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  // Маълумоти кӯҳна то омадани ҷавоби нав нигоҳ дошта мешавад (масалан ҳангоми ивази саҳифа).
  return { data: state.data, error: state.error, loading: key !== null && state.key !== key, reload };
}
