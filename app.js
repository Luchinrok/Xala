// ============================================================
// Xala! — controlador principal
// Registre de jocs + navegació + portada + ajuda "Com es juga?"
// ============================================================

import impostor from './impostor.js';
import quiprobable from './quiprobable.js';
import endevinala from './endevinala.js';
import bomba from './bomba.js';
import aescena from './aescena.js';
import passaparaula from './passaparaula.js';
import escacs from './escacs.js';
import memory from './memory.js';
import sudoku from './sudoku.js';
import joc2048 from './joc2048.js';
import sopa from './sopa.js';
import penjat from './penjat.js';
import vaixells from './vaixells.js';
import tresenratlla from './tresenratlla.js';
import connecta4 from './connecta4.js';
import dames from './dames.js';
import puntsicaixes from './puntsicaixes.js';
import encaixa from './encaixa.js';
import mat2 from './mat2.js';
import traca from './traca.js';
import xifra from './xifra.js';
import serp from './serp.js';
import { t } from './i18n.js';

// Títol, tagline i instruccions surten dels camps del mòdul de cada joc.
const gameTitle = (g) => g.title;
const gameTagline = (g) => g.tagline;
const gameInstructions = (g) => g.instructions || [];

// Tres catàlegs: jocs de festa (multijugador), per a dos i d'un sol jugador.
const PARTY_GAMES = [impostor, endevinala, bomba, quiprobable, aescena, passaparaula];
const DUO_GAMES = [vaixells, tresenratlla, connecta4, dames, puntsicaixes, escacs];
const SOLO_GAMES = [encaixa, memory, sudoku, joc2048, sopa, penjat, mat2, traca, xifra, serp];

const app = document.getElementById('app');

// En qualsevol canvi de pantalla, torna a dalt de tot perquè no quedi
// amagat el botó "Enrere" si véns d'una pantalla amb scroll avall.
// Detecta quan s'insereix una nova ".screen" o quan se'n reemplaça el
// contingut; ignora els canvis de text dels temporitzadors.
function scrollTop() {
  try { window.scrollTo(0, 0); } catch (e) {}
  if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
}
(function watchScreenChanges() {
  const isScreen = (n) => n && n.nodeType === 1 && n.classList && n.classList.contains('screen');
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type !== 'childList') continue;
      const inserted = Array.prototype.some.call(m.addedNodes, isScreen);
      const replacedScreen = isScreen(m.target) && m.addedNodes.length > 0;
      if (inserted || replacedScreen) { scrollTop(); return; }
    }
  });
  obs.observe(app, { childList: true, subtree: true });
})();

// ---------- gest enrere / botó "<" del sistema ----------
// Mateix model que Buyte: la portada és l'ARREL de l'historial (d:0) i cada
// canvi de pantalla fet amb un toc hi afegeix una entrada. Cada gest en consumeix
// una i desfà una capa, igual que el botó "Enrere" de la pantalla.
// Les entrades s'han de crear DINS d'un toc: Chrome salta les que una pàgina
// afegeix sense interacció, i el gest sortiria de l'app.
//   - Si la pantalla té botó "Enrere" -> el premem.
//   - Si no en té (sub-pantalles: "Passa el mòbil", votacions...) -> tornem a la
//     CONFIGURACIÓ del joc re-muntant-lo.
//   - A la portada ja no queden entrades nostres: el gest surt de l'app.
// Poden sobrar entrades (un joc que refà la pantalla en triar una opció, un
// "Tornar a l'inici" que salta capes): cada gest continua desfent una sola capa i
// en arribar a la portada es consumeixen totes. MAX_DEPTH les limita.
const MAX_DEPTH = 6;
const LINK = /^#mat-\d+$/;
let navCurrentGame = null;  // joc obert actual (per re-muntar-lo = anar a la seva config)
let navCurrentBack = null;  // "enrere" del joc (cap a la llista de jocs)
let navAtLanding = true;    // cert només a la portada
let navBacking = false;     // anem enrere: aquest canvi de pantalla no afegeix entrada
let navNoopPops = 0;        // popstates que venen de buidar l'historial, no d'un gest
let navDepth = 0;           // última profunditat coneguda
let updateReady = false;    // hi ha una versió nova esperant la portada (vegeu més avall)

