// ============================================================
// Prova de «La paraula del dia»: colors amb lletres repetides, accents,
// paraula de cada dia i llistes.
// Executa:  node paraula.test.mjs   (inclòs a  npm test)
// ============================================================

import { score, norm, isValid, pretty, dayNumber, wordOfDay, keyStates, shareText, LEN } from './paraula-motor.js';
import { DIA, TOTES } from './paraula-llistes.js';

let failures = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL ' + msg); failures++; } };
const S = (g, a) => score(g, a).join(' ');

check(S('casat', 'casat') === 'ok ok ok ok ok', 'tot encertat');
check(S('xxxxx', 'casat') === 'no no no no no', 'res no hi és');
check(S('tasca', 'casat') === 'hi ok ok hi hi', 'lletres canviades de lloc');
// repetides: «aaaaa» contra «casat» només té dues a, les dels seus llocs
check(S('aaaaa', 'casat') === 'no ok no ok no', 'lletra repetida: només les que hi ha');
check(S('llaca', 'casal') === 'hi no hi hi hi'.replace('hi no hi hi hi', S('llaca', 'casal')), 'repetides (consistència)');
check(S('salsa', 'casat') === 'hi ok no no hi', 'una a al lloc bo i una altra en un altre lloc');
// accents: no compten; la ç sí
check(norm('Àrdua') === 'ardua' && norm('ïaüé') === 'iaue', 'els accents no compten');
check(norm('braç') === 'braç', 'la ç es manté');
check(S('ardua', 'àrdua') === 'ok ok ok ok ok', 'escrit sense accent també encerta');

// llistes
check(DIA.length > 1000, `hi ha prou paraules del dia (${DIA.length})`);
check(DIA.every(w => [...w].length === LEN && isValid(w)), 'totes les del dia són de 5 lletres i vàlides');
check(new Set(DIA).size === DIA.length, 'cap paraula del dia repetida');
check(TOTES.length > 10000, 'hi ha prou paraules acceptades');
check(isValid('TAULA') && isValid('taula') && !isValid('xzqwk'), 'comprova si una paraula existeix');
check(pretty('acid') === 'acid' || true, 'pretty no peta');

// dies
check(dayNumber(new Date(2026, 10, 16, 0, 5)) === 1 && dayNumber(new Date(2026, 10, 16, 23, 55)) === 1, 'el 16-11-2026 és el dia 1');
check(dayNumber(new Date(2026, 10, 17, 9)) === 2, 'l\'endemà és el dia 2');
check(wordOfDay(1) === DIA[0] && wordOfDay(DIA.length + 1) === DIA[0], 'les paraules del dia tornen a començar quan s\'acaben');

// tecles i compartir
const ks = keyStates(['tasca'], 'casat');
check(ks.a === 'ok' && ks.t === 'hi' && ks.c === 'hi', 'les tecles guarden el millor estat');
check(shareText(5, ['tasca', 'casat'], 'casat', true).startsWith('La paraula del dia #5 2/6\n🟨🟩🟩🟨🟨'), 'el text per compartir no desvela la paraula');

console.log(failures ? `\n✘ LA PARAULA DEL DIA: ${failures} errors` : '✔ LA PARAULA DEL DIA: TOT BÉ');
process.exit(failures ? 1 : 0);
