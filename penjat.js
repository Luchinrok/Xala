// ============================================================
// El penjat (hangman) — joc d'un sol jugador.
//
// La paraula surt a l'atzar de les categories triades (CATEGORIES +
// word-bag). S'amaga amb un guió per lletra; els espais es marquen.
// Tocant lletres A–Z es revelen (comparació INSENSIBLE A ACCENTS:
// a=à, c=ç, n=ñ...). Encert -> verd; error -> vermell i dibuixa una
// part del penjat. Dificultat: NOMÉS canvia la mida de la paraula
// (Fàcil curtes, Normal qualsevol, Difícil llargues); les vides són
// sempre 6 a tots els nivells. Rècord: ratxa de victòries
// (localStorage). Tot en tinta; cap negre.
// ============================================================

import { CATEGORIES } from './impostor-paraules.js';
import { openCategoryScreen, categoriesLabel } from './category-select.js';
import { drawFromBag } from './word-bag.js';
import { getRecord, setRecord } from './records.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// La dificultat NOMÉS canvia la mida de la paraula; les vides (errors
// permesos) són fixes a 6 a tots els nivells.
const FIXED_ERRORS = 6;
const LEVELS = {
  easy:   { label: 'Fàcil',   errors: FIXED_ERRORS, maxLen: 6 },   // paraules curtes
  normal: { label: 'Normal',  errors: FIXED_ERRORS },              // qualsevol mida
  hard:   { label: 'Difícil', errors: FIXED_ERRORS, minLen: 8 },   // paraules llargues
};

// minúscula, sense accents ni diacrítics (per comparar a≈à, c≈ç, n≈ñ...)
function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
const isLetterChar = (ch) => /^[a-z]$/.test(norm(ch));
const letterCount = (word) => [...(word || '')].filter(isLetterChar).length;

// Converteix una paraula en caràcters:
//   { sep:true } espai · { letter:true,norm,display,revealed } lletra ·
//   { letter:false,display } literal (guió, apòstrof, ·...).
function wordToChars(word) {
  return [...(word || '')].map(ch => {
    if (ch === ' ') return { sep: true };
    if (isLetterChar(ch)) return { letter: true, norm: norm(ch), display: ch.toUpperCase(), revealed: false };
    return { letter: false, display: ch };
  });
}

// Fins a 8 parts: cap, cos, braç esq, braç dret, cama esq, cama dreta,
// ulls, boca. Se'n dibuixen tantes com errors hi hagi.
const BODY_PARTS = [
  '<circle cx="85" cy="42" r="12"/>',                                                   // 1 cap
  '<line x1="85" y1="54" x2="85" y2="96"/>',                                             // 2 cos
  '<line x1="85" y1="64" x2="70" y2="82"/>',                                             // 3 braç esquerre
  '<line x1="85" y1="64" x2="100" y2="82"/>',                                            // 4 braç dret
  '<line x1="85" y1="96" x2="72" y2="120"/>',                                            // 5 cama esquerra
  '<line x1="85" y1="96" x2="98" y2="120"/>',                                            // 6 cama dreta
  '<circle cx="81" cy="40" r="1.6" fill="currentColor" stroke="none"/><circle cx="89" cy="40" r="1.6" fill="currentColor" stroke="none"/>', // 7 ulls
  '<path d="M81 47 Q85 44 89 47"/>',                                                     // 8 boca
];

