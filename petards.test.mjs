// ============================================================
// Prova de «Petards amagats»: el primer toc és segur, les caselles buides
// s'obren en cadena, comptar i guanyar funcionen.
// Executa:  node petards.test.mjs   (inclòs a  npm test)
// ============================================================

import { newGame, reveal, count, chord, toggleFlag, flags } from './petards-motor.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };
let seed = 3;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// el primer toc mai no peta, i no té cap petard al voltant (s'obre una zona)
for (let k = 0; k < 300; k++) {
  const g = newGame(12, 9, 18);
  const r = Math.floor(rnd() * 12), c = Math.floor(rnd() * 9);
  const res = reveal(g, r, c, rnd);
  check(res === 'open' || res === 'win', `primer toc segur (${res})`);
  check(count(g, r, c) === 0, 'el primer toc no té petards al voltant');
  check(g.mine.flat().filter(Boolean).length === 18, 'hi ha tants petards com toca');
}

// destapar-ho tot menys els petards fa guanyar
{
  const g = newGame(8, 8, 10);
  reveal(g, 0, 0, rnd);
  let res = null;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (!g.mine[r][c] && !g.open[r][c]) res = reveal(g, r, c) || res;
  check(g.won && res === 'win', 'destapar totes les caselles sense petard guanya');
}

// trepitjar un petard perd
{
  const g = newGame(8, 8, 10);
  reveal(g, 0, 0, rnd);
  const m = g.mine.flatMap((row, r) => row.map((x, c) => (x ? [r, c] : null))).filter(Boolean)[0];
  check(reveal(g, m[0], m[1]) === 'boom' && g.over && !g.won, 'un petard fa perdre');
}

// banderes: no es destapa una casella amb bandera; el doble toc obre el voltant
{
  const g = newGame(8, 8, 10);
  reveal(g, 4, 4, rnd);
  let done = false;
  for (let r = 0; r < 8 && !done; r++) for (let c = 0; c < 8 && !done; c++) {
    if (!g.open[r][c] || count(g, r, c) === 0) continue;
    const around = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if ((dr || dc) && rr >= 0 && rr < 8 && cc >= 0 && cc < 8) around.push([rr, cc]); }
    around.filter(([rr, cc]) => g.mine[rr][cc]).forEach(([rr, cc]) => toggleFlag(g, rr, cc));
    check(reveal(g, around.find(([rr, cc]) => g.flag[rr][cc])[0], around.find(([rr, cc]) => g.flag[rr][cc])[1]) === null, 'una casella amb bandera no es destapa');
    const res = chord(g, r, c);
    check(res !== 'boom', 'el doble toc amb les banderes bones no peta');
    check(around.every(([rr, cc]) => g.mine[rr][cc] || g.open[rr][cc]), 'el doble toc obre les del voltant');
    check(flags(g) === around.filter(([rr, cc]) => g.mine[rr][cc]).length, 'es compten les banderes');
    done = true;
  }
  check(done, 'hi ha algun número per provar el doble toc');
}

console.log(failures ? `\n✘ PETARDS AMAGATS: ${failures} errors` : '✔ PETARDS AMAGATS: TOT BÉ');
process.exit(failures ? 1 : 0);
