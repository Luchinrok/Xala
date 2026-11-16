// ============================================================
// girales-motor.js — la lògica de «Gira-les» (del tipus Reversi), sense pantalla.
// Tauler de 8 × 8. Es posa una fitxa de manera que tanqui en ratlla (recta o
// diagonal) fitxes de l'altre entre la nova i una de pròpia: totes les tancades
// es giren. Qui no pot posar, passa. S'acaba quan cap dels dos pot posar.
// Guanya qui té més fitxes.
// ============================================================

export const N = 8;
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

export function newGame() {
  const b = Array(N * N).fill(null);
  b[27] = b[36] = 1; b[28] = b[35] = 0; // el negre (0) comença
  return { board: b, turn: 0, over: false, last: null, passed: false };
}

// fitxes que es girarien posant a la casella i
export function flips(board, i, p) {
  if (board[i] !== null) return [];
  const r0 = Math.floor(i / N), c0 = i % N, out = [];
  for (const [dr, dc] of DIRS) {
    const line = [];
    let r = r0 + dr, c = c0 + dc;
    while (r >= 0 && r < N && c >= 0 && c < N && board[r * N + c] === 1 - p) { line.push(r * N + c); r += dr; c += dc; }
    if (line.length && r >= 0 && r < N && c >= 0 && c < N && board[r * N + c] === p) out.push(...line);
  }
  return out;
}
export function moves(board, p) {
  const out = [];
  for (let i = 0; i < N * N; i++) if (board[i] === null && flips(board, i, p).length) out.push(i);
  return out;
}
export const count = (board, p) => board.filter(x => x === p).length;

// Posa (i: casella, o null per passar). Retorna les fitxes girades.
export function play(g, i) {
  const p = g.turn;
  let fl = [];
  if (i !== null) {
    fl = flips(g.board, i, p);
    g.board[i] = p;
    for (const k of fl) g.board[k] = p;
  }
  g.last = i;
  g.turn = 1 - p;
  if (!moves(g.board, g.turn).length) {
    if (!moves(g.board, p).length) g.over = true;      // ningú no pot: fi
    else { g.turn = p; g.passed = true; return fl; }   // l'altre passa
  }
  g.passed = false;
  return fl;
}
export function winner(g) {
  const a = count(g.board, 0), b = count(g.board, 1);
  return a === b ? null : a > b ? 0 : 1;
}

// ---------- la màquina ----------
// pes de cada casella: les cantonades valen molt; les del costat de la cantonada, poc
const W = [
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -40, -2, -2, -2, -2, -40, -20,
  10, -2, 1, 1, 1, 1, -2, 10,
  5, -2, 1, 0, 0, 1, -2, 5,
  5, -2, 1, 0, 0, 1, -2, 5,
  10, -2, 1, 1, 1, 1, -2, 10,
  -20, -40, -2, -2, -2, -2, -40, -20,
  100, -20, 10, 5, 5, 10, -20, 100,
];
function evaluate(board, me) {
  const o = 1 - me;
  let s = 0;
  for (let i = 0; i < N * N; i++) if (board[i] === me) s += W[i]; else if (board[i] === o) s -= W[i];
  const empty = board.filter(x => x === null).length;
  if (empty < 12) s += (count(board, me) - count(board, o)) * 6; // al final, compten les fitxes
  s += (moves(board, me).length - moves(board, o).length) * 4;   // mobilitat
  return s;
}
function search(board, turn, me, depth, alpha, beta) {
  const ms = moves(board, turn);
  if (depth === 0) return evaluate(board, me);
  if (!ms.length) {
    if (!moves(board, 1 - turn).length) { const d = count(board, me) - count(board, 1 - me); return d > 0 ? 10000 + d : d < 0 ? -10000 + d : 0; }
    return search(board, 1 - turn, me, depth - 1, alpha, beta);
  }
  if (turn === me) {
    let best = -Infinity;
    for (const i of ms) {
      const b = board.slice(); b[i] = turn; for (const k of flips(board, i, turn)) b[k] = turn;
      best = Math.max(best, search(b, 1 - turn, me, depth - 1, alpha, beta));
      alpha = Math.max(alpha, best); if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const i of ms) {
    const b = board.slice(); b[i] = turn; for (const k of flips(board, i, turn)) b[k] = turn;
    best = Math.min(best, search(b, 1 - turn, me, depth - 1, alpha, beta));
    beta = Math.min(beta, best); if (alpha >= beta) break;
  }
  return best;
}
export const LEVELS = { easy: 1, normal: 3, hard: 4 }; // 5 tardava ~0,5 s a l'ordinador (massa al mòbil)
export function aiMove(g, level = 'normal', rnd = Math.random) {
  const me = g.turn, ms = moves(g.board, me);
  if (!ms.length) return null;
  if (level === 'easy' && rnd() < 0.3) return ms[Math.floor(rnd() * ms.length)];
  const depth = LEVELS[level] || 3;
  let best = -Infinity, choice = [];
  for (const i of ms) {
    const b = g.board.slice(); b[i] = me; for (const k of flips(g.board, i, me)) b[k] = me;
    const v = search(b, 1 - me, me, depth - 1, -Infinity, Infinity);
    if (v > best) { best = v; choice = [i]; } else if (v === best) choice.push(i);
  }
  return choice[Math.floor(rnd() * choice.length)];
}
