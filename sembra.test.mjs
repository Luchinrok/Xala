// ============================================================
// Prova de «Sembra»: sembrar, tornar a tirar, capturar, final i la màquina.
// Executa:  node sembra.test.mjs   (inclòs a  npm test)
// ============================================================

import { newGame, play, moves, winner, aiMove } from './sembra-motor.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };
let seed = 13;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const total = (g) => g.b.reduce((a, b) => a + b, 0);

{
  const g = newGame();
  check(total(g) === 48, '48 llavors en total');
  play(g, 2); // 4 llavors: 3, 4, 5 i el graner
  check(g.b[2] === 0 && g.b[3] === 5 && g.b[6] === 1, 'sembra una a una cap a la dreta');
  check(g.turn === 0, 'l\'última al graner propi: torna a tirar');
  play(g, 5); // 5 llavors: graner i 7, 8, 9, 10
  check(g.turn === 1 && g.b[7] === 5, 'les llavors passen al costat de l\'altre');
}
{
  // el graner de l'altre se salta
  const g = newGame();
  g.b.fill(0); g.b[5] = 10; g.b[0] = 1; g.b[7] = 1; g.turn = 0;
  play(g, 5);
  check(g.b[13] === 0, 'no es deixa cap llavor al graner de l\'altre');
  check(g.b.reduce((a, b) => a + b, 0) === 12, 'no es perd cap llavor');
}
{
  // captura: l'última en un forat propi buit i el de davant ple
  const g = newGame();
  g.b.fill(0); g.b[0] = 1; g.b[1] = 0; g.b[11] = 5; g.b[3] = 1; g.b[8] = 1; g.turn = 0;
  play(g, 0); // cau al forat 1 (buit); el de davant és l'11 (5 llavors)
  check(g.b[6] === 6 && g.b[1] === 0 && g.b[11] === 0, 'captura les del davant i la pròpia');
}

// partides senceres: s'acaben, les llavors quadren i la màquina guanya qui juga a l'atzar
let aiWins = 0, games = 0;
for (let k = 0; k < 16; k++) {
  const g = newGame();
  let n = 0;
  while (!g.over && n < 400) {
    const ms = moves(g);
    check(ms.length > 0, 'qui té el torn pot jugar');
    const i = g.turn === 1 ? aiMove(g, 'normal', rnd) : ms[Math.floor(rnd() * ms.length)];
    play(g, i); n++;
    if (total(g) !== 48) { check(false, 'les llavors sempre sumen 48'); break; }
  }
  check(g.over, `partida ${k}: s'acaba`);
  games++; if (winner(g) === 1) aiWins++;
}
check(aiWins >= games - 1, `la màquina guanya qui juga a l'atzar (${aiWins} de ${games})`);

console.log(failures ? `\n✘ SEMBRA: ${failures} errors` : '✔ SEMBRA: TOT BÉ');
process.exit(failures ? 1 : 0);
