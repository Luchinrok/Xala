// ============================================================
// Prova de «Pinzellada»: els 300 primers nivells es poden fer i sempre surten
// iguals; la bola llisca fins a la paret.
// Executa:  node pinzellada.test.mjs   (inclòs a  npm test)
// ============================================================

import { makeLevel, newGame, move, won, solves } from './pinzellada-motor.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };

for (let n = 1; n <= 300; n++) {
  const lv = makeLevel(n);
  check(solves(lv, lv.solution), `nivell ${n}: la solució el pinta tot`);
  check(lv.solution.length >= 6, `nivell ${n}: almenys 6 lliscades`);
  const again = makeLevel(n);
  check(JSON.stringify(again.open) === JSON.stringify(lv.open), `nivell ${n}: surt igual a tots els mòbils`);
  check(lv.open.every((row, r) => row.every((o, c) => !o || (r > 0 && c > 0 && r < lv.rows - 1 && c < lv.cols - 1))), `nivell ${n}: la vora és paret`);
}

// la bola no s'atura a mig passadís
{
  const lv = makeLevel(5), g = newGame(lv);
  const d = lv.solution[0];
  const cells = move(g, d);
  const [r, c] = g.pos, dr = { up: -1, down: 1, left: 0, right: 0 }[d], dc = { up: 0, down: 0, left: -1, right: 1 }[d];
  check(cells.length > 0 && !(lv.open[r + dr] && lv.open[r + dr][c + dc]), 'la bola llisca fins a la paret');
  check(!won(g), 'una sola lliscada no ho pinta tot');
}

console.log(failures ? `\n✘ PINZELLADA: ${failures} errors` : '✔ PINZELLADA: TOT BÉ');
process.exit(failures ? 1 : 0);
