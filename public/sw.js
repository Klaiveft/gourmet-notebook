// Noms repris dans lib/offline.ts
const STATIC_CACHE = "carnet-static-v1";
const PAGES_CACHE = "carnet-pages-v1";
const OFFLINE_PAGE = "/offline.html";
// Au-delà, le Wi-Fi de la cuisine est considéré comme coupé
const NETWORK_TIMEOUT = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_PAGE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function refresh(request) {
  const response = await fetch(request);
  const cache = await caches.open(PAGES_CACHE);
  // Une redirection vers /login ne doit jamais remplacer une recette en cache
  if (response.ok && !response.redirected) await cache.put(request, response.clone());
  // Recette supprimée, ou dont le partage a cessé : la copie hors-ligne ne doit pas survivre
  if (response.status === 404) await cache.delete(request, { ignoreVary: true });
  return response;
}

async function fallback(request) {
  return (await caches.match(request, { ignoreVary: true })) ?? (await caches.match(OFFLINE_PAGE));
}

async function staleWhileRevalidate(event) {
  const cached = await caches.match(event.request, { ignoreVary: true });
  const fresh = refresh(event.request);
  event.waitUntil(fresh.catch(() => {}));
  return cached ?? fresh.catch(() => fallback(event.request));
}

// Commentaires et j'aime doivent être à jour : le cache ne sert qu'en cas de coupure ou de réseau trop lent
async function networkFirst(event) {
  const fresh = refresh(event.request);
  event.waitUntil(fresh.catch(() => {}));
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Réseau trop lent")), NETWORK_TIMEOUT);
  });
  try {
    return await Promise.race([fresh, timeout]);
  } catch {
    return fallback(event.request);
  } finally {
    clearTimeout(timer);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (request.destination === "image") {
    event.respondWith(staleWhileRevalidate(event));
  } else if (request.mode === "navigate" && !/^\/(login|auth|join)/.test(url.pathname)) {
    event.respondWith(networkFirst(event));
  }
  // Les requêtes RSC passent au réseau : hors-ligne, Next retombe sur une navigation classique, servie ci-dessus
});
