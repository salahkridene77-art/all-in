/* All In — service worker : l'appli fonctionne même sans connexion */
const CACHE = 'allin-v3.0.0';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/app.js', './js/core.js', './js/data.js', './js/cloud.js', './js/config.js', './js/anim.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-32.png', './icons/logo.jpg', './icons/emblem-256.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// Réseau d'abord (pour recevoir les mises à jour), cache en secours hors ligne
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Fichiers de l'appli : toujours vérifier la dernière version sur le serveur (pas de cache navigateur)
  const req = url.origin === self.location.origin ? fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(e.request);
  e.respondWith(
    req
      .then((res) => {
        if (res.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.includes('fonts.g'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
