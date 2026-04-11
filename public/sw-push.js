// Push notification handler for workout reminders
self.addEventListener("push", (event) => {
  let data = { title: "GuideStride", body: "Time for your workout!" };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // use defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "GuideStride", {
      body: data.body || "⏰ Time for your workout! Stay consistent and hit your goals.",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      vibrate: [200, 100, 200],
      data: { url: data.url || "/workout" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/workout";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
