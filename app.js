// ============================================================
// Xala! — controlador principal
// Registre de jocs + navegació + portada + ajuda "Com es juga?"
// ============================================================

import impostor from './impostor.js';
import quiprobable from './quiprobable.js';
import endevinala from './endevinala.js';
import bomba from './bomba.js';
import aescena from './aescena.js';
import basta from './basta.js';

const GAMES = [impostor, endevinala, bomba, quiprobable, aescena, basta];

const app = document.getElementById('app');

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
    basta:      '<path d="M14 5h12l8 8v12l-8 8H14l-8-8V13z" fill="none" stroke-width="3"/><path d="M13 20h14" stroke-width="3"/>',
  }[id] || '<circle cx="20" cy="20" r="12" fill="none" stroke-width="3"/>';
  return `<svg class="glyph" viewBox="0 0 40 40" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">${g}</svg>`;
}

function goHome() {
  setAccent(null);
  clear();
  const wrap = document.createElement('div');
  wrap.className = 'screen';
  wrap.innerHTML = `
    <header style="margin-top:8px">
      <div class="brand">Xala<span>!</span></div>
      <p class="tagline">Passa el mòbil i que comenci la festa.</p>
    </header>
    <div class="grid" id="grid"></div>
    <button class="btn btn--outline" id="help" style="margin-top:18px">Com es juga?</button>
    <div class="spacer"></div>
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
      ${game.ready ? '' : '<span class="badge">Aviat</span>'}
      <span>${glyph(game.id)}</span>
      <div><h3>${game.title}</h3><p>${game.tagline}</p></div>
    `;
    if (game.ready) card.addEventListener('click', () => openGame(game));
    grid.appendChild(card);
  });

  wrap.querySelector('#help').addEventListener('click', helpList);
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
    <button class="back" id="back">‹ Inici</button>
    <p class="kicker">Instruccions</p>
    <h2 style="font-size:30px;margin:6px 0 22px">Com es juga?</h2>
    <div class="stack" id="list" style="--stack-gap:12px"></div>
  `;
  app.appendChild(wrap);
  wrap.querySelector('#back').onclick = goHome;

  const list = wrap.querySelector('#list');
  GAMES.forEach(game => {
    const b = document.createElement('button');
    b.className = 'btn btn--outline';
    b.style.textAlign = 'left';
    b.innerHTML = `<span style="color:var(--accent)">${glyph(game.id)}</span> &nbsp; ${game.title}`;
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
  const steps = (game.instructions || ['Aviat hi haurà instruccions.'])
    .map(s => `<li>${s}</li>`).join('');
  wrap.innerHTML = `
    <button class="back" id="back">‹ Instruccions</button>
    <p class="kicker">${game.title}</p>
    <h2 style="font-size:28px;margin:6px 0 18px">${game.tagline}</h2>
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
