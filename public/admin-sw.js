// Service Worker for Shop Admin PWA (Multi-tenant)
// Scoped to /admin routes only - does NOT affect the main website

const CACHE_NAME = 'shop-admin-v3';
const ADMIN_SHELL = [
  '/admin',
  '/hdg_app_icon.png',
  '/hdg_app_icon_1024.png',
];

// Install: cache admin shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ADMIN_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && (key.startsWith('hdg-admin-') || key.startsWith('shop-admin-')))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for admin pages, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle admin-scoped requests and same-origin
  if (url.origin !== self.location.origin) return;

  // Skip API calls - always go to network
  if (url.pathname.startsWith('/api/')) return;

  // Only cache admin-related assets
  if (!url.pathname.startsWith('/admin') && 
      !url.pathname.startsWith('/_next/') &&
      !url.pathname.startsWith('/hdg_app_icon')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // If admin page requested offline, serve cached admin shell
          if (event.request.mode === 'navigate') {
            return caches.match('/admin');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
