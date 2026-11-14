// ============================================================
// petards-motor.js — la lògica de «Petards amagats» (sense pantalla).
// Un tauler de caselles amb petards amagats. Destapar una casella diu quants
// petards toca (en les 8 del voltant); si no en toca cap, s'obren soles les del
// voltant. El primer toc mai no fa petar res: els petards es posen després,
// lluny d'aquella casella.
// ============================================================

export function newGame(rows, cols, mines) {
  return {
    rows, cols, mines,
    placed: false,
    mine: Array.from({ length: rows }, () => Array(cols).fill(false)),
    open: Array.from({ length: rows }, () => Array(cols).fill(false)),
    flag: Array.from({ length: rows }, () => Array(cols).fill(false)),
    over: false, won: false, boom: null, opened: 0,
  };
}

export const neighbours = (g, r, c) => {
  const out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < g.rows && cc >= 0 && cc < g.cols) out.push([rr, cc]);
  }
  return out;
};

export const count = (g, r, c) => neighbours(g, r, c).filter(([rr, cc]) => g.mine[rr][cc]).length;

// Posa els petards a l'atzar, fora de la casella tocada i de les del voltant.
export function place(g, r, c, rnd = Math.random) {
  const free = [];
  for (let rr = 0; rr < g.rows; rr++) for (let cc = 0; cc < g.cols; cc++) {
    if (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1) continue;
    free.push([rr, cc]);
  }
  for (let k = 0; k < g.mines && free.length; k++) {
    const [rr, cc] = free.splice(Math.floor(rnd() * free.length), 1)[0];
    g.mine[rr][cc] = true;
  }
  g.placed = true;
}

// Destapa una casella. Retorna 'boom', 'win', 'open' o null (no ha fet res).
export function reveal(g, r, c, rnd) {
  if (g.over || g.open[r][c] || g.flag[r][c]) return null;
  if (!g.placed) place(g, r, c, rnd);
  if (g.mine[r][c]) { g.over = true; g.boom = [r, c]; return 'boom'; }
  // obre en cadena les caselles sense cap petard al voltant
  const stack = [[r, c]];
  while (stack.length) {
    const [rr, cc] = stack.pop();
    if (g.open[rr][cc] || g.flag[rr][cc]) continue;
    g.open[rr][cc] = true; g.opened++;
    if (count(g, rr, cc) === 0) for (const n of neighbours(g, rr, cc)) if (!g.open[n[0]][n[1]]) stack.push(n);
  }
  if (g.opened === g.rows * g.cols - g.mines) { g.over = true; g.won = true; return 'win'; }
  return 'open';
}

// Toc sobre un número ja obert amb tantes banderes al voltant com el número:
// destapa la resta de caselles del voltant (si una bandera era errònia, peta).
export function chord(g, r, c) {
  if (g.over || !g.open[r][c]) return null;
  const ns = neighbours(g, r, c);
  if (ns.filter(([rr, cc]) => g.flag[rr][cc]).length !== count(g, r, c)) return null;
  let res = null;
  for (const [rr, cc] of ns) {
    const x = reveal(g, rr, cc);
    if (x === 'boom' || x === 'win') return x;
    if (x) res = x;
  }
  return res;
}

export function toggleFlag(g, r, c) {
  if (g.over || g.open[r][c]) return false;
  g.flag[r][c] = !g.flag[r][c];
  return true;
}

export const flags = (g) => g.flag.flat().filter(Boolean).length;
