// Precache the generated entry and its linked bundles on the first visit.
// No external resources or user planning data are sent anywhere.
const CACHE = "tripwise-shell-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const entry = new URL("./", self.registration.scope);
      const response = await fetch(entry, { cache: "reload" });
      if (!response.ok) throw new Error("Could not cache TripWise shell");
      const html = await response.clone().text();
      const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
        .map((match) => new URL(match[1], entry))
        .filter(
          (url) =>
            url.origin === self.location.origin &&
            url.pathname.includes("/assets/"),
        );
      await cache.addAll([
        ...assets.map((url) => url.href),
        new URL("./journey.svg", entry).href,
      ]);
      await cache.put(entry, response);
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(new URL(self.registration.scope).pathname)
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then((cache) => cache.put(event.request, copy)),
          );
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          const shell = await caches.match(
            new URL("./", self.registration.scope),
          );
          if (shell) return shell;
        }
        return Response.error();
      }),
  );
});
