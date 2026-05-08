const CACHE_NAME = 'attendance-v1';
const ASSETS = [
  './',
  './index.html',
  './script.js',
  './iict-logo.png',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined'
];

// Install: Cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Fetch: Serve from cache if offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
