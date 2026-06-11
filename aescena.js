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
import { drawFromBag } from './word-bag.js';
import { t, tc, joinAnd } from './i18n.js';

// Subconjunt de categories bones per actuar.
const ALLOWED = ['menjar', 'animals', 'accions', 'objectes', 'esports', 'professions', 'transport', 'musica'];

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
    const getName = (i) => (state.names[i] && state.names[i].trim()) || t('common.playerN', { n: i + 1 });
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
        <button class="back" id="back">${t('nav.home')}</button>
        <p class="kicker">${t('game.aescena.title')}</p>
        <h2 style="font-size:30px;margin:6px 0 22px">${t('aescena.setupTitle')}</h2>

        <p class="label" style="margin:0 0 12px">${t('common.players')}</p>
        <div class="stack" id="names" style="--stack-gap:10px"></div>
        <button class="btn btn--outline" id="addp" style="margin-top:12px">${t('common.addPlayer')}</button>

        <p class="label" style="margin:24px 0 12px">${t('aescena.wordsPerPlayer')}</p>
        <div class="btn-row" id="perp">
          ${[3, 5, 7].map(n => `<button class="btn ${state.perPlayer === n ? 'btn--accent' : 'btn--outline'}" data-perp="${n}">${n}</button>`).join('')}
        </div>

        <p class="label" style="margin:24px 0 12px">${t('common.categories')}</p>
        <button class="btn btn--outline" id="cats">${categoriesLabel(state.categoryIds, ALLOWED)}</button>

        <button class="btn btn--accent" id="start" style="margin-top:28px">${t('common.start')}</button>
        <p class="muted" id="warn" style="margin-top:10px;text-align:center;color:var(--accent);font-weight:700;display:none">${t('common.fillAllNames')}</p>
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
        openCategoryScreen(root, { categoryIds: state.categoryIds, kicker: t('game.aescena.title'), onBack: screenSetup, allowedIds: ALLOWED });
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
          <input class="input" id="name-${i}" type="text" maxlength="16" placeholder="${t('common.namePlaceholder')}" value="${(nm || '').replace(/"/g, '&quot;')}">
          ${canDelete ? `<button class="name-del" data-del="${i}" aria-label="${t('common.removeAria')}">×</button>` : ''}
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

    // ---------- bossa de paraules (barrejada, persistent, sense repetir) ----------
    // word-bag.js manté la bossa durant tota la sessió: no repeteix cap
    // paraula fins esgotar la bossa de les categories triades, ni tan sols
    // entre partides; quan s'esgota, es torna a barrejar.
    function buildPool() {
      const seen = new Set();
      const pool = [];
      CATEGORIES.filter(c => state.categoryIds.includes(c.id)).forEach(c => {
        c.words.forEach(w => {
          const k = w.word.toLowerCase();
          if (!seen.has(k)) { seen.add(k); pool.push({ word: w.word, cat: c.name }); }
        });
      });
      return pool;
    }
    function drawTurn() {
      const key = 'aescena:' + state.categoryIds.slice().sort().join(',');
      const pick = drawFromBag(key, buildPool);
      state.word = pick.word;
      state.catLabel = pick.cat;
      // identificador intern del mode; el text que es mostra ve de i18n
      state.mode = Math.random() < 0.5 ? 'mime' : 'sound';
    }

    // text traduït del mode actual (MÍMICA / SO i equivalents)
    const modeLabel = () => t(state.mode === 'mime' ? 'aescena.mime' : 'aescena.sound');

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
        <button class="back" id="home">${t('nav.home')}</button>
        <p class="kicker">${t('aescena.turnXofY', { x: state.turn + 1, y: state.order.length })}</p>
        <h2 style="font-size:26px;margin:6px 0 18px">${t('common.passMobileTo')}<br>${getName(actor())}</h2>
        <div class="reveal-card tap-hint" id="card">
          <div class="word" style="font-size:28px">${t('aescena.tapSeeWord')}</div>
        </div>
        <div class="spacer"></div>
        <p class="muted center">${t('aescena.dontLetSee')}</p>
      `;
      root.querySelector('#home').onclick = goHome;
      root.querySelector('#card').onclick = screenReveal;
    }

    // ---------- 3) revelació secreta (només qui actua) ----------
    function screenReveal() {
      root.innerHTML = `
        <button class="back" id="home">${t('nav.home')}</button>
        <p class="kicker center">${t('aescena.onlyName', { name: getName(actor()) })}</p>
        <div class="ae-mode-wrap"><span class="ae-mode">${modeLabel()}</span></div>
        <div class="reveal-card" id="card">
          <div class="who">${state.catLabel}</div>
          <div class="word">${state.word}</div>
        </div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="go" style="margin-top:18px">${t('common.letsBang')}</button>
      `;
      root.querySelector('#home').onclick = goHome;
      root.querySelector('#go').onclick = screenAct;
    }

    // ---------- 4) actuació (ho mira tothom) ----------
    function screenAct() {
      const hint = state.mode === 'mime' ? t('aescena.mimeHint') : t('aescena.soundHint');
      root.innerHTML = `
        <button class="back" id="home">${t('nav.home')}</button>
        <p class="kicker center">${t('aescena.actName', { name: getName(actor()) })}</p>
        <div class="ae-mode-big">${modeLabel()}</div>
        <p class="muted center">${hint}</p>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:14px">
          <button class="btn btn--accent" id="ok">${t('aescena.correct')}</button>
          <button class="btn btn--outline" id="pass">${t('common.pass')}</button>
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
      const winNames = joinAnd(winners.map(i => getName(i)));

      const order = state.names
        .map((nm, i) => i)
        .sort((a, b) => state.scores[b] - state.scores[a] || a - b);
      const rows = order.map(i => `
        <button class="btn btn--outline rank-row" data-player="${i}">
          <span class="rank-row__name">${getName(i)}</span>
          <span class="rank-row__pts">${state.scores[i]} ›</span>
        </button>`).join('');

      root.innerHTML = `
        <button class="back" id="back">${t('nav.home')}</button>
        <p class="kicker center">${t('common.final')}</p>
        <div class="reveal-card" id="card">
          <div class="who">${tie ? t('common.tieWinPlural') : t('common.winSingular')}</div>
          <div class="word">${winNames}!</div>
          <div class="who">${tc(max, 'hits')}</div>
        </div>
        <p class="label" style="margin:22px 0 12px">${t('common.rankingTouch')}</p>
        <div class="stack" style="--stack-gap:10px">${rows}</div>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:20px">
          <button class="btn btn--accent" id="again">${t('common.anotherGame')}</button>
          <button class="btn btn--outline" id="home">${t('common.backHome')}</button>
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
        : `<p class="muted">${t('common.none')}</p>`;
      root.innerHTML = `
        <button class="back" id="back">${t('nav.ranking')}</button>
        <p class="kicker">${getName(i)}</p>
        <h2 style="font-size:28px;margin:6px 0 18px">${tc(state.scores[i], 'hits')}</h2>
        <p class="label" style="margin:0 0 10px">${t('common.correctWords')}</p>
        ${wordList(state.correct[i] || [])}
        <p class="label" style="margin:22px 0 10px">${t('common.passedWords')}</p>
        ${wordList(state.passed[i] || [])}
        <div class="spacer"></div>
      `;
      root.querySelector('#back').onclick = screenFinal;
    }

    screenSetup();
  },
};
