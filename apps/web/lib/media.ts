"use client";

import { useEffect, useRef, useState } from "react";
import { getToken } from "./api";
import { tr } from "./i18n";

/**
 * Форматҳо бо тартиби афзалият: аввал онҳое, ки Telegram/WhatsApp бевосита мефаҳманд
 * (OGG/Opus ва MP4 — овози Telegram ва «видеои мудаввар»), баъд WebM (Chrome).
 */
const AUDIO_TYPES = ["audio/ogg;codecs=opus", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
const VIDEO_TYPES = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp8,opus", "video/webm"];

export function pickMime(kind: "audio" | "video"): string {
  if (typeof MediaRecorder === "undefined") return "";
  return (kind === "audio" ? AUDIO_TYPES : VIDEO_TYPES).find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function mediaSupported() {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

/** Хатои дастрасӣ ба микрофон/камера бо забони одамфаҳм */
export function mediaError(e: unknown): string {
  const name = (e as DOMException)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return tr("Иҷозат ба микрофон/камера дода нашуд. Дар браузер иҷозат диҳед.");
  if (name === "NotFoundError" || name === "OverconstrainedError") return tr("Микрофон ё камера ёфт нашуд.");
  if (name === "NotReadableError") return tr("Микрофон ё камераро барномаи дигар истифода мебарад.");
  return tr("Сабт оғоз нашуд.");
}

/** Файли паём (овоз/видео) бо токен гирифта мешавад ва ҳамчун blob: URL дода мешавад. */
const cache = new Map<number, Promise<string>>();
export function mediaUrl(id: number): Promise<string> {
  let p = cache.get(id);
  if (!p) {
    const token = getToken();
    p = fetch(`/api/messages/media/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(async (r) => {
      if (!r.ok) throw new Error(String(r.status));
      return URL.createObjectURL(await r.blob());
    });
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

export function useMediaUrl(id: number | null) {
  const [state, setState] = useState<{ id: number | null; url: string | null; error: boolean }>({ id: null, url: null, error: false });
  useEffect(() => {
    if (!id) return;
    let alive = true;
    mediaUrl(id)
      .then((url) => alive && setState({ id, url, error: false }))
      .catch(() => alive && setState({ id, url: null, error: true }));
    return () => {
      alive = false;
    };
  }, [id]);
  return state.id === id ? state : { id, url: null, error: false };
}

export interface Recording {
  blob: Blob;
  mime: string;
  seconds: number;
}

/**
 * Сабт аз MediaStream: start() → stop() (бо файл) ё cancel() (бе файл).
 * maxSeconds — сабт худкор қатъ мешавад.
 */
export function useRecorder(maxSeconds: number) {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const done = useRef<((r: Recording | null) => void) | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      setSeconds(s);
      if (s >= maxSeconds) recorder.current?.stop();
    }, 250);
    return () => clearInterval(t);
  }, [recording, maxSeconds]);

  function start(stream: MediaStream, mime: string, opts: MediaRecorderOptions = {}): Promise<Recording | null> {
    chunks.current = [];
    const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), ...opts });
    recorder.current = rec;
    startedAt.current = Date.now();
    setSeconds(0);
    setRecording(true);
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    return new Promise((resolve) => {
      done.current = resolve;
      rec.onstop = () => {
        setRecording(false);
        const secs = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
        const type = (rec.mimeType || mime || chunks.current[0]?.type || "").split(";")[0];
        const finish = done.current;
        done.current = null;
        finish?.(chunks.current.length ? { blob: new Blob(chunks.current, { type }), mime: type, seconds: Math.min(secs, maxSeconds) } : null);
      };
      rec.start(250);
    });
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  function cancel() {
    chunks.current = [];
    const finish = done.current;
    done.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
    finish?.(null);
  }

  return { start, stop, cancel, seconds, recording };
}

export const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
