// ============================================================
// tools/rodola-prova.mjs — prova un o més nivells fets a mà de Fes-la caure.
//   node tools/rodola-prova.mjs [nom del nivell]   (sense nom: tots els de rodola-ama.js)
// Per a cada nivell diu: si la solució guanya, quants dels 8 traços desplaçats
// (mà tremolosa) guanyen, si guanya dibuixat com al mòbil, si un gargot el
// resol, i quants de 150 traços a l'atzar el resolen (com menys, més s'ha de pensar).
// ============================================================

import { createRequire } from 'node:module';
import { simulate } from '../rodola-mon.js';
import AMA from '../rodola-ama.js';

const require = createRequire(import.meta.url);
const Matter = require('../vendor/matter.min.js');

const asPhone = (pts, w) => { const k = w / 400, out = []; for (const [x, y] of pts) { const p = [Math.round(x * k) / k, Math.round(y * k) / k], q = out[out.length - 1]; if (!q || Math.hypot((p[0] - q[0]) * k, (p[1] - q[1]) * k) >= 3) out.push(p); } return out; };
const JIT = [[-8, 0], [8, 0], [0, -8], [0, 6], [-6, -6], [6, -6], [-6, 4], [6, 4]];
const line = (x1, y1, x2, y2, n = 8) => Array.from({ length: n + 1 }, (_, i) => [x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]);
const square = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]].flatMap((p, i, a) => (i ? line(...a[i - 1], ...p, 4).slice(1) : [p]));
const DUDS = [line(10, 20, 40, 20, 3), line(370, 30, 395, 30, 3), line(180, 20, 220, 22, 3)];
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const R = (a, b) => a + rnd() * (b - a);
function randomStroke() {
  const k = rnd();
  if (k < 0.5) { const x = R(10, 390), y = R(80, 520), len = R(100, 280), a = R(-0.7, 0.7) + (rnd() < 0.5 ? 0 : Math.PI); return line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len); }
  if (k < 0.75) { const x = R(10, 390), y = R(40, 560), len = R(30, 90), a = R(0, Math.PI); return line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, 4); }
  return square(R(10, 350), R(30, 480), R(24, 50));
}

const only = process.argv[2];
for (const lv of AMA.filter(l => !only || l.name === only)) {
  const sol = lv.solution, two = sol.length > 1;
  const won = simulate(Matter, lv, sol);
  const jit = JIT.filter(([dx, dy]) => simulate(Matter, lv, sol.map(s => s.map(([x, y]) => [x + dx, y + dy]))).state === 'won').length;
  const phones = [283, 324, 360].map(w => simulate(Matter, lv, sol.map(s => asPhone(s, w))).state === 'won' ? 'ok' : 'NO').join('/');
  const late = two ? [60, 90, 180].map(d => simulate(Matter, lv, [[0, sol[0]], [d, sol[1]]], 1500).state === 'won' ? 'ok' : 'NO').join('/') : '-';
  const dud = DUDS.some(d => simulate(Matter, lv, [d]).state === 'won') ? 'SÍ' : 'no';
  seed = 7;
  let rand = 0;
  for (let k = 0; k < 150; k++) if (simulate(Matter, lv, two ? [[0, randomStroke()], [60, randomStroke()]] : [randomStroke()], 900).state === 'won') rand++;
  console.log(`${lv.name.padEnd(18)} solució:${won.state.padEnd(7)} (${won.frames} passos)  tremolosa:${jit}/8  mòbil:${phones}  tard:${late}  gargot:${dud}  atzar:${rand}/150`);
}
