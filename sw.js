// Фитстенд — service worker.
// При каждом обновлении сайта увеличивайте номер версии, чтобы телефоны подхватили новые файлы.
const VERSION = 'fitstand-v15';
const CORE = [
  './',
  './index.html',
  './model.js',
  './draw.js',
  './ride.js',
  './rider.js',
  './state.js',
  './content.js',
  './quiz.js',
  './forkAnim.js',
  './guide.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Страница и файлы своего сайта: сначала сеть, без сети — из кэша.
  // Так новая страница никогда не запустится со старыми скриптами из кэша.
  const own = new URL(req.url).origin === self.location.origin;
  if (req.mode === 'navigate' || own) {
    const key = req.mode === 'navigate' ? './index.html' : req;
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(key, copy));
          }
          return res;
        })
        .catch(() => caches.match(key))
    );
    return;
  }

  // Чужие файлы (шрифты Google): отдаём из кэша, параллельно обновляем.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
