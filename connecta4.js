// ============================================================
// Connecta 4 — joc per a 2 jugadors (mateix mòbil) o 1 jugador contra la
// màquina. Tauler vertical de 7 columnes × 6 files: les fitxes cauen fins
// a la casella lliure més baixa de la columna. Guanya qui fa 4 en línia
// (horitzontal, vertical o diagonal). Tauler ple sense 4 en línia = empat.
//
// IA (jugador 2): minimax amb poda alfa-beta i avaluació per finestres de 4;
// prioritza guanyar i bloquejar el rival.
//
// Jugador 1 = corall (--accent); Jugador 2 / màquina = blau. Forats i tauler
// en beix, marc en tinta. Cap negre.
// ============================================================

const ROWS = 6, COLS = 7, NEED = 4;
const CENTER = 3;
const MAXDEPTH = 6;                 // profunditat de cerca de la IA
const ORDER = [3, 2, 4, 1, 5, 0, 6]; // columnes: el centre primer (millor poda)
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]]; // →, ↓, ↓→, ↓←

const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));
const cloneBoard = (b) => b.map(r => r.slice());
const isFull = (b) => b[0].every(v => v);

// Fila lliure més baixa de la columna c (-1 si és plena).
function dropRow(b, c) {
  for (let r = ROWS - 1; r >= 0; r--) if (!b[r][c]) return r;
  return -1;
}

// Les 4 caselles guanyadores de `p` que passen per (r,c), o null.
function winFrom(b, r, c, p) {
  for (const [dr, dc] of DIRS) {
    const cells = [[r, c]];
    for (let k = 1; k < NEED; k++) {
      const rr = r + dr * k, cc = c + dc * k;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || b[rr][cc] !== p) break;
      cells.push([rr, cc]);
    }
    for (let k = 1; k < NEED; k++) {
      const rr = r - dr * k, cc = c - dc * k;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || b[rr][cc] !== p) break;
      cells.unshift([rr, cc]);
    }
    if (cells.length >= NEED) return cells.slice(0, NEED);
  }
  return null;
}

// Puntua una finestra de 4 caselles des del punt de vista de `ai`.
function scoreWindow(cells, ai) {
  const opp = ai === 1 ? 2 : 1;
  let a = 0, o = 0, e = 0;
  for (const v of cells) { if (v === ai) a++; else if (v === opp) o++; else e++; }
  if (a > 0 && o > 0) return 0;          // finestra bloquejada
  if (a === 3 && e === 1) return 50;
  if (a === 2 && e === 2) return 10;
  if (a === 1 && e === 3) return 1;
  if (o === 3 && e === 1) return -80;    // penalitza més les amenaces del rival
  if (o === 2 && e === 2) return -8;
  if (o === 1 && e === 3) return -1;
  return 0;
}

// Avaluació posicional del tauler (positiu = bo per a `ai`).
function evaluate(b, ai) {
  let s = 0;
  for (let r = 0; r < ROWS; r++) if (b[r][CENTER]) s += b[r][CENTER] === ai ? 6 : -6;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of DIRS) {
        const rEnd = r + dr * 3, cEnd = c + dc * 3;
        if (rEnd < 0 || rEnd >= ROWS || cEnd < 0 || cEnd >= COLS) continue;
        const cells = [];
        for (let k = 0; k < 4; k++) cells.push(b[r + dr * k][c + dc * k]);
        s += scoreWindow(cells, ai);
      }
    }
  }
  return s;
}

