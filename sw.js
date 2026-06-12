// Service worker bàsic: cache de l'app shell per jugar offline.
// Quan afegeixis fitxers nous (jocs, dades), inclou-los a ASSETS
// i puja la versió de CACHE per forçar l'actualització.

const CACHE = 'xala-v35';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles.css',
  './app.js',
  './i18n.js',
  './store.js',
  './word-bag.js',
  './impostor.js',
  './endevinala.js',
  './bomba.js',
  './quiprobable.js',
  './aescena.js',
  './passaparaula.js',
  './impostor-paraules.js',
  './category-icons.js',
  './category-select.js',
  './escacs.js',
  './memory.js',
  './sudoku.js',
  './joc2048.js',
  './sopa.js',
  './penjat.js',
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
