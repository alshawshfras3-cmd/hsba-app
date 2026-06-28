const CACHE_NAME = "hesba-pwa-v3";
const OFFLINE_FALLBACK = "/index.html";

const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("Failed to precache assets on install:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // CRITICAL: NEVER cache Supabase API, Auth, Edge Functions, or other external APIs
  if (
    url.hostname.includes("supabase.co") || 
    url.pathname.includes("/api/") ||
    url.pathname.includes("/auth/") ||
    url.pathname.includes("/admin") ||
    event.request.url.startsWith("chrome-extension:") ||
    event.request.url.startsWith("android-app:")
  ) {
    return;
  }

  // Handle Navigation Requests (Network First with Cache Fallback)
  if (event.request.mode === "navigate") {
    if (url.pathname.includes("/admin")) {
      return;
    }
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Cache the fresh index.html dynamically to keep offline fallback updated
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(OFFLINE_FALLBACK, cacheCopy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails, serve index.html from cache
          return caches.match(OFFLINE_FALLBACK);
        })
    );
    return;
  }

  // Handle Static Assets (Cache First)
  // Check if it's a local asset (js, css, images, fonts, etc.)
  const isStaticAsset = 
    url.origin === self.location.origin && 
    (url.pathname.includes("/assets/") ||
     url.pathname.endsWith(".js") ||
     url.pathname.endsWith(".css") ||
     url.pathname.endsWith(".png") ||
     url.pathname.endsWith(".jpg") ||
     url.pathname.endsWith(".jpeg") ||
     url.pathname.endsWith(".svg") ||
     url.pathname.endsWith(".woff") ||
     url.pathname.endsWith(".woff2") ||
     url.pathname.endsWith(".webmanifest"));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
          return networkResponse;
        }).catch(() => {
          return cachedResponse || new Response("Asset not available offline", { status: 404 });
        });
      })
    );
    return;
  }

  // General Network First with Cache Fallback for any other local resource
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cacheCopy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});
