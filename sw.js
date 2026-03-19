const CACHE_NAME = 'mare-nostrum-v1';
const ASSETS = [
  'index.html',
  'engine.js',
  'sound.js',
  'narrative.js',
  'cinematics.js',
  'sketch.js',
  'wreck.js',
  'menu.js',
  'islands.js',
  'diving.js',
  'combat.js',
  'economy.js',
  'debug.js',
  'menu_bg.webp',
  'favicon.ico',
  'manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
