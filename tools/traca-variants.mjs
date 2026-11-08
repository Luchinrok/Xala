// ============================================================
// tools/traca-variants.mjs — marca cada paraula de La Traca amb les variants
// del català on és vàlida (central, valencià, balear).
//   node tools/traca-variants.mjs <diccionari.txt de catalan-dict-tools>
// El diccionari és resultats/lt/diccionari.txt de Softcatalà. A les etiquetes
// verbals, el 8è caràcter diu la variant:
//   0 i xifres: totes · C: central · V: valencià · B i Z: balear
//   Y: central i balear (no valencià) · X: central i valencià (no balear)
// Els noms, adjectius, etc. valen per a totes. Una paraula escrita sense
// accents val si alguna de les formes que hi corresponen és de la variant.
// Al fitxer, una paraula que no val per a totes porta «~» i les variants:
// «limite~v», «mult~b», «canti~cb».
// ============================================================

import fs from 'node:fs';
import REPTES from '../traca-reptes.js';
import { norm } from '../traca.js';

const dict = process.argv[2];
if (!dict) { console.error('Cal el camí del diccionari'); process.exit(1); }

const VARS = { C: 'c', V: 'v', B: 'b', Z: 'b', Y: 'cb', X: 'cv' };
const byNorm = new Map(); // forma normalitzada -> conjunt de variants
for (const l of fs.readFileSync(dict, 'utf8').split('\n')) {
  const [f, , t] = l.trim().split(' ');
  if (!t || t.startsWith('NP')) continue;
  const n = norm(f);
  const v = t.startsWith('V') && VARS[t[7]] ? VARS[t[7]] : 'cvb';
  const set = byNorm.get(n) || new Set();
  for (const ch of v) set.add(ch);
  byNorm.set(n, set);
}

let marked = 0, total = 0;
const out = REPTES.map(([set, nCommon, list]) => [set, nCommon, list.split(' ').map((w) => {
  total++;
  const bare = w.split('~')[0];
  const v = byNorm.get(norm(bare));
  if (!v || v.size === 3) return bare;
  marked++;
  return `${bare}~${['c', 'v', 'b'].filter(x => v.has(x)).join('')}`;
}).join(' ')]);

const src = fs.readFileSync(new URL('../traca-reptes.js', import.meta.url), 'utf8');
const header = src.slice(0, src.indexOf('export default'))
  .replace('// Format: [7 lletres, quantes paraules comunes hi ha al davant, paraules]',
    '// Format: [7 lletres, quantes paraules comunes hi ha al davant, paraules]\n// Variants (tools/traca-variants.mjs): «paraula~v» només val en valencià; c central, b balear.');
fs.writeFileSync(new URL('../traca-reptes.js', import.meta.url), `${header}export default ${JSON.stringify(out).replace(/\],\[/g, '],\n[')};\n`);
console.log(`${marked} de ${total} paraules només valen en alguna variant`);
