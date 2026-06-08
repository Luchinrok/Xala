// ============================================================
// Basta! — paraules per lletra a contrarellotge (estil Stop / Scattergories)
//
// Surt una LLETRA i unes quantes categories. Tothom alhora ha de pensar
// una paraula de cada categoria que comenci per aquella lletra abans que
// s'acabi el temps (o fins que algú cridi "Basta!").
//
// Flux: configuració (bossa de categories, categories per ronda, temps) ->
//       ronda (lletra gran + N categories + temporitzador + botó BASTA!) ->
//       fi de ronda (mateixa lletra i categories per comparar respostes).
// Reaprofita la selecció de categories compartida i els tiles de categoria.
// ============================================================

import { CATEGORIES } from './impostor-paraules.js';
import { CATEGORY_ICONS } from './category-icons.js';
import { openCategoryScreen, categoriesLabel } from './category-select.js';

// Lletres comunes en català (evitem les difícils: K, NY, Q, W, X, Y, Z, Ç).
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'V'];

// Opcions de temps (0 = sense temps).
const TIMES = [
  { v: 30, l: '30s' },
  { v: 60, l: '60s' },
  { v: 90, l: '90s' },
  { v: 0, l: 'Sense temps' },
];

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default {
  id: 'basta',
  title: 'Basta!',
  tagline: 'Paraules per lletra, a contrarellotge',
  accent: '#E4572E',
  color: '#F4E8D2',
  ready: true,

  instructions: [
    'Surt una lletra i unes quantes categories (per exemple "animal", "menjar").',
    'Tothom alhora pensa una paraula de cada categoria que comenci per aquella lletra.',
    'Corre: teniu el temps comptat, o jugueu fins que algú cridi "Basta!".',
    'En acabar, compareu les respostes i passeu a una altra ronda amb lletra nova.',
  ],

  mount(root, { goHome }) {
    const state = {
      categoryIds: CATEGORIES.map(c => c.id),  // bossa: totes per defecte
      perRound: 4,
      timeSec: 60,
      letter: null,
      lastLetter: null,
      cats: [],
    };

    // temporitzador viu durant una ronda
    let timerId = null;

    function stopTimer() {
      if (timerId) { clearInterval(timerId); timerId = null; }
    }
    function leaveGame() {
      stopTimer();
      goHome();
    }

    // ---------- tria de lletra i categories ----------
    function pickLetter() {
      let l;
      do { l = LETTERS[Math.floor(Math.random() * LETTERS.length)]; }
      while (l === state.lastLetter && LETTERS.length > 1);
      state.lastLetter = l;
      return l;
    }
    function pickCats() {
      const n = Math.min(state.perRound, state.categoryIds.length);
      return shuffle(state.categoryIds).slice(0, n)
        .map(id => CATEGORIES.find(c => c.id === id))
        .filter(Boolean);
    }

    // ---------- fragments compartits ----------
    const letterHTML = () =>
      `<div style="font-family:var(--font-display);font-weight:800;font-size:clamp(72px,26vw,120px);line-height:1;text-align:center;color:var(--accent);margin:2px 0 6px">${state.letter}</div>`;

    const catsHTML = () => `
      <div class="cat-grid">
        ${state.cats.map(c => `
          <div class="cat-tile" style="cursor:default">
            <span class="cat-tile__icon">${CATEGORY_ICONS[c.id] || ''}</span>
            <span class="cat-tile__name">${c.name}</span>
          </div>`).join('')}
      </div>`;

    // ---------- 1) configuració ----------
    function screenSetup() {
      stopTimer();
      root.innerHTML = `
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker">Basta!</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>

        <p class="label" style="margin:0 0 12px">Categories</p>
        <button class="btn btn--outline" id="cats">${categoriesLabel(state.categoryIds)}</button>

        <p class="label" style="margin:24px 0 12px">Categories per ronda</p>
        <div class="btn-row" id="perr">
          ${[3, 4, 5].map(n => `<button class="btn ${state.perRound === n ? 'btn--accent' : 'btn--outline'}" data-perr="${n}">${n}</button>`).join('')}
        </div>

        <p class="label" style="margin:24px 0 12px">Temps</p>
        <div class="btn-row" id="times">
          ${TIMES.map(t => `<button class="btn ${(state.timeSec || 0) === t.v ? 'btn--accent' : 'btn--outline'}" data-time="${t.v}">${t.l}</button>`).join('')}
        </div>

        <button class="btn btn--accent" id="go" style="margin-top:28px">Comença</button>
      `;
      root.querySelector('#back').onclick = leaveGame;

      root.querySelector('#cats').onclick = () => {
        openCategoryScreen(root, { categoryIds: state.categoryIds, kicker: 'Basta!', onBack: screenSetup });
      };

      root.querySelectorAll('[data-perr]').forEach(b => {
        b.onclick = () => {
          state.perRound = parseInt(b.dataset.perr, 10);
          root.querySelectorAll('[data-perr]').forEach(x => {
            x.className = 'btn ' + (parseInt(x.dataset.perr, 10) === state.perRound ? 'btn--accent' : 'btn--outline');
          });
        };
      });

      root.querySelectorAll('[data-time]').forEach(b => {
        b.onclick = () => {
          const v = parseInt(b.dataset.time, 10);
          state.timeSec = v === 0 ? null : v;
          root.querySelectorAll('[data-time]').forEach(x => {
            x.className = 'btn ' + ((state.timeSec || 0) === parseInt(x.dataset.time, 10) ? 'btn--accent' : 'btn--outline');
          });
        };
      });

      root.querySelector('#go').onclick = screenRound;
    }

    // ---------- 2) ronda ----------
    function screenRound() {
      stopTimer();
      state.letter = pickLetter();
      state.cats = pickCats();
      root.innerHTML = `
        <button class="back" id="home">‹ Inici</button>
        <p class="kicker center">La lletra és</p>
        ${letterHTML()}
        ${state.timeSec
          ? `<div class="center" id="timer" style="font-family:var(--font-display);font-weight:800;font-size:34px;margin-bottom:12px">${formatTime(state.timeSec)}</div>`
          : `<p class="muted center" style="margin-bottom:12px">Sense temps: jugueu fins que algú cridi "Basta!".</p>`}
        ${catsHTML()}
        <div class="spacer"></div>
        <button class="btn btn--accent" id="basta" style="margin-top:18px;font-size:24px;letter-spacing:.06em">BASTA!</button>
      `;
      root.querySelector('#home').onclick = leaveGame;
      root.querySelector('#basta').onclick = () => { stopTimer(); screenEnd(); };

      if (state.timeSec) startTimer(state.timeSec);
    }

    function startTimer(sec) {
      stopTimer();
      let remaining = sec;
      const el = root.querySelector('#timer');
      timerId = setInterval(() => {
        remaining--;
        if (el) el.textContent = formatTime(Math.max(0, remaining));
        if (remaining <= 0) { stopTimer(); screenEnd(); }
      }, 1000);
    }

    // ---------- 3) fi de ronda ----------
    function screenEnd() {
      stopTimer();
      root.innerHTML = `
        <button class="back" id="home">‹ Inici</button>
        <p class="kicker center">Fi de la ronda</p>
        ${letterHTML()}
        <p class="muted center" style="margin-bottom:12px">Compareu i discutiu les respostes!</p>
        ${catsHTML()}
        <div class="spacer"></div>
        <div class="stack" style="margin-top:18px">
          <button class="btn btn--accent" id="again">Una altra ronda</button>
          <button class="btn btn--outline" id="home2">Tornar a l'inici</button>
        </div>
      `;
      root.querySelector('#home').onclick = leaveGame;
      root.querySelector('#home2').onclick = leaveGame;
      root.querySelector('#again').onclick = screenRound;
    }

    screenSetup();
  },
};
