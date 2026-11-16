// ============================================================
// tools/paraula-llistes.mjs — fa paraula-llistes.js per a «La paraula del dia».
//   node tools/paraula-llistes.mjs <diccionari.txt de catalan-dict-tools>
// El diccionari és resultats/lt/diccionari.txt de Softcatalà
// (https://github.com/Softcatala/catalan-dict-tools, GPL 2+ / LGPL 2.1+).
//
// · Acceptades: totes les formes de 5 lletres (sense noms propis).
// · Del dia: noms singulars, adjectius masculins singulars i infinitius que La
//   Traca també té per comuns; sense els que també són noms propis ni manlleus.
//   S'ordenen amb una llavor fixa: l'ordre de les paraules del dia no canvia.
// ============================================================

import fs from 'node:fs';
import tr from '../traca-reptes.js';

const dict = fs.readFileSync(process.argv[2], 'utf8').split('\n');
const common = new Set();
for (const [, n, ws] of tr) ws.split(' ').forEach((w, i) => { if (i < n && !w.includes('~')) common.add(w); });

const ok = /^[a-zàèéíïòóúüç]{5}$/;
const all = new Set(), answers = new Set(), proper = new Set();
for (const line of dict) {
  const [form, , tag] = line.trim().split(' ');
  if (!form || !tag) continue;
  if (tag.startsWith('NP')) { proper.add(form.toLowerCase()); continue; }
  if (!ok.test(form)) continue;
  all.add(form);
  const good = /^NC[MFC]S/.test(tag) || /^A..[MC]S/.test(tag) || /^V.N/.test(tag);
  if (good && common.has(form)) answers.add(form);
}
// manlleus o noms que s'hi colen, i paraules gruixudes (hi juguen nens)
const FORA = new Set(['input', 'elder', 'leone', 'güell', 'semen', 'folla', 'merda', 'cagar', 'pixar', 'mamar', 'putes', 'porro', 'droga', 'pènis', 'culet']);
const del = [...answers].filter(w => !proper.has(w) && !FORA.has(w)).sort();

// ordre fix amb llavor (Fisher–Yates)
let s = 20261117;
const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
for (let i = del.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [del[i], del[j]] = [del[j], del[i]]; }

const out = `// ============================================================
// paraula-llistes.js — paraules de «La paraula del dia» (generat; no editar a mà).
// Fet amb tools/paraula-llistes.mjs a partir de catalan-dict-tools de Softcatalà
// (GPL 2+ / LGPL 2.1+). Llicència: vegeu LLICENCIA-diccionari.txt.
// DIA: les paraules del dia, en l'ordre en què surten. TOTES: les que s'accepten.
// ============================================================

export const DIA = ${JSON.stringify(del)};
export const TOTES = ${JSON.stringify([...all].sort().join(' '))}.split(' ');
`;
fs.writeFileSync(new URL('../paraula-llistes.js', import.meta.url), out);
console.log(`del dia: ${del.length} · acceptades: ${all.size} · ${(out.length / 1024).toFixed(0)} KB`);
