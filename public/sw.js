// Service Worker for GHS Hinder app
// Network-first for pages (always fresh after deploy)
// Cache-first for static assets (immutable hashed filenames)
// API requests handled by syncManager via IndexedDB

const CACHE_NAME = "ghs-hinder-v2";

// --- Install: activate immediately ---
self.addEventListener("install", () => {
  self.skipWaiting();
});

// --- Activate: clean old caches, take control ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// --- Fetch strategy ---
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET (mutations handled by syncManager)
  if (request.method !== "GET") return;

  // Skip API requests (handled by syncManager + IndexedDB)
  if (url.pathname.startsWith("/api/")) return;

  // Skip non-http (Chrome extensions etc.)
  if (!url.protocol.startsWith("http")) return;

  // Static assets (/_next/ with content hashes) — cache-first
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Pages & other resources — network-first (always fresh after deploy)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline — fall back to cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // For navigation, serve cached root page
          if (request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
