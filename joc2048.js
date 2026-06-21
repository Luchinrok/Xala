// ============================================================
// 2048 — joc d'un sol jugador.
//
// Graella 4×4. Es llisca en una direcció i totes les fitxes es desplacen;
// dues d'iguals que xoquen es fusionen sumant-se. Després de cada
// moviment vàlid apareix una fitxa nova (2 o 4) en una casella buida a
// l'atzar. Objectiu: arribar a 2048 (pots continuar). Fi quan no queden
// moviments.
//
// Controls: mòbil amb gestos de lliscar (sense fer scroll de pàgina);
// ordinador amb les tecles de fletxa.
//
// Estètica: fons beix; fitxa de beix (--paper-2) a corall com més gran;
// número sempre llegible (tinta o crema). Cap negre. Cap sense scroll.
// ============================================================

import { getRecord, setRecord } from './records.js';

const SIZE = 4;

// Índexs de cada línia segons la direcció (les fitxes es mouen cap al
// primer índex de cada llista).
function buildLines() {
  const rowsLR = [], colsTB = [];
  for (let r = 0; r < SIZE; r++) {
    const row = [];
    for (let c = 0; c < SIZE; c++) row.push(r * SIZE + c);
    rowsLR.push(row);
  }
  for (let c = 0; c < SIZE; c++) {
    const col = [];
    for (let r = 0; r < SIZE; r++) col.push(r * SIZE + c);
    colsTB.push(col);
  }
  return {
    left:  rowsLR,
    right: rowsLR.map(l => l.slice().reverse()),
    up:    colsTB,
    down:  colsTB.map(l => l.slice().reverse()),
  };
}
const LINES = buildLines();

// Color de la fitxa: de beix (valors petits) a corall (grans); número en
// tinta per als clars i crema per als foscos.
function tileStyle(v) {
  const p2 = [0xF4, 0xE8, 0xD2], coral = [0xE4, 0x57, 0x2E];
  const t = Math.min(1, Math.max(0, (Math.log2(v) - 1) / 10)); // 2→0 ... 2048→1
  const mix = p2.map((a, i) => Math.round(a + (coral[i] - a) * t));
  const fg = t > 0.32 ? 'var(--paper)' : 'var(--ink)';
  const len = String(v).length;
  const fs = len >= 4 ? 'clamp(17px,6vmin,30px)'
           : len === 3 ? 'clamp(21px,7vmin,34px)'
           : 'clamp(26px,8.6vmin,40px)';
  return `background:rgb(${mix[0]},${mix[1]},${mix[2]});color:${fg};font-size:${fs}`;
}

