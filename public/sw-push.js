// Custom push notification and deep-link handler for Our Space PWA

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "Our Space ✨";
    const targetUrl = data.url || data.data?.url || "/app";

    const options = {
      body: data.body || "",
      icon: data.icon || "/icons/icon-192.png",
      badge: data.badge || "/icons/icon-192.png",
      data: {
        url: targetUrl,
        category: data.category,
        ...(data.data || {}),
      },
      tag: data.tag || data.category || "our-space-notification",
      renotify: true,
      vibrate: [100, 50, 100],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (_e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Our Space ✨", {
        body: text,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: "/app" },
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || "/app";
  const urlToOpen = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window from same origin and navigate to deep link
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(urlToOpen);
            }
            return;
          }
        }
        // Otherwise open a new window to the target route
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
