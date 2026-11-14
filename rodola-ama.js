// ============================================================
// rodola-ama.js — nivells de Fes-la caure dissenyats a mà, un per idea.
// Cada un té un truc: el que primer se t'acut no funciona.
// Es proven amb  node tools/rodola-prova.mjs  i amb  npm test.
// ============================================================

const line = (x1, y1, x2, y2, n = 12) =>
  Array.from({ length: n + 1 }, (_, i) => [Math.round(x1 + (x2 - x1) * i / n), Math.round(y1 + (y2 - y1) * i / n)]);
// un cercle dibuixat a mà alçada (tancat): rodola
const circle = (cx, cy, r, n = 20) =>
  Array.from({ length: n + 1 }, (_, i) => [Math.round(cx + r * Math.cos(i / n * 2 * Math.PI)), Math.round(cy + r * Math.sin(i / n * 2 * Math.PI))]);
const square = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]].flatMap((p, i, a) => (i ? line(...a[i - 1], ...p, 4).slice(1) : [p]));

export default [
  {
    // Els traços s'enganxen als pendents; només una roda baixa rodolant.
    name: 'La roda',
    hint: 'Fes que la pilota toqui la paret corall',
    par: 1,
    ball: [250, 401],
    walls: [[10, 250, 190, 420, 12], [186, 420, 396, 420, 12]],
    goal: { type: 'wall', wall: [372, 340, 372, 412, 12] },
    nodraw: [[184, 170, 216, 236]],
    solution: [circle(104, 231, 28)],
  },
  {
    // Res no fa moure la pilota: només un pal dret que, en caure, l'empeny.
    name: 'El pal',
    hint: 'Fes que la pilota toqui la paret corall',
    par: 1,
    // la pilota és quieta a la vora d'un graó: n'hi ha prou amb una empenteta
    ball: [196, 487],
    walls: [[4, 506, 214, 506, 12], [214, 556, 396, 586, 12]],
    goal: { type: 'wall', wall: [384, 500, 384, 576, 12] },
    nodraw: [[160, 60, 240, 380]],
    solution: [line(100, 494, 126, 346)],
  },
  {
    // La pilota cau de dalt, però la zona és sota una teulada.
    name: 'Per sota',
    hint: 'Deixa la pilota a la zona',
    par: 1,
    // la pilota cau sobre la teulada; la zona és a sota
    ball: [150, 60],
    walls: [[0, 470, 240, 470, 12], [6, 476, 6, 598, 12], [12, 592, 396, 526, 12], [394, 200, 394, 530, 12], [184, 250, 196, 250, 10], [300, 320, 312, 320, 10]],
    goal: { type: 'zone', zone: [14, 540, 100, 44] },
    solution: [line(120, 193, 330, 327)],
  },
  {
    // El botó és lluny i no s'hi pot dibuixar a sobre: hi has d'arribar rodolant.
    name: 'Botó llunyà',
    hint: 'Obre la trapa: el botó és lluny',
    par: 1,
    ball: [330, 538],
    cup: [330, 578],
    walls: [[10, 250, 170, 380, 12], [166, 380, 262, 380, 12]],
    doors: [{ button: [235, 370, 40], door: [299, 556, 361, 556, 10] }],
    nodraw: [[150, 0, 130, 372], [262, 300, 138, 200]],
    solution: [circle(92, 231, 26)],
  },
  {
    // No pots tocar la caixa: l'eina és la pilota que penja.
    name: 'Sense tocar-la',
    hint: 'Fes caure la caixa',
    par: 1,
    ball: [80, 170],
    ropes: [[80, 60, 'ball']],
    walls: [[30, 250, 250, 380, 12], [246, 382, 330, 382, 12]],
    boxes: [[326, 356, 24, 40]],
    goal: { type: 'off', box: 0 },
    nodraw: [[200, 0, 200, 600]],
    solution: [line(56, 112, 104, 108, 6)],
  },
];
