const CACHE_NAME = 'mare-nostrum-v12';
const ASSETS = [
  './',
  './index.html',
  // Core engine
  './sketch.js',
  './engine.js',
  './sprites.js',
  './sound.js',
  // V2 core systems
  './v2-safety.js',
  './mediterranean.js',
  './graph.js',
  './nations.js',
  './world-state.js',
  // World & environment
  './world.js',
  './islands.js',
  './environment.js',
  // Player & progression
  './player.js',
  './progression.js',
  './expansion.js',
  './lifecycle.js',
  // Economy & building
  './economy.js',
  './merchant.js',
  './building.js',
  './farming.js',
  './fishing.js',
  // Combat & military
  './combat.js',
  './military.js',
  './naval.js',
  './conquest.js',
  './strategy.js',
  // Ships & sailing
  './sailing.js',
  './ship_home.js',
  // UI & input
  './ui.js',
  './menu.js',
  './input.js',
  './debug.js',
  './mobile.js',
  './faction_emblems.js',
  './faction_select.js',
  // Social & events
  './npc.js',
  './social.js',
  './events.js',
  './narrative.js',
  './cinematics.js',
  './diplomacy.js',
  './sea_events.js',
  // Systems
  './systems.js',
  './companions.js',
  './pets.js',
  './effects.js',
  './diving.js',
  './wreck.js',
  './lighthouse.js',
  './tavern.js',
  // AI
  './bot.js',
  // Save
  './save.js',
  // Libraries
  './libs/p5.min.js',
  './libs/p5.sound.min.js',
  './libs/easystar.min.js',
  './libs/lz-string.min.js',
  './libs/cinzel-latin.woff2',
  './libs/cinzel-latin-ext.woff2',
  // Assets
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
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // App code (navigations, .html/.js/.json) → NETWORK-FIRST so reloads always
  // get the latest build. Falls back to cache only when offline.
  const isCode = e.request.mode === 'navigate' || /\.(html|js|json)$/.test(url.pathname);
  if (isCode) {
    e.respondWith(
      fetch(e.request).then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }
  // Static/big assets (fonts, images, sounds) → CACHE-FIRST for speed + offline.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        if (response && response.ok &&
            (url.pathname.match(/\/sounds\//) || url.pathname.match(/\.(woff2|webp|ico|png|jpg|mp3|ogg|wav)$/))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    })
  );
});
