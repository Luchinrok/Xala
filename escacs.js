// ============================================================
// Escacs — joc d'un sol jugador (vs ordinador) o de 2 jugadors.
//
// Regles completes: moviments de cada peça, enroc, captura al pas,
// coronació automàtica a dama, escac, escac i mat i taules (ofegat).
// No es permeten moviments que deixin el propi rei en escac.
//
// IA (negres): minimax amb poda alfa-beta i avaluació de material +
// posició bàsica. Profunditat segons dificultat (Fàcil 1, Normal 2,
// Difícil 3). El jugador sempre porta les blanques (a baix).
//
// Estètica: tauler beix (--paper-2) i corall (--accent); peces amb
// glifs Unicode SEMPRE en tinta (--ink): blanques buides, negres
// plenes. Cap negre de fons.
// ============================================================

// ---------- glifs Unicode (sempre en tinta) ----------
const GLYPH = {
  w: { P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔' },
  b: { P: '♟', N: '♞', B: '♝', R: '♜', Q: '♛', K: '♚' },
};

// ---------- valors i taules de posició (perspectiva de les blanques) ----------
const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
const MATE = 1000000;

// Taules indexades [r][c] amb r=0 a dalt (fila 8) i r=7 a baix (fila 1).
// Per a una peça negra es fa servir la taula reflectida: PST[t][7-r][c].
const PST = {
  P: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  N: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  B: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  R: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0],
  ],
  Q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  K: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
  ],
};

// ---------- direccions ----------
const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KD = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const BD = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const RD = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const inB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

function initialPos() {
  const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = { c: 'b', t: back[c] };
    board[1][c] = { c: 'b', t: 'P' };
    board[6][c] = { c: 'w', t: 'P' };
    board[7][c] = { c: 'w', t: back[c] };
  }
  return { board, turn: 'w', castling: { wK: true, wQ: true, bK: true, bQ: true }, ep: null };
}

function cloneBoard(board) {
  return board.map(row => row.map(cell => (cell ? { c: cell.c, t: cell.t } : null)));
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const x = board[r][c];
      if (x && x.c === color && x.t === 'K') return [r, c];
    }
  return null;
}

// Hi ha alguna peça de color `by` que ataca la casella (r,c)?
function isAttacked(board, r, c, by) {
  const pdir = by === 'w' ? 1 : -1; // on s'asseu el peó atacant respecte de la casella
  for (const dc of [-1, 1]) {
    const pr = r + pdir, pc = c + dc;
    if (inB(pr, pc)) { const x = board[pr][pc]; if (x && x.c === by && x.t === 'P') return true; }
  }
  for (const [dr, dc] of KN) {
    const rr = r + dr, cc = c + dc;
    if (inB(rr, cc)) { const x = board[rr][cc]; if (x && x.c === by && x.t === 'N') return true; }
  }
  for (const [dr, dc] of KD) {
    const rr = r + dr, cc = c + dc;
    if (inB(rr, cc)) { const x = board[rr][cc]; if (x && x.c === by && x.t === 'K') return true; }
  }
  for (const [dr, dc] of BD) {
    let rr = r + dr, cc = c + dc;
    while (inB(rr, cc)) { const x = board[rr][cc]; if (x) { if (x.c === by && (x.t === 'B' || x.t === 'Q')) return true; break; } rr += dr; cc += dc; }
  }
  for (const [dr, dc] of RD) {
    let rr = r + dr, cc = c + dc;
    while (inB(rr, cc)) { const x = board[rr][cc]; if (x) { if (x.c === by && (x.t === 'R' || x.t === 'Q')) return true; break; } rr += dr; cc += dc; }
  }
  return false;
}

function inCheck(pos, color) {
  const k = findKing(pos.board, color);
  return k ? isAttacked(pos.board, k[0], k[1], color === 'w' ? 'b' : 'w') : false;
}