const readDepth = () => (history.state && Number.isInteger(history.state.d) ? history.state.d : navDepth);

function pushEntry() {
  const d = readDepth();
  if (d >= MAX_DEPTH) return;
  try { history.pushState({ d: d + 1 }, ''); navDepth = d + 1; } catch (e) {}
}

// Marca que el canvi de pantalla que ve ara és anar enrere. Es desfà després
// que hagi corregut l'observador de pantalles.
function markBacking() {
  navBacking = true;
  setTimeout(() => { navBacking = false; }, 0);
}

// Marca el nivell actual de navegació en entrar a CADA pantalla.
function setLevel({ landing = false, game = null, back = null } = {}) {
  navAtLanding = landing;
  navCurrentGame = game;
  navCurrentBack = back;
  if (landing) {
    // A la portada es consumeix tot el que quedi, perquè el proper gest surti.
    const d = readDepth();
    if (d > 0) {
      navNoopPops++;
      navDepth = 0;
      try { history.go(-d); } catch (e) { navNoopPops--; }
    }
  }
}

// Enllaç de repte (#mat-N) amb l'app ja oberta: el navegador només canvia el
// final de l'adreça i ho avisa amb 'popstate', com si fos un gest enrere. Se surt
// del joc actual (el seu "Enrere" n'atura els temporitzadors) i s'obre el problema,
// que treu el #mat-N de l'adreça.
function openFromLink() {
  if (!LINK.test(location.hash)) return false;
  navDepth += 1;
  try { history.replaceState({ d: navDepth }, ''); } catch (e) {}
  markBacking();
  const back = app.querySelector('.back');
  if (navCurrentGame && back) back.click();
  openGame(mat2, goSingle);
  return true;
}
window.addEventListener('hashchange', openFromLink);

window.addEventListener('popstate', () => {
  if (navNoopPops > 0) { navNoopPops--; navDepth = readDepth(); return; }
  if (openFromLink()) return;
  navDepth = readDepth();
  if (navAtLanding) return;
  markBacking();
  const back = app.querySelector('.back');
  if (back) back.click();
  else if (navCurrentGame) openGame(navCurrentGame, navCurrentBack);
  else goLanding();
  // Encara som dins de l'app però sense entrades a sota: en deixem una perquè el
  // proper gest no en surti.
  if (!navAtLanding && readDepth() === 0) pushEntry();
});

// Cada canvi de pantalla fet amb un toc afegeix una entrada.
(function watchForward() {
  const isScreen = (n) => n && n.nodeType === 1 && n.classList && n.classList.contains('screen');
  const obs = new MutationObserver((muts) => {
    if (navBacking || navAtLanding) return;
    const ua = navigator.userActivation;
    if (ua && !ua.isActive) return; // temporitzadors del joc: no és una acció de l'usuari
    const changed = muts.some(m => m.type === 'childList' && m.addedNodes.length > 0 &&
      (isScreen(m.target) || Array.prototype.some.call(m.addedNodes, isScreen)));
    if (changed) pushEntry();
  });
  obs.observe(app, { childList: true, subtree: true });
})();

document.addEventListener('click', (e) => {
  // L'"Enrere" de la pantalla: tira enrere sense afegir cap entrada.
  if (e.target instanceof Element && e.target.closest('.back')) { markBacking(); return; }
  // Entrant per un enllaç no hi ha entrades: el primer toc en crea una.
  if (!navAtLanding && readDepth() === 0) pushEntry();
}, true);

// Arrel de l'historial. Sense URL: no es toca l'adreça (ni el #mat-N d'un enllaç).
if (!history.state || !Number.isInteger(history.state.d)) {
  try { history.replaceState({ d: 0 }, ''); } catch (e) {}
}
navDepth = readDepth();

