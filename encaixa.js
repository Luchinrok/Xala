// ============================================================
// Encaixa! — trencaclosques d'un sol jugador, estil block-puzzle.
//
// Graella 8×8 buida. A la safata de baix surten 3 peces (formes tipus
// tetròmino, quadrats i línies). S'arrosseguen (tàctil o ratolí) cap a
// la graella; mentre s'arrosseguen es mostra una previsualització (verd
// si encaixa, vermell si no). En completar files i/o columnes senceres,
// es netegen i sumes punts (bonus per combo). Quan s'han col·locat les 3
// peces, surten 3 de noves. Fi del joc quan cap peça de la safata cap
// enlloc.
//
// Estètica: graella beix (--paper-2), blocs col·locats i peces en corall
// (--accent). Cap negre. Tot cap sense scroll.
// ============================================================

import { getRecord, setRecord } from './records.js';

const SIZE = 8;       // graella 8×8
const LIFT = 12;      // px que la peça s'eleva per damunt del dit en arrossegar

// Formes (llista de caselles [fila, columna], normalitzades a 0,0).
const SHAPES = [
  // 1
  [[0, 0]],
  // línies de 2
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0]],
  // línies de 3
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0]],
  // línies de 4
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  // línies de 5
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  // quadrat 2×2
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  // quadrat 3×3
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  // cantonades (L de 3) en 4 orientacions
  [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 0]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 1], [1, 0], [1, 1]],
  // L / J de 4
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 1], [1, 1], [2, 1], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  // T de 4
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 1], [1, 0], [1, 1], [2, 1]],
  // S / Z de 4
  [[0, 1], [0, 2], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
];

const randShape = () => SHAPES[Math.floor(Math.random() * SHAPES.length)];

// Paleta de colors ben distingibles i llegibles sobre la graella beix.
// corall, verd, groc mostassa, blau, lila, un to fosc i un de clar.
const COLORS = ['#E4572E', '#1F8A70', '#D4A017', '#2E6DB4', '#7E5AA2', '#33404D', '#E58FB0'];

