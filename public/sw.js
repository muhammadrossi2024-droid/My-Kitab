// Minimal offline cache for the app shell — deliberately not a precache of
// specific build filenames, since Vite's output is content-hashed and
// changes every build; runtime caching (cache what's actually fetched,
// serve it back when offline) works with any build without needing to be
// regenerated. Separate from the "quran-offline-v1" Cache Storage bucket
// utils/offline.js manages directly for downloaded recitation audio — same
// browser API, different named cache, no overlap.
const CACHE_NAME = "mykitab-app-shell-v2";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME && key.startsWith("mykitab-app-shell")).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Leave the app's own API routes and data-fetch/audio traffic alone —
  // this cache is for the app shell (HTML/JS/CSS/icons), not for content
  // that should always be fresh or that utils/offline.js already manages.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await caches.match("/");
          if (shell) return shell;
        }
        throw new Error("offline and not cached");
      })
  );
});
