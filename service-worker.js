/*
 * Service Worker de WODSTARS.
 * Cambia CACHE_VERSION al publicar cambios importantes para activar el aviso.
 * El HTML siempre consulta primero la red para evitar versiones antiguas.
 */
const CACHE_VERSION = "wodstars-static-v4";
const OFFLINE_URL = "./offline.html";

// Solo se guardan archivos estáticos esenciales; las páginas no se precachean.
const STATIC_FILES = [
  OFFLINE_URL,
  "./wodstar-logo-transparent.png",
  "./assets/icons/icon-72x72.png",
  "./assets/icons/icon-96x96.png",
  "./assets/icons/icon-128x128.png",
  "./assets/icons/icon-144x144.png",
  "./assets/icons/icon-152x152.png",
  "./assets/icons/icon-180x180.png",
  "./assets/icons/icon-192x192.png",
  "./assets/icons/icon-384x384.png",
  "./assets/icons/icon-512x512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(STATIC_FILES)));
});

self.addEventListener("activate", event => {
  // Borra automáticamente todas las cachés de versiones anteriores.
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  // La página envía este mensaje cuando se pulsa "Actualizar ahora".
  if(event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if(request.method !== "GET") return;

  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return;

  if(request.mode === "navigate"){
    // Navegación: red sin caché; si falla, pantalla sin conexión.
    event.respondWith(fetch(request, {cache:"no-store"}).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Estáticos: valida en red, actualiza caché y usa la copia solo si falla Internet.
  if(["style", "script", "image", "font"].includes(request.destination)){
    event.respondWith(
      fetch(request, {cache:"no-cache"})
        .then(response => {
          if(response.ok){
            const copy = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
