// ============================================================
// tools/rodola-ordena.mjs — ordena els nivells de Fes-la caure de més fàcil a
// més difícil i escriu rodola-ordre.js (la llista de noms en ordre).
//   node tools/rodola-ordena.mjs      (fa servir tools/rodola-dificultat.json)
// Nota de cada nivell:
//   0,6 × dificultat a l'atzar (0-10, de rodola-dificultat.mjs)
//   + 1,6 per cada mecanisme (corda, molinet, balancí, caixes, porta, imant,
//     dues pilotes, tinta limitada)
//   + 0,8 si l'objectiu no és el cistell (tocar, zona, aguantar, tombar)
//   + 2 si cal fer dos traços
// I cada idea s'ensenya abans de barrejar-la: si un nivell fa servir un
// mecanisme, un objectiu o dos traços que encara no han sortit, primer va el
// nivell més senzill que en fa servir (el de menys idees i menys nota).
// El «Primer traç» sempre va primer.
// ============================================================

import fs from 'node:fs';
import { LEVELS } from '../rodola-nivells.js';

const dif = JSON.parse(fs.readFileSync(new URL('./rodola-dificultat.json', import.meta.url), 'utf8'));
const byName = Object.fromEntries(dif.map(d => [d.name, d]));
const MECHS = ['ropes', 'spinners', 'seesaws', 'boxes', 'doors', 'magnets', 'extra'];
// idees de cada nivell: mecanismes, objectiu i dos traços
const ideas = (lv) => [
  ...MECHS.filter(k => (lv[k] || []).length),
  ...(lv.ink ? ['ink'] : []),
  ...(lv.goal && lv.goal.type !== 'cup' ? ['goal:' + lv.goal.type] : []),
  ...(lv.solution.length > 1 ? ['dos-traços'] : []),
];

const rows = LEVELS.map((lv) => {
  const d = byName[lv.name];
  if (!d) throw new Error(`Falta la dificultat de «${lv.name}»: torna a fer rodola-dificultat.mjs`);
  const id = ideas(lv);
  const mechs = id.filter(x => !x.startsWith('goal:') && x !== 'dos-traços').length;
  const note = 0.6 * d.score + 1.6 * mechs + (lv.goal && lv.goal.type !== 'cup' ? 0.8 : 0) + (lv.solution.length > 1 ? 2 : 0);
  return { name: lv.name, note: Math.round(note * 10) / 10, score: d.score, ideas: id };
});

const first = rows.find(r => r.name === 'Primer traç');
const pending = rows.filter(r => r !== first).sort((a, b) => a.note - b.note);
const order = [first];
const seen = new Set(first.ideas);
while (pending.length) {
  let next = pending[0];
  // una idea nova que encara no ha sortit? primer, el nivell més senzill que la fa servir
  for (let guard = 0; guard < 10; guard++) {
    const fresh = next.ideas.filter(x => !seen.has(x));
    if (fresh.length <= 1) break;
    const teacher = pending
      .filter(r => r.ideas.includes(fresh[0]))
      .sort((a, b) => a.ideas.length - b.ideas.length || a.note - b.note)[0];
    if (!teacher || teacher === next) break;
    next = teacher;
  }
  pending.splice(pending.indexOf(next), 1);
  next.ideas.forEach(x => seen.add(x));
  order.push(next);
}

fs.writeFileSync(new URL('../rodola-ordre.js', import.meta.url), `// ============================================================
// rodola-ordre.js — ordre dels nivells de Fes-la caure (generat; no editar a mà).
// Fet amb tools/rodola-ordena.mjs: de més fàcil a més difícil, i cada idea
// (mecanisme, objectiu, dos traços) s'ensenya abans de barrejar-la.
// ============================================================

export default ${JSON.stringify(order.map(r => r.name), null, 1)};
`);
console.log(' ordre  nota  idees  nivell');
order.forEach((r, i) => console.log(`${String(i + 1).padStart(5)}  ${String(r.note).padStart(4)}  ${String(r.ideas.length).padStart(4)}  ${r.name.padEnd(24)} ${r.ideas.join(', ')}`));
