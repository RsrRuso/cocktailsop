// Service Worker for offline caching, faster loads, and push notifications

// NOTE:
// This SW is used for both the main app and the Procurement install flow.
// It MUST support SPA navigation (return /index.html for navigation requests) to avoid "black screen".

const CACHE_VERSION = 'v4';
const PRECACHE = `precache-${CACHE_VERSION}`;
const RUNTIME = `runtime-${CACHE_VERSION}`;

// Assets to cache immediately (app shell)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/procurement.html',
  '/procurement-manifest.json',
  '/batch-calculator.html',
  '/batch-calculator-manifest.json',
  '/batch-calculator-icon-192.png',
  '/batch-calculator-icon-512.png',
  '/sv-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/notification.wav',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== PRECACHE && name !== RUNTIME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function matchFromAnyCache(request) {
  const cachedRuntime = await caches.open(RUNTIME).then((c) => c.match(request));
  if (cachedRuntime) return cachedRuntime;

  const cachedPre = await caches.open(PRECACHE).then((c) => c.match(request));
  if (cachedPre) return cachedPre;

  return undefined;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GETs
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  const url = new URL(req.url);

  // SPA navigation handling (critical for iOS home screen web app)
  const isNavigation =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  event.respondWith(
    (async () => {
      // For navigation requests, always try network first, then fall back to cached app shell.
      if (isNavigation) {
        try {
          const res = await fetch(req);
          // Cache the navigation response for faster next loads
          const cache = await caches.open(RUNTIME);
          cache.put(req, res.clone());
          return res;
        } catch {
          // IMPORTANT: querystring start_url (e.g. /procurement-pin-access?app=procurement)
          // won't match exact cache keys, so always fall back to the cached app shell.
          return (
            (await matchFromAnyCache(req)) ||
            (await matchFromAnyCache('/index.html')) ||
            (await matchFromAnyCache('/'))
          );
        }
      }

      // For assets/API: network-first, then cache fallback
      try {
        const res = await fetch(req);
        if (res && res.status === 200) {
          const cache = await caches.open(RUNTIME);
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        // try exact match, then try without querystring
        return (
          (await matchFromAnyCache(req)) ||
          (url.search ? await matchFromAnyCache(url.pathname) : undefined)
        );
      }
    })()
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'New Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'notification',
    requireInteraction: false,
    silent: false,
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(urlToOpen);
      })
  );
});

// Background sync for notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(Promise.resolve());
  }
});
