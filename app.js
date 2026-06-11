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
import { t } from './i18n.js';

// Títol, tagline i instruccions surten dels camps del mòdul de cada joc.
const gameTitle = (g) => g.title;
const gameTagline = (g) => g.tagline;
const gameInstructions = (g) => g.instructions || [];

// Dos catàlegs: jocs de festa (multijugador) i jocs d'un sol jugador.
const PARTY_GAMES = [impostor, endevinala, bomba, quiprobable, aescena, passaparaula];
const SOLO_GAMES = [escacs, memory, sudoku, joc2048, sopa, penjat];

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
    // modes de la pantalla inicial
    multi:      '<circle cx="13" cy="13" r="6"/><circle cx="29" cy="15" r="5"/><path d="M3 36c0-6 4-9 10-9s10 3 10 9M21 36c0-5 3-8 8-8s8 3 8 8" fill="none" stroke-width="3"/>',
    solo:       '<circle cx="20" cy="13" r="7"/><path d="M7 37c0-9 6-14 13-14s13 5 13 14" fill="none" stroke-width="3"/>',
    // jocs d'un sol jugador
    escacs:     '<circle cx="20" cy="11" r="5" fill="none" stroke-width="3"/><path d="M16 19c-1 4-3 6-5 13h18c-2-7-4-9-5-13z" fill="none" stroke-width="3"/><path d="M9 36h22" stroke-width="3"/>',
    memory:     '<rect x="6" y="10" width="13" height="20" rx="2" fill="none" stroke-width="3"/><rect x="22" y="10" width="13" height="20" rx="2" fill="none" stroke-width="3"/><path d="M26 16a3 3 0 0 1 5 2c0 2-3 2-3 4" fill="none" stroke-width="2.4"/><circle cx="28" cy="26" r="1" fill="currentColor" stroke="none"/>',
    sudoku:     '<rect x="7" y="7" width="26" height="26" rx="2" fill="none" stroke-width="3"/><path d="M15.7 7v26M24.3 7v26M7 15.7h26M7 24.3h26" stroke-width="2"/>',
    '2048':     '<rect x="8" y="8" width="24" height="24" rx="5" fill="none" stroke-width="3"/><path d="M20 14v12M15 19l5-5 5 5" fill="none" stroke-width="2.6"/>',
    sopa:       '<rect x="5" y="5" width="22" height="22" rx="2" fill="none" stroke-width="3"/><path d="M12 5v22M19 5v22M5 12h22M5 19h22" stroke-width="1.6"/><circle cx="27" cy="27" r="6" fill="none" stroke-width="3"/><path d="M31.5 31.5l4 4" stroke-width="3"/>',
    penjat:     '<path d="M8 35h16" stroke-width="3"/><path d="M13 35V7h13" fill="none" stroke-width="3"/><path d="M26 7v5" stroke-width="3"/><circle cx="26" cy="16" r="3.5" fill="none" stroke-width="3"/><path d="M26 19v7M26 22l-4 3M26 22l4 3M26 26l-3 5M26 26l3 5" fill="none" stroke-width="2.4"/>',
  }[id] || '<circle cx="20" cy="20" r="12" fill="none" stroke-width="3"/>';
  return `<svg class="glyph" viewBox="0 0 40 40" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">${g}</svg>`;
}

// ---------- pantalla inicial: tria de mode ----------
function goLanding() {
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
      <button class="mode-card" id="mode-mp" style="--c:#E4572E">
        <span>${glyph('multi')}</span>
        <div><h3>Multijugador</h3><p>Els 6 jocs de festa: passa el mòbil i a riure.</p></div>
      </button>
      <button class="mode-card mode-card--dark" id="mode-sp" style="--c:var(--ink)">
        <span>${glyph('solo')}</span>
        <div><h3>Un sol jugador</h3><p>6 jocs per a tu sol, quan vulguis.</p></div>
      </button>
    </div>
  `;
  app.appendChild(wrap);
  wrap.querySelector('#mode-mp').addEventListener('click', goMultiplayer);
  wrap.querySelector('#mode-sp').addEventListener('click', goSingle);
}

// ---------- graella de jocs de festa (multijugador) ----------
function goMultiplayer() {
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
  wrap.querySelector('#help').addEventListener('click', helpList);
}

// ---------- graella de jocs d'un sol jugador ----------
function goSingle() {
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
  `;
  app.appendChild(wrap);
  renderGameGrid(wrap.querySelector('#grid'), SOLO_GAMES, goSingle);
  wrap.querySelector('#back').addEventListener('click', goLanding);
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
  setAccent(game.accent);
  clear();
  const root = document.createElement('div');
  root.className = 'screen';
  app.appendChild(root);
  game.mount(root, { goHome: back || goMultiplayer });
}

// ---------- ajuda: "Com es juga?" ----------
function helpList() {
  setAccent('#E4572E');
  clear();
  const wrap = document.createElement('div');
  wrap.className = 'screen';
  wrap.innerHTML = `
    <button class="back" id="back">${t('nav.home')}</button>
    <p class="kicker">${t('help.kicker')}</p>
    <h2 style="font-size:30px;margin:6px 0 22px">${t('help.title')}</h2>
    <div class="stack" id="list" style="--stack-gap:12px"></div>
  `;
  app.appendChild(wrap);
  wrap.querySelector('#back').onclick = goMultiplayer;

  const list = wrap.querySelector('#list');
  PARTY_GAMES.forEach(game => {
    const b = document.createElement('button');
    b.className = 'btn btn--outline';
    b.style.textAlign = 'left';
    b.innerHTML = `<span style="color:var(--accent)">${glyph(game.id)}</span> &nbsp; ${gameTitle(game)}`;
    b.style.display = 'flex';
    b.style.alignItems = 'center';
    b.onclick = () => helpDetail(game);
    list.appendChild(b);
  });
}

function helpDetail(game) {
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
  wrap.querySelector('#back').onclick = helpList;
}

// arrenca
goLanding();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
