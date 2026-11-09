// ============================================================
// tools/rodola-endureix.mjs — fa més difícils els nivells massa fàcils.
//   node tools/rodola-endureix.mjs [objectiu %]
// Per a cada nivell que es resol amb massa traços a l'atzar, prova d'afegir-hi
// zones ratllades (on no es pot dibuixar) que no toquin la solució pensada però
// tapin les dreceres. Només accepta el canvi si el nivell continua sent just
// (mà tremolosa, dibuixat com en un mòbil, segon traç tard) i baixa el % de
// traços a l'atzar que el resolen. Escriu els canvis als fitxers de nivells.
// ============================================================

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { simulate } from '../rodola-mon.js';
import { LEVELS, BASE } from '../rodola-nivells.js';
import GENERATS from '../rodola-generats.js';

const require = createRequire(import.meta.url);
const Matter = require('../vendor/matter.min.js');
const TARGET = +(process.argv[2] || 3) / 100;
const MAXNEW = 2; // zones noves com a màxim per nivell

let seed = 99;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const R = (a, b) => a + rnd() * (b - a);
const line = (x1, y1, x2, y2, n = 8) => Array.from({ length: n + 1 }, (_, i) => [x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]);
const square = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]].flatMap((p, i, a) => (i ? line(...a[i - 1], ...p, 4).slice(1) : [p]));
function randomStroke() {
  const k = rnd();
  if (k < 0.5) { const x = R(10, 390), y = R(80, 520), len = R(100, 280), a = R(-0.7, 0.7) + (rnd() < 0.5 ? 0 : Math.PI); return line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len); }
  if (k < 0.75) { const x = R(10, 390), y = R(40, 560), len = R(30, 90), a = R(0, Math.PI); return line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, 4); }
  return square(R(10, 350), R(30, 480), R(24, 50));
}
// el mateix joc de traços per a totes les proves d'un nivell (comparació justa)
function sampleSet(n, two) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(two ? [[0, randomStroke()], [60, randomStroke()]] : [randomStroke()]);
  return out;
}
const rate = (lv, set) => set.filter(p => simulate(Matter, lv, p, 900).state === 'won').length / set.length;

const asPhone = (pts, w) => { const k = w / 400, out = []; for (const [x, y] of pts) { const p = [Math.round(x * k) / k, Math.round(y * k) / k], q = out[out.length - 1]; if (!q || Math.hypot((p[0] - q[0]) * k, (p[1] - q[1]) * k) >= 3) out.push(p); } return out; };
const JIT = [[-8, 0], [8, 0], [0, -8], [0, 6], [-6, -6], [6, -6], [-6, 4], [6, 4]];
function stillFair(lv) {
  const sol = lv.solution;
  if (simulate(Matter, lv, sol).state !== 'won') return false;
  if (JIT.filter(([dx, dy]) => simulate(Matter, lv, sol.map(s => s.map(([x, y]) => [x + dx, y + dy]))).state === 'won').length < 6) return false;
  if ([283, 324, 360].some(w => simulate(Matter, lv, sol.map(s => asPhone(s, w))).state !== 'won')) return false;
  if (sol.length > 1 && [60, 90, 180].some(d => simulate(Matter, lv, [[0, sol[0]], [d, sol[1]]], 1500).state !== 'won')) return false;
  return true;
}

// Una zona ratllada que no toqui la solució (ni la mà tremolosa) ni tapi la pilota
function randomZone(lv) {
  const pts = lv.solution.flat();
  for (let k = 0; k < 60; k++) {
    const w = R(50, 190), h = R(50, 220), x = R(0, 400 - w), y = R(0, 600 - h);
    const clear = pts.every(([px, py]) => px < x - 18 || px > x + w + 18 || py < y - 18 || py > y + h + 18);
    // sense trepitjar les zones que ja hi ha (un tauler net s'entén millor)
    const apart = (lv.nodraw || []).every(([zx, zy, zw, zh]) => x + w < zx - 6 || zx + zw < x - 6 || y + h < zy - 6 || zy + zh < y - 6);
    if (clear && apart) return [Math.round(x), Math.round(y), Math.round(w), Math.round(h)];
  }
  return null;
}

const changed = {};
LEVELS.forEach((lv0, i) => {
  const two = lv0.solution.length > 1;
  const set = sampleSet(120, two);
  const r0 = rate(lv0, set);
  if (r0 <= 0.05) return;
  let best = lv0, bestR = r0;
  for (let t = 0; t < 120 && bestR > TARGET; t++) {
    // com a màxim dues zones noves per nivell
    const room = MAXNEW - ((best.nodraw || []).length - (lv0.nodraw || []).length);
    if (room <= 0) break;
    const zones = [];
    const probe = { ...best, nodraw: [...(best.nodraw || [])] };
    for (let z = 0; z < Math.min(room, 1 + Math.floor(rnd() * 2)); z++) { const zz = randomZone(probe); if (zz) { zones.push(zz); probe.nodraw.push(zz); } }
    if (!zones.length) continue;
    const cand = { ...best, nodraw: [...(best.nodraw || []), ...zones] };
    const r = rate(cand, set);
    if (r < bestR - 0.02 && stillFair(cand)) { best = cand; bestR = r; }
  }
  console.log(`${String(i + 1).padStart(2)} ${lv0.name.padEnd(24)} ${(r0 * 100).toFixed(0).padStart(3)} % -> ${(bestR * 100).toFixed(0).padStart(3)} %  (${(best.nodraw || []).length - (lv0.nodraw || []).length} zones noves)`);
  if (best !== lv0) changed[lv0.name] = best.nodraw;
});

// desa: els generats al seu fitxer; els fets a mà, com a llista a part que rodola-nivells.js aplica
const gen = GENERATS.map(l => (changed[l.name] ? { ...l, nodraw: changed[l.name] } : l));
const src = fs.readFileSync(new URL('../rodola-generats.js', import.meta.url), 'utf8');
fs.writeFileSync(new URL('../rodola-generats.js', import.meta.url), src.slice(0, src.indexOf('export default')) + 'export default ' + JSON.stringify(gen).replace(/\},\{"name"/g, '},\n{"name"') + ';\n');
const hand = Object.fromEntries(Object.entries(changed).filter(([n]) => BASE.some(b => b.name === n)));
fs.writeFileSync(new URL('./rodola-endureix-base.json', import.meta.url), JSON.stringify(hand, null, 1));
console.log(`\n${Object.keys(changed).length} nivells endurits (${Object.keys(hand).length} fets a mà: vegeu tools/rodola-endureix-base.json)`);