// Minimax amb poda alfa-beta. Muta `b` in-situ i desfà la jugada (ràpid).
function minimax(b, depth, alpha, beta, turn, ai) {
  const opp = ai === 1 ? 2 : 1;
  const valid = ORDER.filter(c => dropRow(b, c) !== -1);
  if (depth === 0 || valid.length === 0) return evaluate(b, ai);
  if (turn === ai) {
    let best = -Infinity;
    for (const c of valid) {
      const r = dropRow(b, c);
      b[r][c] = ai;
      const val = winFrom(b, r, c, ai) ? 100000 - (MAXDEPTH - depth)
        : minimax(b, depth - 1, alpha, beta, opp, ai);
      b[r][c] = 0;
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const c of valid) {
    const r = dropRow(b, c);
    b[r][c] = opp;
    const val = winFrom(b, r, c, opp) ? -100000 + (MAXDEPTH - depth)
      : minimax(b, depth - 1, alpha, beta, ai, ai);
    b[r][c] = 0;
    if (val < best) best = val;
    if (best < beta) beta = best;
    if (alpha >= beta) break;
  }
  return best;
}

// Millor columna per a la màquina (`ai`): guanya de seguida si pot; si no,
// cerca amb minimax (que ja bloqueja les amenaces del rival).
function aiBestMove(board, ai) {
  const b = cloneBoard(board);
  const opp = ai === 1 ? 2 : 1;
  const valid = ORDER.filter(c => dropRow(b, c) !== -1);
  let bestScore = -Infinity, bestCol = valid[0], alpha = -Infinity;
  for (const c of valid) {
    const r = dropRow(b, c);
    b[r][c] = ai;
    const val = winFrom(b, r, c, ai) ? 1000000 : minimax(b, MAXDEPTH - 1, alpha, Infinity, opp, ai);
    b[r][c] = 0;
    if (val > bestScore) { bestScore = val; bestCol = c; }
    if (val > alpha) alpha = val;
  }
  return bestCol;
}

// Exports nominals del motor (per a proves; el navegador només usa el default).
export { emptyBoard, dropRow, winFrom, isFull, aiBestMove, evaluate };

export default {
  id: 'connecta4',
  title: 'Connecta 4',
  tagline: 'Alinea quatre fitxes',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Toca una columna: la fitxa cau fins a baix de tot.',
    'Per torns, jugador 1 (corall) i jugador 2 o màquina (blau).',
    'Fes 4 fitxes seguides en horitzontal, vertical o diagonal.',
    'Si s\'omple el tauler sense 4 en línia, és empat.',
  ],

  mount(root, { goHome }) {
    const state = {
      mode: '2p',            // 'cpu' | '2p' (per defecte 2 jugadors)
      grid: emptyBoard(),
      turn: 1,               // 1 = corall, 2 = blau/màquina
      over: false,
      winCells: null,
      draw: false,
      animating: false,
    };
    let aiTimer = null;
    const DROP_MS = 430;     // durada de la caiguda
    const AI_PAUSE = 600;    // pausa perquè es vegi que "pensa"

    function clearAiTimer() { if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; } }
    function leave() { clearAiTimer(); goHome(); }

    const isCpu = () => state.mode === 'cpu';
    const other = (p) => (p === 1 ? 2 : 1);
    const colorClass = (p) => (p === 1 ? 'p1' : 'p2');
    function playerName(p) {
      if (isCpu()) return p === 1 ? 'Tu' : 'La màquina';
      return p === 1 ? 'Jugador 1' : 'Jugador 2';
    }

    // ---------- 1) configuració ----------
    function screenConfig() {
      clearAiTimer();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Connecta 4</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>

        <p class="label" style="margin:0 0 12px">Mode</p>
        <div class="btn-row" id="modes">
          <button class="btn ${state.mode === 'cpu' ? 'btn--accent' : 'btn--outline'}" data-mode="cpu">1 jugador</button>
          <button class="btn ${state.mode === '2p' ? 'btn--accent' : 'btn--outline'}" data-mode="2p">2 jugadors</button>
        </div>
        <p class="muted" id="modeinfo" style="margin-top:12px"></p>

        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:24px">Comença</button>
      `;
      const info = () => {
        const el = root.querySelector('#modeinfo');
        if (el) el.textContent = isCpu()
          ? 'Tu jugues amb les fitxes corall; la màquina, amb les blaves.'
          : 'Jugador 1 amb les fitxes corall i jugador 2 amb les blaves.';
      };
      info();
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('[data-mode]').forEach(b => {
        b.onclick = () => {
          state.mode = b.dataset.mode;
          root.querySelectorAll('[data-mode]').forEach(x => {
            x.className = 'btn ' + (x.dataset.mode === state.mode ? 'btn--accent' : 'btn--outline');
          });
          info();
        };
      });
      root.querySelector('#start').onclick = beginGame;
    }

    // ---------- arrenca la partida ----------
    function beginGame() {
      clearAiTimer();
      state.grid = emptyBoard();
      state.turn = 1;
      state.over = false;
      state.winCells = null;
      state.draw = false;
      state.animating = false;
      screenGame();
    }

    // ---------- 2) joc ----------
    function screenGame() {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Connecta 4</p>
        <p class="c4-turn" id="turn"></p>
        <div class="c4">
          <div class="c4-arrows" id="arrows"></div>
          <div class="c4-board" id="board"></div>
        </div>
        <div id="result"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      const board = root.querySelector('#board');
      board.addEventListener('click', (e) => {
        const cell = e.target.closest('.c4-cell');
        if (cell) tryDrop(parseInt(cell.dataset.col, 10));
      });
      renderArrows();
      renderBoard(null);
      paintTurn();
    }

    function renderArrows() {
      const arrows = root.querySelector('#arrows');
      if (!arrows) return;
      const interactive = canHumanPlay();
      arrows.innerHTML = '';
      for (let c = 0; c < COLS; c++) {
        const btn = document.createElement('button');
        btn.className = 'c4-arrow ' + colorClass(state.turn);
        btn.textContent = '▼';
        const full = dropRow(state.grid, c) === -1;
        btn.disabled = !interactive || full;
        btn.onclick = () => tryDrop(c);
        arrows.appendChild(btn);
      }
    }

    // dropInfo = { r, c } de la fitxa que acaba de caure (per animar-la), o null.
    function renderBoard(dropInfo) {
      const board = root.querySelector('#board');
      if (!board) return;
      board.innerHTML = '';
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = document.createElement('div');
          cell.className = 'c4-cell';
          cell.dataset.col = c;
          const v = state.grid[r][c];
          if (v) {
            const piece = document.createElement('div');
            let cls = 'c4-piece ' + colorClass(v);
            const isWin = state.winCells && state.winCells.some(([wr, wc]) => wr === r && wc === c);
            if (isWin) cls += ' win';
            if (dropInfo && dropInfo.r === r && dropInfo.c === c) {
              cls += ' drop';
              piece.style.setProperty('--drop', r + 1); // cau des de dalt (r+1 caselles)
            }
            piece.className = cls;
            cell.appendChild(piece);
          }
          board.appendChild(cell);
        }
      }
    }

    function paintTurn() {
      const el = root.querySelector('#turn');
      if (!el) return;
      const cls = colorClass(state.turn);
      let txt;
      if (isCpu()) txt = state.turn === 1 ? 'El teu torn' : 'La màquina pensa…';
      else txt = `Torn del ${playerName(state.turn)}`;
      el.innerHTML = `<b class="${cls}">${txt}</b>`;
    }

    // Pot jugar ara mateix un humà? (no acabat, no animant, i no és torn IA)
    function canHumanPlay() {
      if (state.over || state.animating) return false;
      if (isCpu() && state.turn === 2) return false;
      return true;
    }

    // ---------- jugada ----------
    function tryDrop(c) {
      if (!canHumanPlay()) return;
      doDrop(c);
    }

    // Deixa caure la fitxa del torn a la columna c i encadena la lògica.
    function doDrop(c) {
      const r = dropRow(state.grid, c);
      if (r === -1) return; // columna plena
      const p = state.turn;
      state.grid[r][c] = p;
      state.animating = true;
      renderArrows();
      renderBoard({ r, c });
      clearAiTimer();
      aiTimer = setTimeout(() => { aiTimer = null; afterDrop(r, c, p); }, DROP_MS);
    }

    function afterDrop(r, c, p) {
      state.animating = false;
      const win = winFrom(state.grid, r, c, p);
      if (win) { state.winCells = win; state.over = true; renderBoard(null); finish(p); return; }
      if (isFull(state.grid)) { state.over = true; state.draw = true; renderBoard(null); finish(null); return; }
      state.turn = other(p);
      renderArrows();
      paintTurn();
      maybeAI();
    }

    function maybeAI() {
      if (!isCpu() || state.turn !== 2 || state.over) return;
      clearAiTimer();
      aiTimer = setTimeout(() => {
        aiTimer = null;
        if (state.over) return;
        const c = aiBestMove(state.grid, 2);
        if (c != null) doDrop(c);
      }, AI_PAUSE);
    }

    // ---------- 3) final ----------
    function finish(winner) {
      clearAiTimer();
      let title, sub;
      if (winner == null) { title = 'Empat!'; sub = 'Tauler ple sense 4 en línia.'; }
      else if (isCpu()) { title = winner === 1 ? 'Has guanyat!' : 'Has perdut!'; sub = '4 en línia.'; }
      else { title = `Guanya el ${playerName(winner)}!`; sub = '4 en línia.'; }

      const el = root.querySelector('#turn');
      if (el) el.innerHTML = winner == null
        ? `<b>${title}</b>`
        : `<b class="${colorClass(winner)}">${title}</b>`;

      const result = root.querySelector('#result');
      if (!result) return;
      result.innerHTML = `
        <div class="stack" style="margin-top:18px">
          <p class="muted center">${sub}</p>
          <button class="btn btn--accent" id="again">Una altra</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>
      `;
      result.querySelector('#again').onclick = beginGame;
      result.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
