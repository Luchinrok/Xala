// Service worker bàsic: cache de l'app shell per jugar offline.
// Quan afegeixis fitxers nous (jocs, dades), inclou-los a ASSETS
// i puja la versió de CACHE per forçar l'actualització.

const CACHE = 'xala-v26';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles.css',
  './app.js',
  './store.js',
  './impostor.js',
  './endevinala.js',
  './bomba.js',
  './quiprobable.js',
  './aescena.js',
  './basta.js',
  './impostor-paraules.js',
  './category-icons.js',
  './category-select.js',
  './icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