// Moviments pseudolegals (sense filtrar l'escac propi).
function genPseudo(pos) {
  const { board, turn, ep, castling } = pos;
  const opp = turn === 'w' ? 'b' : 'w';
  const dir = turn === 'w' ? -1 : 1;
  const startRow = turn === 'w' ? 6 : 1;
  const promoRow = turn === 'w' ? 0 : 7;
  const moves = [];

  const addPawn = (fr, to, cap) => {
    if (to[0] === promoRow) moves.push({ fr, to, t: 'P', cap: cap || null, promo: 'Q' });
    else moves.push({ fr, to, t: 'P', cap: cap || null });
  };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell || cell.c !== turn) continue;
      const t = cell.t;

      if (t === 'P') {
        const r1 = r + dir;
        if (inB(r1, c) && !board[r1][c]) {
          addPawn([r, c], [r1, c]);
          if (r === startRow && !board[r + 2 * dir][c]) moves.push({ fr: [r, c], to: [r + 2 * dir, c], t: 'P', cap: null, dbl: true });
        }
        for (const dc of [-1, 1]) {
          const rr = r + dir, cc = c + dc;
          if (!inB(rr, cc)) continue;
          const tgt = board[rr][cc];
          if (tgt && tgt.c !== turn) addPawn([r, c], [rr, cc], tgt.t);
          else if (ep && ep[0] === rr && ep[1] === cc) moves.push({ fr: [r, c], to: [rr, cc], t: 'P', cap: 'P', ep: true });
        }
      } else if (t === 'N') {
        for (const [dr, dc] of KN) {
          const rr = r + dr, cc = c + dc;
          if (!inB(rr, cc)) continue;
          const tgt = board[rr][cc];
          if (!tgt || tgt.c !== turn) moves.push({ fr: [r, c], to: [rr, cc], t: 'N', cap: tgt ? tgt.t : null });
        }
      } else if (t === 'K') {
        for (const [dr, dc] of KD) {
          const rr = r + dr, cc = c + dc;
          if (!inB(rr, cc)) continue;
          const tgt = board[rr][cc];
          if (!tgt || tgt.c !== turn) moves.push({ fr: [r, c], to: [rr, cc], t: 'K', cap: tgt ? tgt.t : null });
        }
        // enroc
        const row = turn === 'w' ? 7 : 0;
        if (r === row && c === 4) {
          const kSide = turn === 'w' ? castling.wK : castling.bK;
          const qSide = turn === 'w' ? castling.wQ : castling.bQ;
          const rook = (cc) => { const x = board[row][cc]; return x && x.t === 'R' && x.c === turn; };
          if (kSide && !board[row][5] && !board[row][6] && rook(7) &&
              !isAttacked(board, row, 4, opp) && !isAttacked(board, row, 5, opp) && !isAttacked(board, row, 6, opp)) {
            moves.push({ fr: [row, 4], to: [row, 6], t: 'K', cap: null, castle: 'K' });
          }
          if (qSide && !board[row][1] && !board[row][2] && !board[row][3] && rook(0) &&
              !isAttacked(board, row, 4, opp) && !isAttacked(board, row, 3, opp) && !isAttacked(board, row, 2, opp)) {
            moves.push({ fr: [row, 4], to: [row, 2], t: 'K', cap: null, castle: 'Q' });
          }
        }
      } else {
        const dirs = t === 'B' ? BD : t === 'R' ? RD : BD.concat(RD); // Q = B + R
        for (const [dr, dc] of dirs) {
          let rr = r + dr, cc = c + dc;
          while (inB(rr, cc)) {
            const tgt = board[rr][cc];
            if (!tgt) moves.push({ fr: [r, c], to: [rr, cc], t, cap: null });
            else { if (tgt.c !== turn) moves.push({ fr: [r, c], to: [rr, cc], t, cap: tgt.t }); break; }
            rr += dr; cc += dc;
          }
        }
      }
    }
  }
  return moves;
}

