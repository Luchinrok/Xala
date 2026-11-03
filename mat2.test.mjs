// ============================================================
// Prova de «Mat en 2»: cada problema de mat2-problemes.js ha de
// tenir mat en 2 forçat amb la solució desada i cap mat en 1.
// Executa:  node mat2.test.mjs   (inclòs a  npm test)
// ============================================================

import { parseFen, toFen, findMove, matingMoves, forcesMateIn2, mirror } from './mat2-motor.js';
import { dailyIndex, PROBLEMES_TOTS } from './mat2.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };

const start = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3';
check(toFen(parseFen(start)) === start, 'FEN anada i tornada');
check(toFen(mirror(mirror(parseFen(start)))) === start, 'girar dues vegades torna a la posició');

let n = 0;
for (const [fen, last, sol] of PROBLEMES_TOTS) {
  const pos = parseFen(fen);
  check(pos.turn === 'w', `#${n + 1} juguen les blanques`);
  check(/^[a-h][1-8][a-h][1-8]/.test(last), `#${n + 1} última jugada vàlida`);
  check(matingMoves(pos).length === 0, `#${n + 1} sense mat en 1`);
  const key = findMove(pos, sol.split(' ')[0]);
  check(key && forcesMateIn2(pos, key), `#${n + 1} la solució fa mat en 2`);
  n++;
}
console.log(`  ok   ${n} problemes verificats`);

const seen = new Set();
for (let d = 0; d < PROBLEMES_TOTS.length; d++) {
  const date = new Date(Date.UTC(2027, 0, 1) + d * 86400000).toISOString().slice(0, 10);
  seen.add(dailyIndex(date));
}
check(seen.size === PROBLEMES_TOTS.length, 'el problema del dia no es repeteix fins acabar la llista');
console.log(failures ? `\n✘ ${failures} errors` : '  ok   problema del dia\n\n✔ MAT EN 2: TOT BÉ');
process.exit(failures ? 1 : 0);
