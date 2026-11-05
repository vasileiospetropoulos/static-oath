const CACHE_NAME = '__CACHE_NAME__'
const PRECACHE_URLS = '__PRECACHE_URLS__'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith('static-oath-shell-') &&
                cacheName !== CACHE_NAME,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(request.url)

  if (
    requestUrl.origin !== self.location.origin ||
    !requestUrl.href.startsWith(self.registration.scope)
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseCopy = response.clone()
            void caches
              .open(CACHE_NAME)
              .then((cache) =>
                cache.put(new URL('./', self.registration.scope), responseCopy),
              )
          }

          return response
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME)
          const cachedPage =
            (await cache.match(request)) ??
            (await cache.match(new URL('./', self.registration.scope)))

          if (!cachedPage) {
            throw new Error('No cached application shell is available offline.')
          }

          return cachedPage
        }),
    )
    return
  }

  if (
    !['script', 'style', 'image', 'font', 'media', 'audio', 'video'].includes(
      request.destination,
    ) &&
    !requestUrl.pathname.endsWith('/audio/old-radio-main-menu.flac')
  ) {
    return
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedAsset = await cache.match(request)

      if (cachedAsset) {
        return cachedAsset
      }

      const response = await fetch(request)

      if (response.ok) {
        await cache.put(request, response.clone())
      }

      return response
    }),
  )
})
