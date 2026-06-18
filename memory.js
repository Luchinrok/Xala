// ============================================================
// Memory (parelles) — joc d'un sol jugador.
//
// Les cartes fan servir les icones de categoria (CATEGORY_ICONS) com a
// símbols de les parelles. Cada partida tria un subconjunt ALEATORI
// d'icones perquè variï. Destapa dues cartes: si fan parella, es queden;
// si no, es tornen a tapar. Quan trobes totes les parelles, es mostren
// els moviments i el temps.
//
// Estètica: fons beix; carta tapada corall (--accent) amb "?" en beix;
// carta destapada beix (--paper) amb la icona en tinta (--ink). Gir 3D.
// Cap negre. La graella cap sense scroll.
// ============================================================

import { CATEGORY_ICONS } from './category-icons.js';
import { getRecord, setRecord } from './records.js';

const ICON_KEYS = Object.keys(CATEGORY_ICONS);

// cols × rows i nombre de parelles per dificultat. El 5×5 (25 cel·les) és
// senar: es deixa una casella buida -> 24 cartes = 12 parelles.
const LEVELS = {
  easy:   { cols: 4, rows: 4, pairs: 8,  label: 'Fàcil' },   // 16 cartes
  normal: { cols: 5, rows: 5, pairs: 12, label: 'Normal' },  // 25 cel·les, 24 cartes (1 buida)
  hard:   { cols: 6, rows: 6, pairs: 18, label: 'Difícil' }, // 36 cartes
};

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const fmtTime = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

