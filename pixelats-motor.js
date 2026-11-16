// ============================================================
// pixelats-motor.js — la lògica de «Pixelats» (del tipus nonograma).
// Cada fila i columna diu quins blocs de caselles pintades té, en ordre
// (p. ex. «3 1»: tres seguides, almenys un buit, una). Pintant les bones surt
// un dibuix. Inclou un resolutor línia a línia: un dibuix només val si es pot
// resoldre sencer amb lògica, sense haver d'endevinar.
// ============================================================

export const parse = (rows) => rows.map(r => [...r].map(c => c === '#'));
export function clues(line) {
  const out = [];
  let n = 0;
  for (const v of line) { if (v) n++; else if (n) { out.push(n); n = 0; } }
  if (n) out.push(n);
  return out.length ? out : [0];
}
export const rowClues = (g) => g.map(clues);
export const colClues = (g) => g[0].map((_, c) => clues(g.map(r => r[c])));

// Totes les maneres de col·locar els blocs en una línia de llargada n que
// respectin el que ja se sap (1 pintada, 0 buida, null no se sap). Retorna,
// per a cada casella, si sempre és pintada, sempre buida o depèn.
function solveLine(known, blocks) {
  const n = known.length;
  if (blocks.length === 1 && blocks[0] === 0) blocks = [];
  const canFill = Array(n).fill(false), canEmpty = Array(n).fill(false);
  let any = false;
  const memo = new Map();
  // f(i, b): es poden col·locar els blocs b.. a partir de la casella i?
  function f(i, b) {
    const key = i * 64 + b;
    if (memo.has(key)) return memo.get(key);
    let ok = false;
    if (b === blocks.length) {
      ok = true;
      for (let k = i; k < n; k++) if (known[k] === 1) { ok = false; break; }
    } else {
      const len = blocks[b];
      for (let s = i; s + len <= n; s++) {
        // entre i i s, tot buit
        let gapOk = true;
        for (let k = i; k < s; k++) if (known[k] === 1) { gapOk = false; break; }
        if (!gapOk) break;
        let blockOk = true;
        for (let k = s; k < s + len; k++) if (known[k] === 0) { blockOk = false; break; }
        if (!blockOk) continue;
        if (s + len < n && known[s + len] === 1) continue;
        const next = s + len + (s + len < n ? 1 : 0);
        if (f(next, b + 1)) ok = true;
      }
    }
    memo.set(key, ok);
    return ok;
  }
  // marca: recorre les col·locacions vàlides
  const seen = new Set();
  function mark(i, b) {
    const key = i * 64 + b;
    if (seen.has(key)) return;
    seen.add(key);
    if (b === blocks.length) { for (let k = i; k < n; k++) canEmpty[k] = true; any = true; return; }
    const len = blocks[b];
    for (let s = i; s + len <= n; s++) {
      let gapOk = true;
      for (let k = i; k < s; k++) if (known[k] === 1) { gapOk = false; break; }
      if (!gapOk) break;
      let blockOk = true;
      for (let k = s; k < s + len; k++) if (known[k] === 0) { blockOk = false; break; }
      if (!blockOk) continue;
      if (s + len < n && known[s + len] === 1) continue;
      const next = s + len + (s + len < n ? 1 : 0);
      if (!f(next, b + 1)) continue;
      for (let k = i; k < s; k++) canEmpty[k] = true;
      for (let k = s; k < s + len; k++) canFill[k] = true;
      if (s + len < n) canEmpty[s + len] = true;
      mark(next, b + 1);
    }
  }
  if (!f(0, 0)) return null;
  mark(0, 0);
  return known.map((v, k) => (canFill[k] && !canEmpty[k] ? 1 : !canFill[k] && canEmpty[k] ? 0 : v));
}

// Resol amb lògica de línies. Retorna la graella (1/0/null) on ha arribat.
export function solve(rc, cc) {
  const R = rc.length, C = cc.length;
  const g = Array.from({ length: R }, () => Array(C).fill(null));
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < R; r++) {
      const res = solveLine(g[r], rc[r]);
      if (!res) return null;
      res.forEach((v, c) => { if (v !== g[r][c]) { g[r][c] = v; changed = true; } });
    }
    for (let c = 0; c < C; c++) {
      const col = g.map(row => row[c]);
      const res = solveLine(col, cc[c]);
      if (!res) return null;
      res.forEach((v, r) => { if (v !== g[r][c]) { g[r][c] = v; changed = true; } });
    }
  }
  return g;
}
// es pot resoldre sencer, i dona exactament el dibuix?
export function uniquelySolvable(pic) {
  const g = solve(rowClues(pic), colClues(pic));
  return !!g && g.every((row, r) => row.every((v, c) => v === (pic[r][c] ? 1 : 0)));
}
// la graella del jugador (true pintada) coincideix amb les pistes?
export const solved = (cells, rc, cc) =>
  cells.every((row, r) => JSON.stringify(clues(row)) === JSON.stringify(rc[r])) &&
  cells[0].every((_, c) => JSON.stringify(clues(cells.map(row => row[c]))) === JSON.stringify(cc[c]));