function setAccent(color) {
  document.documentElement.style.setProperty('--accent', color || 'var(--coral)');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', color || '#E4572E');
}

function clear() { app.innerHTML = ''; }

// ---------- accessibilitat compartida per tots els jocs ----------
// Les targetes "toca per veure" són <div role="button">: amb el teclat,
// Enter o Espai fan el mateix que tocar-les.
app.addEventListener('keydown', (e) => {
  const el = e.target;
  if (!(el instanceof HTMLElement) || el.tagName === 'BUTTON' || el.getAttribute('role') !== 'button') return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
});

// Els botons d'opció (mode, dificultat, nivell, durada...) marquen la tria
// amb la classe btn--accent; aquí en sincronitzem aria-pressed perquè els
// lectors de pantalla també sàpiguen quina està triada.
const OPTION_BTN = '.btn[data-mode], .btn[data-diff], .btn[data-level], .btn[data-size], .btn[data-range], .btn[data-dur], .btn[data-perp], .btn[data-time]';
function syncPressed(root) {
  root.querySelectorAll(OPTION_BTN).forEach((b) => {
    const on = String(b.classList.contains('btn--accent'));
    if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on);
  });
}
// La fletxa dels botons «‹ Enrere» és un caràcter minúscul a la lletra: es
// canvia per una de dibuixada amb CSS, sigui quin sigui el joc o l'idioma.
function growBackChevrons(root) {
  root.querySelectorAll('.back').forEach((b) => {
    const first = b.firstChild;
    if (!first || first.nodeType !== 3 || !first.nodeValue.startsWith('‹')) return;
    first.nodeValue = first.nodeValue.slice(1).trimStart();
    const chev = document.createElement('span');
    chev.className = 'back__chev';
    chev.setAttribute('aria-hidden', 'true');
    b.insertBefore(chev, first);
  });
}
new MutationObserver(() => growBackChevrons(app))
  .observe(app, { childList: true, subtree: true });
