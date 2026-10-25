// Service worker: lets the app open offline once it has been visited.
// Network first, so a new deploy shows up the next time you open the app with signal.
// Bump CACHE when the list of files changes.
const CACHE = 'nutrition-tracker-v4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './foods.js',
  './ideas.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    // 'no-cache' revalidates with the server instead of reusing GitHub Pages'
    // 10-minute HTTP cache, so a merged change shows up on the next open.
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })),
  );
});
