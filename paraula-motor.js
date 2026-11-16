// ============================================================
// paraula-motor.js — la lògica de «La paraula del dia» (sense pantalla).
// Cal endevinar una paraula de 5 lletres en 6 intents. Cada intent diu, lletra
// a lletra, si és al seu lloc, si és a la paraula però en un altre lloc o si
// no hi és. Els accents no compten (s'escriu sense): «arbre» = «àrbre»; la ç sí.
// ============================================================

import { DIA, TOTES } from './paraula-llistes.js';

export const LEN = 5, TRIES = 6;

// treu els accents (però no la ç): a-z i ç
const MAP = { à: 'a', á: 'a', è: 'e', é: 'e', í: 'i', ï: 'i', ò: 'o', ó: 'o', ú: 'u', ü: 'u' };
export const norm = (w) => [...String(w).toLowerCase()].map(c => MAP[c] || c).join('');

// paraules acceptades: sense accents → amb accents (per mostrar-la bé)
const VALID = new Map();
for (const w of TOTES) { const k = norm(w); if (!VALID.has(k)) VALID.set(k, w); }
for (const w of DIA) VALID.set(norm(w), w); // la forma de la paraula del dia mana
export const isValid = (w) => VALID.has(norm(w));
export const pretty = (w) => VALID.get(norm(w)) || w;

// Número del dia (1 = 16-11-2026), segons la data del mòbil.
const START = Date.UTC(2026, 10, 16);
export function dayNumber(d = new Date()) {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - START) / 86400000) + 1;
}
export const wordOfDay = (n) => DIA[((n - 1) % DIA.length + DIA.length) % DIA.length];
export const randomWord = () => DIA[Math.floor(Math.random() * DIA.length)];

// Puntua un intent: 'ok' (lloc bo), 'hi' (hi és, en un altre lloc), 'no'.
// Amb lletres repetides, cada lletra de la solució es fa servir una sola vegada.
export function score(guess, answer) {
  const g = [...norm(guess)], a = [...norm(answer)];
  const res = Array(LEN).fill('no');
  const left = {};
  for (let i = 0; i < LEN; i++) {
    if (g[i] === a[i]) res[i] = 'ok';
    else left[a[i]] = (left[a[i]] || 0) + 1;
  }
  for (let i = 0; i < LEN; i++) {
    if (res[i] === 'ok') continue;
    if (left[g[i]]) { res[i] = 'hi'; left[g[i]]--; }
  }
  return res;
}

// L'estat de cada tecla: el millor que s'ha vist (ok > hi > no)
export function keyStates(guesses, answer) {
  const rank = { no: 1, hi: 2, ok: 3 }, out = {};
  for (const g of guesses) {
    const s = score(g, answer);
    [...norm(g)].forEach((c, i) => { if (!out[c] || rank[s[i]] > rank[out[c]]) out[c] = s[i]; });
  }
  return out;
}

// Text per compartir: quadrats de colors (sense lletres: no desvela la paraula)
export function shareText(n, guesses, answer, won) {
  const sq = { ok: '🟧', hi: '🟨', no: '⬛' };
  return `La paraula del dia #${n} ${won ? guesses.length : 'X'}/${TRIES}\n` + guesses.map(g => score(g, answer).map(s => sq[s]).join('')).join('\n');
}
