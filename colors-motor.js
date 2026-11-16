// ============================================================
// colors-motor.js — la lògica d'«Uneix colors» (del tipus Flow), sense pantalla.
// Un tauler n × n amb parelles de punts de colors. Cal unir cada parella amb
// un camí (de casella veïna en casella veïna) sense creuar-se i omplint totes
// les caselles.
//
// Nivells amb llavor: es fa un camí que passa per totes les caselles (en
// ziga-zaga), es remena amb «mossegades» (backbite) i es talla en trossos de 3
// caselles o més: cada tros és un color i els seus extrems, els punts. Així
// cada nivell té segur una solució que omple el tauler.
// ============================================================

export const TIERS = [
  { id: 'n5', name: '5×5', n: 5, from: 1, to: 30 },
  { id: 'n6', name: '6×6', n: 6, from: 31, to: 60 },
  { id: 'n7', name: '7×7', n: 7, from: 61, to: 90 },
  { id: 'n8', name: '8×8', n: 8, from: 91, to: 120 },
  { id: 'n9', name: '9×9', n: 9, from: 121, to: 150 },
];
export const tierOf = (lv) => TIERS.find(t => lv >= t.from && lv <= t.to) || TIERS[TIERS.length - 1];

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
export const neigh = (n, i) => {
  const r = Math.floor(i / n), c = i % n, out = [];
  if (r > 0) out.push(i - n); if (r < n - 1) out.push(i + n);
  if (c > 0) out.push(i - 1); if (c < n - 1) out.push(i + 1);
  return out;
};

export function makeLevel(lv) {
  const { n } = tierOf(lv);
  const rnd = rng(lv * 7907 + 11);
  // 1) ziga-zaga que passa per totes les caselles
  let path = [];
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) path.push(r * n + (r % 2 ? n - 1 - k : k));
  // 2) mossegades: un extrem s'uneix a un veí i el tros d'entremig es gira
  for (let it = 0; it < n * n * 60; it++) {
    if (rnd() < 0.5) path.reverse();
    const e = path[0], pos = new Map(path.map((c, i) => [c, i]));
    const opts = neigh(n, e).filter(v => pos.get(v) > 1);
    if (!opts.length) continue;
    const i = pos.get(opts[Math.floor(rnd() * opts.length)]);
    path = path.slice(0, i).reverse().concat(path.slice(i));
  }
  // 3) talla en trossos: tants colors com la mida del tauler, de 3 caselles o més
  const k = n, len = n * n;
  for (let tries = 0; tries < 500; tries++) {
    const cuts = new Set();
    while (cuts.size < k - 1) cuts.add(3 + Math.floor(rnd() * (len - 5)));
    const cs = [0, ...[...cuts].sort((a, b) => a - b), len];
    if (cs.some((c, i) => i && c - cs[i - 1] < 3)) continue;
    const sol = cs.slice(1).map((c, i) => path.slice(cs[i], c));
    // els dos punts d'un color no han de ser veïns (seria massa fàcil)
    if (sol.some(p => neigh(n, p[0]).includes(p[p.length - 1]))) continue;
    const dots = new Map();
    sol.forEach((p, color) => { dots.set(p[0], color); dots.set(p[p.length - 1], color); });
    return { lv, n, k, dots, sol };
  }
  return makeLevel(lv + 100000); // molt rar: una altra llavor
}

// Està resolt? Cada color uneix els seus dos punts i no queda cap casella buida.
export function isSolved(level, paths) {
  const { n, k, dots } = level;
  const used = new Set();
  for (let c = 0; c < k; c++) {
    const p = paths[c];
    if (!p || p.length < 2) return false;
    const ends = [...dots].filter(([, col]) => col === c).map(([i]) => i);
    if (!(ends.includes(p[0]) && ends.includes(p[p.length - 1]) && p[0] !== p[p.length - 1])) return false;
    for (let i = 0; i < p.length; i++) {
      if (used.has(p[i])) return false;
      used.add(p[i]);
      if (i && !neigh(n, p[i - 1]).includes(p[i])) return false;
    }
  }
  return used.size === n * n;
}
