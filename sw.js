/* RAFIQ cache is deliberately versioned; change this on every release. */
const CACHE_NAME = 'rafiq-static-20260928-1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/assets/rafig-logo-hq.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('rafiq-static-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/admin') || url.pathname.startsWith('/agent')) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && url.pathname.match(/\.(?:html|css|js|webmanifest|svg|png|jpg)$/)) {
      const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then(hit => hit || caches.match('/index.html'))));
});
