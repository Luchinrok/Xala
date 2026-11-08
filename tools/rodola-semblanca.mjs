// ============================================================
// tools/rodola-semblanca.mjs — quant s'assemblen dos nivells de Fes-la caure.
// Ho fan servir el generador (per no repetir nivells) i les proves.
// Compara pilota, objectiu (cistell, pilota vermella, zona o caixa) i parets,
// també amb un dels dos girat en mirall. Objectius diferents: mai són iguals.
// ============================================================

// Per sota d'aquesta distància, es considera el mateix nivell. Calibrat amb parelles
// que un jugador va trobar repetides: el pont fet a mà i un pont generat (102) i
// dos «Toca» generats (111). A la pràctica, dues variants d'una mateixa plantilla
// es veuen com el mateix nivell.
export const SIMILAR = 130;

const mirror = (lv) => ({
  ...lv,
  ball: [400 - lv.ball[0], lv.ball[1]],
  cup: lv.cup && [400 - lv.cup[0], lv.cup[1]],
  ball2: lv.ball2 && [400 - lv.ball2[0], lv.ball2[1]],
  goal: lv.goal && lv.goal.zone ? { ...lv.goal, zone: [400 - lv.goal.zone[0] - lv.goal.zone[2], ...lv.goal.zone.slice(1)] } : lv.goal,
  walls: (lv.walls || []).map(([a, b, c, d, t]) => [400 - c, d, 400 - a, b, t]),
  boxes: (lv.boxes || []).map(([x, y, w, h]) => [400 - x, y, w, h]),
  seesaws: (lv.seesaws || []).map(([x, y, l]) => [400 - x, y, l]),
  ropes: (lv.ropes || []).map(([x, y, w]) => [400 - x, y, w]),
  spinners: (lv.spinners || []).map(([x, y, l, d]) => [400 - x, y, l, -d]),
  doors: (lv.doors || []).map(({ button: [bx, by, bw], door: [a, b, c, d, t] }) => ({ button: [400 - bx, by, bw], door: [400 - c, d, 400 - a, b, t] })),
});
const keyPts = (lv) => [
  ...(lv.walls || []).flatMap(([a, b, c, d]) => [[a, b], [c, d], [(a + c) / 2, (b + d) / 2]]),
  ...(lv.boxes || []).map(([x, y]) => [x, y]),
  ...(lv.seesaws || []).map(([x, y]) => [x, y]),
  ...(lv.ropes || []).map(([x, y]) => [x, y]),
  ...(lv.spinners || []).map(([x, y]) => [x, y]),
  ...(lv.doors || []).flatMap(({ button: [bx, by], door: [a, b, c, d] }) => [[bx, by], [(a + c) / 2, (b + d) / 2]]),
];
// distància mitjana de cada punt al més proper de l'altre conjunt (en els dos sentits)
const cham = (A, B) => {
  if (!A.length || !B.length) return A.length === B.length ? 0 : 999;
  const f = (P, Q) => P.reduce((s, p) => s + Math.min(...Q.map(q => Math.hypot(p[0] - q[0], p[1] - q[1]))), 0) / P.length;
  return (f(A, B) + f(B, A)) / 2;
};
const anchor = (lv) => lv.cup || lv.ball2 || (lv.goal && lv.goal.zone && [lv.goal.zone[0] + lv.goal.zone[2] / 2, lv.goal.zone[1] + lv.goal.zone[3] / 2]) || (lv.boxes && lv.boxes[0]) || lv.ball;
const gtype = (lv) => (lv.goal && lv.goal.type) || 'cup';
// mecanismes diferents (corda, plataforma que gira, balancí, caixes): idea diferent
const mech = (lv) => ['ropes', 'spinners', 'seesaws', 'boxes', 'doors'].map(k => ((lv[k] || []).length ? 1 : 0)).join('');
const d1 = (a, b) => (gtype(a) !== gtype(b) ? 1000 : 0) + (mech(a) !== mech(b) ? 500 : 0)
  + (Math.hypot(a.ball[0] - b.ball[0], a.ball[1] - b.ball[1]) + Math.hypot(anchor(a)[0] - anchor(b)[0], anchor(a)[1] - anchor(b)[1])) / 2
  + cham(keyPts(a), keyPts(b));

export const levelDistance = (a, b) => Math.min(d1(a, b), d1(a, mirror(b)));
