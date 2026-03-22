const CACHE_NAME = 'mare-nostrum-v8';
const ASSETS = [
  './',
  './index.html',
  './sketch.js',
  './world.js',
  './player.js',
  './farming.js',
  './fishing.js',
  './npc.js',
  './ui.js',
  './events.js',
  './cinematics.js',
  './menu.js',
  './wreck.js',
  './combat.js',
  './diving.js',
  './economy.js',
  './islands.js',
  './narrative.js',
  './progression.js',
  './sound.js',
  './engine.js',
  './debug.js',
  './mobile.js',
  './multiplayer.js',
  './lobby.js',
  './naval.js',
  './sprites.js',
  './libs/p5.min.js',
  './libs/p5.sound.min.js',
  './libs/easystar.min.js',
  './libs/lz-string.min.js',
  './libs/cinzel-latin.woff2',
  './libs/cinzel-latin-ext.woff2',
  './menu_bg.webp',
  './manifest.json',
  './favicon.ico',
  // Sounds are NOT cached (too large ~80MB). They load on-demand from network.
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
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        // Cache sound files on first fetch so they're available offline next time
        if (response.ok && e.request.url.match(/\/sounds\//)) {
          let clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
