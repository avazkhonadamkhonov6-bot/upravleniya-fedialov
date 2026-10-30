// Service worker-и FilialHub: огоҳӣ ба телефон (Web Push) ва насб ҳамчун барнома.
// Версияро иваз кунед, агар рафтори кор иваз шавад — браузер онро нав мекунад.
const VERSION = "fh-sw-1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
      data: { url: data.url || "/dashboard", version: VERSION },
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