// Tria n colors DISTINTS de la paleta (sense repetir).
function pickColors(n) {
  const pool = COLORS.slice();
  const out = [];
  for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

// Safata de 3 peces; cada peça és { shape, color } i les 3 tenen colors
// diferents entre elles.
function newTray() {
  const cols = pickColors(3);
  return [randShape(), randShape(), randShape()].map((shape, i) => ({ shape, color: cols[i] }));
}

// Dimensions (files, columnes) de la caixa contenidora d'una forma.
function dims(shape) {
  let r = 0, c = 0;
  for (const [dr, dc] of shape) { if (dr > r) r = dr; if (dc > c) c = dc; }
  return { rows: r + 1, cols: c + 1 };
}

export default {
  id: 'encaixa',
  title: 'Encaixa!',
  tagline: 'Encaixa els blocs i fes línies',
  accent: '#E4572E',
  color: '#E4572E',
  ready: true,

  instructions: [
    'Arrossega les 3 peces de la safata cap a la graella de 8×8.',
    'Es col·loquen si caben en caselles buides; no es poden girar.',
    'En completar una fila o columna sencera, s\'esborra i sumes punts.',
    'S\'acaba quan cap de les peces disponibles cap enlloc.',
  ],

  mount(root, { goHome }) {
    const state = {
      grid: [],          // SIZE×SIZE (0 buit / 1 ple)
      tray: [],          // 3 formes o null (col·locada)
      cellEls: [],       // SIZE×SIZE elements
      score: 0,
      over: false,
    };
    let board = null;
    let ghost = null;
    let drag = null;     // { index, shape, color, cell, rect } durant l'arrossegament
    let prevCells = [];  // caselles ressaltades en la previsualització
    let hintCells = [];  // caselles de fila/columna que es completaria (animades)

    function cleanup() {
      endDrag();
    }
    function leave() { cleanup(); goHome(); }

    // ---------- 1) configuració ----------
    function screenConfig() {
      cleanup();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Encaixa!</p>
        <h2 style="font-size:30px;margin:6px 0 16px">Encaixa els blocs</h2>
        <p class="muted" style="margin-bottom:6px">Arrossega les peces a la graella i omple files o columnes senceres per netejar-les. S'acaba quan cap peça hi cap.</p>
        <button class="btn btn--outline" id="record" style="margin-top:16px">Rècord</button>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">Comença</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelector('#record').onclick = screenRecord;
      root.querySelector('#start').onclick = beginGame;
    }

    // ---------- rècord ----------
    function screenRecord() {
      cleanup();
      const best = getRecord('encaixa');
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Encaixa!</p>
        <h2 style="font-size:30px;margin:6px 0 14px">Rècord</h2>
        <div class="panel center stack" style="margin-top:18px">
          <p class="muted">Millor puntuació</p>
          <h2 style="font-size:40px;color:var(--accent)">${best != null ? best : '—'}</h2>
        </div>
        <div class="spacer"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
    }

    // ---------- arrenca la partida ----------
    function beginGame() {
      cleanup();
      state.grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
      state.tray = newTray();
      state.score = 0;
      state.over = false;
      screenGame();
    }

    // ---------- 2) joc ----------
    function screenGame() {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <div class="encaixa-head">
          <span class="kicker">Punts</span>
          <span class="encaixa-score" id="score">0</span>
        </div>
        <div class="encaixa-board" id="board"></div>
        <div class="encaixa-tray" id="tray"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      board = root.querySelector('#board');
      renderBoard();
      renderTray();
      paintScore();
    }

    function renderBoard() {
      board.innerHTML = '';
      state.cellEls = [];
      for (let r = 0; r < SIZE; r++) {
        const row = [];
        for (let c = 0; c < SIZE; c++) {
          const d = document.createElement('div');
          const v = state.grid[r][c];
          d.className = 'encaixa-cell' + (v ? ' on' : '');
          if (v) d.style.setProperty('--cell-color', v); // color de la peça col·locada
          board.appendChild(d);
          row.push(d);
        }
        state.cellEls.push(row);
      }
    }

    function renderTray() {
      const tray = root.querySelector('#tray');
      tray.innerHTML = '';
      state.tray.forEach((piece, i) => {
        const slot = document.createElement('div');
        slot.className = 'encaixa-slot';
        if (piece) slot.appendChild(buildPiece(piece.shape, i, piece.color));
        tray.appendChild(slot);
      });
    }

    // Construeix l'element d'una peça de la safata (graella petita).
    function buildPiece(shape, index, color) {
      const { rows, cols } = dims(shape);
      const el = document.createElement('div');
      el.className = 'encaixa-piece';
      el.style.setProperty('--cell-color', color);
      el.style.gridTemplateColumns = `repeat(${cols}, var(--pc))`;
      const filled = new Set(shape.map(([r, c]) => r * cols + c));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = document.createElement('div');
          cell.className = 'encaixa-pcell ' + (filled.has(r * cols + c) ? 'on' : 'off');
          el.appendChild(cell);
        }
      }
      el.addEventListener('pointerdown', (e) => startDrag(e, index));
      return el;
    }

    function paintScore() {
      const el = root.querySelector('#score');
      if (el) el.textContent = state.score;
    }

    // ---------- arrossegament (tàctil + ratolí) ----------
    function startDrag(e, index) {
      if (state.over || !state.tray[index]) return;
      e.preventDefault();
      const piece = state.tray[index];
      const shape = piece.shape;
      const rect = board.getBoundingClientRect();
      const cell = rect.width / SIZE;           // mida exacta de casella (sense vores)
      drag = { index, shape, color: piece.color, cell, rect };
      buildGhost(shape, cell, piece.color);
      positionGhost(e.clientX, e.clientY);
      updatePreview(e.clientX, e.clientY);
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
    }

    function onMove(e) {
      if (!drag) return;
      e.preventDefault();
      positionGhost(e.clientX, e.clientY);
      updatePreview(e.clientX, e.clientY);
    }

    function onEnd(e) {
      if (!drag) return;
      e.preventDefault();
      const { shape, index, color } = drag;
      const p = placementAt(e.clientX, e.clientY);
      endDrag();
      if (p.fits) {
        placeShape(shape, p.r, p.c, color);
        state.tray[index] = null;
        renderBoard();
        afterPlace(shape.length);
      }
      // si no encaixa, la peça es queda a la safata (no cal re-render)
    }

    function endDrag() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      if (ghost) { ghost.remove(); ghost = null; }
      clearPreview();
      drag = null;
    }

    function buildGhost(shape, cell, color) {
      if (ghost) ghost.remove();
      const { rows, cols } = dims(shape);
      ghost = document.createElement('div');
      ghost.className = 'encaixa-ghost';
      ghost.style.setProperty('--cell-color', color);
      ghost.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
      const filled = new Set(shape.map(([r, c]) => r * cols + c));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d = document.createElement('div');
          d.className = 'encaixa-pcell ' + (filled.has(r * cols + c) ? 'on' : 'off');
          d.style.width = cell + 'px';
          d.style.height = cell + 'px';
          ghost.appendChild(d);
        }
      }
      document.body.appendChild(ghost);
    }

    // Cantonada superior-esquerra (px) de la peça segons el punter:
    // centrada horitzontalment i elevada per damunt del dit.
    function ghostTopLeft(x, y) {
      const { rows, cols } = dims(drag.shape);
      const cell = drag.cell;
      return { left: x - (cols * cell) / 2, top: y - rows * cell - LIFT };
    }

    function positionGhost(x, y) {
      if (!ghost) return;
      const { left, top } = ghostTopLeft(x, y);
      ghost.style.left = left + 'px';
      ghost.style.top = top + 'px';
    }

    // Casella d'origen i si la peça hi encaixa, a partir del punter.
    function placementAt(x, y) {
      const { left, top } = ghostTopLeft(x, y);
      const cell = drag.cell, rect = drag.rect;
      const c = Math.round((left - rect.left) / cell);
      const r = Math.round((top - rect.top) / cell);
      return { r, c, fits: fitsAt(drag.shape, r, c) };
    }

    function updatePreview(x, y) {
      clearPreview();
      const { r, c, fits } = placementAt(x, y);
      drag.shape.forEach(([dr, dc]) => {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) return; // fora: no es pinta
        const el = state.cellEls[rr][cc];
        el.classList.add(fits ? 'prev-ok' : 'prev-bad');
        prevCells.push([rr, cc]);
      });
      // Si en aquesta posició es completaria alguna fila/columna, ressalta-la
      // sencera amb una animació perquè es vegi abans de deixar anar la peça.
      if (fits) {
        completingCells(drag.shape, r, c).forEach(([rr, cc]) => {
          state.cellEls[rr][cc].classList.add('line-hint');
          hintCells.push([rr, cc]);
        });
      }
    }

    // Caselles de les files/columnes que quedarien completes si es col·loca
    // la forma a (originR, originC). Buit si no se'n completa cap.
    function completingCells(shape, originR, originC) {
      const placed = new Set(shape.map(([dr, dc]) => (originR + dr) * SIZE + (originC + dc)));
      const filled = (r, c) => state.grid[r][c] || placed.has(r * SIZE + c);
      const cells = [];
      for (let r = 0; r < SIZE; r++) {
        let full = true;
        for (let c = 0; c < SIZE; c++) if (!filled(r, c)) { full = false; break; }
        if (full) for (let c = 0; c < SIZE; c++) cells.push([r, c]);
      }
      for (let c = 0; c < SIZE; c++) {
        let full = true;
        for (let r = 0; r < SIZE; r++) if (!filled(r, c)) { full = false; break; }
        if (full) for (let r = 0; r < SIZE; r++) cells.push([r, c]);
      }
      return cells;
    }

    function clearPreview() {
      prevCells.forEach(([r, c]) => {
        const el = state.cellEls[r] && state.cellEls[r][c];
        if (el) el.classList.remove('prev-ok', 'prev-bad');
      });
      hintCells.forEach(([r, c]) => {
        const el = state.cellEls[r] && state.cellEls[r][c];
        if (el) el.classList.remove('line-hint');
      });
      prevCells = [];
      hintCells = [];
    }

    // ---------- lògica del tauler ----------
    function fitsAt(shape, originR, originC) {
      for (const [dr, dc] of shape) {
        const r = originR + dr, c = originC + dc;
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return false;
        if (state.grid[r][c]) return false;
      }
      return true;
    }

    function placeShape(shape, originR, originC, color) {
      for (const [dr, dc] of shape) state.grid[originR + dr][originC + dc] = color;
    }

    function canPlaceSomewhere(shape) {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (fitsAt(shape, r, c)) return true;
        }
      }
      return false;
    }

    // Files i columnes completes actuals.
    function fullLines() {
      const rows = [], cols = [];
      for (let r = 0; r < SIZE; r++) if (state.grid[r].every(v => v)) rows.push(r);
      for (let c = 0; c < SIZE; c++) {
        let full = true;
        for (let r = 0; r < SIZE; r++) if (!state.grid[r][c]) { full = false; break; }
        if (full) cols.push(c);
      }
      return { rows, cols };
    }

    // Després de col·locar: puntua, neteja línies (animat) i comprova el final.
    function afterPlace(placedCells) {
      state.score += placedCells; // +1 per bloc col·locat
      const { rows, cols } = fullLines();
      const lines = rows.length + cols.length;
      if (lines > 0) {
        state.score += 8 * lines * lines; // bonus amb combo (creix amb les línies alhora)
        const cells = [];
        rows.forEach(r => { for (let c = 0; c < SIZE; c++) cells.push([r, c]); });
        cols.forEach(c => { for (let r = 0; r < SIZE; r++) cells.push([r, c]); });
        cells.forEach(([r, c]) => state.cellEls[r][c].classList.add('clearing'));
        paintScore();
        setTimeout(() => {
          cells.forEach(([r, c]) => { state.grid[r][c] = 0; });
          renderBoard();
          finishMove();
        }, 200);
      } else {
        paintScore();
        finishMove();
      }
    }

    // Refà la safata si cal i comprova el fi del joc.
    function finishMove() {
      if (state.tray.every(s => !s)) state.tray = newTray();
      renderTray();
      const alive = state.tray.some(s => s && canPlaceSomewhere(s.shape));
      if (!alive) finish();
    }

    // ---------- 3) fi ----------
    function finish() {
      state.over = true;
      cleanup();
      const prev = getRecord('encaixa');
      const isRecord = prev == null || state.score > prev;
      if (isRecord) setRecord('encaixa', state.score);
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker center">Fi del joc</p>
        <div class="panel center stack" style="margin-top:18px">
          <h2 style="font-size:30px">No hi cap cap peça més</h2>
          <p class="muted">Puntuació</p>
          <h2 style="font-size:44px;color:var(--accent)">${state.score}</h2>
          ${isRecord ? '<p class="kicker" style="color:var(--accent)">Nou rècord!</p>' : `<p class="muted">Rècord: ${prev}</p>`}
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
