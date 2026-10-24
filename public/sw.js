// Service worker: makes SQL Playbook installable and fast on repeat visits, and lets lessons run offline once the
// needed files have been loaded. Files with a hash in their name never change, so they are served from the cache;
// everything else (the page, datasets, the manifest) comes from the network when possible, the cache otherwise.
// It also shows the daily reminders the server sends (api/push) and opens the app when one is tapped.
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

self.addEventListener('push', (event) => {
  let data = { title: 'Time for SQL', body: 'Your next lesson is ready.' }
  try {
    data = { ...data, ...event.data.json() }
  } catch {
    // No payload or not JSON: show the default text.
  }
  const scope = self.registration.scope
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: `${scope}icons/icon-192.png`,
      badge: `${scope}icons/icon-192.png`,
      tag: 'daily-reminder',
      data: { url: scope },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? self.registration.scope
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(url))
      return open ? open.focus() : self.clients.openWindow(url)
    }),
  )
})
