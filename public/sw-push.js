// Push notification handler for the service worker
// This file is loaded by the main service worker

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "Time for your workout!",
      icon: data.icon || "/pwa-192x192.png",
      badge: data.badge || "/pwa-192x192.png",
      vibrate: [200, 100, 200],
      data: data.data || { url: "/workout" },
      actions: [
        { action: "open", title: "Start Workout" },
        { action: "dismiss", title: "Dismiss" },
      ],
      tag: "workout-reminder",
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "Workout Reminder", options)
    );
  } catch (err) {
    console.error("Push event error:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/workout";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
