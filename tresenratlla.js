// ============================================================
// Tres en ratlla — variant de 3 FITXES MÒBILS (sense empats).
//
// Cada jugador té 3 fitxes. Mentre en té menys de 3 al tauler, en col·loca
// una a una casella buida. Quan ja en té 3, en el seu torn ha de MOURE una
// fitxa pròpia a qualsevol casella buida. Així el tauler mai s'omple del
// tot i no hi pot haver empat: guanya qui fa tres en ratlla.
//
// 2 jugadors al mateix mòbil o 1 jugador contra la màquina (heurística:
// guanya si pot, bloqueja les amenaces i, si no, juga posicional).
//
// X = jugador 1 (corall), O = jugador 2 / màquina (blau).
// ============================================================

// Les 8 línies guanyadores (índexs 0..8 del tauler en fila).
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // files
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columnes
  [0, 4, 8], [2, 4, 6],            // diagonals
];

function winningLine(board, p) {
  for (const ln of LINES) if (ln.every(i => board[i] === p)) return ln;
  return null;
}

const pieceCount = (board, p) => board.reduce((n, v) => n + (v === p ? 1 : 0), 0);

// Jugades legals de `p`: col·locar (si té < 3 fitxes) o moure'n una a una
// casella buida (si ja en té 3).
function legalMoves(board, p) {
  const empties = [];
  for (let i = 0; i < 9; i++) if (board[i] === '') empties.push(i);
  if (pieceCount(board, p) < 3) return empties.map(to => ({ type: 'place', to }));
  const moves = [];
  for (let i = 0; i < 9; i++) if (board[i] === p) for (const to of empties) moves.push({ type: 'move', from: i, to });
  return moves;
}

function applyAction(board, p, mv) {
  const b = board.slice();
  if (mv.type === 'place') b[mv.to] = p;
  else { b[mv.from] = ''; b[mv.to] = p; }
  return b;
}

const OTHER = (m) => (m === 'X' ? 'O' : 'X');
const POS = [4, 0, 2, 6, 8, 1, 3, 5, 7]; // centre > cantonades > costats

// Caselles buides on `p` faria tres en ratlla la jugada següent (amenaces).
function winCells(board, p) {
  const set = new Set();
  for (const ln of LINES) {
    let cntP = 0, empty = -1;
    for (const i of ln) { if (board[i] === p) cntP++; else if (board[i] === '') empty = i; }
    if (cntP === 2 && empty !== -1) set.add(empty);
  }
  return [...set];
}

// Avaluació posicional al límit de profunditat (lluny de la victòria):
// pondera les amenaces pròpies menys les del rival.
function heuristicEval(board, ai) {
  const opp = OTHER(ai);
  return winCells(board, ai).length * 12 - winCells(board, opp).length * 14;
}

// Ordena les jugades (millors primer) per podar més amb alfa-beta.
function orderedMoves(board, turn) {
  const opp = OTHER(turn);
  return legalMoves(board, turn).map(mv => {
    const b = applyAction(board, turn, mv);
    let s;
    if (winningLine(b, turn)) s = 1000;
    else s = winCells(b, turn).length * 10 - winCells(b, opp).length * 8 - POS.indexOf(mv.to);
    return { mv, s };
  }).sort((a, b) => b.s - a.s).map(o => o.mv);
}

const MAXD = 8; // profunditat de cerca (prou per anticipar forquilles)

// Minimax amb alfa-beta i límit de profunditat (la fase de moviment podria
// no acabar mai; al límit s'avalua amb l'heurística).
function minimax(board, turn, ai, depth, alpha, beta) {
  if (winningLine(board, ai)) return 1000 - depth;
  if (winningLine(board, OTHER(ai))) return depth - 1000;
  if (depth >= MAXD) return heuristicEval(board, ai);
  const maximizing = turn === ai;
  let best = maximizing ? -Infinity : Infinity;
  for (const mv of orderedMoves(board, turn)) {
    const v = minimax(applyAction(board, turn, mv), OTHER(turn), ai, depth + 1, alpha, beta);
    if (maximizing) { if (v > best) best = v; if (best > alpha) alpha = best; }
    else { if (v < best) best = v; if (best < beta) beta = best; }
    if (alpha >= beta) break;
  }
  return best;
}

