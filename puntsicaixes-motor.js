// ============================================================
// puntsicaixes-motor.js — la lògica de «Punts i caixes» (sense pantalla).
// Una quadrícula de n × n caixes. Per torns es traça una ratlla entre dos
// punts veïns; qui tanca el quart costat d'una caixa se la queda i torna a
// tirar. Guanya qui té més caixes. Inclou la jugada de la màquina.
// ============================================================

// Ratlles: 'h' (horitzontals, n+1 files × n) i 'v' (verticals, n files × n+1).
export function newGame(n) {
  return {
    n, turn: 0, score: [0, 0], last: null,
    h: Array.from({ length: n + 1 }, () => Array(n).fill(false)),
    v: Array.from({ length: n }, () => Array(n + 1).fill(false)),
    owner: Array.from({ length: n }, () => Array(n).fill(null)),
  };
}

export const edges = (g) => {
  const out = [];
  for (let r = 0; r <= g.n; r++) for (let c = 0; c < g.n; c++) if (!g.h[r][c]) out.push(['h', r, c]);
  for (let r = 0; r < g.n; r++) for (let c = 0; c <= g.n; c++) if (!g.v[r][c]) out.push(['v', r, c]);
  return out;
};
export const over = (g) => g.score[0] + g.score[1] === g.n * g.n;

// costats ja traçats d'una caixa
export const sides = (g, r, c) => g.h[r][c] + g.h[r + 1][c] + g.v[r][c] + g.v[r][c + 1];
// caixes que toca una ratlla
function boxesOf(g, [t, r, c]) {
  const out = [];
  if (t === 'h') { if (r > 0) out.push([r - 1, c]); if (r < g.n) out.push([r, c]); }
  else { if (c > 0) out.push([r, c - 1]); if (c < g.n) out.push([r, c]); }
  return out;
}

// Traça una ratlla. Retorna quantes caixes ha tancat (0: passa el torn), o -1 si no es pot.
export function play(g, e) {
  const [t, r, c] = e;
  const arr = t === 'h' ? g.h : g.v;
  if (!arr[r] || arr[r][c] !== false) return -1;
  arr[r][c] = true;
  g.last = e;
  let closed = 0;
  for (const [br, bc] of boxesOf(g, e)) {
    if (sides(g, br, bc) === 4 && g.owner[br][bc] === null) { g.owner[br][bc] = g.turn; closed++; }
  }
  g.score[g.turn] += closed;
  if (!closed) g.turn = 1 - g.turn;
  return closed;
}

const clone = (g) => ({ ...g, score: [...g.score], h: g.h.map(r => [...r]), v: g.v.map(r => [...r]), owner: g.owner.map(r => [...r]) });
// quantes caixes es podria endur el contrari seguides si traço aquesta ratlla
function giveaway(g, e) {
  const x = clone(g);
  play(x, e);
  const who = x.turn;
  let n = 0;
  for (let guard = 0; guard < 200; guard++) {
    if (x.turn !== who || over(x)) break;
    const take = edges(x).find(f => boxesOf(x, f).some(([r, c]) => sides(x, r, c) === 3));
    if (!take) break;
    n += play(x, take);
  }
  return n;
}

// Jugada de la màquina. level: 'easy' (es despista) o 'normal'.
export function aiMove(g, level = 'normal', rnd = Math.random) {
  const all = edges(g);
  const closes = all.filter(e => boxesOf(g, e).some(([r, c]) => sides(g, r, c) === 3));
  if (closes.length && (level !== 'easy' || rnd() < 0.7)) return closes[Math.floor(rnd() * closes.length)];
  const safe = all.filter(e => boxesOf(g, e).every(([r, c]) => sides(g, r, c) < 2));
  if (safe.length && (level !== 'easy' || rnd() < 0.6)) return safe[Math.floor(rnd() * safe.length)];
  if (level === 'easy') return all[Math.floor(rnd() * all.length)];
  // no queda cap ratlla segura: la que regala menys caixes
  let best = null, bestN = Infinity;
  for (const e of all) { const k = giveaway(g, e); if (k < bestN) { bestN = k; best = e; } }
  return best;
}