export default {
  id: '2048',
  title: '2048',
  tagline: 'Ajunta els números fins al 2048',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Llisca amunt, avall, esquerra o dreta (o fletxes) per moure totes les fitxes.',
    'Dues fitxes amb el mateix número que xoquen es fusionen i se sumen.',
    'Cada moviment apareix una fitxa nova (2 o 4) en una casella buida.',
    'Arriba a 2048; s\'acaba quan no queden moviments possibles.',
  ],

  mount(root, { goHome }) {
    const state = {
      grid: new Array(SIZE * SIZE).fill(0),
      score: 0,
      won: false,
    };
    let keyHandler = null;

    function cleanup() {
      if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
    }
    function leave() { cleanup(); goHome(); }

    const best = () => getRecord('joc2048') || 0;

    // ---------- 1) configuració ----------
    function screenConfig() {
      cleanup();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">2048</p>
        <h2 style="font-size:30px;margin:6px 0 14px">Ajunta fins a 2048</h2>
        <p class="muted" style="margin-bottom:8px">Llisca (o fletxes) per moure les fitxes. Dues d'iguals es fusionen i se sumen. Arriba a 2048!</p>
        <button class="btn btn--outline" id="record" style="margin-top:8px">Rècord</button>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">Comença</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelector('#record').onclick = screenRecords;
      root.querySelector('#start').onclick = beginGame;
    }

    // ---------- rècord ----------
    function screenRecords() {
      cleanup();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">2048</p>
        <h2 style="font-size:30px;margin:6px 0 18px">Rècord</h2>
        <div class="panel center stack" style="margin-top:8px">
          <p class="muted">Millor puntuació</p>
          <h2 style="font-size:44px;color:var(--accent)">${best()}</h2>
        </div>
        <div class="spacer"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
    }

    // ---------- arrenca la partida ----------
    function beginGame() {
      cleanup();
      state.grid = new Array(SIZE * SIZE).fill(0);
      state.score = 0;
      state.won = false;
      const fresh = new Set();
      fresh.add(spawnTile());
      fresh.add(spawnTile());
      screenGame(fresh);
    }

    function spawnTile() {
      const empties = [];
      for (let i = 0; i < state.grid.length; i++) if (state.grid[i] === 0) empties.push(i);
      if (!empties.length) return -1;
      const idx = empties[Math.floor(Math.random() * empties.length)];
      state.grid[idx] = Math.random() < 0.9 ? 2 : 4;
      return idx;
    }

    // ---------- 2) joc ----------
    function screenGame(fresh) {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <div class="g2048-head">
          <span class="kicker">Punts: <b id="score">0</b></span>
          <span class="kicker">Rècord: <b id="best">${best()}</b></span>
        </div>
        <p class="g2048-win" id="win" style="display:none">Has fet 2048!</p>
        <div class="g2048-board" id="board"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      render({ fresh: fresh || new Set() });

      // gestos de lliscar (mòbil) — sense fer scroll de pàgina
      const board = root.querySelector('#board');
      let sx = 0, sy = 0, tracking = false;
      board.addEventListener('touchstart', (e) => {
        const t = e.touches[0]; sx = t.clientX; sy = t.clientY; tracking = true;
      }, { passive: true });
      board.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
      board.addEventListener('touchend', (e) => {
        if (!tracking) return;
        tracking = false;
        const t = e.changedTouches[0];
        const dx = t.clientX - sx, dy = t.clientY - sy;
        const ax = Math.abs(dx), ay = Math.abs(dy);
        if (Math.max(ax, ay) < 24) return; // massa curt
        if (ax > ay) move(dx > 0 ? 'right' : 'left');
        else move(dy > 0 ? 'down' : 'up');
      }, { passive: true });

      // tecles de fletxa (ordinador)
      keyHandler = (e) => {
        const dir = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key];
        if (dir) { e.preventDefault(); move(dir); }
      };
      document.addEventListener('keydown', keyHandler);
    }

    function render({ fresh = new Set(), merged = new Set() } = {}) {
      const board = root.querySelector('#board');
      if (!board) return;
      board.innerHTML = state.grid.map((v, i) => {
        if (!v) return '<span class="g2048-tile g2048-tile--empty"></span>';
        const cls = ['g2048-tile'];
        if (fresh.has(i)) cls.push('is-new');
        if (merged.has(i)) cls.push('is-merged');
        return `<span class="${cls.join(' ')}" style="${tileStyle(v)}">${v}</span>`;
      }).join('');
      const sc = root.querySelector('#score');
      if (sc) sc.textContent = state.score;
    }

    // ---------- moviment ----------
    function move(dir) {
      const lines = LINES[dir];
      const next = new Array(SIZE * SIZE).fill(0);
      const merged = new Set();
      let gained = 0;

      lines.forEach(idxs => {
        const vals = idxs.map(i => state.grid[i]).filter(v => v);
        const out = [], mf = [];
        for (let k = 0; k < vals.length; k++) {
          if (k + 1 < vals.length && vals[k] === vals[k + 1]) {
            const m = vals[k] * 2;
            out.push(m); mf.push(true); gained += m;
            k++; // s'ha fusionat amb la següent
          } else {
            out.push(vals[k]); mf.push(false);
          }
        }
        for (let k = 0; k < SIZE; k++) {
          const idx = idxs[k];
          next[idx] = out[k] || 0;
          if (mf[k]) merged.add(idx);
        }
      });

      const changed = next.some((v, i) => v !== state.grid[i]);
      if (!changed) return; // moviment sense efecte: no compta

      state.grid = next;
      state.score += gained;
      const newIdx = spawnTile();
      const fresh = new Set(newIdx >= 0 ? [newIdx] : []);
      render({ fresh, merged });

      if (!state.won && state.grid.includes(2048)) {
        state.won = true;
        const w = root.querySelector('#win');
        if (w) w.style.display = 'block';
      }
      if (isGameOver()) screenGameOver();
    }

    function isGameOver() {
      if (state.grid.includes(0)) return false;
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const v = state.grid[r * SIZE + c];
          if (c < SIZE - 1 && state.grid[r * SIZE + c + 1] === v) return false;
          if (r < SIZE - 1 && state.grid[(r + 1) * SIZE + c] === v) return false;
        }
      }
      return true;
    }

    // ---------- 3) fi del joc ----------
    function screenGameOver() {
      cleanup();
      const prev = best();
      const isRecord = state.score > prev;
      if (isRecord) setRecord('joc2048', state.score);
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker center">Final</p>
        <div class="panel center stack" style="margin-top:18px">
          <h2 style="font-size:32px;color:var(--accent)">Sense moviments!</h2>
          ${isRecord ? '<p class="kicker" style="color:var(--accent)">Nou rècord!</p>' : ''}
          <p class="muted">Puntuació</p>
          <h2 style="font-size:40px">${state.score}</h2>
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
