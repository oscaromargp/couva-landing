/* Service worker — cachea el "shell" de la app para uso offline en campo. */
const CACHE = 'pdi-couva-v4';
const SHELL = ['/', '/index.html', '/styles.css', '/db.js', '/app.js', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Nunca cachear la API ni los medios: siempre a la red.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/') || url.pathname.startsWith('/r/')) return;
  // Shell: cache-first con actualización en segundo plano.
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res && res.status === 200 && e.request.method === 'GET') { const cl = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, cl)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
