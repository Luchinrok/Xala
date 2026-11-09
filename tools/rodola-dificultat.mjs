// ============================================================
// tools/rodola-dificultat.mjs — quant costa cada nivell de Fes-la caure.
//   node tools/rodola-dificultat.mjs [traços per nivell]
// Prova molts traços a l'atzar (rampes, ratlles i pesos en llocs qualssevol;
// parelles als nivells de dos traços) i compta quants el resolen. Si molts el
// resolen, és fàcil: gairebé qualsevol cosa serveix. Escriu el resultat a
// tools/rodola-dificultat.json i una taula per pantalla.
// ============================================================

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { simulate } from '../rodola-mon.js';
import { LEVELS } from '../rodola-nivells.js';

const require = createRequire(import.meta.url);
const Matter = require('../vendor/matter.min.js');
const N = +(process.argv[2] || 150);

let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const R = (a, b) => a + rnd() * (b - a);
const line = (x1, y1, x2, y2, n = 8) => Array.from({ length: n + 1 }, (_, i) => [x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]);
const square = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]].flatMap((p, i, a) => (i ? line(...a[i - 1], ...p, 4).slice(1) : [p]));

// Un traç a l'atzar com els que faria algú provant: rampes llargues, ratlles curtes o pesos.
function randomStroke() {
  const kind = rnd();
  if (kind < 0.5) { // rampa llarga, poc o molt inclinada
    const x = R(10, 390), y = R(80, 520), len = R(100, 280), a = R(-0.7, 0.7) + (rnd() < 0.5 ? 0 : Math.PI);
    return line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
  }
  if (kind < 0.75) { // ratlla curta (tallar, fer un tap)
    const x = R(10, 390), y = R(40, 560), len = R(30, 90), a = R(0, Math.PI);
    return line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, 4);
  }
  return square(R(10, 350), R(30, 480), R(24, 50)); // un pes
}

const out = [];
LEVELS.forEach((lv, i) => {
  const two = lv.solution.length > 1;
  let wins = 0;
  for (let k = 0; k < N; k++) {
    const plan = two ? [[0, randomStroke()], [60, randomStroke()]] : [randomStroke()];
    if (simulate(Matter, lv, plan, 900).state === 'won') wins++;
  }
  // nota de dificultat: 0 (qualsevol cosa el resol) a 10 (cap traç a l'atzar el resol)
  const rate = wins / N;
  const score = Math.round((1 - Math.min(1, rate * 5)) * 10 * 10) / 10;
  out.push({ n: i + 1, name: lv.name, strokes: lv.solution.length, wins, rate: Math.round(rate * 1000) / 10, score });
  process.stderr.write(`${i + 1}/${LEVELS.length} ${lv.name}: ${wins}/${N}\n`);
});
fs.writeFileSync(new URL('./rodola-dificultat.json', import.meta.url), JSON.stringify(out, null, 1));
console.log('\n  #  nivell                      traços  resolts a l\'atzar   dificultat');
for (const r of out) console.log(`${String(r.n).padStart(3)}  ${r.name.padEnd(26)} ${String(r.strokes).padStart(4)}   ${String(r.wins).padStart(4)}/${N} (${String(r.rate).padStart(4)} %)   ${'█'.repeat(Math.round(r.score))}${'·'.repeat(10 - Math.round(r.score))} ${r.score}`);
