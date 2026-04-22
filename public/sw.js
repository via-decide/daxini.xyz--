const STATIC_CACHE = "zayvora-static-v1";
const RUNTIME_CACHE = "zayvora-runtime-v1";
const TOOLKIT_CACHE = "zayvora-toolkit-v1";

const STATIC_FILES = [
  "/",
  "/zayvora/",
  "/zayvora/index.html",
  "/zayvora/app.js",
  "/zayvora/style.css"
];

self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_FILES))

  );

  self.skipWaiting();

});

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys().then(keys => {

      return Promise.all(
        keys.filter(key =>
          key !== STATIC_CACHE &&
          key !== RUNTIME_CACHE &&
          key !== TOOLKIT_CACHE
        ).map(key => caches.delete(key))
      );

    })

  );

  self.clients.claim();

});

self.addEventListener("fetch", event => {

  const url = new URL(event.request.url);

  if (
    url.pathname.startsWith("/toolkit") ||
    url.pathname.startsWith("/engine")
  ) {

    event.respondWith(

      caches.open(TOOLKIT_CACHE).then(cache => {

        return cache.match(event.request).then(response => {

          if (response) return response;

          return fetch(event.request).then(networkResponse => {

            cache.put(event.request, networkResponse.clone());

            return networkResponse;

          });

        });

      })

    );

    return;

  }

  event.respondWith(

    caches.match(event.request).then(response => {

      if (response) return response;

      return fetch(event.request).then(networkResponse => {

        return caches.open(RUNTIME_CACHE).then(cache => {

          cache.put(event.request, networkResponse.clone());

          return networkResponse;

        });

      });

    })

  );

});
