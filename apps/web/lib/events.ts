"use client";

import type { ServerEvent } from "@filialhub/shared";
import { useEffect, useRef } from "react";
import { getToken } from "./api";

// Як пайвасти /api/events барои ҳамаи компонентҳо. EventSource сарлавҳаи Authorization
// намефиристад, бинобар ин fetch-ро бо ReadableStream мехонем.
// data — танҳо барои «activity» ва «presence»; дигар рӯйдодҳо холӣ ({}) меоянд.
type Listener = (data: unknown) => void;
const listeners = new Map<ServerEvent, Set<Listener>>();
let controller: AbortController | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let backoff = 2_000;

function dispatch(type: string, data: unknown) {
  listeners.get(type as ServerEvent)?.forEach((fn) => fn(data));
}

async function connect() {
  const token = getToken();
  if (!token || controller) return;
  const ctl = new AbortController();
  controller = ctl;
  try {
    const res = await fetch("/api/events", { headers: { Authorization: `Bearer ${token}` }, signal: ctl.signal, cache: "no-store" });
    if (!res.ok || !res.body) throw new Error(String(res.status));
    backoff = 2_000;
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      let end: number;
      while ((end = buf.indexOf("\n\n")) >= 0) {
        const lines = buf.slice(0, end).split("\n");
        buf = buf.slice(end + 2);
        const ev = lines.find((l) => l.startsWith("event: "));
        const raw = lines.find((l) => l.startsWith("data: "));
        let data: unknown = {};
        try {
          if (raw) data = JSON.parse(raw.slice(6));
        } catch {}
        if (ev) dispatch(ev.slice(7).trim(), data);
      }
    }
  } catch {
    // шабака ё сервер — пас аз таваққуф аз нав
  }
  if (controller !== ctl) return;
  controller = null;
  if (listeners.size) {
    retryTimer = setTimeout(connect, backoff);
    backoff = Math.min(backoff * 2, 60_000);
  }
}

function disconnect() {
  clearTimeout(retryTimer);
  controller?.abort();
  controller = null;
}

/** Обуна ба хабари фаврӣ; функсияи бозгашт обунаро бекор мекунад */
export function subscribe(type: ServerEvent, fn: Listener) {
  let set = listeners.get(type);
  if (!set) listeners.set(type, (set = new Set()));
  set.add(fn);
  void connect();
  return () => {
    set.delete(fn);
    if (!set.size) listeners.delete(type);
    if (!listeners.size) disconnect();
  };
}

/** Хуки обуна: fn ҳар бор, ки сервер хабари `type` мефиристад (бо data, агар бошад) */
export function useServerEvent<T = unknown>(type: ServerEvent, fn: (data: T) => void) {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  }, [fn]);
  useEffect(() => subscribe(type, (data) => saved.current(data as T)), [type]);
}
