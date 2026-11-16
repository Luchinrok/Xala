// ============================================================
// Prova del Marro: tauler, marros, treure fitxes, fases i la màquina.
// Executa:  node marro.test.mjs   (inclòs a  npm test)
// ============================================================

import { newGame, moves, play, ADJ, MILLS, alive, phaseOf, removable, aiMove, clone } from './marro-motor.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };
let seed = 5;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// el tauler
check(MILLS.length === 16, '16 ratlles de tres');
check(ADJ.every((a, i) => a.every(j => ADJ[j].includes(i))), 'els veïns van en els dos sentits');
check(ADJ.filter(a => a.length === 2).length === 12 && ADJ.filter(a => a.length === 4).length === 4, 'cantonades amb 2 veïns, creus del mig amb 4');

// posar i fer marro: treu una fitxa de l'altre
{
  const g = newGame();
  play(g, { from: null, to: 0, take: null }); play(g, { from: null, to: 8, take: null });
  play(g, { from: null, to: 1, take: null }); play(g, { from: null, to: 9, take: null });
  const ms = moves(g).filter(m => m.to === 2);
  check(ms.length === 2 && ms.every(m => m.take !== null), 'fer marro obliga a triar quina fitxa treure');
  play(g, ms[0]);
  check(alive(g, 1) === 8, 'l\'altre perd una fitxa');
}

// no es pot treure una fitxa d'un marro si n'hi ha de lliures
{
  const g = newGame();
  g.board[0] = g.board[1] = g.board[2] = 1; g.board[20] = 1; g.hand = [0, 0];
  const r = removable(g, 0);
  check(r.length === 1 && r[0] === 20, 'les fitxes d\'un marro estan protegides');
  g.board[20] = null;
  check(removable(g, 0).length === 3, 'si totes són en marros, es pot treure qualsevol');
}

// fases
{
  const g = newGame();
  check(phaseOf(g, 0) === 'place', 'primer es posa');
  g.hand = [0, 0]; g.board[0] = g.board[5] = g.board[10] = g.board[15] = 0;
  check(phaseOf(g, 0) === 'move', 'després es mou');
  check(moves(g).every(m => ADJ[m.from].includes(m.to)), 'movent, només a punts veïns');
  g.board[15] = null;
  check(phaseOf(g, 0) === 'fly', 'amb 3 fitxes, es vola');
  check(moves(g).some(m => !ADJ[m.from].includes(m.to)), 'volant, a qualsevol punt buit');
}

// partides senceres: s'acaben, i la màquina normal guanya la que juga a l'atzar
let aiWins = 0, games = 0;
for (let k = 0; k < 16; k++) {
  const g = newGame();
  let n = 0;
  while (!g.over && n < 400) {
    const ms = moves(g);
    check(ms.length > 0, 'qui ha de moure té jugades (si no, ja s\'hauria acabat)');
    const m = g.turn === 1 ? aiMove(g, k % 2 ? 'normal' : 'easy', rnd) : ms[Math.floor(rnd() * ms.length)];
    play(g, m); n++;
  }
  check(g.over || n === 400, `partida ${k}: s'acaba`);
  if (k % 2 && g.over) { games++; if (g.winner === 1) aiWins++; }
}
check(aiWins >= games - 1, `la màquina (normal) guanya qui juga a l'atzar (${aiWins} de ${games})`);

// la màquina no regala un marro evident: si pot fer marro, el fa
{
  const g = newGame();
  g.board[0] = g.board[1] = 1; g.board[8] = g.board[9] = 0; g.board[22] = 0; g.hand = [3, 3]; g.turn = 1;
  const m = aiMove(g, 'normal', rnd);
  check(m.to === 2 && m.take !== null, 'la màquina fa marro quan pot');
}

console.log(failures ? `\n✘ MARRO: ${failures} errors` : '✔ MARRO: TOT BÉ');
process.exit(failures ? 1 : 0);
