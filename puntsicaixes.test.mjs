// ============================================================
// Prova de «Punts i caixes»: tancar una caixa suma i repeteix torn, les
// partides acaben, i la màquina no regala caixes si té una ratlla segura.
// Executa:  node puntsicaixes.test.mjs   (inclòs a  npm test)
// ============================================================

import { newGame, play, edges, over, sides, aiMove } from './puntsicaixes-motor.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };
let seed = 11;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// una caixa: el que tanca el quart costat se la queda i torna a tirar
{
  const g = newGame(2);
  play(g, ['h', 0, 0]); play(g, ['v', 0, 0]); play(g, ['h', 1, 0]);
  const who = g.turn;
  check(play(g, ['v', 0, 1]) === 1, 'el quart costat tanca la caixa');
  check(g.owner[0][0] === who && g.score[who] === 1, 'la caixa és de qui la tanca');
  check(g.turn === who, 'qui tanca una caixa torna a tirar');
  check(play(g, ['v', 0, 1]) === -1, 'no es pot traçar dues vegades la mateixa ratlla');
}

// partides senceres a l'atzar i amb la màquina: s'acaben i les caixes quadren
for (let k = 0; k < 60; k++) {
  const n = 3 + (k % 4), g = newGame(n);
  let moves = 0;
  while (!over(g) && moves < 1000) {
    const e = g.turn === 1 ? aiMove(g, k % 2 ? 'easy' : 'normal', rnd) : edges(g)[Math.floor(rnd() * edges(g).length)];
    check(play(g, e) >= 0, 'la màquina tria una ratlla lliure');
    moves++;
  }
  check(over(g) && g.score[0] + g.score[1] === n * n, `partida ${k}: s'acaba i totes les caixes tenen amo`);
  check(moves === 2 * n * (n + 1), `partida ${k}: s'han traçat totes les ratlles`);
}

// la màquina (normal) no deixa cap caixa amb tres costats si pot evitar-ho
for (let k = 0; k < 200; k++) {
  const g = newGame(4);
  for (let i = 0; i < 6 + (k % 10); i++) { const es = edges(g).filter(e => { const x = JSON.stringify(e); return true; }); play(g, es[Math.floor(rnd() * es.length)]); }
  if (over(g)) continue;
  g.turn = 1;
  const anyClose = edges(g).some(e => { const t = { ...g, h: g.h.map(r => [...r]), v: g.v.map(r => [...r]), owner: g.owner.map(r => [...r]), score: [...g.score] }; return play(t, e) > 0; });
  if (anyClose) continue;
  const safeExists = edges(g).some(e => {
    const t = { ...g, h: g.h.map(r => [...r]), v: g.v.map(r => [...r]), owner: g.owner.map(r => [...r]), score: [...g.score] };
    play(t, e);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (t.owner[r][c] === null && sides(t, r, c) === 3) return false;
    return true;
  });
  if (!safeExists) continue;
  play(g, aiMove(g, 'normal', rnd));
  let gives = false;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (g.owner[r][c] === null && sides(g, r, c) === 3) gives = true;
  check(!gives, `posició ${k}: la màquina no regala cap caixa`);
}

console.log(failures ? `\n✘ PUNTS I CAIXES: ${failures} errors` : '✔ PUNTS I CAIXES: TOT BÉ');
process.exit(failures ? 1 : 0);
