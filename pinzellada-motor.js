// ============================================================
// pinzellada-motor.js — la lògica de «Pinzellada» (sense pantalla).
// La bola llisca en una direcció fins que topa amb una paret, i pinta les
// caselles per on passa. Cal pintar-les totes.
//
// Els nivells es fan amb una llavor (iguals a tots els mòbils): es parteix
// d'un tauler tot de paret i es fa lliscar la bola a l'atzar, obrint només
// les caselles per on passa. La casella on s'atura cada lliscada queda
// marcada perquè la següent no la tapi: així el nivell sempre té solució
// (la mateixa seqüència de lliscades).
// ============================================================

export const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Quatre dificultats, cadascuna amb els seus nivells (vegeu pinzellada.js)
export const TIERS = [
  { id: 'facil', name: 'Fàcil', from: 1, to: 30 },
  { id: 'mitja', name: 'Mitjà', from: 31, to: 80 },
  { id: 'dificil', name: 'Difícil', from: 81, to: 150 },
  { id: 'expert', name: 'Expert', from: 151, to: 300 },
];
export const tierOf = (n) => TIERS.find(t => n >= t.from && n <= t.to) || TIERS[TIERS.length - 1];

// mida del tauler i nombre de lliscades segons el número de nivell
export function sizeFor(n) {
  if (n <= 30) return { rows: 7, cols: 7, moves: 8 + Math.floor(n / 6) };
  if (n <= 80) return { rows: n > 55 ? 11 : 9, cols: 9, moves: 14 + Math.floor((n - 30) / 5) };
  if (n <= 150) return { rows: n > 115 ? 13 : 11, cols: 11, moves: 25 + Math.floor((n - 80) / 5) };
  return { rows: 15, cols: n > 220 ? 13 : 11, moves: Math.min(70, 40 + Math.floor((n - 150) / 5)) };
}

// Com de fàcil és: de 40 partides d'algú que llisca a l'atzar (sense tornar
// enrere tot just), quantes acaben pintant-ho tot. Com menys, més trampes té.
export function luck(level, runs = 40) {
  const rnd = rng(level.n * 31 + 5);
  const names = Object.keys(DIRS), back = { up: 'down', down: 'up', left: 'right', right: 'left' };
  let ok = 0;
  for (let k = 0; k < runs; k++) {
    const g = newGame(level);
    let lastD = null;
    for (let m = 0; m < level.solution.length * 4 && !won(g); m++) {
      const opts = names.filter(d => d !== (lastD && back[lastD]) && slide(level, g.pos[0], g.pos[1], d).length);
      const pickFrom = opts.length ? opts : names.filter(d => slide(level, g.pos[0], g.pos[1], d).length);
      if (!pickFrom.length) break;
      lastD = pickFrom[Math.floor(rnd() * pickFrom.length)];
      move(g, lastD);
    }
    if (won(g)) ok++;
  }
  return ok / runs;
}

// Les dificultats altes proven uns quants laberints i es queden el que té més trampes.
export function makeLevel(n) {
  const tries = n > 150 ? 8 : n > 80 ? 5 : n > 30 ? 2 : 1;
  let best = null, bestLuck = 2;
  for (let k = 0; k < tries; k++) {
    const lv = makeOne(n, k * 1000);
    const l = tries > 1 ? luck(lv) : 0;
    if (l < bestLuck) { best = lv; bestLuck = l; }
  }
  return best;
}

function makeOne(n, salt) {
  const { rows, cols, moves } = sizeFor(n);
  for (let attempt = salt; attempt < salt + 200; attempt++) {
    const rnd = rng(n * 7919 + attempt);
    const open = Array.from({ length: rows }, () => Array(cols).fill(false));
    const stop = Array.from({ length: rows }, () => Array(cols).fill(false)); // han de quedar paret
    // la vora sempre és paret
    const inside = (r, c) => r > 0 && c > 0 && r < rows - 1 && c < cols - 1;
    let r = 1 + Math.floor(rnd() * (rows - 2)), c = 1 + Math.floor(rnd() * (cols - 2));
    const start = [r, c];
    open[r][c] = true;
    const path = [];
    let last = null;
    for (let k = 0, tries = 0; k < moves && tries < moves * 30; tries++) {
      const names = Object.keys(DIRS);
      const d = names[Math.floor(rnd() * 4)];
      if (d === last) continue;
      const [dr, dc] = DIRS[d];
      const len = 1 + Math.floor(rnd() * Math.max(rows, cols) * 0.6);
      // camí: totes les caselles han de poder ser obertes (dins i no marcades com a parada)
      let ok = true, rr = r, cc = c;
      for (let i = 0; i < len; i++) {
        rr += dr; cc += dc;
        if (!inside(rr, cc) || stop[rr][cc]) { ok = false; break; }
      }
      if (!ok) continue;
      // després del final hi ha d'haver paret (o la vora), i no pot ser una casella oberta
      const br = rr + dr, bc = cc + dc;
      if (inside(br, bc) && open[br][bc]) continue;
      for (let i = 1; i <= len; i++) open[r + dr * i][c + dc * i] = true;
      if (inside(br, bc)) stop[br][bc] = true;
      r = rr; c = cc; last = d;
      path.push(d);
      k++;
    }
    const level = { n, rows, cols, open, start, solution: path };
    const total = open.flat().filter(Boolean).length;
    if (path.length >= Math.min(6, moves) && total >= rows * cols * 0.3 && solves(level, path)) return level;
  }
  throw new Error('no s\'ha pogut fer el nivell ' + n);
}

// Llisca des de (r, c): retorna les caselles per on passa (sense la de sortida).
export function slide(level, r, c, d) {
  const [dr, dc] = DIRS[d];
  const cells = [];
  while (level.open[r + dr] && level.open[r + dr][c + dc]) { r += dr; c += dc; cells.push([r, c]); }
  return cells;
}

export function newGame(level) {
  const painted = level.open.map(row => row.map(() => false));
  painted[level.start[0]][level.start[1]] = true;
  return { level, pos: [...level.start], painted, moves: 0, left: level.open.flat().filter(Boolean).length - 1 };
}

// Fa una lliscada. Retorna les caselles recorregudes (buit si no es mou).
export function move(g, d) {
  const cells = slide(g.level, g.pos[0], g.pos[1], d);
  if (!cells.length) return cells;
  for (const [r, c] of cells) if (!g.painted[r][c]) { g.painted[r][c] = true; g.left--; }
  g.pos = cells[cells.length - 1];
  g.moves++;
  return cells;
}

export const won = (g) => g.left === 0;

export function solves(level, path) {
  const g = newGame(level);
  for (const d of path) move(g, d);
  return won(g);
}