new MutationObserver(() => syncPressed(app))
  .observe(app, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

function glyph(id) {
  const g = {
    impostor:   '<circle cx="20" cy="14" r="8"/><path d="M6 38c0-8 6-13 14-13s14 5 14 13" fill="none" stroke-width="3"/><path d="M14 13l4 3M26 13l-4 3" stroke-width="3"/>',
    endevinala: '<rect x="6" y="9" width="28" height="22" rx="4" fill="none" stroke-width="3"/><path d="M14 36h12M20 31v5" stroke-width="3"/><path d="M13 20l5 4 9-9" fill="none" stroke-width="3"/>',
    bomba:      '<circle cx="18" cy="26" r="11" fill="none" stroke-width="3"/><path d="M26 16l5-5M31 11l1 4M31 11l-4-1" stroke-width="3"/>',
    quiprobable:'<circle cx="13" cy="13" r="6"/><circle cx="29" cy="15" r="5"/><path d="M3 36c0-6 4-9 10-9s10 3 10 9M21 36c0-5 3-8 8-8s8 3 8 8" fill="none" stroke-width="3"/>',
    aescena:    '<path d="M8 8h24v13c0 8-5 13-12 13S8 29 8 21z" fill="none" stroke-width="3"/><path d="M15 17l3 2M25 17l-3 2" stroke-width="3"/><path d="M15 27c2 2 8 2 10 0" fill="none" stroke-width="3"/>',
    passaparaula:'<circle cx="20" cy="20" r="13" fill="none" stroke-width="3"/><circle cx="20" cy="7" r="2.4"/><circle cx="33" cy="20" r="2.4"/><circle cx="20" cy="33" r="2.4"/><circle cx="7" cy="20" r="2.4"/>',
    // modes de la pantalla inicial. Cada persona té el mateix estil que
    // "solo" (cap = cercle separat + cos = espatlles obertes en arc); només
    // canvia el nombre. Coordenades de l'SVG 64×64 escalades a 40×40 (×0.625).
    // Multijugador: tres persones (dues grans als costats + una petita al mig)
    multi:      '<circle cx="8.125" cy="13.125" r="4.0625"/><path d="M1.875 28.125 Q1.875 20.625 8.125 20.625 Q14.375 20.625 14.375 28.125" stroke-width="3"/><circle cx="20" cy="17.5" r="2.8125"/><path d="M15.625 28.125 Q15.625 23.75 20 23.75 Q24.375 23.75 24.375 28.125" stroke-width="3"/><circle cx="31.875" cy="13.125" r="4.0625"/><path d="M25.625 28.125 Q25.625 20.625 31.875 20.625 Q38.125 20.625 38.125 28.125" stroke-width="3"/>',
    // Dos jugadors: una gran + una petita
    duo:        '<circle cx="12.5" cy="12.5" r="4.375"/><path d="M5.625 28.125 Q5.625 20 12.5 20 Q19.375 20 19.375 28.125" stroke-width="3"/><circle cx="28.125" cy="16.25" r="3.125"/><path d="M23.125 28.125 Q23.125 22.5 28.125 22.5 Q33.125 22.5 33.125 28.125" stroke-width="3"/>',
    solo:       '<circle cx="20" cy="13" r="7"/><path d="M7 37c0-9 6-14 13-14s13 5 13 14" fill="none" stroke-width="3"/>',
    // jocs d'un sol jugador
    escacs:     '<circle cx="20" cy="11" r="5" fill="none" stroke-width="3"/><path d="M16 19c-1 4-3 6-5 13h18c-2-7-4-9-5-13z" fill="none" stroke-width="3"/><path d="M9 36h22" stroke-width="3"/>',
    memory:     '<rect x="6" y="10" width="13" height="20" rx="2" fill="none" stroke-width="3"/><rect x="22" y="10" width="13" height="20" rx="2" fill="none" stroke-width="3"/><path d="M26 16a3 3 0 0 1 5 2c0 2-3 2-3 4" fill="none" stroke-width="2.4"/><circle cx="28" cy="26" r="1" fill="currentColor" stroke="none"/>',
    sudoku:     '<rect x="7" y="7" width="26" height="26" rx="2" fill="none" stroke-width="3"/><path d="M15.7 7v26M24.3 7v26M7 15.7h26M7 24.3h26" stroke-width="2"/>',
    '2048':     '<rect x="8" y="8" width="24" height="24" rx="5" fill="none" stroke-width="3"/><path d="M20 14v12M15 19l5-5 5 5" fill="none" stroke-width="2.6"/>',
    sopa:       '<rect x="5" y="5" width="22" height="22" rx="2" fill="none" stroke-width="3"/><path d="M12 5v22M19 5v22M5 12h22M5 19h22" stroke-width="1.6"/><circle cx="27" cy="27" r="6" fill="none" stroke-width="3"/><path d="M31.5 31.5l4 4" stroke-width="3"/>',
    penjat:     '<path d="M8 35h16" stroke-width="3"/><path d="M13 35V7h13" fill="none" stroke-width="3"/><path d="M26 7v5" stroke-width="3"/><circle cx="26" cy="16" r="3.5" fill="none" stroke-width="3"/><path d="M26 19v7M26 22l-4 3M26 22l4 3M26 26l-3 5M26 26l3 5" fill="none" stroke-width="2.4"/>',
    // jocs per a dos
    vaixells:   '<path d="M7 24h26l-4 9H11z" fill="none" stroke-width="3"/><path d="M20 7v17" stroke-width="3"/><path d="M20 9l8 12h-8z" fill="none" stroke-width="2.6"/><path d="M5 36c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0 4 1.6 6 0" fill="none" stroke-width="2.2"/>',
    tresenratlla:'<path d="M15.7 7v26M24.3 7v26M7 15.7h26M7 24.3h26" stroke-width="2"/><path d="M8.5 8.8l4.7 4.7M13.2 8.8l-4.7 4.7" stroke-width="2.6"/><circle cx="20" cy="20" r="3" fill="none" stroke-width="2.6"/>',
    connecta4:  '<rect x="7" y="9" width="26" height="24" rx="3" fill="none" stroke-width="3"/><circle cx="14" cy="16" r="2.6" fill="none" stroke-width="2"/><circle cx="20" cy="16" r="2.6" fill="none" stroke-width="2"/><circle cx="26" cy="16" r="2.6" fill="none" stroke-width="2"/><circle cx="14" cy="26" r="2.6" fill="none" stroke-width="2"/><circle cx="26" cy="26" r="2.6" fill="none" stroke-width="2"/><circle cx="20" cy="26" r="2.6" fill="currentColor" stroke="none"/>',
    dames:      '<rect x="6" y="6" width="28" height="28" rx="2" fill="none" stroke-width="3"/><path d="M15.3 6v28M24.7 6v28M6 15.3h28M6 24.7h28" stroke-width="1.6"/><circle cx="20" cy="20" r="4.6" fill="none" stroke-width="2.6"/><circle cx="20" cy="20" r="1.8" fill="none" stroke-width="2"/>',
    puntsicaixes:'<circle cx="10" cy="10" r="2" fill="currentColor" stroke="none"/><circle cx="20" cy="10" r="2" fill="currentColor" stroke="none"/><circle cx="30" cy="10" r="2" fill="currentColor" stroke="none"/><circle cx="10" cy="20" r="2" fill="currentColor" stroke="none"/><circle cx="20" cy="20" r="2" fill="currentColor" stroke="none"/><circle cx="30" cy="20" r="2" fill="currentColor" stroke="none"/><circle cx="10" cy="30" r="2" fill="currentColor" stroke="none"/><circle cx="20" cy="30" r="2" fill="currentColor" stroke="none"/><circle cx="30" cy="30" r="2" fill="currentColor" stroke="none"/><path d="M10 10h10M10 20h10M10 10v10M20 10v10" fill="none" stroke-width="2.4"/>',
    // La Serp: una serp en S amb un ull
    serp:       '<path d="M30 9H14a5 5 0 0 0 0 10h12a5 5 0 0 1 0 10H8" fill="none" stroke-width="4"/><circle cx="30" cy="9" r="3"/><circle cx="34" cy="30" r="2.4"/>',
    // La Xifra: una fitxa amb un signe de més i un número petit
    xifra:      '<rect x="6" y="8" width="24" height="24" rx="4" fill="none" stroke-width="3"/><path d="M18 14v12M12 20h12" stroke-width="3"/><path d="M32 6l4 4M36 6l-4 4" stroke-width="2.2"/>',
    // La Traca: un petard amb la metxa encesa
    traca:      '<rect x="8" y="17" width="20" height="16" rx="3" fill="none" stroke-width="3" transform="rotate(-20 18 25)"/><path d="M24 13c1-4 4-5 7-5" fill="none" stroke-width="2.6"/><path d="M34 3v3M38 8h-3M37 4l-2 2" stroke-width="2.2"/>',
    // problemes d'escacs: rei amb creu i un «2»
    mat2:       '<path d="M16 6h6M19 3v6" stroke-width="3"/><path d="M13 15c0-4 12-4 12 0l-2 15h-8z" fill="none" stroke-width="3"/><path d="M9 35h20" stroke-width="3"/><path d="M29 18c0-3 6-3 6 0 0 3-6 5-6 8h6" fill="none" stroke-width="2.4"/>',
    // joc d'un sol jugador (block-puzzle): tres blocs en L
    encaixa:    '<rect x="10" y="9" width="9" height="9" rx="1.5" stroke-width="3"/><rect x="10" y="20" width="9" height="9" rx="1.5" stroke-width="3"/><rect x="20" y="20" width="9" height="9" rx="1.5" stroke-width="3"/>',
  }[id] || '<circle cx="20" cy="20" r="12" fill="none" stroke-width="3"/>';
  return `<svg class="glyph" aria-hidden="true" viewBox="0 0 40 40" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">${g}</svg>`;
}

// ---------- pantalla inicial: tria de mode ----------
function goLanding() {
  setLevel({ landing: true });
  if (updateReady) { reloadIfUpdated(); return; }
  setAccent(null);
  clear();
  const wrap = document.createElement('div');
  wrap.className = 'screen home';
  wrap.innerHTML = `
    <header class="home__head">
      <h1 class="brand">Xala<span>!</span></h1>
      <p class="tagline">Tria com vols jugar.</p>
    </header>
    <div class="modes">
      <button class="mode-card" id="mode-mp" style="--c:var(--paper-2)">
        <span>${glyph('multi')}</span>
        <div><h3>Multijugador</h3><p>Els 6 jocs de festa: passa el mòbil i a riure.</p></div>
      </button>
      <button class="mode-card" id="mode-duo" style="--c:var(--accent)">
        <span>${glyph('duo')}</span>
        <div><h3>Dos jugadors</h3><p>6 jocs per a dos, un contra un.</p></div>
      </button>
      <button class="mode-card" id="mode-sp" style="--c:var(--paper-2)">
        <span>${glyph('solo')}</span>
        <div><h3>Un sol jugador</h3><p>10 jocs per a tu sol, quan vulguis.</p></div>
      </button>
    </div>
  `;
  app.appendChild(wrap);
  wrap.querySelector('#mode-mp').addEventListener('click', goMultiplayer);
  wrap.querySelector('#mode-duo').addEventListener('click', goDuo);
  wrap.querySelector('#mode-sp').addEventListener('click', goSingle);
}

// ---------- graella de jocs de festa (multijugador) ----------
function goMultiplayer() {
  setLevel();
  setAccent(null);
  clear();
  const wrap = document.createElement('div');
  wrap.className = 'screen home';
  wrap.innerHTML = `
    <button class="back" id="back">‹ Enrere</button>
    <header class="home__head">
      <div class="brand">Xala<span>!</span></div>
      <p class="tagline">${t('home.tagline')}</p>
    </header>
    <div class="grid" id="grid"></div>
    <button class="btn btn--outline home__help" id="help">${t('home.help')}</button>
  `;
  app.appendChild(wrap);
  renderGameGrid(wrap.querySelector('#grid'), PARTY_GAMES, goMultiplayer);
  wrap.querySelector('#back').addEventListener('click', goLanding);
  wrap.querySelector('#help').addEventListener('click', () => helpList(PARTY_GAMES, goMultiplayer));
}

// ---------- graella de jocs per a dos ----------
function goDuo() {
  setLevel();
  setAccent(null);
  clear();
  const wrap = document.createElement('div');
  wrap.className = 'screen home';
  wrap.innerHTML = `
    <button class="back" id="back">‹ Enrere</button>
    <header class="home__head">
      <div class="brand">Xala<span>!</span></div>
      <p class="tagline">Jocs per a dos.</p>
    </header>
    <div class="grid" id="grid"></div>
    <button class="btn btn--outline home__help" id="help">${t('home.help')}</button>
  `;
  app.appendChild(wrap);
  renderGameGrid(wrap.querySelector('#grid'), DUO_GAMES, goDuo);
  wrap.querySelector('#back').addEventListener('click', goLanding);
  wrap.querySelector('#help').addEventListener('click', () => helpList(DUO_GAMES, goDuo));
}

// ---------- graella de jocs d'un sol jugador ----------
function goSingle() {
  setLevel();
  setAccent(null);
  clear();
  const wrap = document.createElement('div');
  wrap.className = 'screen home';
  wrap.innerHTML = `
    <button class="back" id="back">‹ Enrere</button>
    <header class="home__head">
      <div class="brand">Xala<span>!</span></div>
      <p class="tagline">Jocs per a tu sol.</p>
    </header>
    <div class="grid" id="grid"></div>
    <button class="btn btn--outline home__help" id="help">${t('home.help')}</button>
  `;
  app.appendChild(wrap);
  renderGameGrid(wrap.querySelector('#grid'), SOLO_GAMES, goSingle);
  wrap.querySelector('#back').addEventListener('click', goLanding);
  wrap.querySelector('#help').addEventListener('click', () => helpList(SOLO_GAMES, goSingle));
}

// ---------- render compartit d'una graella de jocs ----------
function renderGameGrid(grid, games, back) {
  games.forEach(game => {
    const card = document.createElement('button');
    const cardColor = game.color || game.accent;
    const dark = cardColor === 'var(--ink)';
    card.className = 'card' + (game.ready ? '' : ' locked') + (dark ? ' card--dark' : '');
    card.style.setProperty('--c', cardColor);
    // mida del títol limitada per l'amplada de la targeta: la paraula més
    // llarga hi ha de cabre sencera (unes 0,56 em per lletra en Bricolage)
    const longest = Math.max(...gameTitle(game).split(/ +/).map(w => w.length));
    card.style.setProperty('--fit', (100 / (longest * 0.56)).toFixed(1) + 'cqi');
    card.innerHTML = `
      ${game.ready ? '' : `<span class="badge">${t('soon')}</span>`}
      <span>${glyph(game.id)}</span>
      <div><h3>${gameTitle(game)}</h3><p>${gameTagline(game)}</p></div>
    `;
    if (game.ready) card.addEventListener('click', () => openGame(game, back));
    grid.appendChild(card);
  });
}

function openGame(game, back) {
  setLevel({ game, back: back || goMultiplayer });
  setAccent(game.accent);
  clear();
  const root = document.createElement('div');
  root.className = 'screen';
  app.appendChild(root);
  game.mount(root, { goHome: back || goMultiplayer });
}

// ---------- ajuda: "Com es juga?" (per a un catàleg de jocs) ----------
function helpList(games, back) {
  setLevel();
  setAccent('#E4572E');
  clear();
  const wrap = document.createElement('div');
  wrap.className = 'screen';
  wrap.innerHTML = `
    <button class="back" id="back">‹ Enrere</button>
    <p class="kicker">${t('help.kicker')}</p>
    <h2 style="font-size:30px;margin:6px 0 22px">${t('help.title')}</h2>
    <div class="stack" id="list" style="--stack-gap:12px"></div>
  `;
  app.appendChild(wrap);
  wrap.querySelector('#back').onclick = back;

  const list = wrap.querySelector('#list');
  games.forEach(game => {
    const b = document.createElement('button');
    b.className = 'btn btn--outline';
    b.style.textAlign = 'left';
    b.innerHTML = `<span style="color:var(--accent)">${glyph(game.id)}</span> &nbsp; ${gameTitle(game)}`;
    b.style.display = 'flex';
    b.style.alignItems = 'center';
    b.onclick = () => helpDetail(game, games, back);
    list.appendChild(b);
  });
}

function helpDetail(game, games, back) {
  setLevel();
  setAccent('#E4572E');
  clear();
  const wrap = document.createElement('div');
  wrap.className = 'screen';
  const steps = gameInstructions(game).map(s => `<li>${s}</li>`).join('');
  wrap.innerHTML = `
    <button class="back" id="back">${t('nav.instructions')}</button>
    <p class="kicker">${gameTitle(game)}</p>
    <h2 style="font-size:28px;margin:6px 0 18px">${gameTagline(game)}</h2>
    <ol class="howto">${steps}</ol>
  `;
  app.appendChild(wrap);
  wrap.querySelector('#back').onclick = () => helpList(games, back);
}

// arrenca
goLanding();
// enllaç compartit d'un problema (#mat-N): obre «Mat en 2» directament
if (LINK.test(location.hash)) openGame(mat2, goSingle);

// ---------- versions noves ----------
// L'app instal·lada sovint no es torna a obrir sinó que es reprèn: en tornar-hi
// es comprova si hi ha versió nova. Quan la nova pren el control es recarrega,
// però mai enmig d'un joc: s'espera que es torni a la portada.
function reloadIfUpdated() {
  if (updateReady && navAtLanding) location.reload();
}
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || updateReady) return; // primera instal·lació: no cal recarregar
    updateReady = true;
    reloadIfUpdated();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch(() => {});
  });
}
