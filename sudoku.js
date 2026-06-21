// ============================================================
// Sudoku — joc d'un sol jugador.
//
// Mides: 9×9 (blocs 3×3, números 1–9) i 6×6 (blocs 2×3, números 1–6).
// Generació: es crea una graella completa i vàlida amb backtracking
// aleatori i, després, es treuen caselles (comprovant amb el solucionador
// que la solució continuï sent ÚNICA) fins a la quantitat de "donades"
// segons mida i dificultat.
//
// Modes: Clàssic (números neutres + botó "Comprovar") i Guiat (verd/
// vermell a l'instant, victòria automàtica).
//
// Estètica: fons i caselles beix (--paper); línies i números donats en
// tinta (--ink); número de l'usuari verd si és correcte i vermell si no
// (o corall neutre en clàssic abans de comprovar). Cap negre. La graella
// cap sense scroll.
// ============================================================

import { getRecord, setRecord } from './records.js';

// Mides disponibles. bh×bw = dimensions del bloc (files × columnes).
const SIZES = {
  '9': { N: 9, bh: 3, bw: 3, label: '9×9' },
  '6': { N: 6, bh: 2, bw: 3, label: '6×6' },
};

// Dificultat = nombre de caselles donades, per mida.
const LEVELS = {
  easy:   { label: 'Fàcil',   givens: { '9': 40, '6': 22 } },
  normal: { label: 'Normal',  givens: { '9': 32, '6': 18 } },
  hard:   { label: 'Difícil', givens: { '9': 26, '6': 14 } },
};

const fmtTime = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- motor de Sudoku (graella plana N*N: 0 = buida) ----------
function findEmpty(g) {
  for (let i = 0; i < g.length; i++) if (g[i] === 0) return i;
  return -1;
}

function canPlace(g, i, v, N, bh, bw) {
  const r = Math.floor(i / N), c = i % N;
  for (let k = 0; k < N; k++) {
    if (g[r * N + k] === v) return false;   // fila
    if (g[k * N + c] === v) return false;   // columna
  }
  const br = Math.floor(r / bh) * bh, bc = Math.floor(c / bw) * bw;
  for (let dr = 0; dr < bh; dr++) {
    for (let dc = 0; dc < bw; dc++) {
      if (g[(br + dr) * N + (bc + dc)] === v) return false; // bloc
    }
  }
  return true;
}

// Omple una graella buida amb una solució completa (backtracking a l'atzar).
function fillGrid(g, N, bh, bw) {
  const i = findEmpty(g);
  if (i === -1) return true;
  for (const v of shuffle(Array.from({ length: N }, (_, k) => k + 1))) {
    if (canPlace(g, i, v, N, bh, bw)) {
      g[i] = v;
      if (fillGrid(g, N, bh, bw)) return true;
      g[i] = 0;
    }
  }
  return false;
}

// Compta solucions fins a `limit` (atura aviat per saber si és única).
function countSolutions(g, limit, N, bh, bw) {
  const i = findEmpty(g);
  if (i === -1) return 1;
  let total = 0;
  for (let v = 1; v <= N; v++) {
    if (canPlace(g, i, v, N, bh, bw)) {
      g[i] = v;
      total += countSolutions(g, limit, N, bh, bw);
      g[i] = 0;
      if (total >= limit) return total;
    }
  }
  return total;
}

// Crea un trencaclosques amb (idealment) solució única i ~givens donades.
function makePuzzle(givens, N, bh, bw) {
  const total = N * N;
  const full = new Array(total).fill(0);
  fillGrid(full, N, bh, bw);
  const puzzle = full.slice();
  let count = total;
  for (const idx of shuffle([...Array(total).keys()])) {
    if (count <= givens) break;
    const backup = puzzle[idx];
    if (backup === 0) continue;
    puzzle[idx] = 0;
    if (countSolutions(puzzle.slice(), 2, N, bh, bw) === 1) count--;
    else puzzle[idx] = backup; // trencaria la unicitat: la mantenim
  }
  return { puzzle, solution: full };
}

