// Minimaler Service Worker: cached die App-Shell (HTML/JS/CSS/Icons) für
// den Offline-Start und schnelleres Laden. Cross-Origin-Requests (Supabase-API)
// werden nicht angefasst, damit Daten immer frisch vom Netzwerk kommen.
const CACHE_NAME = 'mycatz-v1'
const APP_SHELL = ['/', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
