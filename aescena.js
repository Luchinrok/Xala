// ============================================================
// A escena! — actuar i endevinar amb un gir (mímica o so)
//
// Per torns rotatius: a cada torn, a UN jugador li toca una paraula i
// un MODE (MÍMICA o SO) i l'ha de representar; la resta ho endevina.
// "Encertat!" suma un punt al jugador que actua. Al final, guanyador +
// classificació. Reaprofita els noms (store.js), la selecció de
// categories compartida (subconjunt) i les paraules de l'impostor.
// ============================================================

import { CATEGORIES } from './impostor-paraules.js';
import { getPlayers, setPlayers } from './store.js';
import { openCategoryScreen, categoriesLabel } from './category-select.js';

// Subconjunt de categories bones per actuar.
const ALLOWED = ['menjar', 'animals', 'accions', 'objectes', 'esports', 'professions', 'transport', 'musica'];

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default {
  id: 'aescena',
  title: 'A escena!',
  tagline: 'Fes mímica o so i que ho endevinin',
  accent: '#E4572E',
  color: '#E4572E',
  ready: true,

  instructions: [
    'Per torns, a un jugador li toca una paraula i un mode a l’atzar: MÍMICA o SO.',
    'Passa-li el mòbil; només la veu ell, i la representa sense parlar.',
    'La resta ho endevina: "Encertat!" suma un punt a qui actua.',
    'Es va rotant fins que tothom ha fet les seves paraules; al final, classificació.',
  ],

  mount(root, { goHome }) {
    // Carrega els noms recordats; mínim 2 jugadors.
    const saved = getPlayers();
    const initialNames = (Array.isArray(saved) && saved.length) ? saved.slice(0, 12) : ['', ''];
    while (initialNames.length < 2) initialNames.push('');

    const state = {
      names: initialNames,
      perPlayer: 5,
      categoryIds: ['menjar'],   // per defecte, només la primera (Menjar i beure)
      bag: [],
      bagKey: null,
      word: null,
      catLabel: null,
      mode: null,
      scores: [],
      correct: [],  // paraules encertades per jugador
      passed: [],   // paraules passades per jugador
      order: [],   // seqüència d'índexs de jugador (torns rotatius)
      turn: 0,
    };

    const count = () => state.names.length;
    const getName = (i) => (state.names[i] && state.names[i].trim()) || `Jugador ${i + 1}`;
    const allFilled = () => state.names.every((n) => (n || '').trim() !== '');
    const save = () => setPlayers(state.names);

    function readNames() {
      for (let i = 0; i < count(); i++) {
        const el = root.querySelector('#name-' + i);
        if (el) state.names[i] = el.value;
      }
    }

    // ---------- 1) configuració ----------
    function screenSetup() {
      root.innerHTML = `
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker">A escena!</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>

        <p class="label" style="margin:0 0 12px">Jugadors</p>
        <div class="stack" id="names" style="--stack-gap:10px"></div>
        <button class="btn btn--outline" id="addp" style="margin-top:12px">+ Afegeix jugador</button>

        <p class="label" style="margin:24px 0 12px">Paraules per jugador</p>
        <div class="btn-row" id="perp">
          ${[3, 5, 7].map(n => `<button class="btn ${state.perPlayer === n ? 'btn--accent' : 'btn--outline'}" data-perp="${n}">${n}</button>`).join('')}
        </div>

        <p class="label" style="margin:24px 0 12px">Categories</p>
        <button class="btn btn--outline" id="cats">${categoriesLabel(state.categoryIds, ALLOWED)}</button>

        <button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>
        <p class="muted" id="warn" style="margin-top:10px;text-align:center;color:var(--accent);font-weight:700;display:none">Cal omplir el nom de tots els jugadors</p>
      `;
      root.querySelector('#back').onclick = goHome;

      root.querySelectorAll('[data-perp]').forEach(b => {
        b.onclick = () => {
          state.perPlayer = parseInt(b.dataset.perp, 10);
          root.querySelectorAll('[data-perp]').forEach(x => {
            x.className = 'btn ' + (parseInt(x.dataset.perp, 10) === state.perPlayer ? 'btn--accent' : 'btn--outline');
          });
        };
      });

      root.querySelector('#cats').onclick = () => {
        readNames();
        openCategoryScreen(root, { categoryIds: state.categoryIds, kicker: 'A escena!', onBack: screenSetup, allowedIds: ALLOWED });
      };

      root.querySelector('#addp').onclick = () => {
        readNames();
        if (count() >= 12 || !allFilled()) return;
        state.names.push('');
        save();
        renderNames();
        const last = root.querySelector('#name-' + (count() - 1));
        if (last) last.focus();
      };

      root.querySelector('#start').onclick = () => {
        readNames();
        if (!allFilled()) { updateButtons(); return; }
        save();
        beginGame();
      };

      renderNames();
    }

    function updateButtons() {
      const filled = allFilled();
      const add = root.querySelector('#addp');
      const start = root.querySelector('#start');
      const warn = root.querySelector('#warn');
      if (add) add.disabled = count() >= 12 || !filled;
      if (start) start.disabled = !filled;
      if (warn) warn.style.display = filled ? 'none' : 'block';
    }

    function renderNames() {
      const box = root.querySelector('#names');
      const canDelete = count() > 2; // mínim 2 jugadors
      box.innerHTML = state.names.map((nm, i) => `
        <div class="name-row">
          <input class="input" id="name-${i}" type="text" maxlength="16" placeholder="Nom" value="${(nm || '').replace(/"/g, '&quot;')}">
          ${canDelete ? `<button class="name-del" data-del="${i}" aria-label="Treu">×</button>` : ''}
        </div>
      `).join('');
      box.querySelectorAll('[data-del]').forEach(b => {
        b.onclick = () => {
          readNames();
          state.names.splice(parseInt(b.dataset.del, 10), 1);
          save();
          renderNames();
        };
      });
      box.querySelectorAll('input.input').forEach((el, i) => {
        el.oninput = () => {
          state.names[i] = el.value;
          save();
          updateButtons();
        };
      });
      updateButtons();
    }

    // ---------- bossa de paraules (sense repetir) ----------
    function buildBag() {
      const seen = new Set();
      const pool = [];
      CATEGORIES.filter(c => state.categoryIds.includes(c.id)).forEach(c => {
        c.words.forEach(w => {
          const k = w.word.toLowerCase();
          if (!seen.has(k)) { seen.add(k); pool.push({ word: w.word, cat: c.name }); }
        });
      });
      return shuffle(pool);
    }
    function drawTurn() {
      const key = state.categoryIds.slice().sort().join(',');
      if (state.bagKey !== key || state.bag.length === 0) { state.bag = buildBag(); state.bagKey = key; }
      const pick = state.bag.pop();
      state.word = pick.word;
      state.catLabel = pick.cat;
      state.mode = Math.random() < 0.5 ? 'MÍMICA' : 'SO';
    }

    // ---------- arrenca la partida ----------
    function beginGame() {
      state.scores = state.names.map(() => 0);
      state.correct = state.names.map(() => []);
      state.passed = state.names.map(() => []);
      // torns rotatius: cada ronda passa per tots els jugadors
      state.order = [];
      for (let r = 0; r < state.perPlayer; r++) {
        for (let p = 0; p < count(); p++) state.order.push(p);
      }
      state.turn = 0;
      state.bag = [];
      state.bagKey = null;
      nextTurn();
    }

    function nextTurn() {
      if (state.turn >= state.order.length) { screenFinal(); return; }
      drawTurn();
      screenPass();
    }

    const actor = () => state.order[state.turn];

    // ---------- 2) passa el mòbil ----------
    function screenPass() {
      root.innerHTML = `
        <button class="back" id="home">‹ Inici</button>
        <p class="kicker">Torn ${state.turn + 1} de ${state.order.length}</p>
        <h2 style="font-size:26px;margin:6px 0 18px">Passa el mòbil a<br>${getName(actor())}</h2>
        <div class="reveal-card tap-hint" id="card">
          <div class="word" style="font-size:28px">Toca per veure<br>la paraula</div>
        </div>
        <div class="spacer"></div>
        <p class="muted center">Que la resta no la vegi!</p>
      `;
      root.querySelector('#home').onclick = goHome;
      root.querySelector('#card').onclick = screenReveal;
    }

    // ---------- 3) revelació secreta (només qui actua) ----------
    function screenReveal() {
      root.innerHTML = `
        <button class="back" id="home">‹ Inici</button>
        <p class="kicker center">Només ${getName(actor())}</p>
        <div class="ae-mode-wrap"><span class="ae-mode">${state.mode}</span></div>
        <div class="reveal-card" id="card">
          <div class="who">${state.catLabel}</div>
          <div class="word">${state.word}</div>
        </div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="go" style="margin-top:18px">Som-hi!</button>
      `;
      root.querySelector('#home').onclick = goHome;
      root.querySelector('#go').onclick = screenAct;
    }

    // ---------- 4) actuació (ho mira tothom) ----------
    function screenAct() {
      const hint = state.mode === 'MÍMICA' ? 'Només gestos, sense parlar!' : 'Només sons, sense paraules!';
      root.innerHTML = `
        <button class="back" id="home">‹ Inici</button>
        <p class="kicker center">Actua ${getName(actor())}</p>
        <div class="ae-mode-big">${state.mode}</div>
        <p class="muted center">${hint}</p>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:14px">
          <button class="btn btn--accent" id="ok">Encertat!</button>
          <button class="btn btn--outline" id="pass">Passa</button>
        </div>
      `;
      root.querySelector('#home').onclick = goHome;
      root.querySelector('#ok').onclick = () => { state.correct[actor()].push(state.word); state.scores[actor()]++; state.turn++; nextTurn(); };
      root.querySelector('#pass').onclick = () => { state.passed[actor()].push(state.word); state.turn++; nextTurn(); };
    }

    // ---------- 5) final: guanyador + classificació ----------
    function screenFinal() {
      const max = Math.max(...state.scores);
      const winners = state.names.map((nm, i) => i).filter(i => state.scores[i] === max);
      const tie = winners.length > 1;
      const winNames = winners.map(i => getName(i)).join(' i ');

      const order = state.names
        .map((nm, i) => i)
        .sort((a, b) => state.scores[b] - state.scores[a] || a - b);
      const rows = order.map(i => `
        <button class="btn btn--outline rank-row" data-player="${i}">
          <span class="rank-row__name">${getName(i)}</span>
          <span class="rank-row__pts">${state.scores[i]} ›</span>
        </button>`).join('');

      root.innerHTML = `
        <button class="back" id="back">‹ Inici</button>
        <p class="kicker center">Final</p>
        <div class="reveal-card" id="card">
          <div class="who">${tie ? 'Empat! Guanyen...' : 'Guanya...'}</div>
          <div class="word">${winNames}!</div>
          <div class="who">${max} encert${max === 1 ? '' : 's'}</div>
        </div>
        <p class="label" style="margin:22px 0 12px">Classificació · toca un jugador</p>
        <div class="stack" style="--stack-gap:10px">${rows}</div>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:20px">
          <button class="btn btn--accent" id="again">Una altra partida</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>
      `;
      root.querySelector('#back').onclick = goHome;
      root.querySelector('#home').onclick = goHome;
      root.querySelector('#again').onclick = beginGame;
      root.querySelectorAll('[data-player]').forEach(b => {
        b.onclick = () => screenPlayerDetail(parseInt(b.dataset.player, 10));
      });
    }

    // ---------- detall d'un jugador (encertades / passades) ----------
    function screenPlayerDetail(i) {
      const wordList = (arr) => arr.length
        ? `<div class="stack" style="--stack-gap:8px">${arr.map(w => `<div class="btn btn--outline" style="cursor:default;text-align:left">${w}</div>`).join('')}</div>`
        : `<p class="muted">Cap.</p>`;
      root.innerHTML = `
        <button class="back" id="back">‹ Classificació</button>
        <p class="kicker">${getName(i)}</p>
        <h2 style="font-size:28px;margin:6px 0 18px">${state.scores[i]} encert${state.scores[i] === 1 ? '' : 's'}</h2>
        <p class="label" style="margin:0 0 10px">Encertades</p>
        ${wordList(state.correct[i] || [])}
        <p class="label" style="margin:22px 0 10px">Passades</p>
        ${wordList(state.passed[i] || [])}
        <div class="spacer"></div>
      `;
      root.querySelector('#back').onclick = screenFinal;
    }

    screenSetup();
  },
};
