"use client";

import { api } from "./api";

/** Браузер огоҳии push-ро дастгирӣ мекунад? (iPhone — танҳо агар сайт ба экран илова шуда бошад) */
export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** Service worker-ро бақайд мегирем (як бор; барои push ва насб ҳамчун барнома) */
export function registerSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register("/sw.js").catch(() => null);
}

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function pushEnabled() {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}

/** Иҷозат мепурсем ва обунаро ба сервер мефиристем; false — корбар рад кард */
export async function enablePush() {
  if (!pushSupported()) return false;
  if ((await Notification.requestPermission()) !== "granted") return false;
  const reg = (await registerSW()) ?? (await navigator.serviceWorker.ready);
  const { key } = await api<{ key: string }>("/push/key");
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
  const json = sub.toJSON();
  await api("/push/subscribe", { method: "POST", json: { endpoint: sub.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth } });
  return true;
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await api("/push/unsubscribe", { method: "POST", json: { endpoint: sub.endpoint } }).catch(() => {});
  await sub.unsubscribe();
}
