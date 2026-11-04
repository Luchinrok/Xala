// ============================================================
// Prova de La Xifra: els reptes han de ser resolubles i el mínim de fitxes, cert.
// Executa:  node xifra.test.mjs   (inclòs a  npm test)
// ============================================================

import { LEVELS, makePuzzle, solve, starsFor } from './xifra-motor.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };

// Cerca independent, per força bruta, sense la taula del motor: el mínim de
// fitxes que fan falta per arribar a l'objectiu.
function bruteMin(tiles, target) {
  let best = Infinity;
  const visit = (vals) => {
    for (const v of vals) if (v.n === target && v.c < best) best = v.c;
    if (vals.length < 2) return;
    for (let i = 0; i < vals.length; i++) {
      for (let j = i + 1; j < vals.length; j++) {
        const a = vals[i], b = vals[j];
        const rest = vals.filter((_, k) => k !== i && k !== j);
        const c = a.c + b.c;
        if (c >= best) continue;
        const rs = [a.n + b.n, a.n * b.n];
        if (a.n !== b.n) rs.push(Math.abs(a.n - b.n));
        if (b.n > 1 && a.n % b.n === 0) rs.push(a.n / b.n);
        if (a.n > 1 && b.n % a.n === 0) rs.push(b.n / a.n);
        for (const n of rs) if (n <= 5000) visit([...rest, { n, c }]);
      }
    }
  };
  visit(tiles.map(n => ({ n, c: 1 })));
  return best;
}

// Refà la solució com ho faria un jugador, comprovant cada pas.
function replay(tiles, steps, target) {
  const bag = tiles.slice();
  for (const s of steps) {
    for (const x of [s.a, s.b]) {
      const i = bag.indexOf(x);
      if (i < 0) return `${x} no és disponible`;
      bag.splice(i, 1);
    }
    const r = { '+': s.a + s.b, '−': s.a - s.b, '×': s.a * s.b, '÷': s.a / s.b }[s.op];
    if (r !== s.r || r <= 0 || !Number.isInteger(r)) return `${s.a} ${s.op} ${s.b} no dona ${s.r}`;
    bag.push(r);
  }
  return bag.includes(target) ? null : 'no arriba a l\'objectiu';
}

check(starsFor(3, 3) === 3 && starsFor(4, 3) === 2 && starsFor(6, 3) === 1, 'estrelles');

let n = 0;
for (const level of Object.keys(LEVELS)) {
  const cfg = LEVELS[level];
  const seen = new Set();
  for (let i = 0; i < 150; i++) {
    const p = makePuzzle(level, i);
    const id = `${level} ${i}`;
    const again = makePuzzle(level, i);
    check(JSON.stringify(p) === JSON.stringify(again), `${id}: sempre surt igual`);
    check(p.tiles.length === 6, `${id}: 6 fitxes`);
    check(p.target >= cfg.min && p.target <= cfg.max, `${id}: objectiu ${p.target} dins del nivell`);
    check(!p.tiles.includes(p.target), `${id}: l'objectiu no és cap fitxa`);
    check(p.minTiles >= cfg.tilesMin && p.minTiles <= cfg.tilesMax, `${id}: dificultat`);
    const sol = solve(p.tiles, p.target);
    check(sol && sol.tiles === p.minTiles, `${id}: la solució fa servir ${p.minTiles} fitxes`);
    const bad = sol && replay(p.tiles, sol.steps, p.target);
    check(!bad, `${id}: ${bad}`);
    seen.add(p.tiles.join() + ':' + p.target);
    n++;
  }
  check(seen.size >= 145, `${level}: reptes prou diferents (${seen.size})`);
  // la força bruta és lenta: només una mostra
  for (let i = 0; i < 12; i++) {
    const p = makePuzzle(level, i);
    const b = bruteMin(p.tiles, p.target);
    check(b === p.minTiles, `${level} ${i}: mínim ${p.minTiles}, força bruta ${b}`);
  }
}

console.log(failures ? `\n✘ LA XIFRA: ${failures} errors` : `  ok   ${n} reptes verificats\n\n✔ LA XIFRA: TOT BÉ`);
process.exit(failures ? 1 : 0);
