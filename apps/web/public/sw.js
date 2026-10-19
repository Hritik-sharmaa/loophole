// Loophole's service worker (ADR-022). Deliberately small:
// - Next's hashed build files (/_next/static/) are cached on first use and
//   served from the cache after that; their names change on every deploy.
// - Page loads go to the network; with no network, a page seen before is
//   served from the cache, otherwise the /offline page.
// - Everything else, including every API and Supabase call (other
//   origins), is not touched: grading, XP and auth always need the server.
// Bump VERSION to drop every old cache on the next visit.

const VERSION = 'v1';
const STATIC_CACHE = `loophole-static-${VERSION}`;
const PAGE_CACHE = `loophole-pages-${VERSION}`;
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([STATIC_CACHE, PAGE_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(pageFromNetwork(request));
    return;
  }
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staticFromCache(request));
  }
});

async function pageFromNetwork(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) void cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request)) ??
      (await cache.match(OFFLINE_URL)) ??
      Response.error()
    );
  }
}

async function staticFromCache(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) void cache.put(request, response.clone());
  return response;
}
