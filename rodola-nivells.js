// ============================================================
// rodola-nivells.js — nivells de Rodola!
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

const line = (x1, y1, x2, y2, n = 12) =>
  Array.from({ length: n + 1 }, (_, i) => [x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]);
const poly = (...pts) => {
  const out = [];
  for (let i = 1; i < pts.length; i++) out.push(...line(...pts[i - 1], ...pts[i], 8).slice(i > 1 ? 1 : 0));
  return out;
};

// Gira un nivell de dreta a esquerra (x -> 400 - x).
const mirror = (lv, name, hint) => ({
  ...lv,
  name,
  hint,
  ball: [400 - lv.ball[0], lv.ball[1]],
  cup: [400 - lv.cup[0], lv.cup[1]],
  walls: (lv.walls || []).map(([x1, y1, x2, y2, t]) => [400 - x2, y2, 400 - x1, y1, t].filter(v => v !== undefined)),
  seesaws: (lv.seesaws || []).map(([x, y, l]) => [400 - x, y, l]),
  nodraw: (lv.nodraw || []).map(([x, y, w, h]) => [400 - x - w, y, w, h]),
  solution: lv.solution.map(st => st.map(([x, y]) => [400 - x, y])),
});

const BASE = [
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
    nodraw: [[0, 470, 200, 130]],
    par: 1,
    solution: [line(330, 246, 110, 293)],
  },
  {
    name: 'Ziga-zaga',
    hint: 'Amb una rampa no n’hi ha prou',
    ball: [330, 40],
    cup: [358, 578],
    walls: [[340, 192, 352, 192, 10], [200, 232, 212, 232, 10], [54, 336, 66, 336, 10], [234, 386, 246, 386, 10]],
    nodraw: [[280, 450, 120, 150]],
    par: 2,
    solution: [line(375, 176, 182, 222), line(34, 316, 266, 380)],
  },
];

export const LEVELS = [
  ...BASE,
  mirror(BASE[1], 'El pont de tornada', 'Ara rodola cap a l’altra banda'),
  mirror(BASE[2], 'Balancí al revés', 'El mateix truc, a l’altre costat'),
  mirror(BASE[4], 'Ziga-zaga de tornada', 'Dues rampes, començant per la dreta'),
];

