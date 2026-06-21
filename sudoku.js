// ============================================================
// Sudoku — joc d'un sol jugador.
//
// Generació: es crea una graella 9×9 completa i vàlida amb backtracking
// aleatori i, després, es treuen caselles (comprovant amb el solucionador
// que la solució continuï sent ÚNICA) fins a la quantitat de "donades"
// segons la dificultat: Fàcil ~40, Normal ~32, Difícil ~26.
//
// Estètica: fons i caselles beix (--paper); línies i números donats en
// tinta (--ink); números de l'usuari en corall (--accent); conflictes en
// vermell. Cap negre. La graella cap sense scroll.
// ============================================================

import { getRecord, setRecord } from './records.js';

// Dificultat = nombre de caselles donades.
const LEVELS = {
  easy:   { label: 'Fàcil',   givens: 40 },
  normal: { label: 'Normal',  givens: 32 },
  hard:   { label: 'Difícil', givens: 26 },
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

// ---------- motor de Sudoku (graella plana de 81: 0 = buida) ----------
function findEmpty(g) {
  for (let i = 0; i < 81; i++) if (g[i] === 0) return i;
  return -1;
}

function canPlace(g, i, v) {
  const r = Math.floor(i / 9), c = i % 9;
  for (let k = 0; k < 9; k++) {
    if (g[r * 9 + k] === v) return false;   // fila
    if (g[k * 9 + c] === v) return false;   // columna
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      if (g[(br + dr) * 9 + (bc + dc)] === v) return false; // bloc 3×3
    }
  }
  return true;
}

// Omple una graella buida amb una solució completa (backtracking a l'atzar).
function fillGrid(g) {
  const i = findEmpty(g);
  if (i === -1) return true;
  for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (canPlace(g, i, v)) {
      g[i] = v;
      if (fillGrid(g)) return true;
      g[i] = 0;
    }
  }
  return false;
}

// Compta solucions fins a `limit` (atura aviat per saber si és única).
function countSolutions(g, limit) {
  const i = findEmpty(g);
  if (i === -1) return 1;
  let total = 0;
  for (let v = 1; v <= 9; v++) {
    if (canPlace(g, i, v)) {
      g[i] = v;
      total += countSolutions(g, limit);
      g[i] = 0;
      if (total >= limit) return total;
    }
  }
  return total;
}

// Crea un trencaclosques amb (idealment) solució única i ~givens donades.
function makePuzzle(givens) {
  const full = new Array(81).fill(0);
  fillGrid(full);
  const puzzle = full.slice();
  let count = 81;
  for (const idx of shuffle([...Array(81).keys()])) {
    if (count <= givens) break;
    const backup = puzzle[idx];
    if (backup === 0) continue;
    puzzle[idx] = 0;
    if (countSolutions(puzzle.slice(), 2) === 1) count--;
    else puzzle[idx] = backup; // trencaria la unicitat: la mantenim
  }
  return { puzzle, solution: full };
}

