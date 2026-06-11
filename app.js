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
import { t, getLang, setLang, LANGUAGES } from './i18n.js';

// Títol i tagline d'un joc segons l'idioma actual (la INTERFÍCIE es
// tradueix; el contingut del joc continua en català dins de cada fitxer).
const gameTitle = (g) => t('game.' + g.id + '.title');
const gameTagline = (g) => t('game.' + g.id + '.tagline');
const gameInstructions = (g) => [1, 2, 3, 4].map(n => t('instr.' + g.id + '.' + n));

const GAMES = [impostor, endevinala, bomba, quiprobable, aescena, passaparaula];

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
  }[id] || '<circle cx="20" cy="20" r="12" fill="none" stroke-width="3"/>';
  return `<svg class="glyph" viewBox="0 0 40 40" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">${g}</svg>`;
}

function goHome() {
  setAccent(null);
  clear();
  const wrap = document.createElement('div');
  wrap.className = 'screen home';
  wrap.innerHTML = `
    <button class="home__lang" id="lang" aria-label="${t('home.language')}">${globeGlyph()}<span>${t('home.language')}</span></button>
    <header class="home__head">
      <div class="brand">Xala<span>!</span></div>
      <p class="tagline">${t('home.tagline')}</p>
    </header>
    <div class="grid" id="grid"></div>
    <button class="btn btn--outline home__help" id="help">${t('home.help')}</button>
  `;
  app.appendChild(wrap);

  const grid = wrap.querySelector('#grid');
  GAMES.forEach(game => {
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
    if (game.ready) card.addEventListener('click', () => openGame(game));
    grid.appendChild(card);
  });

  wrap.querySelector('#help').addEventListener('click', helpList);
  wrap.querySelector('#lang').addEventListener('click', languageScreen);
}

// Icona de globus per al botó d'idioma.
function globeGlyph() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/></svg>`;
}

// ---------- selector d'idioma ----------
function languageScreen() {
  setAccent('#E4572E');
  clear();
  const wrap = document.createElement('div');
  wrap.className = 'screen';
  const cur = getLang();
  const items = LANGUAGES.map(l => `
    <button class="btn ${l.code === cur ? 'btn--accent' : 'btn--outline'}" data-lang="${l.code}"
      style="text-align:left">${l.name}</button>
  `).join('');
  wrap.innerHTML = `
    <button class="back" id="back">${t('nav.home')}</button>
    <p class="kicker">${t('lang.kicker')}</p>
    <h2 style="font-size:30px;margin:6px 0 22px">${t('lang.title')}</h2>
    <div class="stack" id="list" style="--stack-gap:10px">${items}</div>
  `;
  app.appendChild(wrap);
  wrap.querySelector('#back').onclick = goHome;
  wrap.querySelectorAll('[data-lang]').forEach(b => {
    b.onclick = () => { setLang(b.dataset.lang); goHome(); };
  });
}

function openGame(game) {
  setAccent(game.accent);
  clear();
  const root = document.createElement('div');
  root.className = 'screen';
  app.appendChild(root);
  game.mount(root, { goHome });
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
  wrap.querySelector('#back').onclick = goHome;

  const list = wrap.querySelector('#list');
  GAMES.forEach(game => {
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
goHome();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
