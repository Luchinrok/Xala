// ============================================================
// xifra-motor.js — càlculs de La Xifra, sense res de pantalla.
// Genera un repte a partir d'un número (el mateix a tots els mòbils) i troba
// la manera d'arribar a l'objectiu amb menys fitxes.
// Regles dels càlculs: sempre nombres enters positius, i les divisions exactes.
// ============================================================

const CAP = 5000; // no cal passar per números més grans

export const LEVELS = {
  easy: { name: 'Fàcil', min: 10, max: 50, tilesMin: 2, tilesMax: 3, big: 0 },
  normal: { name: 'Mitjà', min: 30, max: 200, tilesMin: 3, tilesMax: 4, big: 2 },
  hard: { name: 'Difícil', min: 150, max: 999, tilesMin: 4, tilesMax: 5, big: 2 },
};
const BIG = [11, 12, 15, 20, 25];

// Generador pseudoaleatori amb llavor: enters purs, igual a tots els mòbils.
function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Totes les operacions possibles entre dos valors (a l'ordre que surti enter positiu).
function combine(a, b) {
  const out = [[a + b, a, '+', b], [a * b, a, '×', b]];
  if (a > b) out.push([a - b, a, '−', b]);
  else if (b > a) out.push([b - a, b, '−', a]);
  if (b > 1 && a % b === 0) out.push([a / b, a, '÷', b]);
  if (a > 1 && b % a === 0 && a !== b) out.push([b / a, b, '÷', a]);
  return out;
}

// table[màscara de fitxes] = Map(valor -> com s'hi arriba). La fitxa `i` és el bit i.
export function buildTable(tiles) {
  const size = 1 << tiles.length;
  const table = new Array(size);
  tiles.forEach((v, i) => { table[1 << i] = new Map([[v, null]]); });
  for (let mask = 1; mask < size; mask++) {
    if (table[mask]) continue;
    const m = new Map();
    for (let sub = (mask - 1) & mask; sub > 0; sub = (sub - 1) & mask) {
      const other = mask ^ sub;
      if (sub < other) continue; // cada parella, una sola vegada
      for (const a of table[sub].keys()) {
        for (const b of table[other].keys()) {
          for (const [v, x, op, y] of combine(a, b)) {
            if (v > CAP || m.has(v)) continue;
            m.set(v, { x, op, y, xMask: x === a ? sub : other, yMask: y === a && x !== a ? sub : (x === a ? other : sub) });
          }
        }
      }
    }
    table[mask] = m;
  }
  return table;
}

const bits = (m) => { let c = 0; for (let x = m; x; x &= x - 1) c++; return c; };

// valor -> mínim de fitxes per arribar-hi.
function minTilesMap(table) {
  const best = new Map();
  for (let mask = 1; mask < table.length; mask++) {
    const c = bits(mask);
    for (const v of table[mask].keys()) if (!best.has(v) || c < best.get(v)) best.set(v, c);
  }
  return best;
}

// Passos de la solució més curta: [{ a, op, b, r }, ...]
export function solve(tiles, target) {
  const table = buildTable(tiles);
  let bestMask = 0;
  for (let mask = 1; mask < table.length; mask++) {
    if (table[mask].has(target) && (!bestMask || bits(mask) < bits(bestMask))) bestMask = mask;
  }
  if (!bestMask) return null;
  const steps = [];
  (function walk(mask, v) {
    const how = table[mask].get(v);
    if (!how) return;
    walk(how.xMask, how.x);
    walk(how.yMask, how.y);
    steps.push({ a: how.x, op: how.op, b: how.y, r: v });
  })(bestMask, target);
  return { steps, tiles: bits(bestMask) };
}

// El repte número `n` d'un nivell: { tiles, target, minTiles }.
export function makePuzzle(level, n) {
  const cfg = LEVELS[level];
  const salt = { easy: 11, normal: 503, hard: 7919 }[level];
  const rnd = rngFrom(Math.imul(n + 1, 2654435761) ^ salt);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  for (let attempt = 0; attempt < 400; attempt++) {
    const tiles = [];
    for (let i = 0; i < 6 - cfg.big; i++) tiles.push(1 + Math.floor(rnd() * 9));
    for (let i = 0; i < cfg.big; i++) tiles.push(pick(BIG));
    // sense massa fitxes repetides
    if (new Set(tiles).size < 4) continue;
    const best = minTilesMap(buildTable(tiles));
    const cands = [...best.entries()]
      .filter(([v, c]) => v >= cfg.min && v <= cfg.max && c >= cfg.tilesMin && c <= cfg.tilesMax && !tiles.includes(v))
      .sort((a, b) => a[0] - b[0]);
    if (!cands.length) continue;
    // prefereix els que demanen més fitxes dins del nivell
    const top = Math.max(...cands.map(c => c[1]));
    const pool = cands.filter(c => c[1] === top);
    const [target, minTiles] = pick(pool);
    return { tiles, target, minTiles };
  }
  throw new Error('No s\'ha pogut crear el repte ' + n);
}

// Quantes estrelles val una solució.
export function starsFor(used, minTiles) {
  if (used <= minTiles) return 3;
  return used === minTiles + 1 ? 2 : 1;
}

// Dia en número, per al repte del dia.
export function dayNumber(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