// Aplica un moviment i retorna una posició NOVA.
function applyMove(pos, m) {
  const board = cloneBoard(pos.board);
  const turn = pos.turn;
  const opp = turn === 'w' ? 'b' : 'w';
  const castling = { ...pos.castling };
  let ep = null;

  const piece = board[m.fr[0]][m.fr[1]];
  if (m.ep) board[m.fr[0]][m.to[1]] = null; // captura al pas: treu el peó del costat
  board[m.to[0]][m.to[1]] = piece;
  board[m.fr[0]][m.fr[1]] = null;
  if (m.promo) board[m.to[0]][m.to[1]] = { c: turn, t: m.promo };

  if (m.castle === 'K') { const row = m.fr[0]; board[row][5] = board[row][7]; board[row][7] = null; }
  if (m.castle === 'Q') { const row = m.fr[0]; board[row][3] = board[row][0]; board[row][0] = null; }

  if (m.dbl) ep = [(m.fr[0] + m.to[0]) / 2, m.fr[1]];

  if (piece.t === 'K') {
    if (turn === 'w') { castling.wK = false; castling.wQ = false; }
    else { castling.bK = false; castling.bQ = false; }
  }
  const clearRook = (r, c) => {
    if (r === 7 && c === 0) castling.wQ = false;
    if (r === 7 && c === 7) castling.wK = false;
    if (r === 0 && c === 0) castling.bQ = false;
    if (r === 0 && c === 7) castling.bK = false;
  };
  clearRook(m.fr[0], m.fr[1]);
  clearRook(m.to[0], m.to[1]);

  return { board, turn: opp, castling, ep };
}

// Moviments legals: pseudolegals que NO deixen el propi rei en escac.
function genLegal(pos) {
  const opp = pos.turn === 'w' ? 'b' : 'w';
  return genPseudo(pos).filter(m => {
    const np = applyMove(pos, m);
    const k = findKing(np.board, pos.turn);
    return k && !isAttacked(np.board, k[0], k[1], opp);
  });
}

// Avaluació (material + posició), positiu = bo per a les blanques.
function evaluate(pos) {
  let score = 0;
  const b = pos.board;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x = b[r][c];
      if (!x) continue;
      if (x.c === 'w') score += VAL[x.t] + PST[x.t][r][c];
      else score -= VAL[x.t] + PST[x.t][7 - r][c];
    }
  }
  return score;
}

// Ordena els moviments (captures primer) per millorar la poda.
function orderMoves(moves) {
  return moves.slice().sort((a, b) => (b.cap ? 1 : 0) - (a.cap ? 1 : 0));
}

