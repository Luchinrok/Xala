// ============================================================
// serp-motor.js — regles de La Serp, sense res de pantalla.
// La serp és una llista de caselles [fila, columna], amb el cap al davant.
// ============================================================

export const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

// Partida nova: serp de 3 caselles al mig, mirant a la dreta.
export function newGame(size, rnd = Math.random) {
  const r = Math.floor(size / 2), c = Math.floor(size / 2);
  const snake = [[r, c], [r, c - 1], [r, c - 2]];
  return { size, snake, dir: 'right', food: placeFood(size, snake, rnd), over: false, eaten: 0 };
}

// Menjar en una casella lliure a l'atzar (null si la serp ho omple tot).
export function placeFood(size, snake, rnd = Math.random) {
  const taken = new Set(snake.map(([r, c]) => r * size + c));
  const free = [];
  for (let i = 0; i < size * size; i++) if (!taken.has(i)) free.push(i);
  if (!free.length) return null;
  const i = free[Math.floor(rnd() * free.length)];
  return [Math.floor(i / size), i % size];
}

// Es pot girar cap a `next` venint de `dir`? (mai mitja volta de cop)
export function canTurn(dir, next) {
  return next !== dir && next !== OPPOSITE[dir];
}

// Un pas. Retorna 'move', 'eat' o 'crash' i actualitza la partida.
export function step(g, rnd = Math.random) {
  if (g.over) return 'crash';
  const [dr, dc] = DIRS[g.dir];
  const head = [g.snake[0][0] + dr, g.snake[0][1] + dc];
  const eats = g.food && head[0] === g.food[0] && head[1] === g.food[1];
  // la cua es mou en aquest mateix pas (si no menja): s'hi pot entrar
  const body = eats ? g.snake : g.snake.slice(0, -1);
  const out = head[0] < 0 || head[1] < 0 || head[0] >= g.size || head[1] >= g.size;
  if (out || body.some(([r, c]) => r === head[0] && c === head[1])) {
    g.over = true;
    return 'crash';
  }
  g.snake = [head, ...body];
  if (eats) {
    g.eaten++;
    g.food = placeFood(g.size, g.snake, rnd);
    if (!g.food) g.over = true; // ho ha omplert tot: partida acabada (i guanyada)
    return 'eat';
  }
  return 'move';
}
