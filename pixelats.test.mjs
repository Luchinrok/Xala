// ============================================================
// Prova de «Pixelats»: tots els dibuixos són quadrats, es poden resoldre
// només amb lògica (sense endevinar) i es reconeix quan està resolt.
// Executa:  node pixelats.test.mjs   (inclòs a  npm test)
// ============================================================

import { LEVELS } from './pixelats-dibuixos.js';
import { parse, rowClues, colClues, clues, uniquelySolvable, solved } from './pixelats-motor.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };

check(JSON.stringify(clues([true, true, false, true])) === '[2,1]' && JSON.stringify(clues([false, false])) === '[0]', 'pistes d\'una línia');
const sizes = { easy: 5, normal: 10, hard: 15 };
for (const [k, l] of Object.entries(LEVELS)) {
  l.pics.forEach((p, i) => {
    const pic = parse(p.rows);
    check(pic.length === sizes[k] && pic.every(r => r.length === sizes[k]), `${k} ${i} (${p.name}): ${sizes[k]}×${sizes[k]}`);
    check(uniquelySolvable(pic), `${k} ${i} (${p.name}): es resol només amb lògica`);
    check(solved(pic, rowClues(pic), colClues(pic)), `${k} ${i}: el dibuix compleix les seves pistes`);
  });
}
const pic = parse(LEVELS.easy.pics[0].rows);
const wrong = pic.map(r => r.slice()); wrong[0][0] = !wrong[0][0];
check(!solved(wrong, rowClues(pic), colClues(pic)), 'una casella malament no compta com a resolt');

console.log(failures ? `\n✘ PIXELATS: ${failures} errors` : '✔ PIXELATS: TOT BÉ');
process.exit(failures ? 1 : 0);
