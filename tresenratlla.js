// ============================================================
// Tres en ratlla — 2 jugadors al mateix mòbil o 1 jugador contra la
// màquina (minimax: imbatible). Tauler 3×3.
//
// Jugador 1 = X (corall), Jugador 2 / màquina = O (tinta).
//
// Flux: configuració (mode) -> joc per torns -> final (línia guanyadora
// ressaltada, o empat).
// ============================================================

// Les 8 línies guanyadores (índexs 0..8 del tauler en fila).
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // files
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columnes
  [0, 4, 8], [2, 4, 6],            // diagonals
];

// Retorna {line} de la combinació guanyadora del jugador `p`, o null.
function winningLine(board, p) {
  for (const ln of LINES) if (ln.every(i => board[i] === p)) return ln;
  return null;
}
const isFull = (board) => board.every(v => v);

// Minimax: puntuació òptima per a qui mou (`turn`). +10/-10 ponderats per
// profunditat perquè guanyi com abans millor i perdi com més tard millor.
function minimax(board, turn, ai, human, depth) {
  if (winningLine(board, ai)) return 10 - depth;
  if (winningLine(board, human)) return depth - 10;
  if (isFull(board)) return 0;
  const maximizing = turn === ai;
  let best = maximizing ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = turn;
    const score = minimax(board, turn === ai ? human : ai, ai, human, depth + 1);
    board[i] = '';
    best = maximizing ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

// Millor jugada de la màquina (`ai`) contra `human`.
function bestMove(board, ai, human) {
  let best = -Infinity, move = -1;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = ai;
    const score = minimax(board, human, ai, human, 1);
    board[i] = '';
    if (score > best) { best = score; move = i; }
  }
  return move;
}

export default {
  id: 'tresenratlla',
  title: 'Tres en ratlla',
  tagline: 'Tres en línia i guanyes',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Un jugador juga amb les X i l\'altre amb els O.',
    'Per torns, toqueu una casella buida per posar la vostra marca.',
    'Guanya qui alinea tres marques iguals: fila, columna o diagonal.',
    'A 1 jugador, jugues contra la màquina.',
  ],

  mount(root, { goHome }) {
    const state = {
      mode: '2p',        // 'cpu' | '2p' (per defecte 2 jugadors)
      board: Array(9).fill(''),
      turn: 'X',         // 'X' (jugador 1) o 'O' (jugador 2 / màquina)
      over: false,
      winLine: null,
    };
    let aiTimer = null;

    function clearAiTimer() { if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; } }
    function leave() { clearAiTimer(); goHome(); }

    const isCpu = () => state.mode === 'cpu';
    // X = jugador 1; O = jugador 2 o màquina.
    function markName(m) {
      if (isCpu()) return m === 'X' ? 'Tu' : 'La màquina';
      return m === 'X' ? 'Jugador 1' : 'Jugador 2';
    }

    // ---------- 1) configuració ----------
    function screenConfig() {
      clearAiTimer();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Tres en ratlla</p>
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
          ? 'Tu ets les X; la màquina, les O.'
          : 'Jugador 1 amb les X i Jugador 2 amb les O.';
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
      state.board = Array(9).fill('');
      state.turn = 'X';
      state.over = false;
      state.winLine = null;
      screenGame();
    }

    // ---------- 2) joc ----------
    function screenGame() {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Tres en ratlla</p>
        <p class="ttt-turn" id="turn"></p>
        <div class="ttt-board" id="board"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      renderBoard();
      paintTurn();
    }

    function paintTurn() {
      const el = root.querySelector('#turn');
      if (!el) return;
      const cls = state.turn === 'X' ? 'x' : 'o';
      el.innerHTML = `Torn de <b class="${cls}">${markName(state.turn)}</b> (<b class="${cls}">${state.turn}</b>)`;
    }

    function renderBoard() {
      const b = root.querySelector('#board');
      if (!b) return;
      b.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const cell = document.createElement('button');
        const mark = state.board[i];
        let cls = 'ttt-cell';
        if (mark === 'X') cls += ' x';
        else if (mark === 'O') cls += ' o';
        if (state.winLine && state.winLine.includes(i)) cls += ' win';
        cell.className = cls;
        cell.textContent = mark;
        cell.dataset.i = i;
        if (!mark && !state.over) cell.onclick = () => humanPlay(i);
        cell.disabled = !!mark || state.over;
        b.appendChild(cell);
      }
    }

    // Jugada d'un humà a la casella i.
    function humanPlay(i) {
      if (state.over || state.board[i]) return;
      // a 1 jugador, només pots jugar quan és el torn de les X (tu)
      if (isCpu() && state.turn !== 'X') return;
      play(i);
      if (state.over) return;
      if (isCpu() && state.turn === 'O') {
        // la màquina respon amb una petita pausa
        aiTimer = setTimeout(() => {
          aiTimer = null;
          if (state.over) return;
          const m = bestMove(state.board.slice(), 'O', 'X');
          if (m >= 0) play(m);
        }, 500);
      }
    }

    // Aplica una marca i comprova el final.
    function play(i) {
      state.board[i] = state.turn;
      const line = winningLine(state.board, state.turn);
      if (line) { state.winLine = line; state.over = true; renderBoard(); finish(state.turn); return; }
      if (isFull(state.board)) { state.over = true; renderBoard(); finish(null); return; }
      state.turn = state.turn === 'X' ? 'O' : 'X';
      renderBoard();
      paintTurn();
    }

    // ---------- 3) final ----------
    function finish(winner) {
      clearAiTimer();
      let title, sub;
      if (!winner) { title = 'Empat!'; sub = 'Ningú no fa tres en ratlla'; }
      else if (isCpu()) {
        title = winner === 'X' ? 'Has guanyat!' : 'Has perdut!';
        sub = `Guanyen les ${winner}`;
      } else {
        title = `Guanya el ${markName(winner)}!`;
        sub = `Tres en ratlla amb les ${winner}`;
      }
      const turnEl = root.querySelector('#turn');
      if (turnEl) turnEl.innerHTML = `<b class="${winner === 'X' ? 'x' : (winner === 'O' ? 'o' : '')}">${title}</b>`;
      // panell de resultat sota el tauler
      const old = root.querySelector('#result');
      if (old) old.remove();
      const wrap = document.createElement('div');
      wrap.id = 'result';
      wrap.className = 'stack';
      wrap.style.marginTop = '20px';
      wrap.innerHTML = `
        <p class="muted center">${sub}</p>
        <button class="btn btn--accent" id="again">Una altra</button>
        <button class="btn btn--outline" id="home">Tornar a l'inici</button>
      `;
      root.appendChild(wrap);
      root.querySelector('#again').onclick = beginGame;
      root.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
