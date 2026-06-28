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
import { t } from './i18n.js';

// Títol, tagline i instruccions surten dels camps del mòdul de cada joc.
const gameTitle = (g) => g.title;
const gameTagline = (g) => g.tagline;
const gameInstructions = (g) => g.instructions || [];

// Tres catàlegs: jocs de festa (multijugador), per a dos i d'un sol jugador.
const PARTY_GAMES = [impostor, endevinala, bomba, quiprobable, aescena, passaparaula];
const DUO_GAMES = [vaixells, tresenratlla, connecta4, dames, puntsicaixes, escacs];
const SOLO_GAMES = [encaixa, memory, sudoku, joc2048, sopa, penjat];

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

// ---------- botó "<" del sistema (Android/navegador) ----------
// Navegació centralitzada i robusta. Mentre NO siguem a la pantalla
// inicial mantenim sempre una entrada "tampó" a l'historial, de manera
// que el "<" del sistema MAI surti de l'app: el capturem amb un únic
// 'popstate' i fem EXACTAMENT el mateix que el botó "Enrere" (pujar un
// nivell), funcioni o no la pantalla amb botó "Enrere" visible.
//   - Si la pantalla té botó "Enrere" visible -> el premem.
//   - Si no en té (sub-pantalles de joc: "Passa el mòbil", votacions,
//     revelacions...) -> tornem a la CONFIGURACIÓ del joc re-muntant-lo.
//   - Només a la pantalla inicial (nivell més alt) el "<" surt de l'app.
// Cada entrada de pantalla passa per ensureArmed()/setLevel() (vegeu les
// funcions de navegació), així queda centralitzat.
let navCurrentGame = null;  // joc obert actual (per re-muntar-lo = anar a la seva config)
let navCurrentBack = null;  // "enrere" del joc (cap a la llista de jocs)
let navAtLanding = true;    // cert només a la pantalla inicial
let navArmed = false;       // si el tampó d'historial està posat

function ensureArmed() {
  if (navArmed) return;
  try { history.pushState({ xala: true }, ''); navArmed = true; } catch (e) {}
}

// Marca el nivell actual de navegació en entrar a CADA pantalla.
function setLevel({ landing = false, game = null, back = null } = {}) {
  navAtLanding = landing;
  navCurrentGame = game;
  navCurrentBack = back;
  if (!landing) ensureArmed();
}

window.addEventListener('popstate', () => {
  navArmed = false; // el sistema acaba de consumir el nostre tampó
  if (navAtLanding) {
    // a l'inici (nivell més alt): deixa sortir de l'app
    try { history.back(); } catch (e) {}
    return;
  }
  ensureArmed(); // re-arma: el següent "<" també s'ha de capturar
  // mateixa acció que el botó "Enrere": puja un nivell dins l'app
  const back = app.querySelector('.back');
  if (back) { back.click(); return; }
  // sub-pantalla de joc sense botó "Enrere": torna a la configuració del
  // joc (re-muntant-lo); si no hi ha joc, a la pantalla inicial
  if (navCurrentGame) { openGame(navCurrentGame, navCurrentBack); return; }
  goLanding();
});
ensureArmed(); // tampó inicial

function setAccent(color) {
  document.documentElement.style.setProperty('--accent', color || 'var(--coral)');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', color || '#E4572E');
}

function clear() { app.innerHTML = ''; }

function glyph(id) {
  const g = {
    impostor:   '<circle cx="20" cy="14" r="8"/><path d="M6 38c0-8 6-13 14-13s14 5 14 13" fill="none" stroke-width="3"/><path d="M14 13l4 3M26 13l-4 3" stroke-width="3"/>',
    endevinala: '<rect x="6" y="9" width="28" height="22" rx="4" fill="none" stroke-width="3"/><path d="M14 36h12M20 31v5" stroke-width="3"/><path d="M13 20l5 4 9-9" fill="none" stroke-width="3"/>',
    bomba:      '<circle cx="18" cy="26" r="11" fill="none" stroke-width="3"/><path d="M26 16l5-5M31 11l1 4M31 11l-4-1" stroke-width="3"/>',
    quiprobable:'<circle cx="13" cy="13" r="6"/><circle cx="29" cy="15" r="5"/><path d="M3 36c0-6 4-9 10-9s10 3 10 9M21 36c0-5 3-8 8-8s8 3 8 8" fill="none" stroke-width="3"/>',
    aescena:    '<path d="M8 8h24v13c0 8-5 13-12 13S8 29 8 21z" fill="none" stroke-width="3"/><path d="M15 17l3 2M25 17l-3 2" stroke-width="3"/><path d="M15 27c2 2 8 2 10 0" fill="none" stroke-width="3"/>',
    passaparaula:'<circle cx="20" cy="20" r="13" fill="none" stroke-width="3"/><circle cx="20" cy="7" r="2.4"/><circle cx="33" cy="20" r="2.4"/><circle cx="20" cy="33" r="2.4"/><circle cx="7" cy="20" r="2.4"/>',
    // modes de la pantalla inicial (mateix estil: cap = cercle + espatlles
    // arrodonides; només canvia el nombre de persones). Coordenades de
    // l'SVG 64×64 escalades al viewBox 40×40 (×0.625).
    // Multijugador: tres persones (alta, baixa, alta)
    multi:      '<circle cx="8.125" cy="11.875" r="3.125" stroke-width="3"/><path d="M3.125 29.375 Q3.125 19.375 8.125 19.375 Q13.125 19.375 13.125 29.375" stroke-width="3"/><circle cx="20" cy="15.625" r="3.125" stroke-width="3"/><path d="M15 29.375 Q15 23.125 20 23.125 Q25 23.125 25 29.375" stroke-width="3"/><circle cx="31.875" cy="11.875" r="3.125" stroke-width="3"/><path d="M26.875 29.375 Q26.875 19.375 31.875 19.375 Q36.875 19.375 36.875 29.375" stroke-width="3"/>',
    // Dos jugadors: dues persones
    duo:        '<circle cx="13.75" cy="11.875" r="3.125" stroke-width="3"/><path d="M8.75 29.375 Q8.75 19.375 13.75 19.375 Q18.75 19.375 18.75 29.375" stroke-width="3"/><circle cx="26.25" cy="11.875" r="3.125" stroke-width="3"/><path d="M21.25 29.375 Q21.25 19.375 26.25 19.375 Q31.25 19.375 31.25 29.375" stroke-width="3"/>',
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
    // joc d'un sol jugador (block-puzzle): tres blocs en L
    encaixa:    '<rect x="10" y="9" width="9" height="9" rx="1.5" stroke-width="3"/><rect x="10" y="20" width="9" height="9" rx="1.5" stroke-width="3"/><rect x="20" y="20" width="9" height="9" rx="1.5" stroke-width="3"/>',
  }[id] || '<circle cx="20" cy="20" r="12" fill="none" stroke-width="3"/>';
  return `<svg class="glyph" viewBox="0 0 40 40" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">${g}</svg>`;
}

// ---------- pantalla inicial: tria de mode ----------
function goLanding() {
  setLevel({ landing: true });
  setAccent(null);
  clear();
  const wrap = document.createElement('div');
  wrap.className = 'screen home';
  wrap.innerHTML = `
    <header class="home__head">
      <div class="brand">Xala<span>!</span></div>
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
        <div><h3>Un sol jugador</h3><p>6 jocs per a tu sol, quan vulguis.</p></div>
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
