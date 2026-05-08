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
    // This allows the app to be installable
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
