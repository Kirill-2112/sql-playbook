// Service worker: makes SQL Playbook installable and fast on repeat visits, and lets lessons run offline once the
// needed files have been loaded. Files with a hash in their name never change, so they are served from the cache;
// everything else (the page, datasets, the manifest) comes from the network when possible, the cache otherwise.
const CACHE = 'sql-playbook-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  const hashed = /\/assets\/.+-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(new URL(request.url).pathname)
  event.respondWith(hashed ? cacheFirst(request) : networkFirst(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone())
  return response
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) (await caches.open(CACHE)).put(request, response.clone())
    return response
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: true })
    if (cached) return cached
    throw error
  }
}