function gallowsSVG(errors) {
  const body = BODY_PARTS.slice(0, Math.max(0, Math.min(errors, BODY_PARTS.length))).join('');
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
    'Encert en verd; error en vermell i es dibuixa una part del penjat.',
    'La dificultat només canvia la llargada de la paraula; sempre tens 6 intents.',
  ],

  mount(root, { goHome }) {
    const state = {
      level: 'normal',
      categoryIds: [],   // cap per defecte; cal triar-ne almenys una
      maxErrors: LEVELS.normal.errors,
      word: '',
      chars: [],
      used: new Set(),
      errors: 0,
      over: false,
    };

    // ---------- rècord: ratxa de victòries ----------
    const loadStreak = () => getRecord('penjat:streak') || { best: 0, current: 0 };
    const saveStreak = (s) => setRecord('penjat:streak', s);

    // ---------- 1) configuració ----------
    function screenConfig() {
      const opts = ['easy', 'normal', 'hard'];
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">El penjat</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>

        <p class="label" style="margin:0 0 12px">Dificultat</p>
        <div class="btn-row" id="diffs">
          ${opts.map(k => `<button class="btn ${state.level === k ? 'btn--accent' : 'btn--outline'}" data-diff="${k}">${LEVELS[k].label}</button>`).join('')}
        </div>

        <p class="label" style="margin:24px 0 12px">Categories</p>
        <button class="btn btn--outline" id="cats">${categoriesLabel(state.categoryIds)}</button>
        <button class="btn btn--outline" id="record" style="margin-top:12px">Rècord</button>

        <button class="btn btn--accent" id="start" style="margin-top:24px">Comença</button>
        <p class="muted" id="warn" style="margin-top:10px;text-align:center;color:var(--accent);font-weight:700;display:none">Selecciona almenys una categoria</p>
      `;
      root.querySelector('#back').onclick = goHome;
      root.querySelectorAll('[data-diff]').forEach(b => {
        b.onclick = () => { state.level = b.dataset.diff; screenConfig(); };
      });
      root.querySelector('#cats').onclick = () => {
        openCategoryScreen(root, { categoryIds: state.categoryIds, kicker: 'El penjat', onBack: screenConfig });
      };
      root.querySelector('#record').onclick = screenRecords;
      root.querySelector('#start').onclick = () => {
        if (state.categoryIds.length === 0) { updateStart(); return; }
        beginGame();
      };
      updateStart();
    }

    function updateStart() {
      const has = state.categoryIds.length > 0;
      const start = root.querySelector('#start');
      const warn = root.querySelector('#warn');
      if (start) start.disabled = !has;
      if (warn) warn.style.display = has ? 'none' : 'block';
    }

    // ---------- rècord (pantalla) ----------
    function screenRecords() {
      const s = loadStreak();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">El penjat</p>
        <h2 style="font-size:30px;margin:6px 0 18px">Rècord</h2>
        <div class="panel center stack" style="margin-top:8px">
          <p class="muted">Millor ratxa de victòries</p>
          <h2 style="font-size:44px;color:var(--accent)">${s.best}</h2>
          <p class="muted">Ratxa actual: ${s.current}</p>
        </div>
        <div class="spacer"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
    }

    // ---------- paraula ----------
    function buildPool() {
      const seen = new Set();
      const all = [];
      CATEGORIES.filter(c => state.categoryIds.includes(c.id)).forEach(c => {
        c.words.forEach(w => {
          const k = w.word.toLowerCase();
          if (!seen.has(k)) { seen.add(k); all.push(w.word); }
        });
      });
      const lv = LEVELS[state.level];
      const filtered = all.filter(w => {
        const len = letterCount(w);
        if (lv.maxLen && len > lv.maxLen) return false;
        if (lv.minLen && len < lv.minLen) return false;
        return true;
      });
      return filtered.length ? filtered : all; // si el filtre buida el pool, sense filtre
    }

    function beginGame() {
      state.maxErrors = LEVELS[state.level].errors;
      const key = 'penjat:' + state.level + ':' + state.categoryIds.slice().sort().join(',');
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
      if (el) el.textContent = `Errors restants: ${state.maxErrors - state.errors}`;
    }
    function renderKeys() {
      const keys = root.querySelector('#keys');
      if (!keys) return;
      keys.innerHTML = ALPHABET.map(L => `<button class="hang-key" data-l="${L.toLowerCase()}">${L}</button>`).join('');
      keys.addEventListener('click', (e) => {
        const b = e.target.closest('.hang-key');
        if (!b || b.disabled) return;
        guess(b.dataset.l);
      });
    }

    function guess(letter) {
      if (state.over || state.used.has(letter)) return;
      state.used.add(letter);
      const hit = state.chars.some(ch => ch.letter && ch.norm === letter);
      const btn = root.querySelector(`.hang-key[data-l="${letter}"]`);
      if (btn) { btn.disabled = true; btn.classList.add(hit ? 'hang-key--ok' : 'hang-key--no'); }

      if (hit) {
        state.chars.forEach(ch => { if (ch.letter && ch.norm === letter) ch.revealed = true; });
        renderWord();
        if (state.chars.every(ch => !ch.letter || ch.revealed)) finish('win');
      } else {
        state.errors++;
        renderGallows();
        renderStatus();
        if (state.errors >= state.maxErrors) finish('lose');
      }
    }

    // ---------- 3) final ----------
    function finish(result) {
      state.over = true;
      const s = loadStreak();
      if (result === 'win') {
        s.current += 1;
        if (s.current > s.best) s.best = s.current;
      } else {
        state.chars.forEach(ch => { if (ch.letter) ch.revealed = true; });
        s.current = 0;
      }
      saveStreak(s);
      screenEnd(result, s);
    }

    function screenEnd(result, streak) {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker center">Final</p>
        <div class="hang-stage" id="gallows"></div>
        <div class="panel center stack" style="margin-top:10px">
          <h2 style="font-size:32px;color:var(--accent)">${result === 'win' ? 'Has guanyat!' : 'Has perdut!'}</h2>
          <p class="muted">La paraula era</p>
          <h2 style="font-size:26px">${state.word}</h2>
          <p class="muted">${result === 'win' ? 'Ratxa de victòries: ' + streak.current : 'Ratxa reiniciada'}</p>
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
