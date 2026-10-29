"use client";

// Хатоҳои браузер ба логи API (/api/client-errors) мераванд, то соҳиби сайт онҳоро бинад.
// Ҳамон хато як бор; дар як саҳифа на зиёда аз 10 — то сервер бор нашавад.
const sent = new Set<string>();

export function reportError(error: unknown) {
  const e = error instanceof Error ? error : new Error(typeof error === "string" ? error : JSON.stringify(error ?? null));
  const key = e.message + location.pathname;
  if (sent.has(key) || sent.size >= 10) return;
  sent.add(key);
  const body = JSON.stringify({
    message: e.message.slice(0, 1000) || "Unknown error",
    stack: e.stack?.slice(0, 4000),
    url: location.pathname.slice(0, 500),
  });
  try {
    if (!navigator.sendBeacon?.("/api/client-errors", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/client-errors", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch {}
}

/** Хатоҳои ҷаҳонии саҳифа (window.onerror, Promise-и радшуда) */
export function listenForErrors() {
  const onError = (ev: ErrorEvent) => reportError(ev.error ?? ev.message);
  const onRejection = (ev: PromiseRejectionEvent) => reportError(ev.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
