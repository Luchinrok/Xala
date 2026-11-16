// ============================================================
// sembra-motor.js — la lògica de «Sembra» (del tipus mancala), sense pantalla.
//
// Cada jugador té 6 forats amb 4 llavors i un graner. Agafes totes les llavors
// d'un forat teu i les vas deixant d'una en una cap a la dreta (al graner teu
// també, al de l'altre no). Si l'última cau al teu graner, tornes a tirar. Si
// cau en un forat teu buit i el de davant té llavors, te les quedes totes.
// Quan un costat es queda sense llavors, s'acaba: cadascú es queda les seves.
// Índexs: 0-5 forats del jugador 0, 6 el seu graner; 7-12 forats del 1, 13 el seu graner.
// ============================================================

export const PITS = 6, SEEDS = 4;
export const store = (p) => (p === 0 ? 6 : 13);
export const pitsOf = (p) => (p === 0 ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12]);
export const opposite = (i) => 12 - i;

export function newGame() {
  const b = Array(14).fill(SEEDS);
  b[6] = b[13] = 0;
  return { b, turn: 0, over: false, last: null };
}
export const moves = (g) => (g.over ? [] : pitsOf(g.turn).filter(i => g.b[i] > 0));

// Sembra des del forat i. Retorna el camí (les caselles on ha caigut cada llavor)
// i, si n'hi ha, la captura.
export function play(g, i) {
  const p = g.turn, skip = store(1 - p);
  let n = g.b[i], k = i;
  g.b[i] = 0;
  const path = [];
  while (n > 0) {
    k = (k + 1) % 14;
    if (k === skip) continue;
    g.b[k]++; n--; path.push(k);
  }
  let capture = null;
  if (pitsOf(p).includes(k) && g.b[k] === 1 && g.b[opposite(k)] > 0) {
    capture = { at: k, from: opposite(k), n: g.b[opposite(k)] + 1 };
    g.b[store(p)] += g.b[opposite(k)] + 1;
    g.b[k] = 0; g.b[opposite(k)] = 0;
  }
  g.last = { from: i, path, capture };
  if (k !== store(p)) g.turn = 1 - p; // l'última al graner propi: torna a tirar
  // un costat buit: s'acaba i cadascú es queda les seves
  if (pitsOf(0).every(j => g.b[j] === 0) || pitsOf(1).every(j => g.b[j] === 0)) {
    for (const q of [0, 1]) for (const j of pitsOf(q)) { g.b[store(q)] += g.b[j]; g.b[j] = 0; }
    g.over = true;
  }
  return g.last;
}
export const clone = (g) => ({ ...g, b: g.b.slice() });
export function winner(g) {
  const a = g.b[6], c = g.b[13];
  return a === c ? null : a > c ? 0 : 1;
}

// ---------- la màquina ----------
function search(g, depth, me, alpha, beta) {
  if (g.over || depth === 0) return (g.b[store(me)] - g.b[store(1 - me)]) * 10 + (g.over ? 0 : pitsOf(me).reduce((s, j) => s + g.b[j], 0) - pitsOf(1 - me).reduce((s, j) => s + g.b[j], 0));
  const maximizing = g.turn === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const i of moves(g)) {
    const c = clone(g); play(c, i);
    const v = search(c, depth - 1, me, alpha, beta);
    if (maximizing) { best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (alpha >= beta) break;
  }
  return best;
}
export const LEVELS = { easy: 1, normal: 4, hard: 9 }; // 7 tardava ~8 ms: es pot pensar més lluny
export function aiMove(g, level = 'normal', rnd = Math.random) {
  const ms = moves(g), me = g.turn;
  if (!ms.length) return null;
  if (level === 'easy' && rnd() < 0.35) return ms[Math.floor(rnd() * ms.length)];
  let best = -Infinity, choice = [];
  for (const i of ms) {
    const c = clone(g); play(c, i);
    const v = search(c, (LEVELS[level] || 4) - 1, me, -Infinity, Infinity);
    if (v > best) { best = v; choice = [i]; } else if (v === best) choice.push(i);
  }
  return choice[Math.floor(rnd() * choice.length)];
}
