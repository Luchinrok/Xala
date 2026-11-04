// ============================================================
// Prova de La Traca: cada repte ha de ser jugable.
// Executa:  node traca.test.mjs   (inclòs a  npm test)
// ============================================================

import REPTES from './traca-reptes.js';
import { norm, pointsFor, rankFor, dailyIndex } from './traca.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };

check(norm('Plaça') === 'placa', 'la ç val com a c');
check(norm('col·legi') === 'collegi', 'el punt volat no compta');
check(norm('què') === 'que', 'sense accents');
check(pointsFor('casa', 'casbdef') === 1, '4 lletres, 1 punt');
check(rankFor(0).name === 'Espurna' && rankFor(100).name === 'Castell de focs', 'rangs');

const sets = new Set();
REPTES.forEach(([set, nCommon, list], i) => {
  const id = `#${i + 1}`;
  check(set.length === 7 && new Set(set).size === 7, `${id} té 7 lletres diferents`);
  sets.add(set);
  const words = list.split(' ');
  check(nCommon >= 30 && nCommon <= words.length, `${id} té prou paraules comunes`);
  const seen = new Set();
  let pangram = false;
  for (const w of words) {
    const n = norm(w);
    check(n.length >= 4, `${id} ${w}: massa curta`);
    check([...n].every(l => set.includes(l)), `${id} ${w}: fa servir una lletra que no hi és`);
    check(!seen.has(n), `${id} ${w}: repetida`);
    seen.add(n);
    if ([...set].every(l => n.includes(l))) pangram = true;
  }
  check(pangram, `${id} té algun esclat`);
  // l'esclat ha de ser una paraula comuna
  check(words.slice(0, nCommon).some(w => [...set].every(l => norm(w).includes(l))), `${id} l'esclat és una paraula comuna`);
});
check(sets.size === REPTES.length, 'cap repte repetit');

const days = new Set();
for (let d = 0; d < REPTES.length; d++) {
  days.add(dailyIndex(REPTES.length, new Date(Date.UTC(2027, 0, 1) + d * 86400000).toISOString().slice(0, 10)));
}
check(days.size === REPTES.length, 'el repte del dia no es repeteix fins acabar la llista');

console.log(failures ? `\n✘ LA TRACA: ${failures} errors` : `  ok   ${REPTES.length} reptes verificats\n\n✔ LA TRACA: TOT BÉ`);
process.exit(failures ? 1 : 0);
