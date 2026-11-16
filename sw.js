// Service worker bàsic: cache de l'app shell per jugar offline.
// Quan afegeixis fitxers nous (jocs, dades), inclou-los a ASSETS
// i puja la versió de CACHE per forçar l'actualització.

const CACHE = 'xala-v149';
const ASSETS = [
  './',
  './index.html',
  './privacitat.html',
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
  './puntsicaixes-motor.js',
  './encaixa.js',
  './board-keys.js',
  './mat2.js',
  './mat2-motor.js',
  './mat2-problemes.js',
  './traca.js',
  './xifra.js',
  './xifra-motor.js',
  './serp.js',
  './drac.js',
  './petards.js',
  './petards-motor.js',
  './trencamurs.js',
  './macedonia.js',
  './pinzellada.js',
  './pinzellada-motor.js',
  './gravetat.js',
  './flipers.js',
  './marro.js',
  './marro-motor.js',
  './girales.js',
  './girales-motor.js',
  './llops.js',
  './dibuixa.js',
  './veu-llops/ca/nit.mp3',
  './veu-llops/ca/llops-obriu.mp3',
  './veu-llops/ca/llops-tanqueu.mp3',
  './veu-llops/ca/vident-obre.mp3',
  './veu-llops/ca/vident-tanca.mp3',
  './veu-llops/ca/metge-obre.mp3',
  './veu-llops/ca/metge-tanca.mp3',
  './veu-llops/ca/dia.mp3',
  './veu-llops/ca/victima.mp3',
  './veu-llops/ca/ningu.mp3',
  './veu-llops/ca/fora.mp3',
  './veu-llops/ca/guanyen-llops.mp3',
  './veu-llops/ca/guanya-poble.mp3',
  './vendor/matter.min.js',
  './serp-motor.js',
  './musica.js',
  './ranking.js',
  './confirma.js',
  './paraula.js',
  './paraula-motor.js',
  './paraula-llistes.js',
  './pixelats.js',
  './pixelats-motor.js',
  './pixelats-dibuixos.js',
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
  // el rànquing (Supabase) sempre de la xarxa: si no, es veuria la còpia vella
  if (new URL(e.request.url).hostname.endsWith('supabase.co')) return;
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
