// Service worker-и FilialHub: огоҳӣ ба телефон (Web Push), насб ҳамчун барнома
// ва кушодани саҳифаҳо бе интернет (POS-и офлайн).
// Версияро иваз кунед, агар рафтори кеш иваз шавад — кеши кӯҳна тоза мешавад.
const VERSION = "fh-sw-2";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
// Дар development (localhost) кеш намекунем — вагарна коди кӯҳна нишон дода мешавад
const CACHE_ON = !["localhost", "127.0.0.1", "[::1]"].includes(self.location.hostname);

self.addEventListener("install", (event) => {
  self.skipWaiting();
  if (CACHE_ON) event.waitUntil(caches.open(PAGES).then((c) => c.addAll(["/pos"]).catch(() => {})));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (!key.startsWith(VERSION)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (!CACHE_ON) return;
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Файлҳои сохташуда (JS/CSS/ҳарфҳо) номи ягона доранд — аввал аз кеш
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(ASSETS).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Саҳифаҳо: аввал интернет; бе интернет — нусхаи охирин (ё POS)
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const c = await caches.open(PAGES);
        try {
          const res = await fetch(req);
          if (res.ok) c.put(req, res.clone());
          return res;
        } catch {
          return (await c.match(req, { ignoreSearch: true })) ?? (await c.match("/pos")) ?? Response.error();
        }
      })(),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "FilialHub" };
  }
  const title = data.title || "FilialHub";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || undefined,
      // Занг — то ҷавоб дар экран мемонад
      requireInteraction: data.tag === "call",
      renotify: !!data.tag,
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/dashboard", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Агар сайт аллакай кушода бошад — ҳамон табро меорем
      for (const tab of tabs) {
        if (new URL(tab.url).origin === self.location.origin) {
          await tab.focus();
          if ("navigate" in tab) await tab.navigate(url).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