// Decideix la jugada de la màquina (`p`) amb minimax.
function aiChooseAction(board, p) {
  let best = null, bestScore = -Infinity;
  for (const mv of orderedMoves(board, p)) {
    const score = minimax(applyAction(board, p, mv), OTHER(p), p, 1, -Infinity, Infinity);
    if (score > bestScore) { bestScore = score; best = mv; }
  }
  return best;
}

export default {
  id: 'tresenratlla',
  title: 'Tres en ratlla',
  tagline: 'Tres en línia i guanyes',
  accent: '#E4572E',
  color: 'var(--paper-2)',
  ready: true,

  instructions: [
    'Cada jugador té 3 fitxes: X (jugador 1) i O (jugador 2 o màquina).',
    'Mentre en tinguis menys de 3, col·loca una fitxa a una casella buida.',
    'Quan ja en tens 3, mou-ne una: tria una fitxa teva i toca una casella buida.',
    'Guanya qui fa tres en ratlla. No hi ha empats!',
  ],

  mount(root, { goHome }) {
    const state = {
      mode: '2p',           // 'cpu' | '2p' (per defecte 2 jugadors)
      board: Array(9).fill(''),
      turn: 'X',
      selected: null,       // índex de la fitxa triada (fase de moviment)
      over: false,
      winLine: null,
      confirming: false,    // mostra la confirmació de rendir-se
    };
    let aiTimer = null;

    function clearAiTimer() { if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; } }
    function leave() { clearAiTimer(); goHome(); }

    const isCpu = () => state.mode === 'cpu';
    const other = (m) => (m === 'X' ? 'O' : 'X');
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
        <p class="muted" style="margin-top:8px">3 fitxes cadascú: col·loca-les i després mou-les. No hi ha empats.</p>

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
      state.selected = null;
      state.over = false;
      state.winLine = null;
      state.confirming = false;
      screenGame();
    }

    // ---------- 2) joc ----------
    function screenGame() {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Tres en ratlla</p>
        <p class="ttt-turn" id="turn"></p>
        <div class="ttt-board" id="board"></div>
        <div id="controls" class="center" style="margin-top:14px"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      renderBoard();
      paintTurn();
      resetControls();
    }

    // ---------- rendir-se ----------
    function resetControls() {
      const ctl = root.querySelector('#controls');
      if (!ctl) return;
      ctl.innerHTML = `<button class="btn btn--outline" id="resign">Rendir-se</button>`;
      ctl.querySelector('#resign').onclick = askResign;
    }
    function askResign() {
      if (state.over) return;
      state.confirming = true;
      const ctl = root.querySelector('#controls');
      if (!ctl) return;
      ctl.innerHTML = `
        <div class="panel center stack" style="margin-top:4px;--stack-gap:12px">
          <p style="font-weight:700">Segur que et vols rendir?</p>
          <div class="btn-row">
            <button class="btn btn--accent" id="ryes">Sí</button>
            <button class="btn btn--outline" id="rno">No</button>
          </div>
        </div>`;
      ctl.querySelector('#ryes').onclick = () => { state.confirming = false; doResign(); };
      ctl.querySelector('#rno').onclick = () => { state.confirming = false; resetControls(); };
    }
    function doResign() {
      if (state.over) return;
      const loser = isCpu() ? 'X' : state.turn; // a 1 jugador es rendeix l'humà (X)
      const winner = other(loser);
      state.over = true;
      state.selected = null;
      renderBoard();
      finish(winner, 'resign');
    }

    function paintTurn() {
      const el = root.querySelector('#turn');
      if (!el) return;
      const cls = state.turn === 'X' ? 'x' : 'o';
      const moving = pieceCount(state.board, state.turn) >= 3;
      const action = !moving ? 'col·loca una fitxa'
        : (state.selected != null ? 'toca una casella buida' : 'tria i mou una fitxa');
      el.innerHTML = `Torn de <b class="${cls}">${markName(state.turn)}</b> (<b class="${cls}">${state.turn}</b>) · ${action}`;
    }

    function renderBoard() {
      const b = root.querySelector('#board');
      if (!b) return;
      const interactive = !state.over && (!isCpu() || state.turn === 'X');
      const moving = pieceCount(state.board, state.turn) >= 3;
      b.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const cell = document.createElement('button');
        const mark = state.board[i];
        let cls = 'ttt-cell';
        if (mark === 'X') cls += ' x';
        else if (mark === 'O') cls += ' o';
        if (state.winLine && state.winLine.includes(i)) cls += ' win';
        if (state.selected === i) cls += ' sel';

        let actionable = false;
        if (interactive) {
          if (!moving) actionable = (mark === '');
          else if (mark === state.turn) actionable = true;                 // triar/canviar fitxa
          else if (mark === '' && state.selected != null) { actionable = true; cls += ' target'; } // destí
        }
        cell.className = cls;
        cell.textContent = mark;
        cell.disabled = !actionable;
        if (actionable) cell.onclick = () => humanPlay(i);
        b.appendChild(cell);
      }
    }

    function humanPlay(i) {
      if (state.over || state.confirming) return;
      if (isCpu() && state.turn !== 'X') return; // espera la màquina
      const moving = pieceCount(state.board, state.turn) >= 3;
      if (!moving) {
        if (state.board[i] !== '') return;
        place(i);
      } else {
        if (state.board[i] === state.turn) { state.selected = i; renderBoard(); paintTurn(); return; }
        if (state.board[i] === '' && state.selected != null) movePiece(state.selected, i);
      }
    }

    function place(i) { state.board[i] = state.turn; afterAction(); }
    function movePiece(from, to) { state.board[from] = ''; state.board[to] = state.turn; state.selected = null; afterAction(); }

    // Comprova el final i, si no, passa el torn (i mou la màquina si cal).
    function afterAction() {
      const line = winningLine(state.board, state.turn);
      if (line) { state.winLine = line; state.over = true; state.selected = null; renderBoard(); finish(state.turn); return; }
      state.turn = other(state.turn);
      state.selected = null;
      renderBoard();
      paintTurn();
      maybeAI();
    }

    function maybeAI() {
      if (!isCpu() || state.turn !== 'O' || state.over) return;
      clearAiTimer();
      aiTimer = setTimeout(aiPlay, 500); // pausa perquè es vegi
    }

    function aiPlay() {
      aiTimer = null;
      if (state.over) return;
      const act = aiChooseAction(state.board, 'O');
      if (!act) return;
      if (act.type === 'place') place(act.to);
      else movePiece(act.from, act.to);
    }

    // ---------- 3) final (sempre hi ha guanyador) ----------
    function finish(winner, reason) {
      clearAiTimer();
      const ctl = root.querySelector('#controls');
      if (ctl) ctl.innerHTML = '';
      let title;
      if (isCpu()) title = winner === 'X' ? 'Has guanyat!' : 'Has perdut!';
      else title = `Guanya el ${markName(winner)}!`;
      const turnEl = root.querySelector('#turn');
      if (turnEl) turnEl.innerHTML = `<b class="${winner === 'X' ? 'x' : 'o'}">${title}</b>`;
      const sub = reason === 'resign'
        ? (isCpu() ? 'T\'has rendit.' : `El ${markName(other(winner))} s'ha rendit.`)
        : `Tres en ratlla amb les ${winner}`;
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
