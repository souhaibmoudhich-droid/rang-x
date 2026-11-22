/* Rang X — service worker : l'app fonctionne hors ligne après la première visite. */
const VERSION = 'rangx-v1';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/standards.js', 'js/program.js', 'js/bosses.js', 'js/pose.js',
  'js/run.js', 'js/social.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== self.location.origin && !fonts) return; // ex. Firebase : jamais mis en cache
  const immutable = fonts || url.pathname.includes('/vendor/');
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit && immutable) return hit;
    const net = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => hit || caches.match('index.html'));
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  }));
});
