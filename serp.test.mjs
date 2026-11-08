// ============================================================
// Prova de La Serp: moviment, menjar, xocs i girs.
// Executa:  node serp.test.mjs   (inclòs a  npm test)
// ============================================================

import { newGame, step, canTurn, placeFood } from './serp-motor.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };
const at = (g, i) => g.snake[i].join(',');

let g = newGame(15, () => 0);
check(g.snake.length === 3 && at(g, 0) === '7,7' && g.dir === 'right', 'comença al mig mirant a la dreta');
check(g.food && !g.snake.some(s => s.join() === g.food.join()), 'el menjar no cau sobre la serp');

g.food = [0, 0];
check(step(g) === 'move' && at(g, 0) === '7,8' && g.snake.length === 3, 'avança sense créixer');

g.food = [7, 9];
check(step(g) === 'eat' && g.snake.length === 4 && g.eaten === 1, 'menja i creix');
check(g.food && !g.snake.some(s => s.join() === g.food.join()), 'el menjar nou no cau sobre la serp');

check(!canTurn('right', 'left') && !canTurn('up', 'down'), 'no es pot fer mitja volta de cop');
check(canTurn('right', 'up') && canTurn('right', 'down'), 'es pot girar de costat');

// paret
g = newGame(15); g.food = null;
let r;
for (let i = 0; i < 20 && r !== 'crash'; i++) r = step(g);
check(r === 'crash' && g.over && g.snake[0][1] === 14, 'xoca amb la paret de la dreta');

// mossegar-se: serp llarga que fa un quadrat
g = newGame(15); g.food = null;
g.snake = [[5, 5], [5, 4], [5, 3], [5, 2], [5, 1]];
g.dir = 'down'; step(g);
g.dir = 'left'; step(g);
g.dir = 'up';
check(step(g) === 'crash', 'xoca amb ella mateixa');

// entrar a la casella que deixa la cua és permès
g = newGame(15); g.food = null;
g.snake = [[5, 5], [5, 4], [6, 4], [6, 5]];
g.dir = 'down';
check(step(g) === 'move', 'pot entrar on era la cua, que es mou alhora');

// tauler ple
check(placeFood(2, [[0, 0], [0, 1], [1, 0], [1, 1]]) === null, 'sense lloc no hi ha menjar');

console.log(failures ? `\n✘ LA SERP: ${failures} errors` : '\n✔ LA SERP: TOT BÉ');
process.exit(failures ? 1 : 0);