// Minimax amb poda alfa-beta. Blanques maximitzen, negres minimitzen.
function search(pos, depth, alpha, beta) {
  const moves = genLegal(pos);
  if (moves.length === 0) {
    if (inCheck(pos, pos.turn)) return pos.turn === 'w' ? -(MATE + depth) : (MATE + depth);
    return 0; // ofegat
  }
  if (depth === 0) return evaluate(pos);

  const ord = orderMoves(moves);
  if (pos.turn === 'w') {
    let best = -Infinity;
    for (const m of ord) {
      const v = search(applyMove(pos, m), depth - 1, alpha, beta);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of ord) {
      const v = search(applyMove(pos, m), depth - 1, alpha, beta);
      if (v < best) best = v;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

// Tria el moviment de la IA (negres = minimitzar). Una mica d'atzar entre
// els millors per donar varietat; a Fàcil, més marge (joc més fluix).
function pickAIMove(pos, depth) {
  const moves = orderMoves(genLegal(pos));
  if (!moves.length) return null;
  const scored = moves.map(m => ({ m, s: search(applyMove(pos, m), depth - 1, -Infinity, Infinity) }));
  let min = Infinity;
  for (const x of scored) if (x.s < min) min = x.s;
  const eps = depth <= 1 ? 60 : 10;
  const pool = scored.filter(x => x.s <= min + eps);
  return pool[Math.floor(Math.random() * pool.length)].m;
}

const DEPTH = { easy: 1, normal: 2, hard: 3 };

// Exports nominals del motor (per a proves; el navegador només usa el default).
export { initialPos, genLegal, genPseudo, applyMove, inCheck, isAttacked, findKing, evaluate, pickAIMove };

export default {
  id: 'escacs',
  title: 'Escacs',
  tagline: 'El joc dels reis, mou per mou',
  accent: '#E4572E',
  color: '#E4572E',
  ready: true,

  instructions: [
    'Toca una peça blanca: s\'il·luminen amb un punt totes les jugades legals.',
    'Toca una casella marcada per moure-hi. Inclou enroc, captura al pas i coronació (auto a dama).',
    'Fes escac i mat al rei contrari per guanyar; si el rei no està en escac però no es pot moure, són taules.',
    'Tria jugar contra l\'ordinador (Fàcil, Normal o Difícil) o a 2 jugadors al mateix mòbil.',
  ],

  mount(root, { goHome }) {
    let mode = 'cpu';     // 'cpu' | '2p'
    let diff = 'normal';  // 'easy' | 'normal' | 'hard'

    let pos = null;
    let selected = null;      // [r,c] de la peça triada
    let legalForSel = [];     // jugades legals de la peça triada
    let allLegal = [];        // totes les jugades legals del torn
    let gameOver = false;

    // ---------- 1) configuració ----------
    function screenConfig() {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Escacs</p>
        <h2 style="font-size:30px;margin:6px 0 22px">Prepara la partida</h2>

        <p class="label" style="margin:0 0 12px">Mode</p>
        <div class="btn-row" id="modes">
          <button class="btn ${mode === 'cpu' ? 'btn--accent' : 'btn--outline'}" data-mode="cpu">Contra l'ordinador</button>
          <button class="btn ${mode === '2p' ? 'btn--accent' : 'btn--outline'}" data-mode="2p">2 jugadors</button>
        </div>

        <div id="diffWrap" style="${mode === 'cpu' ? '' : 'display:none'}">
          <p class="label" style="margin:24px 0 12px">Dificultat</p>
          <div class="btn-row" id="diffs">
            <button class="btn ${diff === 'easy' ? 'btn--accent' : 'btn--outline'}" data-diff="easy">Fàcil</button>
            <button class="btn ${diff === 'normal' ? 'btn--accent' : 'btn--outline'}" data-diff="normal">Normal</button>
            <button class="btn ${diff === 'hard' ? 'btn--accent' : 'btn--outline'}" data-diff="hard">Difícil</button>
          </div>
        </div>

        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>
      `;
      root.querySelector('#back').onclick = goHome;
      root.querySelectorAll('[data-mode]').forEach(b => { b.onclick = () => { mode = b.dataset.mode; screenConfig(); }; });
      root.querySelectorAll('[data-diff]').forEach(b => { b.onclick = () => { diff = b.dataset.diff; screenConfig(); }; });
      root.querySelector('#start').onclick = beginGame;
    }

    // ---------- arrenca la partida ----------
    function beginGame() {
      pos = initialPos();
      selected = null;
      legalForSel = [];
      gameOver = false;
      allLegal = genLegal(pos);
      screenBoard();
    }

    // ---------- 2) tauler ----------
    function screenBoard() {
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker center" id="status">El teu torn — blanques</p>
        <div class="chess-board" id="board"></div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = goHome;
      const boardEl = root.querySelector('#board');
      boardEl.addEventListener('click', (e) => {
        const b = e.target.closest('.sq');
        if (!b) return;
        handleClick(parseInt(b.dataset.r, 10), parseInt(b.dataset.c, 10));
      });
      renderBoard();
      updateStatus(inCheck(pos, pos.turn));
    }

    function renderBoard() {
      const boardEl = root.querySelector('#board');
      if (!boardEl) return;
      let html = '';
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const light = (r + c) % 2 === 0;
          const piece = pos.board[r][c];
          const sel = selected && selected[0] === r && selected[1] === c;
          const target = legalForSel.some(m => m.to[0] === r && m.to[1] === c);
          let inner = '';
          if (piece) inner += `<span class="piece">${GLYPH[piece.c][piece.t]}</span>`;
          if (target) inner += piece ? '<span class="dot dot--cap"></span>' : '<span class="dot"></span>';
          html += `<button class="sq ${light ? 'sq--light' : 'sq--dark'}${sel ? ' sq--sel' : ''}" data-r="${r}" data-c="${c}">${inner}</button>`;
        }
      }
      boardEl.innerHTML = html;
    }

    function handleClick(r, c) {
      if (gameOver) return;
      if (mode === 'cpu' && pos.turn === 'b') return; // torn de la IA
      const cell = pos.board[r][c];
      if (selected) {
        const mv = legalForSel.find(m => m.to[0] === r && m.to[1] === c);
        if (mv) { playMove(mv); return; }
        if (cell && cell.c === pos.turn) selectAt(r, c);
        else { selected = null; legalForSel = []; renderBoard(); }
      } else if (cell && cell.c === pos.turn) {
        selectAt(r, c);
      }
    }

    function selectAt(r, c) {
      selected = [r, c];
      legalForSel = allLegal.filter(m => m.fr[0] === r && m.fr[1] === c);
      renderBoard();
    }

    function playMove(mv) {
      pos = applyMove(pos, mv);
      selected = null;
      legalForSel = [];
      afterMove();
    }

    // ---------- després de cada moviment: fi de partida / torn de la IA ----------
    function afterMove() {
      allLegal = genLegal(pos);
      const check = inCheck(pos, pos.turn);
      renderBoard();

      if (allLegal.length === 0) {
        gameOver = true;
        endScreen(check ? 'mate' : 'stalemate');
        return;
      }
      updateStatus(check);

      if (mode === 'cpu' && pos.turn === 'b') {
        setStatus('L\'ordinador pensa…');
        // deixa pintar la UI abans del càlcul (bloquejant) de la IA
        setTimeout(() => {
          const mv = pickAIMove(pos, DEPTH[diff]);
          if (mv) { pos = applyMove(pos, mv); afterMove(); }
        }, 30);
      }
    }

    function setStatus(txt) {
      const s = root.querySelector('#status');
      if (s) s.textContent = txt;
    }

    function updateStatus(check) {
      let txt;
      if (mode === 'cpu') txt = pos.turn === 'w' ? 'El teu torn — blanques' : 'Negres';
      else txt = 'Torn de les ' + (pos.turn === 'w' ? 'blanques' : 'negres');
      if (check) txt += ' · Escac!';
      setStatus(txt);
    }

    // ---------- 3) final ----------
    function endScreen(kind) {
      let title, sub;
      if (kind === 'mate') {
        const loser = pos.turn; // qui ha de moure i no pot, està en mat
        if (mode === 'cpu') {
          if (loser === 'w') { title = 'Escac i mat'; sub = 'Has perdut contra l\'ordinador.'; }
          else { title = 'Escac i mat!'; sub = 'Has guanyat. Ben jugat!'; }
        } else {
          const winner = loser === 'w' ? 'negres' : 'blanques';
          title = 'Escac i mat'; sub = 'Guanyen les ' + winner + '.';
        }
        setStatus('Escac i mat');
      } else {
        title = 'Taules'; sub = 'Rei ofegat: ningú no guanya.';
        setStatus('Taules');
      }

      const endbox = root.querySelector('#endbox');
      endbox.innerHTML = `
        <div class="panel center stack" style="margin-top:16px">
          <h2 style="font-size:30px;color:var(--accent)">${title}</h2>
          <p class="muted">${sub}</p>
        </div>
        <div class="stack" style="margin-top:16px">
          <button class="btn btn--accent" id="again">Una altra</button>
          <button class="btn btn--outline" id="home">Tornar a l'inici</button>
        </div>
      `;
      endbox.querySelector('#again').onclick = screenConfig;
      endbox.querySelector('#home').onclick = goHome;
    }

    screenConfig();
  },
};
