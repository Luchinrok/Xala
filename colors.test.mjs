// ============================================================
// Prova d'«Uneix colors»: els 150 nivells tenen solució que omple el tauler,
// surten iguals a tots els mòbils, i el comprovador detecta errors.
// Executa:  node colors.test.mjs   (inclòs a  npm test)
// ============================================================

import { makeLevel, isSolved, tierOf, neigh } from './colors-motor.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };

for (let lv = 1; lv <= 150; lv++) {
  const L = makeLevel(lv);
  check(L.n === tierOf(lv).n, `nivell ${lv}: mida bona`);
  check(L.dots.size === 2 * L.k, `nivell ${lv}: ${L.k} parelles de punts`);
  check(isSolved(L, L.sol), `nivell ${lv}: la solució omple el tauler`);
  check(L.sol.every(p => p.length >= 3), `nivell ${lv}: cap camí de menys de 3 caselles`);
  check(JSON.stringify(makeLevel(lv).sol) === JSON.stringify(L.sol), `nivell ${lv}: surt igual a tots els mòbils`);
}
{
  const L = makeLevel(5);
  const broken = L.sol.map(p => p.slice()); broken[0].pop();
  check(!isSolved(L, broken), 'si falta una casella, no està resolt');
  const swapped = L.sol.map(p => p.slice()); swapped[0] = swapped[0].slice().reverse();
  check(isSolved(L, swapped), 'el camí es pot fer en qualsevol sentit');
  check(neigh(5, 0).length === 2 && neigh(5, 12).length === 4, 'veïns d\'una casella');
}

console.log(failures ? `\n✘ UNEIX COLORS: ${failures} errors` : '✔ UNEIX COLORS: TOT BÉ');
process.exit(failures ? 1 : 0);
