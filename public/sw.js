/* Minimal service worker: displays scheduled notifications when a tab is open. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("message", (event) => {
  const data = event.data ?? {};
  if (data.type === "notify") {
    self.registration.showNotification(data.title, {
      body: data.body ?? "",
      icon: data.icon,
      tag: data.tag,
      renotify: true,
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("/");
    })
  );
});