// Marca les caselles en conflicte (mateix valor a fila, columna o bloc).
function conflicts(g, N, bh, bw) {
  const bad = new Array(g.length).fill(false);
  for (let i = 0; i < g.length; i++) {
    const v = g[i];
    if (!v) continue;
    const r = Math.floor(i / N), c = i % N;
    for (let k = 0; k < N; k++) {
      const ri = r * N + k, ci = k * N + c;
      if (ri !== i && g[ri] === v) bad[i] = true;
      if (ci !== i && g[ci] === v) bad[i] = true;
    }
    const br = Math.floor(r / bh) * bh, bc = Math.floor(c / bw) * bw;
    for (let dr = 0; dr < bh; dr++) {
      for (let dc = 0; dc < bw; dc++) {
        const bi = (br + dr) * N + (bc + dc);
        if (bi !== i && g[bi] === v) bad[i] = true;
      }
    }
  }
  return bad;
}

// per a proves (el navegador només usa el default)
export { fillGrid, countSolutions, makePuzzle, conflicts, canPlace };

export default {
  id: 'sudoku',
  title: 'Sudoku',
  tagline: "Omple la graella sense repetir",
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Omple les caselles buides sense repetir cap número a la mateixa fila, columna ni bloc.',
    'Tria la mida (6×6 o 9×9), la dificultat i el mode de joc.',
    'Toca una casella i després un número del teclat; esborra amb ⌫.',
    'Mode Guiat: et diu a l\'instant si encertes. Clàssic: comprova-ho amb el botó "Comprovar".',
  ],

  mount(root, { goHome }) {
    const state = {
      size: '9',       // '9' o '6'
      level: 'normal',
      mode: 'classic', // 'classic' (neutre + Comprovar) o 'guided' (verd/vermell a l'instant)
      N: 9, bh: 3, bw: 3,
      grid: [],        // N*N valors (0 = buida)
      given: [],       // N*N booleans (true = donada, fixa)
      solution: [],
      selected: null,  // índex de casella seleccionada
      seconds: 0,
      showCheck: false, // (clàssic) cert quan s'han de mostrar les marques de Comprovar
    };
    let timerId = null;
    let keyHandler = null;   // teclat físic (ordinador)

    function cleanup() {
      if (timerId) { clearInterval(timerId); timerId = null; }
      if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
    }
    function leave() { cleanup(); goHome(); }

    // ---------- 1) configuració ----------
    function screenConfig() {
      cleanup();
      const levelOpts = ['easy', 'normal', 'hard'];
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Sudoku</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>

        <p class="label" style="margin:0 0 12px">Mida</p>
        <div class="btn-row" id="sizes">
          <button class="btn ${state.size === '9' ? 'btn--accent' : 'btn--outline'}" data-size="9">9×9</button>
          <button class="btn ${state.size === '6' ? 'btn--accent' : 'btn--outline'}" data-size="6">6×6</button>
        </div>

        <p class="label" style="margin:22px 0 12px">Dificultat</p>
        <div class="btn-row" id="levels">
          ${levelOpts.map(k => `<button class="btn ${state.level === k ? 'btn--accent' : 'btn--outline'}" data-level="${k}">${LEVELS[k].label}</button>`).join('')}
        </div>
        <p class="muted" id="lvinfo" style="margin-top:12px"></p>

        <p class="label" style="margin:22px 0 12px">Mode</p>
        <div class="btn-row" id="modes">
          <button class="btn ${state.mode === 'classic' ? 'btn--accent' : 'btn--outline'}" data-mode="classic">Clàssic</button>
          <button class="btn ${state.mode === 'guided' ? 'btn--accent' : 'btn--outline'}" data-mode="guided">Guiat</button>
        </div>
        <p class="muted" id="modeinfo" style="margin-top:12px"></p>

        <button class="btn btn--outline" id="record" style="margin-top:14px">Rècord</button>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">Comença</button>
      `;
      const info = () => {
        const el = root.querySelector('#lvinfo');
        if (el) el.textContent = `${LEVELS[state.level].givens[state.size]} caselles donades`;
        const me = root.querySelector('#modeinfo');
        if (me) me.textContent = state.mode === 'guided'
          ? 'Guiat: et diu a l\'instant si encertes.'
          : 'Clàssic: comprova-ho tu amb el botó "Comprovar".';
      };
      info();

      root.querySelector('#back').onclick = leave;

      const wire = (sel, key) => {
        root.querySelectorAll(sel).forEach(b => {
          b.onclick = () => {
            state[key] = b.dataset[key];
            root.querySelectorAll(sel).forEach(x => {
              x.className = 'btn ' + (x.dataset[key] === state[key] ? 'btn--accent' : 'btn--outline');
            });
            info();
          };
        });
      };
      wire('[data-size]', 'size');
      wire('[data-level]', 'level');
      wire('[data-mode]', 'mode');

      root.querySelector('#record').onclick = () => screenRecords(state.size);
      root.querySelector('#start').onclick = beginGame;
    }

    // ---------- rècord: millor temps per mida + mode + dificultat ----------
    function recordId(size, mode, level) { return `sudoku:${size}:${mode}:${level}`; }

    function screenRecords(recSize) {
      cleanup();
      if (!SIZES[recSize]) recSize = state.size; // mida triada a la pantalla de rècord
      const modesArr = [['guided', 'Guiat'], ['classic', 'Clàssic']];
      const levelsArr = ['easy', 'normal', 'hard'];
      const blocks = modesArr.map(([mk, mlabel]) => {
        const rows = levelsArr.map(lv => {
          const r = getRecord(recordId(recSize, mk, lv));
          const txt = r ? fmtTime(r.time) : '—';
          return `<div class="btn btn--outline" style="display:flex;justify-content:space-between;cursor:default;text-align:left">
            <span>${LEVELS[lv].label}</span><span style="color:var(--accent)">${txt}</span></div>`;
        }).join('');
        return `<p class="label" style="margin:16px 0 8px">${mlabel}</p>
          <div class="stack" style="--stack-gap:8px">${rows}</div>`;
      }).join('');
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Sudoku</p>
        <h2 style="font-size:30px;margin:6px 0 14px">Rècord</h2>
        <div class="btn-row" id="recsizes">
          <button class="btn ${recSize === '9' ? 'btn--accent' : 'btn--outline'}" data-size="9">9×9</button>
          <button class="btn ${recSize === '6' ? 'btn--accent' : 'btn--outline'}" data-size="6">6×6</button>
        </div>
        <p class="muted" style="margin-top:12px">Millor temps de cada mode i dificultat</p>
        ${blocks}
        <div class="spacer"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      root.querySelectorAll('#recsizes [data-size]').forEach(b => {
        b.onclick = () => screenRecords(b.dataset.size);
      });
    }

    // ---------- arrenca la partida ----------
    function beginGame() {
      cleanup();
      const sz = SIZES[state.size];
      state.N = sz.N; state.bh = sz.bh; state.bw = sz.bw;
      const givens = LEVELS[state.level].givens[state.size];
      const { puzzle, solution } = makePuzzle(givens, sz.N, sz.bh, sz.bw);
      state.grid = puzzle.slice();
      state.given = puzzle.map(v => v !== 0);
      state.solution = solution;
      state.selected = null;
      state.seconds = 0;
      state.showCheck = false;
      screenGame();
    }

    // ---------- 2) joc ----------
    function screenGame() {
      const classic = state.mode === 'classic';
      const keysHtml =
        Array.from({ length: state.N }, (_, k) => k + 1)
          .map(n => `<button class="sudoku-key" data-n="${n}">${n}</button>`).join('') +
        `<button class="sudoku-key sudoku-key--del" data-del="1" aria-label="Esborrar">⌫</button>`;

      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <div class="sudoku-head"><span class="kicker">Temps: <b id="time">0:00</b></span></div>
        <div class="sudoku-board${classic ? ' compact' : ''}" id="board" style="--n:${state.N}"></div>
        <div class="sudoku-keys" id="keys">${keysHtml}</div>
        ${classic ? '<button class="btn btn--accent" id="check" style="margin-top:10px">Comprovar</button>' : ''}
      `;
      root.querySelector('#back').onclick = screenConfig;

      renderBoard();

      root.querySelector('#board').addEventListener('click', (e) => {
        const c = e.target.closest('.sudoku-cell');
        if (c) selectCell(parseInt(c.dataset.i, 10));
      });
      root.querySelector('#keys').addEventListener('click', (e) => {
        const b = e.target.closest('.sudoku-key');
        if (!b) return;
        if (b.dataset.del) erase();
        else place(parseInt(b.dataset.n, 10));
      });
      const chk = root.querySelector('#check');
      if (chk) chk.onclick = doCheck;

      // Teclat físic (ordinador): 1–N posa el número, Backspace/Delete buida.
      // Al mòbil no hi ha cap input de text, així que el teclat natiu no surt.
      keyHandler = (e) => {
        if (e.key >= '1' && e.key <= String(state.N)) { place(parseInt(e.key, 10)); }
        else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); erase(); }
      };
      document.addEventListener('keydown', keyHandler);

      startTimer();
    }

    function renderBoard() {
      const board = root.querySelector('#board');
      if (!board) return;
      const { N, bh, bw } = state;
      // Guiat: marca sempre. Clàssic: només després de "Comprovar".
      const reveal = state.mode === 'guided' || state.showCheck;
      board.innerHTML = state.grid.map((v, i) => {
        const r = Math.floor(i / N), c = i % N;
        const cls = ['sudoku-cell'];
        if (c % bw === bw - 1 && c !== N - 1) cls.push('col-edge'); // límit de bloc
        if (r % bh === bh - 1 && r !== N - 1) cls.push('row-edge');
        if (c === N - 1) cls.push('last-col');
        if (r === N - 1) cls.push('last-row');
        if (state.given[i]) cls.push('fixed');
        else if (v) cls.push(reveal ? (v === state.solution[i] ? 'ok' : 'bad') : 'neutral');
        if (state.selected === i) cls.push('sel');
        return `<button class="${cls.join(' ')}" data-i="${i}">${v || ''}</button>`;
      }).join('');
    }

    function selectCell(i) {
      if (state.given[i]) { state.selected = null; renderBoard(); return; }
      state.selected = i;
      renderBoard();
    }

    function place(n) {
      if (state.selected === null) return;
      const i = state.selected;
      if (state.given[i]) return;
      state.grid[i] = n;
      // en clàssic, editar amaga les marques fins que es torni a comprovar
      if (state.mode === 'classic') state.showCheck = false;
      renderBoard();
      // en guiat, es guanya automàticament en omplir-ho tot bé
      if (state.mode === 'guided') checkSolved();
    }

    function erase() {
      if (state.selected === null) return;
      const i = state.selected;
      if (state.given[i]) return;
      state.grid[i] = 0;
      if (state.mode === 'classic') state.showCheck = false;
      renderBoard();
    }

    // (clàssic) "Comprovar": mostra correctes/incorrectes; si tot és
    // correcte, acaba. Es pot corregir i tornar a comprovar.
    function doCheck() {
      state.showCheck = true;
      renderBoard();
      checkSolved();
    }

    function checkSolved() {
      // resolt quan tota la graella coincideix amb la solució.
      for (let i = 0; i < state.grid.length; i++) {
        if (state.grid[i] !== state.solution[i]) return;
      }
      stopTimer();
      screenEnd();
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
      const id = recordId(state.size, state.mode, state.level);
      const prev = getRecord(id);
      const isRecord = !prev || state.seconds < prev.time;
      if (isRecord) setRecord(id, { time: state.seconds });
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker center">Final</p>
        <div class="panel center stack" style="margin-top:18px">
          <h2 style="font-size:34px;color:var(--accent)">Resolt!</h2>
          ${isRecord ? '<p class="kicker" style="color:var(--accent)">Nou rècord!</p>' : ''}
          <p class="muted">${SIZES[state.size].label} · ${state.mode === 'guided' ? 'Guiat' : 'Clàssic'} · ${LEVELS[state.level].label}</p>
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
