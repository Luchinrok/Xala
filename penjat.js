// ============================================================
// El penjat (hangman) — joc d'un sol jugador.
//
// La paraula surt a l'atzar de les categories triades (reaprofita
// CATEGORIES; només la paraula). S'amaga amb un guió per lletra i els
// espais es marquen. Tocant lletres de l'abecedari (A–Z) es revelen;
// la comparació és INSENSIBLE A ACCENTS (tocar "a" descobreix à/á...).
// Cada error dibuixa una part del penjat (6 errors = perds).
//
// Estètica: fons beix; forca i ninot en tinta (--ink); tecles beix amb
// vora de tinta, usades en corall. Cap negre.
// ============================================================

import { CATEGORIES } from './impostor-paraules.js';
import { openCategoryScreen, categoriesLabel } from './category-select.js';
import { drawFromBag } from './word-bag.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const MAX_ERRORS = 6;

// minúscula, sense accents ni diacrítics (per comparar a≈à, c≈ç, n≈ñ...)
function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Converteix una paraula en una llista de caràcters:
//   { sep:true }                       -> espai (separació de paraules)
//   { letter:true, norm, display, revealed } -> lletra a endevinar
//   { letter:false, display }          -> literal (guió, apòstrof, ·...)
function wordToChars(word) {
  return [...(word || '')].map(ch => {
    if (ch === ' ') return { sep: true };
    const n = norm(ch);
    if (/^[a-z]$/.test(n)) return { letter: true, norm: n, display: ch.toUpperCase(), revealed: false };
    return { letter: false, display: ch };
  });
}

// Parts del ninot, en ordre d'error (1..6).
const BODY_PARTS = [
  '<circle cx="85" cy="42" r="12"/>',          // 1 cap
  '<line x1="85" y1="54" x2="85" y2="96"/>',    // 2 cos
  '<line x1="85" y1="64" x2="70" y2="82"/>',    // 3 braç esquerre
  '<line x1="85" y1="64" x2="100" y2="82"/>',   // 4 braç dret
  '<line x1="85" y1="96" x2="72" y2="120"/>',   // 5 cama esquerra
  '<line x1="85" y1="96" x2="98" y2="120"/>',   // 6 cama dreta
];

// Forca sempre visible (pal, biga, corda) + una part del ninot per error.
function gallowsSVG(errors) {
  const body = BODY_PARTS.slice(0, Math.max(0, Math.min(errors, MAX_ERRORS))).join('');
  return `<svg class="hang-svg" viewBox="0 0 120 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="14" y1="152" x2="76" y2="152"/>
    <line x1="30" y1="152" x2="30" y2="12"/>
    <line x1="30" y1="12" x2="85" y2="12"/>
    <line x1="85" y1="12" x2="85" y2="30"/>
    ${body}
  </svg>`;
}

// per a proves (el navegador només usa el default)
export { norm, wordToChars, gallowsSVG };

