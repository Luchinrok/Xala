// ============================================================
// Prova de Fes-la caure: cada nivell es resol amb la solució desada, i no amb
// traços inútils. També comprova la simplificació dels traços.
// Executa:  node rodola.test.mjs   (inclòs a  npm test)
// ============================================================

import { createRequire } from 'node:module';
import { simulate, simplify, buildWorld } from './rodola-mon.js';
import { LEVELS } from './rodola-nivells.js';
import { SIMILAR, levelDistance } from './tools/rodola-semblanca.mjs';

const require = createRequire(import.meta.url);
const Matter = require('./vendor/matter.min.js');

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };
const asPhone = (pts, w) => {
  const k = w / 400, out = [];
  for (const [x, y] of pts) {
    const p = [Math.round(x * k) / k, Math.round(y * k) / k], q = out[out.length - 1];
    if (!q || Math.hypot((p[0] - q[0]) * k, (p[1] - q[1]) * k) >= 3) out.push(p);
  }
  return out;
};
const line = (x1, y1, x2, y2, n = 3) => Array.from({ length: n + 1 }, (_, i) => [x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]);

check(simplify(line(0, 0, 100, 0, 10), 5).length === 2, 'una línia recta queda en un sol tram');
const square = [[0, 0], [40, 0], [40, 40], [0, 40], [0, 0]];
check(simplify(square, 5).length === 5, 'un quadrat tancat no desapareix');

const w = buildWorld(Matter, LEVELS[0]);
check(w.addStroke([[LEVELS[0].ball[0], LEVELS[0].ball[1]]]) === null, 'no es pot dibuixar sobre la pilota');
const [nx, ny, nw, nh] = LEVELS[0].nodraw[0];
check(w.addStroke([[nx + nw / 2, ny + nh / 2]]) === null, 'no es pot dibuixar a les zones ratllades');

LEVELS.forEach((lv, i) => {
  const id = `#${i + 1} ${lv.name}`;
  const r = simulate(Matter, lv, lv.solution);
  check(r.state === 'won', `${id}: la solució guanya (${r.state})`);
  check(r.strokes <= lv.par, `${id}: la solució fa servir ${r.strokes} traços (par ${lv.par})`);
  // dibuixat com ho faria un mòbil (píxels enters, a tres mides de pantalla) també s'ha de resoldre
  for (const w of [283, 324, 360]) {
    const ph = simulate(Matter, lv, lv.solution.map(s => asPhone(s, w)));
    check(ph.state === 'won', `${id}: dibuixat en un tauler de ${w} px (${ph.state})`);
  }
  // dos traços: una persona tarda una estona a fer el segon (1, 1,5 i 3 s; el
  // generador ja demana fins a 5 s per als nivells nous)
  if (lv.solution.length > 1) {
    for (const d of [60, 90, 180]) {
      const late = simulate(Matter, lv, [[0, lv.solution[0]], [d, lv.solution[1]]], 1500);
      check(late.state === 'won', `${id}: amb el segon traç ${d / 60} s més tard (${late.state})`);
    }
  }
  // un gargot en un racó de dalt no ha de resoldre'l
  const dud = simulate(Matter, lv, [line(10, 20, 40, 20)]);
  check(dud.state !== 'won', `${id}: un traç inútil no el resol`);
});

// cap nivell no ha de ser una repetició d'un altre (ni girat en mirall)
for (let i = 0; i < LEVELS.length; i++) {
  for (let j = i + 1; j < LEVELS.length; j++) {
    const d = levelDistance(LEVELS[i], LEVELS[j]);
    check(d >= SIMILAR, `#${i + 1} ${LEVELS[i].name} i #${j + 1} ${LEVELS[j].name} són massa semblants (${Math.round(d)})`);
  }
}

console.log(failures ? `\n✘ FES-LA CAURE: ${failures} errors` : `  ok   ${LEVELS.length} nivells verificats\n\n✔ FES-LA CAURE: TOT BÉ`);
process.exit(failures ? 1 : 0);