// Marca les caselles en conflicte (mateix valor a fila, columna o bloc).
function conflicts(g) {
  const bad = new Array(81).fill(false);
  for (let i = 0; i < 81; i++) {
    const v = g[i];
    if (!v) continue;
    const r = Math.floor(i / 9), c = i % 9;
    for (let k = 0; k < 9; k++) {
      const ri = r * 9 + k, ci = k * 9 + c;
      if (ri !== i && g[ri] === v) bad[i] = true;
      if (ci !== i && g[ci] === v) bad[i] = true;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const bi = (br + dr) * 9 + (bc + dc);
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
  tagline: "Omple la graella de l'1 al 9",
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Omple les caselles buides amb xifres de l\'1 al 9.',
    'Cap xifra es pot repetir a la mateixa fila, columna ni bloc de 3×3.',
    'Toca una casella i després un número del teclat; esborra amb ⌫.',
    'Completa-ho tot sense conflictes el més ràpid que puguis.',
  ],

  mount(root, { goHome }) {
    const state = {
      level: 'normal',
      grid: [],        // 81 valors (0 = buida)
      given: [],       // 81 booleans (true = donada, fixa)
      solution: [],
      selected: null,  // índex de casella seleccionada
      seconds: 0,
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
      const opts = ['easy', 'normal', 'hard'];
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Sudoku</p>
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
        const el = root.querySelector('#lvinfo');
        if (el) el.textContent = `${LEVELS[state.level].givens} caselles donades`;
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

    // ---------- rècord: millor temps per dificultat ----------
    function screenRecords() {
      cleanup();
      const rows = ['easy', 'normal', 'hard'].map(lv => {
        const r = getRecord('sudoku:' + lv);
        const txt = r ? fmtTime(r.time) : '—';
        return `<div class="btn btn--outline" style="display:flex;justify-content:space-between;cursor:default;text-align:left">
          <span>${LEVELS[lv].label}</span><span style="color:var(--accent)">${txt}</span></div>`;
      }).join('');
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Sudoku</p>
        <h2 style="font-size:30px;margin:6px 0 8px">Rècord</h2>
        <p class="muted" style="margin-bottom:14px">Millor temps per dificultat</p>
        <div class="stack" style="--stack-gap:10px">${rows}</div>
        <div class="spacer"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
    }

    // ---------- arrenca la partida ----------
    function beginGame() {
      cleanup();
      const { puzzle, solution } = makePuzzle(LEVELS[state.level].givens);
      state.grid = puzzle.slice();
      state.given = puzzle.map(v => v !== 0);
      state.solution = solution;
      state.selected = null;
      state.seconds = 0;
      screenGame();
    }

    // ---------- 2) joc ----------
    function screenGame() {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <div class="sudoku-head"><span class="kicker">Temps: <b id="time">0:00</b></span></div>
        <div class="sudoku-board" id="board"></div>
        <div class="sudoku-keys" id="keys"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;

      renderBoard();

      const keys = root.querySelector('#keys');
      keys.innerHTML =
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="sudoku-key" data-n="${n}">${n}</button>`).join('') +
        `<button class="sudoku-key sudoku-key--del" data-del="1" aria-label="Esborrar">⌫</button>`;

      root.querySelector('#board').addEventListener('click', (e) => {
        const c = e.target.closest('.sudoku-cell');
        if (c) selectCell(parseInt(c.dataset.i, 10));
      });
      keys.addEventListener('click', (e) => {
        const b = e.target.closest('.sudoku-key');
        if (!b) return;
        if (b.dataset.del) erase();
        else place(parseInt(b.dataset.n, 10));
      });

      // Teclat físic (ordinador): 1–9 posa el número, Backspace/Delete buida.
      // Al mòbil no hi ha cap input de text, així que el teclat natiu no surt.
      keyHandler = (e) => {
        if (e.key >= '1' && e.key <= '9') { place(parseInt(e.key, 10)); }
        else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { e.preventDefault(); erase(); }
      };
      document.addEventListener('keydown', keyHandler);

      startTimer();
    }

    function renderBoard() {
      const board = root.querySelector('#board');
      if (!board) return;
      board.innerHTML = state.grid.map((v, i) => {
        const r = Math.floor(i / 9), c = i % 9;
        const cls = ['sudoku-cell'];
        if (c === 2 || c === 5) cls.push('col-edge');
        if (r === 2 || r === 5) cls.push('row-edge');
        if (c === 8) cls.push('last-col');
        if (r === 8) cls.push('last-row');
        if (state.given[i]) cls.push('fixed');
        // número de l'usuari: verd si coincideix amb la solució, vermell si no.
        else if (v) cls.push(v === state.solution[i] ? 'ok' : 'bad');
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
      renderBoard();
      checkSolved();
    }

    function erase() {
      if (state.selected === null) return;
      const i = state.selected;
      if (state.given[i]) return;
      state.grid[i] = 0;
      renderBoard();
    }

    function checkSolved() {
      // resolt quan tota la graella coincideix amb la solució.
      for (let i = 0; i < 81; i++) if (state.grid[i] !== state.solution[i]) return;
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
      const id = 'sudoku:' + state.level;
      const prev = getRecord(id);
      const isRecord = !prev || state.seconds < prev.time;
      if (isRecord) setRecord(id, { time: state.seconds });
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker center">Final</p>
        <div class="panel center stack" style="margin-top:18px">
          <h2 style="font-size:34px;color:var(--accent)">Resolt!</h2>
          ${isRecord ? '<p class="kicker" style="color:var(--accent)">Nou rècord!</p>' : ''}
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
