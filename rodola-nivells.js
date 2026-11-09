// ============================================================
// rodola-nivells.js — nivells de Fes-la caure
// Món de 400 × 600 (y cap avall). Els traços cauen: s'han de recolzar en
// alguna cosa o fer servir el seu pes per empènyer.
//   ball: [x, y] on comença la pilota
//   cup: [x, y] centre del fons del cistell
//   walls: segments fixos [x1, y1, x2, y2, gruix]
//   boxes: caixes que es poden empènyer [x, y, amplada, alçada]
//   seesaws: balancins [x, y, llargada]
//   nodraw: zones on no es pot dibuixar [x, y, amplada, alçada]
//   par: traços per a les 3 estrelles
//   solution: traços que el resolen (les proves ho comproven)
// ============================================================

import GENERATS from './rodola-generats.js';
import ORDRE from './rodola-ordre.js';

const line = (x1, y1, x2, y2, n = 12) =>
  Array.from({ length: n + 1 }, (_, i) => [x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]);
const poly = (...pts) => {
  const out = [];
  for (let i = 1; i < pts.length; i++) out.push(...line(...pts[i - 1], ...pts[i], 8).slice(i > 1 ? 1 : 0));
  return out;
};

export const BASE = [
  {
    name: 'Primer traç',
    hint: 'Recolza una rampa sobre els dos tacs',
    ball: [70, 60],
    cup: [300, 578],
    walls: [[44, 252, 56, 252, 10], [184, 292, 196, 292, 10]],
    nodraw: [[220, 440, 180, 160]],
    par: 1,
    solution: [line(20, 232, 215, 285)],
  },
  {
    name: 'El pont',
    hint: 'La pilota rodola: fes-li un pont',
    ball: [24, 60],
    cup: [352, 330],
    walls: [[0, 80, 170, 240, 12], [270, 240, 320, 240, 12], [392, 180, 392, 330, 12]],
    nodraw: [[178, 252, 88, 348], [310, 250, 90, 100]],
    par: 1,
    solution: [line(158, 224, 284, 226)],
  },
  {
    name: 'El balancí',
    hint: "Deixa caure alguna cosa a l'altra punta",
    ball: [110, 372],
    cup: [297, 578],
    seesaws: [[180, 390, 200]],
    walls: [[74, 401, 86, 401, 10]],
    nodraw: [[225, 470, 175, 130]],
    par: 1,
    solution: [poly([230, 160], [270, 160], [270, 200], [230, 200], [230, 160])],
  },
  {
    name: "L'embut",
    hint: 'La pilota cau al mig: recull-la',
    ball: [200, 50],
    cup: [80, 578],
    walls: [[144, 300, 156, 300, 10], [284, 270, 296, 270, 10], [200, 440, 200, 600, 12]],
    // la segona zona tapa una drecera (tools/rodola-endureix.mjs)
    nodraw: [[0, 470, 200, 130], [81, 135, 165, 71]],
    par: 1,
    solution: [line(330, 246, 110, 293)],
  },
  {
    name: 'Ziga-zaga',
    hint: 'Dues rampes: tens uns segons',
    // La pilota comença sobre una lleixa poc inclinada i tarda uns 4 s a caure:
    // dona temps de fer les dues rampes, en qualsevol ordre.
    ball: [380, 45],
    cup: [358, 578],
    walls: [[230, 90, 396, 60, 12], [340, 192, 352, 192, 10], [200, 232, 212, 232, 10], [54, 336, 66, 336, 10], [234, 386, 246, 386, 10]],
    nodraw: [[280, 450, 120, 150]],
    par: 2,
    solution: [line(392, 172, 182, 222), line(34, 316, 266, 380)],
  },
];

// Tots: els fets a mà i els generats amb tools/rodola-genera.mjs.
const ALL = [...BASE, ...GENERATS];

// Ordre de joc, de més fàcil a més difícil (rodola-ordre.js, fet amb
// tools/rodola-ordena.mjs). Un nivell que no hi surti va al final.
export const LEVELS = [
  ...ORDRE.map(n => ALL.find(l => l.name === n)).filter(Boolean),
  ...ALL.filter(l => !ORDRE.includes(l.name)),
];

