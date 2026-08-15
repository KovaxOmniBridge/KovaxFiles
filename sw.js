// Service Worker para suporte offline e cache estático local do ManipuladorLocal
const CACHE_NAME = 'manipulador-local-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch for local static assets
});
