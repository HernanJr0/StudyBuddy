// Service worker do StudyBuddy. O plugin (pwa-plugin.ts) troca os
// marcadores de cache e de pré-cache no build e grava o resultado em dist/sw.js.
// Não guarda chave nem texto de material: só arquivos estáticos do próprio site.
const CACHE = "__CACHE__";
const PRECACHE = __PRECACHE__;
const SHELL = new URL("index.html", self.registration.scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(
          PRECACHE.map(
            (p) => new Request(new URL(p, self.registration.scope), { cache: "reload" }),
          ),
        ),
      ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("studybuddy-") && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Outras origens (provedores de IA) nunca passam pelo service worker.
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(
        async () =>
          (await caches.match(SHELL, { cacheName: CACHE, ignoreVary: true })) || Response.error(),
      ),
    );
    return;
  }

  // Arquivos com hash no nome e demais estáticos: cache primeiro; o que for baixado entra no cache.
  event.respondWith(
    caches.match(req, { cacheName: CACHE, ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && res.type === "basic" && url.pathname !== "/sw.js") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
