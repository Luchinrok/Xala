// ============================================================
// marro-motor.js — la lògica del Marro (nou fitxes) sense pantalla.
//
// Tauler de 24 punts en tres quadrats concèntrics. Cada jugador té 9 fitxes.
// 1) Posar: per torns, es posen les fitxes als punts buits.
// 2) Moure: quan ja no en queden per posar, es mou una fitxa a un punt veí buit.
// 3) Volar: qui només té 3 fitxes pot moure-les a qualsevol punt buit.
// Tres fitxes en ratlla (un «marro») permeten treure una fitxa de l'altre que
// no sigui en un marro (si totes ho són, qualsevol). Perd qui es queda amb
// menys de 3 fitxes o no pot moure. 60 moviments seguits sense treure'n cap: taules.
// ============================================================

// punts: [columna, fila] en una quadrícula de 7 × 7 (per dibuixar)
export const POS = [
  [0, 0], [3, 0], [6, 0], [6, 3], [6, 6], [3, 6], [0, 6], [0, 3],
  [1, 1], [3, 1], [5, 1], [5, 3], [5, 5], [3, 5], [1, 5], [1, 3],
  [2, 2], [3, 2], [4, 2], [4, 3], [4, 4], [3, 4], [2, 4], [2, 3],
];
export const ADJ = Array.from({ length: 24 }, () => []);
const link = (a, b) => { ADJ[a].push(b); ADJ[b].push(a); };
for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) link(r * 8 + i, r * 8 + (i + 1) % 8);
for (const k of [1, 3, 5, 7]) { link(k, k + 8); link(k + 8, k + 16); }
export const MILLS = [];
for (let r = 0; r < 3; r++) for (const [a, b, c] of [[0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0]]) MILLS.push([r * 8 + a, r * 8 + b, r * 8 + c]);
for (const k of [1, 3, 5, 7]) MILLS.push([k, k + 8, k + 16]);
const MILLS_OF = Array.from({ length: 24 }, (_, p) => MILLS.filter(m => m.includes(p)));

export function newGame() {
  return { board: Array(24).fill(null), hand: [9, 9], turn: 0, quiet: 0, last: null, over: false, winner: null };
}
export const count = (g, p) => g.board.filter(x => x === p).length;
export const alive = (g, p) => count(g, p) + g.hand[p];
export const phaseOf = (g, p) => (g.hand[p] > 0 ? 'place' : count(g, p) === 3 ? 'fly' : 'move');
export const inMill = (board, pt) => MILLS_OF[pt].some(m => m.every(q => board[q] === board[pt]));
const makesMill = (board, pt, p) => MILLS_OF[pt].some(m => m.every(q => (q === pt ? p : board[q]) === p));

// fitxes de l'altre que es poden treure
export function removable(g, p) {
  const o = 1 - p, theirs = [];
  for (let i = 0; i < 24; i++) if (g.board[i] === o) theirs.push(i);
  const free = theirs.filter(i => !inMill(g.board, i));
  return free.length ? free : theirs;
}

// Jugades legals del jugador que toca: { from (null si posa), to, take (o null) }
export function moves(g) {
  if (g.over) return [];
  const p = g.turn, ph = phaseOf(g, p), out = [];
  const add = (from, to) => {
    const b = g.board.slice();
    if (from !== null) b[from] = null;
    if (makesMill(b, to, p)) {
      b[to] = p;
      const tmp = { ...g, board: b };
      for (const t of removable(tmp, p)) out.push({ from, to, take: t });
    } else out.push({ from, to, take: null });
  };
  if (ph === 'place') { for (let i = 0; i < 24; i++) if (g.board[i] === null) add(null, i); return out; }
  for (let f = 0; f < 24; f++) {
    if (g.board[f] !== p) continue;
    const targets = ph === 'fly' ? [...Array(24).keys()].filter(i => g.board[i] === null) : ADJ[f].filter(i => g.board[i] === null);
    for (const t of targets) add(f, t);
  }
  return out;
}

// Aplica una jugada (la dona per bona) i mira si s'ha acabat.
export function play(g, m) {
  const p = g.turn;
  if (m.from === null) g.hand[p]--; else g.board[m.from] = null;
  g.board[m.to] = p;
  if (m.take !== null) { g.board[m.take] = null; g.quiet = 0; } else if (g.hand[0] + g.hand[1] === 0) g.quiet++;
  g.last = m;
  g.turn = 1 - p;
  const o = g.turn;
  if (alive(g, o) < 3) { g.over = true; g.winner = p; }
  else if (!moves(g).length) { g.over = true; g.winner = p; }
  else if (g.quiet >= 60) { g.over = true; g.winner = null; }
  return g;
}
export const clone = (g) => ({ ...g, board: g.board.slice(), hand: g.hand.slice() });

// ---------- la màquina ----------
function evaluate(g, me) {
  if (g.over) return g.winner === me ? 10000 : g.winner === null ? 0 : -10000;
  const o = 1 - me;
  let s = (alive(g, me) - alive(g, o)) * 100;
  // marros fets i a punt de fer (dues fitxes i el tercer punt buit)
  for (const m of MILLS) {
    const v = m.map(q => g.board[q]);
    const mine = v.filter(x => x === me).length, theirs = v.filter(x => x === o).length, empty = v.filter(x => x === null).length;
    if (mine === 3) s += 12; else if (theirs === 3) s -= 12;
    if (mine === 2 && empty === 1) s += 8; else if (theirs === 2 && empty === 1) s -= 9;
  }
  // mobilitat (en la fase de moure)
  if (g.hand[me] === 0 && phaseOf(g, me) === 'move') {
    let mob = 0, omob = 0;
    for (let i = 0; i < 24; i++) {
      if (g.board[i] === me) mob += ADJ[i].filter(j => g.board[j] === null).length;
      else if (g.board[i] === o) omob += ADJ[i].filter(j => g.board[j] === null).length;
    }
    s += (mob - omob) * 2;
  }
  return s;
}
function negamax(g, depth, alpha, beta, me) {
  if (depth === 0 || g.over) return (g.turn === me ? 1 : -1) * evaluate(g, me);
  let best = -Infinity;
  const ms = moves(g);
  ms.sort((a, b) => (b.take !== null) - (a.take !== null)); // primer les que treuen fitxa
  for (const m of ms) {
    const v = -negamax(play(clone(g), m), depth - 1, -beta, -alpha, me);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}
export const LEVELS = { easy: 1, normal: 3, hard: 4 };
export function aiMove(g, level = 'normal', rnd = Math.random) {
  const ms = moves(g), me = g.turn;
  if (!ms.length) return null;
  if (level === 'easy' && rnd() < 0.35) return ms[Math.floor(rnd() * ms.length)];
  const depth = LEVELS[level] || 3;
  let best = -Infinity, choice = [];
  for (const m of ms) {
    // el valor del fill és des del punt de vista de qui hi mou (l'altre): canviat de signe
    const val = -negamax(play(clone(g), m), depth - 1, -Infinity, Infinity, me);
    if (val > best + 1e-9) { best = val; choice = [m]; } else if (Math.abs(val - best) < 1e-9) choice.push(m);
  }
  return choice[Math.floor(rnd() * choice.length)];
}
