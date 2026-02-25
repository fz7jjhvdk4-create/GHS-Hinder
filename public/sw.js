// Service Worker for GHS Hinder app
// Caches app shell (HTML, JS, CSS) for offline access
// API requests are handled by syncManager in the app via IndexedDB

const CACHE_NAME = "ghs-hinder-v1";

// App shell files to precache
const APP_SHELL = ["/", "/login", "/ghs-logo.jpg", "/manifest.json"];

// --- Install: precache app shell ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// --- Activate: clean old caches ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// --- Fetch: cache-first for app shell, skip API ---
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET (mutations handled by syncManager)
  if (request.method !== "GET") return;

  // Skip API requests (handled by syncManager + IndexedDB)
  if (url.pathname.startsWith("/api/")) return;

  // Skip non-http (Chrome extensions etc.)
  if (!url.protocol.startsWith("http")) return;

  // Cache-first with background revalidation
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Return cached immediately, update in background
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clone);
              });
            }
          })
          .catch(() => {
            /* offline, keep using cache */
          });
        return cached;
      }

      // Not in cache — try network, cache on success
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline and not cached — for navigation, return cached root
          if (request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Offline", { status: 503 });
        });
    })
  );
});