export default {
  id: 'memory',
  title: 'Memory',
  tagline: 'Troba totes les parelles de cartes',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Destapa dues cartes per torn tocant-les.',
    'Si fan parella, es queden destapades; si no, es tornen a girar.',
    'Recorda on és cada dibuix i troba totes les parelles.',
    'Acaba amb el mínim de moviments i temps possible.',
  ],

  mount(root, { goHome }) {
    root.classList.add('mem-screen');

    const state = {
      level: 'normal',
      cells: [],          // cel·les del tauler: { id, up, matched } o null (buida)
      cols: 4, rows: 4, pairs: 8,
      first: null,        // índex de la primera carta destapada
      busy: false,        // cert mentre es comparen dues cartes
      moves: 0,
      matched: 0,
      seconds: 0,
    };
    let timerId = null;
    let compareTo = null;
    let finishTo = null;

    function cleanup() {
      if (timerId) { clearInterval(timerId); timerId = null; }
      if (compareTo) { clearTimeout(compareTo); compareTo = null; }
      if (finishTo) { clearTimeout(finishTo); finishTo = null; }
    }
    function leave() { cleanup(); goHome(); }

    // ---------- 1) configuració ----------
    function screenConfig() {
      cleanup();
      const opts = ['easy', 'normal', 'hard'];
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Memory</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>
        <p class="label" style="margin:0 0 12px">Dificultat</p>
        <div class="btn-row" id="levels">
          ${opts.map(k => `<button class="btn ${state.level === k ? 'btn--accent' : 'btn--outline'}" data-level="${k}">${LEVELS[k].label}</button>`).join('')}
        </div>
        <p class="muted" id="lvinfo" style="margin-top:12px"></p>
        <button class="btn btn--outline" id="record" style="margin-top:14px">Rècord</button>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">Comença</button>
      `;
      const info = () => {
        const lv = LEVELS[state.level];
        const el = root.querySelector('#lvinfo');
        if (el) el.textContent = `${lv.cols}×${lv.rows} · ${lv.pairs} parelles`;
      };
      info();
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-level]').forEach(b => {
        b.onclick = () => {
          state.level = b.dataset.level;
          root.querySelectorAll('[data-level]').forEach(x => {
            x.className = 'btn ' + (x.dataset.level === state.level ? 'btn--accent' : 'btn--outline');
          });
          info();
        };
      });
      root.querySelector('#record').onclick = screenRecords;
      root.querySelector('#start').onclick = beginGame;
    }

    // ---------- rècord: millor temps (i moviments) per nivell ----------
    function screenRecords() {
      cleanup();
      const rows = ['easy', 'normal', 'hard'].map(lv => {
        const r = getRecord('memory:' + lv);
        const txt = r ? `${fmtTime(r.time)} · ${r.moves} mov` : '—';
        return `<div class="btn btn--outline" style="display:flex;justify-content:space-between;cursor:default;text-align:left">
          <span>${LEVELS[lv].label}</span><span style="color:var(--accent)">${txt}</span></div>`;
      }).join('');
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Memory</p>
        <h2 style="font-size:30px;margin:6px 0 8px">Rècord</h2>
        <p class="muted" style="margin-bottom:14px">Millor temps per nivell</p>
        <div class="stack" style="--stack-gap:10px">${rows}</div>
        <div class="spacer"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
    }

    // ---------- arrenca la partida ----------
    function beginGame() {
      cleanup();
      const lv = LEVELS[state.level];
      state.cols = lv.cols; state.rows = lv.rows; state.pairs = lv.pairs;
      const keys = shuffle(ICON_KEYS).slice(0, lv.pairs);
      const deck = [];
      keys.forEach(k => { deck.push({ id: k, up: false, matched: false }, { id: k, up: false, matched: false }); });
      const cards = shuffle(deck);
      // reparteix les caselles buides (5×5 -> 1 forat, al centre)
      const total = lv.cols * lv.rows;
      const cells = cards.slice();
      for (let e = 0; e < total - cards.length; e++) cells.splice(Math.floor(total / 2) + e, 0, null);
      state.cells = cells;
      state.first = null;
      state.busy = false;
      state.moves = 0;
      state.matched = 0;
      state.seconds = 0;
      screenGame();
    }

    // ---------- 2) joc ----------
    function screenGame() {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <div class="mem-head">
          <span class="kicker">Moviments: <b id="moves">0</b></span>
          <span class="kicker">Temps: <b id="time">0:00</b></span>
        </div>
        <div class="mem-board" id="board" style="--cols:${state.cols};--rows:${state.rows}"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      renderBoard();
      root.querySelector('#board').addEventListener('click', (e) => {
        const b = e.target.closest('.mem-card');
        if (!b) return;
        onCardClick(parseInt(b.dataset.i, 10));
      });
      startTimer();
    }

    function renderBoard() {
      const board = root.querySelector('#board');
      board.innerHTML = state.cells.map((card, i) => {
        if (!card) return '<span class="mem-empty" aria-hidden="true"></span>';
        return `<button class="mem-card${card.up || card.matched ? ' up' : ''}${card.matched ? ' matched' : ''}" data-i="${i}" aria-label="carta">
          <span class="mem-card__q">?</span>
          <span class="mem-card__icon">${CATEGORY_ICONS[card.id] || ''}</span>
        </button>`;
      }).join('');
    }

    const cardEl = (i) => root.querySelector(`.mem-card[data-i="${i}"]`);

    function onCardClick(i) {
      if (state.busy) return;
      const card = state.cells[i];
      if (!card || card.up || card.matched) return;

      // destapa
      card.up = true;
      const el = cardEl(i);
      if (el) el.classList.add('up');

      if (state.first === null) {
        state.first = i;
        return;
      }

      // segona carta: compta un moviment
      state.moves++;
      const mv = root.querySelector('#moves');
      if (mv) mv.textContent = state.moves;

      const a = state.cells[state.first];
      const firstIdx = state.first;
      state.first = null;

      if (a.id === card.id) {
        // parella encertada: es queden destapades
        a.matched = card.matched = true;
        const ea = cardEl(firstIdx);
        if (ea) ea.classList.add('matched');
        if (el) el.classList.add('matched');
        state.matched++;
        if (state.matched === state.pairs) {
          stopTimer();
          finishTo = setTimeout(screenEnd, 550);
        }
      } else {
        // no encertada: tapa les dues al cap d'un moment (bloqueja mentrestant)
        state.busy = true;
        compareTo = setTimeout(() => {
          compareTo = null;
          a.up = false; card.up = false;
          const ea = cardEl(firstIdx);
          if (ea) ea.classList.remove('up');
          if (el) el.classList.remove('up');
          state.busy = false;
        }, 850);
      }
    }

    // ---------- temporitzador ----------
    function startTimer() {
      state.seconds = 0;
      paintTime();
      timerId = setInterval(() => { state.seconds++; paintTime(); }, 1000);
    }
    function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
    function paintTime() {
      const el = root.querySelector('#time');
      if (el) el.textContent = fmtTime(state.seconds);
    }

    // ---------- 3) final ----------
    function screenEnd() {
      cleanup();
      // rècord per nivell: millor temps (desempat: menys moviments)
      const id = 'memory:' + state.level;
      const prev = getRecord(id);
      const cur = { time: state.seconds, moves: state.moves };
      const isRecord = !prev || cur.time < prev.time || (cur.time === prev.time && cur.moves < prev.moves);
      if (isRecord) setRecord(id, cur);
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker center">Fet!</p>
        <div class="panel center stack" style="margin-top:18px">
          <h2 style="font-size:32px;color:var(--accent)">Totes les parelles!</h2>
          ${isRecord ? '<p class="kicker" style="color:var(--accent)">Nou rècord!</p>' : ''}
          <p class="muted">Moviments: <b>${state.moves}</b></p>
          <p class="muted">Temps: <b>${fmtTime(state.seconds)}</b></p>
        </div>
        <div class="spacer"></div>
        <div class="stack" style="margin-top:20px">
          <button class="btn btn--accent" id="again">Una altra</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelector('#again').onclick = beginGame;
      root.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