export default {
  id: 'penjat',
  title: 'El penjat',
  tagline: 'Endevina la paraula lletra a lletra',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Surt una paraula amagada amb un guió per cada lletra.',
    'Toca lletres de l\'abecedari; les accentuades compten igual (a = à).',
    'Encerta i es revela; falla i es dibuixa una part del penjat.',
    'Endevina la paraula abans de fer 6 errors!',
  ],

  mount(root, { goHome }) {
    const state = {
      categoryIds: CATEGORIES.map(c => c.id), // totes per defecte
      word: '',
      chars: [],
      used: new Set(),
      errors: 0,
      over: false,
    };

    // ---------- 1) configuració ----------
    function screenConfig() {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">El penjat</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>
        <p class="label" style="margin:0 0 12px">Categories</p>
        <button class="btn btn--outline" id="cats">${categoriesLabel(state.categoryIds)}</button>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>
      `;
      root.querySelector('#back').onclick = goHome;
      root.querySelector('#cats').onclick = () => {
        openCategoryScreen(root, { categoryIds: state.categoryIds, kicker: 'El penjat', onBack: screenConfig });
      };
      root.querySelector('#start').onclick = beginGame;
    }

    // ---------- paraula ----------
    function buildPool() {
      const seen = new Set();
      const out = [];
      CATEGORIES.filter(c => state.categoryIds.includes(c.id)).forEach(c => {
        c.words.forEach(w => {
          const k = w.word.toLowerCase();
          if (!seen.has(k)) { seen.add(k); out.push(w.word); }
        });
      });
      return out;
    }

    function beginGame() {
      const key = 'penjat:' + state.categoryIds.slice().sort().join(',');
      state.word = drawFromBag(key, buildPool) || '';
      state.chars = wordToChars(state.word);
      state.used = new Set();
      state.errors = 0;
      state.over = false;
      screenGame();
    }

    // ---------- 2) joc ----------
    function screenGame() {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker center" id="status"></p>
        <div class="hang-stage" id="gallows"></div>
        <div class="hang-word" id="word"></div>
        <div class="hang-keys" id="keys"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      renderGallows();
      renderWord();
      renderStatus();
      renderKeys();
    }

    function renderGallows() {
      const el = root.querySelector('#gallows');
      if (el) el.innerHTML = gallowsSVG(state.errors);
    }
    function renderWord() {
      const el = root.querySelector('#word');
      if (!el) return;
      el.innerHTML = state.chars.map(ch => {
        if (ch.sep) return '<span class="hang-space"></span>';
        if (!ch.letter) return `<span class="hang-lit">${ch.display}</span>`;
        return `<span class="hang-slot">${ch.revealed ? ch.display : ''}</span>`;
      }).join('');
    }
    function renderStatus() {
      const el = root.querySelector('#status');
      if (el) el.textContent = `Errors restants: ${MAX_ERRORS - state.errors}`;
    }
    function renderKeys() {
      const keys = root.querySelector('#keys');
      if (!keys) return;
      keys.innerHTML = ALPHABET.map(L => {
        const l = L.toLowerCase();
        return `<button class="hang-key" data-l="${l}"${state.used.has(l) ? ' disabled' : ''}>${L}</button>`;
      }).join('');
      keys.addEventListener('click', (e) => {
        const b = e.target.closest('.hang-key');
        if (!b || b.disabled) return;
        guess(b.dataset.l);
      });
    }

    function guess(letter) {
      if (state.over || state.used.has(letter)) return;
      state.used.add(letter);
      const btn = root.querySelector(`.hang-key[data-l="${letter}"]`);
      if (btn) btn.disabled = true;

      const hit = state.chars.some(ch => ch.letter && ch.norm === letter);
      if (hit) {
        state.chars.forEach(ch => { if (ch.letter && ch.norm === letter) ch.revealed = true; });
        renderWord();
        if (state.chars.every(ch => !ch.letter || ch.revealed)) finish('win');
      } else {
        state.errors++;
        renderGallows();
        renderStatus();
        if (state.errors >= MAX_ERRORS) finish('lose');
      }
    }

    // ---------- 3) final ----------
    function finish(result) {
      state.over = true;
      if (result === 'lose') state.chars.forEach(ch => { if (ch.letter) ch.revealed = true; });
      screenEnd(result);
    }

    function screenEnd(result) {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker center">Final</p>
        <div class="hang-stage" id="gallows"></div>
        <div class="panel center stack" style="margin-top:10px">
          <h2 style="font-size:32px;color:var(--accent)">${result === 'win' ? 'Has guanyat!' : 'Has perdut!'}</h2>
          <p class="muted">La paraula era</p>
          <h2 style="font-size:26px">${state.word}</h2>
        </div>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:18px">
          <button class="btn btn--accent" id="again">Una altra</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>
      `;
      root.querySelector('#gallows').innerHTML = gallowsSVG(state.errors);
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#again').onclick = beginGame;
      root.querySelector('#home').onclick = goHome;
    }

    screenConfig();
  },
};
