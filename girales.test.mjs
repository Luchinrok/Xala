// ============================================================
// Prova de «Gira-les»: posició inicial, girar, passar, final i la màquina.
// Executa:  node girales.test.mjs   (inclòs a  npm test)
// ============================================================

import { newGame, moves, flips, play, count, winner, aiMove } from './girales-motor.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };
let seed = 9;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

{
  const g = newGame();
  check(count(g.board, 0) === 2 && count(g.board, 1) === 2, 'comença amb dues fitxes de cada');
  check(JSON.stringify(moves(g.board, 0).sort((a, b) => a - b)) === JSON.stringify([19, 26, 37, 44]), 'les quatre jugades d\'obertura');
  const fl = play(g, 19);
  check(fl.length === 1 && fl[0] === 27 && g.board[27] === 0, 'posar gira la fitxa tancada');
  check(g.turn === 1, 'després toca a l\'altre');
  check(flips(g.board, 0, 1).length === 0, 'una casella sense res a tancar no gira res');
}

// partides senceres: s'acaben, el tauler quadra i la màquina guanya qui juga a l'atzar
let aiWins = 0, games = 0;
for (let k = 0; k < 12; k++) {
  const g = newGame();
  let n = 0;
  while (!g.over && n < 200) {
    const ms = moves(g.board, g.turn);
    check(ms.length > 0, 'qui té el torn sempre pot posar');
    const i = g.turn === 1 ? aiMove(g, 'normal', rnd) : ms[Math.floor(rnd() * ms.length)];
    play(g, i); n++;
  }
  check(g.over, `partida ${k}: s'acaba`);
  check(count(g.board, 0) + count(g.board, 1) <= 64, 'mai més de 64 fitxes');
  games++; if (winner(g) === 1) aiWins++;
}
check(aiWins >= games - 1, `la màquina guanya qui juga a l'atzar (${aiWins} de ${games})`);

console.log(failures ? `\n✘ GIRA-LES: ${failures} errors` : '✔ GIRA-LES: TOT BÉ');
process.exit(failures ? 1 : 0);
