// SERVICE WORKER — SELF-DESTRUCT MODE
// This version immediately unregisters itself and clears all caches.
// After one page load, the browser will serve files directly from the local server.

self.addEventListener('install', () => {
  self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(names =>
              Promise.all(names.map(n => caches.delete(n)))
        ).then(() => self.registration.unregister())
             .then(() => self.clients.matchAll())
                  .then(clients => {
                         clients.forEach(client => client.navigate(client.url));
                              })
                                );
                                });

                                // Pass all fetches straight through to network — no caching
                                self.addEventListener('fetch', (event) => {
                                  event.respondWith(fetch(event.request));
                                  });
                                  