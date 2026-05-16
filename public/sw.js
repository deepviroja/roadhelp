const CACHE_NAME = 'roadhelp-v2'; // Bump version
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Bypass cache for Firebase, Google APIs, and OSRM
  const bypassHostnames = ['firebase', 'googleapis', 'project-osrm.org', 'openstreetmap.org'];
  if (bypassHostnames.some(hostname => event.request.url.includes(hostname))) {
    return;
  }

  // Network First strategy
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      })
      .catch(() => {
        return caches.match(event.request).then(async (cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            const fallback =
              (await caches.match('/index.html')) ||
              (await caches.match('/')) ||
              new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
            return fallback;
          }
          return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        });
      })
  );
});
