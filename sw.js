// Service worker bàsic: cache de l'app shell per jugar offline.
// Quan afegeixis fitxers nous (jocs, dades), inclou-los a ASSETS
// i puja la versió de CACHE per forçar l'actualització.

const CACHE = 'xala-v123';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles.css',
  './app.js',
  './i18n.js',
  './store.js',
  './word-bag.js',
  './records.js',
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
  './vaixells.js',
  './tresenratlla.js',
  './connecta4.js',
  './dames.js',
  './puntsicaixes.js',
  './encaixa.js',
  './board-keys.js',
  './mat2.js',
  './mat2-motor.js',
  './mat2-problemes.js',
  './traca.js',
  './xifra.js',
  './xifra-motor.js',
  './serp.js',
  './serp-motor.js',
  './musica.js',
  './traca-reptes.js',
  './LLICENCIA-diccionari.txt',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload': sempre del servidor. Si no, el navegador pot donar fitxers
  // que encara té guardats i la versió nova quedaria amb codi antic.
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
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
