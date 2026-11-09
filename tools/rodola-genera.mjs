// ============================================================
// tools/rodola-genera.mjs — genera nivells per a Fes-la caure.
//   node tools/rodola-genera.mjs [quants] [llavor]
// Cada plantilla munta un escenari i proposa moltes solucions possibles
// (on deixar caure un pes, on posar un tap...). Es simulen amb Matter.js i el
// nivell només es queda si alguna solució el resol, aguanta una mà tremolosa
// (6 de 8 traços desplaçats) i cap gargot el resol sol.
// Escriu rodola-generats.js. No s'executa a l'app: només per crear nivells.
// ============================================================

import fs from 'node:fs';
import { createRequire } from 'node:module';
import { simulate, buildWorld } from '../rodola-mon.js';
import { BASE } from '../rodola-nivells.js';
import { SIMILAR, levelDistance } from './rodola-semblanca.mjs';

const require = createRequire(import.meta.url);
const Matter = require('../vendor/matter.min.js');

const WANT = +(process.argv[2] || 75);
const SEED = +(process.argv[3] || 20261108);
let seed = SEED;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const R = (a, b) => a + rnd() * (b - a);
const RI = (a, b) => Math.round(R(a, b));
const r1 = (v) => Math.round(v);

const line = (x1, y1, x2, y2, n = 8) => Array.from({ length: n + 1 }, (_, i) => [r1(x1 + (x2 - x1) * i / n), r1(y1 + (y2 - y1) * i / n)]);
const square = (x, y, s) => [[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]].flatMap((p, i, a) => (i ? line(...a[i - 1], ...p, 4).slice(1) : [p]));
const peg = (x, y) => [x - 6, y, x + 6, y, 10];
const lenOf = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
// rampa que passa 12 px per sobre de dos tacs
function rampOver(p1, p2, extL, extR) {
  const [x1, y1] = p1, [x2, y2] = p2;
  const k = (y2 - y1) / (x2 - x1);
  return line(x1 - extL, y1 - 12 - k * extL, x2 + extR, y2 - 12 + k * extR);
}
const mirrorLevel = (lv) => ({
  ...lv,
  ball: [400 - lv.ball[0], lv.ball[1]],
  walls: (lv.walls || []).map(([a, b, c, d, t]) => [400 - c, d, 400 - a, b, t]),
  seesaws: (lv.seesaws || []).map(([x, y, l]) => [400 - x, y, l]),
  boxes: (lv.boxes || []).map(([x, y, w, h]) => [400 - x, y, w, h]),
  ropes: (lv.ropes || []).map(([x, y, w]) => [400 - x, y, w]),
  spinners: (lv.spinners || []).map(([x, y, l, d]) => [400 - x, y, l, -d]),
  doors: (lv.doors || []).map(({ button: [bx, by, bw], door: [a, b, c, d, t] }) => ({ button: [400 - bx, by, bw], door: [400 - c, d, 400 - a, b, t] })),
  magnets: (lv.magnets || []).map(([x, y, k, r]) => [400 - x, y, k, r]),
  extra: (lv.extra || []).map(([x, y]) => [400 - x, y]),
  ...(lv.button ? { button: [400 - lv.button[0], lv.button[1], lv.button[2]] } : {}),
  nodraw: (lv.nodraw || []).map(([x, y, w, h]) => [400 - x - w, y, w, h]),
  ...(lv.cup ? { cup: [400 - lv.cup[0], lv.cup[1]] } : {}),
  candidates: lv.candidates.map(c => c.map(s => s.map(([x, y]) => [400 - x, y]))),
});

// On passa la pilota per y = 540 (sense cistell). null si no hi arriba.
function landing(lv, sol) {
  const w = buildWorld(Matter, { ...lv, cup: [-900, 3000] });
  sol.forEach(s => w.addStroke(s));
  let still = 0;
  for (let f = 0; f < 1200; f++) {
    w.step();
    if (w.ball.position.y > 540) return w.ball.position.x;
    if (w.state === 'lost') return null;
    still = Math.hypot(w.ball.velocity.x, w.ball.velocity.y) < 0.05 ? still + 1 : 0;
    if (still > 120) return null; // encallada
  }
  return null;
}

// ---------- plantilles: escenari + solucions candidates ----------
const TEMPLATES = {
  rampa() {
    const bx = RI(50, 130), by = RI(40, 90);
    const k = Math.tan(R(10, 22) * Math.PI / 180);
    const p1 = [bx - RI(10, 35), by + RI(150, 250)];
    const d = RI(120, 200);
    const p2 = [p1[0] + d, r1(p1[1] + d * k)];
    return { kind: 'rampa', par: 1, ball: [bx, by], walls: [peg(...p1), peg(...p2)], candidates: [[rampOver(p1, p2, 25, RI(15, 45))]] };
  },
  pont() {
    const sy = RI(50, 120), gx = RI(130, 190), gy = RI(210, 300);
    const w = RI(70, 120), lw = RI(40, 60);
    const cx = gx + w + lw + 40;
    if (cx + 44 > 396 || (gy - sy) / gx < 0.5) return null;
    return {
      kind: 'pont', par: 1, ball: [24, sy - 20], cup: [cx, gy + 90],
      walls: [[0, sy, gx, gy, 12], [gx + w, gy, gx + w + lw, gy, 12], [cx + 42, gy - 60, cx + 42, gy + 90, 12]],
      nodraw: [[gx + 8, gy + 12, w - 16, 600 - gy - 12], [gx + w + lw - 10, gy + 10, 400 - (gx + w + lw - 10), 120]],
      candidates: [[line(gx - 12, gy - 14, gx + w + 14, gy - 14)]],
    };
  },
  balanci() {
    const px = RI(150, 230), py = RI(300, 430), len = RI(170, 220);
    const left = px - len / 2;
    const cands = [];
    for (let i = 0; i < 6; i++) {
      const s = RI(36, 46);
      cands.push([square(r1(px + len / 2 - s - RI(0, 20)), RI(py - 280, py - 150), s)]);
    }
    return { kind: 'balanci', par: 1, ball: [r1(left + 32), py - 18], seesaws: [[px, py, len]], walls: [peg(r1(left + 6), py + 11)], candidates: cands };
  },
  embut() {
    const bx = RI(160, 240);
    const p1 = [bx - RI(40, 70), RI(260, 330)];
    const p2 = [bx + RI(70, 110), p1[1] - RI(20, 45)];
    return { kind: 'embut', par: 1, ball: [bx, 50], walls: [peg(...p1), peg(...p2), [bx, RI(430, 470), bx, 600, 12]], candidates: [[rampOver(p1, p2, 40, 35)]] };
  },
  zigazaga() {
    const bx = RI(290, 340);
    const k1 = Math.tan(R(10, 16) * Math.PI / 180);
    const a1 = [bx + RI(5, 20), RI(170, 210)];
    const d1 = RI(130, 170);
    const a2 = [a1[0] - d1, r1(a1[1] + d1 * k1)];
    const k2 = Math.tan(R(12, 18) * Math.PI / 180);
    const b1 = [RI(55, 75), a2[1] + RI(90, 130)];
    const d2 = RI(160, 190);
    const b2 = [b1[0] + d2, r1(b1[1] + d2 * k2)];
    if (b2[1] > 440) return null;
    return { kind: 'zigazaga', par: 2, ball: [bx, 40], walls: [peg(...a1), peg(...a2), peg(...b1), peg(...b2)], candidates: [[rampOver(a2, a1, 20, 25).reverse(), rampOver(b1, b2, 22, 22)]] };
  },
  // La pilota és quieta en una lleixa: un pes baixa pel tobogan i l'empeny.
  empenta() {
    const lx = RI(130, 190), ly = RI(250, 360), lw = RI(55, 85); // lleixa curta: el pes arriba a la pilota
    const sx = lx - RI(90, 125), sy = ly - RI(80, 130);
    const cands = [];
    for (let i = 0; i < 18; i++) {
      const s = RI(30, 48), x = RI(sx + 8, sx + 50); // pesos més grans: empenyen més
      const yOn = sy + (x - sx) * (ly - sy) / (lx - sx);
      cands.push([square(x, r1(yOn - s - RI(14, 70)), s)]);
    }
    return { kind: 'empenta', par: 1, ball: [lx + lw - 12, ly - 19], walls: [[sx, sy, lx, ly, 12], [lx, ly, lx + lw, ly, 12]], candidates: cands };
  },
  // Una caixa alta dreta a la lleixa: tomba-la perquè empenyi la pilota.
  domino() {
    const lx = RI(110, 160), ly = RI(250, 360);
    const bxx = lx + RI(40, 60), bh = RI(64, 80);
    const ballX = bxx + RI(38, 54);
    const lw = ballX - lx + RI(8, 16); // la pilota, just a la vora: una empenta i cau
    const cands = [];
    for (let i = 0; i < 12; i++) {
      const s = RI(26, 40);
      cands.push([square(r1(bxx - s - RI(-10, 12)), r1(ly - bh - RI(90, 200)), s)]);
    }
    return { kind: 'domino', par: 1, ball: [ballX, ly - 19], walls: [[lx, ly, lx + lw, ly, 12]], boxes: [[bxx, r1(ly - 6 - bh / 2), 16, bh]], candidates: cands };
  },
  // Rampa amb poca tinta i obstacles: cal anar al gra.
  precisio() {
    const base = TEMPLATES[rnd() < 0.6 ? 'rampa' : 'embut']();
    const sol = base.candidates[0][0];
    const far = (x, y, m) => sol.every(([px, py]) => Math.hypot(px - x, py - y) > m) && Math.hypot(base.ball[0] - x, base.ball[1] - y) > 60;
    const walls = [...base.walls];
    for (let i = 0; i < 2; i++) {
      const x = RI(40, 360), y = RI(150, 430), len = RI(40, 90), ang = R(-0.6, 0.6);
      const x2 = r1(x + len * Math.cos(ang)), y2 = r1(y + len * Math.sin(ang));
      if (far(x, y, 40) && far(x2, y2, 40) && far((x + x2) / 2, (y + y2) / 2, 40)) walls.push([x, y, x2, y2, 12]);
    }
    return { ...base, kind: 'precisio', walls, ink: r1(lenOf(sol) * 1.15) };
  },

  // ---------- objectius diferents del cistell ----------
  // Toca: la pilota groga ha d'arribar a la vermella, que és quieta en un tac.
  toca() {
    const r = TEMPLATES.rampa();
    return { ...r, kind: 'toca', place: 'ball2', goal: { type: 'touch' } };
  },
  // Tomba: una caixa alta a la vora de la taula; fes-la caure.
  tomba() {
    const ty = RI(300, 430), tx = RI(150, 250), tw = RI(110, 160);
    const bh = RI(70, 100), bw = RI(18, 26);
    const bx = r1(tx + tw / 2 - bw / 2 - RI(4, 16)); // a tocar de la vora dreta
    const cands = [];
    for (let i = 0; i < 14; i++) {
      const s = RI(30, 46);
      cands.push([square(r1(bx - s - RI(-14, 8)), r1(ty - bh - RI(80, 220)), s)]);
    }
    return {
      kind: 'tomba', par: 1, ball: [r1(tx - tw / 2 + 24), ty - 19], goal: { type: 'off', box: 0 },
      walls: [[r1(tx - tw / 2), ty, r1(tx + tw / 2), ty, 12]], boxes: [[bx, r1(ty - 6 - bh / 2), bw, bh]],
      nodraw: [[r1(tx + tw / 2 + 4), ty - 140, 400 - r1(tx + tw / 2 + 4), 600 - ty + 140]],
      candidates: cands,
    };
  },
  // Aguanta: la pilota cau del cel; fes-li un bressol sobre els tacs perquè no caigui.
  aguanta() {
    const bx = RI(120, 280), gap = RI(110, 170), py = RI(300, 420);
    const p1 = [bx - r1(gap / 2) + RI(-20, 20), py + RI(-25, 25)];
    const p2 = [p1[0] + gap, py + RI(-25, 25)];
    const cands = [];
    for (let i = 0; i < 8; i++) {
      const dip = RI(30, 60), ext = RI(8, 22);
      const mid = [r1((p1[0] + p2[0]) / 2), r1(Math.max(p1[1], p2[1]) + dip)];
      cands.push([[...line(p1[0] - ext, p1[1] - 14, mid[0], mid[1], 6), ...line(mid[0], mid[1], p2[0] + ext, p2[1] - 14, 6).slice(1)]]);
    }
    return { kind: 'aguanta', par: 1, ball: [bx, 40], goal: { type: 'hold', secs: 5 }, walls: [peg(...p1), peg(...p2)], candidates: cands };
  },
  // ---------- corda i plataforma que gira ----------
  // Talla: la pilota penja d'una corda sobre un tobogan; talla-la.
  talla() {
    const dir = rnd() < 0.5 ? 1 : -1;
    const bx = RI(110, 290), by = RI(170, 260), ay = by - RI(80, 130);
    const ty = by + RI(110, 180);
    const walls = [[bx - dir * 40, ty, bx + dir * RI(120, 170), ty + RI(35, 70), 12]].map(([a, b, c, d, t]) => (a < c ? [a, b, c, d, t] : [c, d, a, b, t]));
    const cands = [];
    for (let i = 0; i < 8; i++) { const yc = RI(ay + 20, by - 25), w = RI(18, 34); cands.push([line(bx - w, yc, bx + w, yc + RI(-6, 6), 4)]); }
    return { kind: 'talla', par: 1, ball: [bx, by], ropes: [[bx, ay, 'ball']], walls, candidates: cands };
  },
  // Talla i rampa: primer la rampa sobre els tacs, després talla la corda.
  tallarampa() {
    const r = TEMPLATES.rampa();
    const [bx, by] = r.ball;
    const ay = Math.max(20, by - RI(30, 50));
    const ballY = by + RI(50, 90); // la pilota penja més avall del punt fix
    const cands = [];
    for (let i = 0; i < 6; i++) { const yc = RI(ay + 12, ballY - 22), w = RI(16, 28); cands.push([r.candidates[0][0], line(bx - w, yc, bx + w, yc, 4)]); }
    return { ...r, kind: 'tallarampa', par: 2, ball: [bx, ballY], ropes: [[bx, ay, 'ball']], candidates: cands };
  },
  // Catapulta: un pes penja sobre la punta d'un balancí; talla la corda.
  catapulta() {
    const px = RI(150, 230), py = RI(330, 430), len = RI(170, 220);
    const left = px - len / 2, right = px + len / 2;
    const s = RI(34, 44), wx = r1(right - s / 2 - RI(4, 18)), wy = RI(py - 260, py - 150);
    const ay = wy - RI(60, 100);
    if (ay < 20) return null;
    const cands = [];
    for (let i = 0; i < 8; i++) { const yc = RI(ay + 14, wy - s / 2 - 14), w = RI(16, 30); cands.push([line(wx - w, yc, wx + w, yc, 4)]); }
    return {
      kind: 'catapulta', par: 1, ball: [r1(left + 32), py - 18], seesaws: [[px, py, len]], walls: [peg(r1(left + 6), py + 11)],
      boxes: [[wx, wy, s, s]], ropes: [[wx, ay, 0]], candidates: cands,
    };
  },
  // Molinet: una plataforma gira sota la pilota; fes-li un camí que l'esquivi.
  molinet() {
    const sx = RI(150, 250), sy = RI(250, 360), len = RI(100, 150);
    const dps = (rnd() < 0.5 ? -1 : 1) * RI(50, 110);
    const bx = sx + RI(-50, 50);
    const p1 = [RI(30, 120), RI(140, 230)];
    const k = Math.tan(R(12, 22) * Math.PI / 180);
    const d = RI(140, 220);
    const p2 = [p1[0] + d, r1(p1[1] + d * k)];
    if (Math.hypot(p2[0] - sx, p2[1] - sy) < len / 2 + 30 || Math.hypot(p1[0] - sx, p1[1] - sy) < len / 2 + 30) return null;
    return {
      kind: 'molinet', par: 1, ball: [bx, 40], spinners: [[sx, sy, len, dps]], walls: [peg(...p1), peg(...p2)],
      candidates: [[rampOver(p1, p2, 25, RI(15, 40))]],
    };
  },
  // ---------- combinacions: una idea per nivell ----------
  // Tomba amb la corda: un pes penja sobre una caixa alta a la vora de la taula.
  cordatomba() {
    const t = TEMPLATES.tomba();
    const [bx, by, bw, bh] = t.boxes[0];
    const s = RI(30, 40), wx = r1(bx - bw / 2 - s / 2 + RI(-4, 10)), wy = r1(by - bh / 2 - RI(70, 150));
    const ay = wy - RI(50, 90);
    if (ay < 20) return null;
    const cands = [];
    for (let i = 0; i < 8; i++) { const yc = RI(ay + 12, wy - s / 2 - 12), w = RI(14, 26); cands.push([line(wx - w, yc, wx + w, yc, 4)]); }
    return { ...t, kind: 'cordatomba', boxes: [...t.boxes, [wx, wy, s, s]], ropes: [[wx, ay, 1]], candidates: cands };
  },
  // Talla i toca: la pilota penja; rampa i després talla, fins a la vermella.
  cordatoca() {
    const t = TEMPLATES.tallarampa();
    return { ...t, kind: 'cordatoca', place: 'ball2', goal: { type: 'touch' } };
  },
  // Catapulta a la zona: el balancí llança la pilota fins a la lleixa marcada.
  catapultazona() {
    const t = TEMPLATES.catapulta();
    return t && { ...t, kind: 'catapultazona', place: 'zone', goal: { type: 'zone', zone: [0, 0, 0, 0] } };
  },
  // Molinet a la zona: guia la pilota que llança la plataforma fins a la zona.
  molinetzona() {
    const t = TEMPLATES.molinet();
    return t && { ...t, kind: 'molinetzona', place: 'zone', goal: { type: 'zone', zone: [0, 0, 0, 0] } };
  },
  // Corda sobre el molinet: talla la corda i la plataforma llança la pilota.
  cordamolinet() {
    const sx = RI(140, 260), sy = RI(300, 400), len = RI(100, 140);
    const dps = (rnd() < 0.5 ? -1 : 1) * RI(50, 110);
    const bx = sx + RI(-45, 45), by = sy - len / 2 - RI(60, 120), ay = by - RI(70, 120);
    if (ay < 20) return null;
    const cands = [];
    for (let i = 0; i < 8; i++) { const yc = RI(ay + 14, by - 24), w = RI(16, 28); cands.push([line(bx - w, yc, bx + w, yc, 4)]); }
    return { kind: 'cordamolinet', par: 1, ball: [bx, r1(by)], ropes: [[bx, r1(ay), 'ball']], spinners: [[sx, sy, len, dps]], walls: [], candidates: cands };
  },
  // Aguanta sobre el molinet: un bressol que no toqui la plataforma que gira.
  aguantamolinet() {
    const t = TEMPLATES.aguanta();
    const [x1, y1] = [t.walls[0][0] + 6, t.walls[0][1]], [x2, y2] = [t.walls[1][0] + 6, t.walls[1][1]];
    const len = RI(80, 120);
    const sx = r1((x1 + x2) / 2), sy = r1(Math.max(y1, y2) + 60 + len / 2 + RI(10, 40));
    if (sy + len / 2 > 590) return null;
    return { ...t, kind: 'aguantamolinet', spinners: [[sx, sy, len, (rnd() < 0.5 ? -1 : 1) * RI(60, 120)]] };
  },
  // Dòmino doble: dues caixes en cadena fins a la pilota.
  dominodoble() {
    const lx = RI(60, 110), ly = RI(260, 360);
    const b1 = lx + RI(30, 45), h1 = RI(64, 78);
    const b2 = b1 + RI(42, 56), h2 = RI(64, 80);
    const ballX = b2 + RI(38, 50);
    const lw = ballX - lx + RI(8, 16);
    if (lx + lw > 380) return null;
    const cands = [];
    for (let i = 0; i < 12; i++) { const s = RI(26, 40); cands.push([square(r1(b1 - s - RI(-10, 12)), r1(ly - h1 - RI(90, 200)), s)]); }
    return { kind: 'dominodoble', par: 1, ball: [ballX, ly - 19], walls: [[lx, ly, lx + lw, ly, 12]], boxes: [[b1, r1(ly - 6 - h1 / 2), 16, h1], [b2, r1(ly - 6 - h2 / 2), 16, h2]], candidates: cands };
  },
  // Catapulta que toca: el balancí llança la pilota fins a la vermella.
  catapultatoca() {
    const t = TEMPLATES.catapulta();
    return t && { ...t, kind: 'catapultatoca', place: 'ball2', goal: { type: 'touch' } };
  },
  // ---------- segona tanda de combinacions ----------
  // Pont i toca / pont i zona: el pont de sempre, però amb un altre objectiu.
  pontsense() {
    const t = TEMPLATES.pont();
    if (!t) return null;
    // sense cistell ni paret del fons: l'objectiu el posa la simulació
    return { ...t, cup: undefined, walls: t.walls.slice(0, 2), nodraw: [t.nodraw[0]] };
  },
  pontoca() { const t = TEMPLATES.pontsense(); return t && { ...t, kind: 'pontoca', place: 'ball2', goal: { type: 'touch' } }; },
  pontzona() { const t = TEMPLATES.pontsense(); return t && { ...t, kind: 'pontzona', place: 'zone', goal: { type: 'zone', zone: [0, 0, 0, 0] } }; },
  // Molinet i toca: la plataforma llança la pilota contra la vermella.
  molinettoca() { const t = TEMPLATES.molinet(); return t && { ...t, kind: 'molinettoca', place: 'ball2', goal: { type: 'touch' } }; },
  // Corda i zona: talla la corda i que la pilota s'aturi a la zona.
  cordazona() { const t = TEMPLATES.talla(); return t && { ...t, kind: 'cordazona', place: 'zone', goal: { type: 'zone', zone: [0, 0, 0, 0] } }; },
  // Embut i toca: recull la pilota que cau i porta-la fins a la vermella.
  embuttoca() { const t = TEMPLATES.embut(); return { ...t, kind: 'embuttoca', walls: t.walls.slice(0, 2), place: 'ball2', goal: { type: 'touch' } }; },
  // Equilibri: la pilota és sobre un balancí que es tomba; posa-hi un contrapès.
  equilibri() {
    const px = RI(150, 250), py = RI(320, 440), len = RI(180, 230);
    const left = px - len / 2, right = px + len / 2;
    const cands = [];
    for (let i = 0; i < 14; i++) {
      const s = RI(30, 50);
      cands.push([square(r1(right - s - RI(0, 50)), r1(py - 20 - s - RI(0, 40)), s)]);
    }
    return { kind: 'equilibri', par: 1, ball: [r1(left + RI(28, 50)), py - 18], seesaws: [[px, py, len]], goal: { type: 'hold', secs: 5 }, walls: [], candidates: cands };
  },
  // Tinta i toca / tinta i zona: tinta justa i obstacles.
  tintatoca() { const t = TEMPLATES.precisio(); return { ...t, kind: 'tintatoca', place: 'ball2', goal: { type: 'touch' } }; },
  tintazona() { const t = TEMPLATES.precisio(); return { ...t, kind: 'tintazona', place: 'zone', goal: { type: 'zone', zone: [0, 0, 0, 0] } }; },
  // ---------- botó i porta ----------
  // Un botó lluny de la pilota i dels camins per on cauen els gargots de prova.
  botoPos(avoidX) {
    for (let k = 0; k < 20; k++) {
      const bx = RI(70, 330), by = RI(240, 440);
      if (Math.abs(bx - avoidX) < 100 || Math.abs(bx - 200) < 45) continue;
      return [bx, by, RI(40, 56)];
    }
    return null;
  },
  pesos(btn, n = 10) {
    const [bx, by, bw] = btn, out = [];
    for (let i = 0; i < n; i++) { const s = RI(26, 40); out.push(square(r1(bx - s / 2 + RI(-bw / 3, bw / 3)), r1(by - s - RI(60, 160)), s)); }
    return out;
  },
  // Trapa: la pilota és sobre una trapa damunt del cistell; el botó l'obre.
  trapa() {
    const cx = RI(80, 320), btn = TEMPLATES.botoPos(cx);
    if (!btn) return null;
    return {
      kind: 'trapa', par: 1, ball: [cx, 498], cup: [cx, 578],
      doors: [{ button: btn, door: [cx - 46, 516, cx + 46, 516, 10] }],
      walls: [], candidates: TEMPLATES.pesos(btn).map(s => [s]),
    };
  },
  // Trapa i toca: a sota de la trapa hi ha la pilota vermella.
  trapatoca() {
    const t = TEMPLATES.trapa();
    if (!t) return null;
    const cx = t.ball[0], yy = RI(560, 575);
    return { ...t, kind: 'trapatoca', cup: undefined, ball2: [cx + RI(-8, 8), yy], walls: [[cx - 18, yy + 19, cx + 18, yy + 19, 10]], goal: { type: 'touch' } };
  },
  // Trapa i zona: quan s'obre, la pilota ha d'acabar a la zona.
  trapazona() {
    const t = TEMPLATES.trapa();
    if (!t) return null;
    const cx = t.ball[0];
    return { ...t, kind: 'trapazona', ball: [cx, 300], cup: undefined, doors: [{ ...t.doors[0], door: [cx - 46, 318, cx + 46, 318, 10] }], place: 'zone', goal: { type: 'zone', zone: [0, 0, 0, 0] } };
  },
  // Botó i rampa: el cistell és tapat; obre'l amb el botó i fes-hi una rampa.
  botorampa() {
    const r = TEMPLATES.rampa();
    const btn = TEMPLATES.botoPos(r.ball[0]);
    if (!btn) return null;
    // la tapa del cistell es posa quan se sap on cau la pilota (vegeu tryCandidate)
    // primer la rampa i després el pes: és l'ordre en què ho faria una persona (el primer
    // traç posa el món en marxa; la pilota espera sobre la tapa fins que es prem el botó)
    return { ...r, kind: 'botorampa', par: 2, lid: btn, candidates: TEMPLATES.pesos(btn, 6).map(s => [r.candidates[0][0], s]) };
  },
  // ---------- imant ----------
  // Un imant en un lloc on no toqui la solució ni la pilota d'entrada.
  // A prop del camí: un punt de la rampa desplaçat 50-90 px en una direcció a l'atzar.
  imantPer(lv) {
    const pts = lv.candidates[0].flat();
    for (let k = 0; k < 30; k++) {
      const [px, py] = pts[Math.floor(rnd() * pts.length)];
      const a = R(0, Math.PI * 2), d = R(50, 90);
      const x = r1(px + Math.cos(a) * d), y = r1(py + Math.sin(a) * d);
      if (x < 30 || x > 370 || y < 120 || y > 480) continue;
      const far = pts.every(([qx, qy]) => Math.hypot(qx - x, qy - y) > 40) && Math.hypot(lv.ball[0] - x, lv.ball[1] - y) > 90;
      if (far) return [x, y, R(1.5, 3.5), RI(90, 140)];
    }
    return null;
  },
  iman() {
    const r = TEMPLATES.rampa(), m = TEMPLATES.imantPer(r);
    return m && { ...r, kind: 'iman', magnets: [m] };
  },
  imantoca() { const t = TEMPLATES.iman(); return t && { ...t, kind: 'imantoca', place: 'ball2', goal: { type: 'touch' } }; },
  imanzona() { const t = TEMPLATES.iman(); return t && { ...t, kind: 'imanzona', place: 'zone', goal: { type: 'zone', zone: [0, 0, 0, 0] } }; },
  // Imant a prop del camí real de la pilota: es simula l'escenari amb la primera
  // solució (sense objectiu ni imant) i s'agafa un punt del recorregut desplaçat 50-90 px.
  imantCami(lv) {
    const w = buildWorld(Matter, { ...lv, cup: undefined, goal: { type: 'hold', secs: 99 }, magnets: [] });
    lv.candidates[0].forEach(s => w.addStroke(s));
    const path = [];
    for (let f = 0; f < 400 && w.state !== 'lost'; f++) { w.step(); if (f % 5 === 0) path.push([w.ball.position.x, w.ball.position.y]); }
    if (path.length < 10) return null;
    for (let k = 0; k < 30; k++) {
      const [px, py] = path[Math.floor(R(0.3, 0.9) * path.length)];
      const a = R(0, Math.PI * 2), d = R(50, 90);
      const x = r1(px + Math.cos(a) * d), y = r1(py + Math.sin(a) * d);
      if (x < 30 || x > 370 || y < 120 || y > 500) continue;
      if (Math.hypot(lv.ball[0] - x, lv.ball[1] - y) < 90) continue;
      const pts = lv.candidates[0].flat();
      if (pts.some(([qx, qy]) => Math.hypot(qx - x, qy - y) < 40)) continue;
      return [x, y, R(1.5, 3.5), RI(90, 140)];
    }
    return null;
  },
  ambImant(t, kind) {
    if (!t) return null;
    const m = TEMPLATES.imantCami(t);
    return m && { ...t, kind, magnets: [m] };
  },
  imantalla() { return TEMPLATES.ambImant(TEMPLATES.talla(), 'imantalla'); },
  imanmolinet() { return TEMPLATES.ambImant(TEMPLATES.molinet(), 'imanmolinet'); },
  imancatapulta() { return TEMPLATES.ambImant(TEMPLATES.catapulta(), 'imancatapulta'); },
  imanpenjatoca() { const t = TEMPLATES.ambImant(TEMPLATES.tallarampa(), 'imanpenjatoca'); return t && { ...t, place: 'ball2', goal: { type: 'touch' } }; },
  // Trapa i imant: la pilota és sobre una trapa a mitja alçada; l'imant la porta al cistell.
  imantrapa() {
    const t = TEMPLATES.trapa();
    if (!t) return null;
    const cx = t.ball[0];
    const base = { ...t, ball: [cx, 300], cup: undefined, doors: [{ ...t.doors[0], door: [cx - 46, 318, cx + 46, 318, 10] }] };
    return TEMPLATES.ambImant(base, 'imantrapa');
  },
  // ---------- dues pilotes ----------
  // Dues i rampa: dues pilotes juntes i una sola rampa.
  duesrampa() {
    const r = TEMPLATES.rampa();
    return { ...r, kind: 'duesrampa', extra: [[r.ball[0] + RI(30, 50), r.ball[1] + RI(-10, 10)]] };
  },
  // Dues rampes: una pilota a cada banda, i una rampa per a cadascuna.
  duesrampes() {
    const k = Math.tan(R(12, 20) * Math.PI / 180);
    const lb = [RI(40, 90), RI(40, 80)], rb = [RI(310, 360), RI(40, 80)];
    const l1 = [lb[0] - RI(5, 25), lb[1] + RI(150, 220)], dl = RI(90, 130), l2 = [l1[0] + dl, r1(l1[1] + dl * k)];
    const r1p = [rb[0] + RI(5, 25), rb[1] + RI(150, 220)], dr = RI(90, 130), r2 = [r1p[0] - dr, r1(r1p[1] + dr * k)];
    if (l2[0] > 190 || r2[0] < 210) return null;
    return {
      kind: 'duesrampes', par: 2, ball: lb, extra: [rb], walls: [peg(...l1), peg(...l2), peg(...r1p), peg(...r2)],
      candidates: [[rampOver(l1, l2, 25, RI(10, 30)), rampOver(r2, r1p, RI(10, 30), 25).reverse()]],
    };
  },
  // Dues i pont: totes dues rodolen per sobre del pont.
  duespont() {
    const t = TEMPLATES.pont();
    return t && { ...t, kind: 'duespont', ball: [24, t.ball[1]], extra: [[58, t.ball[1] + RI(14, 22)]] };
  },
  // Dues i imant: l'imant les atreu totes dues.
  duesimant() { return TEMPLATES.ambImant(TEMPLATES.duesrampa(), 'duesimant'); },
  // Dues cordes: cada pilota penja de la seva corda; un sol traç les ha de tallar totes dues.
  duestalla() {
    const t = TEMPLATES.talla();
    const [bx, by] = t.ball, ay = t.ropes[0][1];
    const dx = rnd() < 0.5 ? -RI(32, 44) : RI(32, 44);
    const cands = [];
    for (let i = 0; i < 8; i++) {
      const yc = RI(ay + 18, by - 26), a = Math.min(bx, bx + dx) - RI(14, 24), b = Math.max(bx, bx + dx) + RI(14, 24);
      cands.push([line(a, yc, b, yc + RI(-5, 5), 6)]);
    }
    return { ...t, kind: 'duestalla', extra: [[bx + dx, by]], ropes: [...t.ropes, [bx + dx, ay, 'e0']], candidates: cands };
  },
  // ---------- tres mecanismes ----------
  // Corda, molinet i imant.
  cordamolinetiman() { return TEMPLATES.ambImant(TEMPLATES.cordamolinet(), 'cordamolinetiman'); },
  // Corda, trapa i imant: talla la corda, la pilota cau sobre la trapa; prem el botó.
  cordatrapa() {
    const bx = RI(100, 300), by = RI(140, 200), ay = by - RI(70, 110);
    const ly = by + RI(70, 110);
    const btn = TEMPLATES.botoPos(bx);
    if (!btn || ay < 20) return null;
    const cuts = [];
    for (let i = 0; i < 4; i++) { const yc = RI(ay + 14, by - 24), w = RI(16, 28); cuts.push(line(bx - w, yc, bx + w, yc, 4)); }
    const pes = TEMPLATES.pesos(btn, 4);
    const cands = cuts.flatMap(c => pes.map(p => [c, p]));
    return { kind: 'cordatrapa', par: 2, ball: [bx, by], ropes: [[bx, ay, 'ball']], doors: [{ button: btn, door: [bx - 40, ly, bx + 40, ly, 10] }], walls: [], candidates: cands };
  },
  cordatrapaiman() { return TEMPLATES.ambImant(TEMPLATES.cordatrapa(), 'cordatrapaiman'); },
  // Trapa, molinet i imant: la pilota cau de la trapa sobre la plataforma que gira.
  trapamolinet() {
    const bx = RI(120, 280), ly = RI(200, 260);
    const btn = TEMPLATES.botoPos(bx);
    if (!btn) return null;
    const len = RI(100, 140), sy = ly + len / 2 + RI(50, 90);
    const sx = bx + RI(-40, 40);
    if (Math.hypot(btn[0] - sx, btn[1] - sy) < len / 2 + 40) return null;
    return {
      kind: 'trapamolinet', par: 1, ball: [bx, ly - 18], spinners: [[sx, r1(sy), len, (rnd() < 0.5 ? -1 : 1) * RI(50, 110)]],
      doors: [{ button: btn, door: [bx - 40, ly, bx + 40, ly, 10] }], walls: [], candidates: TEMPLATES.pesos(btn).map(s => [s]),
    };
  },
  trapamolinetiman() { return TEMPLATES.ambImant(TEMPLATES.trapamolinet(), 'trapamolinetiman'); },
  // Dues pilotes, corda i botó: talla la corda del pes; el pes prem el botó i s'obre la trapa.
  duestrapa() {
    const cx = RI(90, 310), btn = TEMPLATES.botoPos(cx);
    if (!btn) return null;
    const [bx, by] = btn, s = RI(30, 38);
    const wy = by - s / 2 - RI(40, 90), ay = wy - RI(50, 90);
    if (ay < 20) return null;
    const cands = [];
    for (let i = 0; i < 8; i++) { const yc = RI(ay + 12, wy - s / 2 - 12), w = RI(14, 26); cands.push([line(bx - w, yc, bx + w, yc, 4)]); }
    return {
      kind: 'duestrapa', par: 1, ball: [cx - 15, 498], extra: [[cx + 15, 498]], cup: [cx, 578],
      boxes: [[bx, r1(wy), s, s]], ropes: [[bx, r1(ay), 0]],
      doors: [{ button: [bx, by, btn[2]], door: [cx - 46, 516, cx + 46, 516, 10] }], walls: [], candidates: cands,
    };
  },
  // ---------- més combinacions de tres ----------
  // Una plataforma que gira al camí de la pilota (com ambImant però amb un molinet).
  ambMolinet(t, kind) {
    if (!t) return null;
    const w = buildWorld(Matter, { ...t, cup: undefined, goal: { type: 'hold', secs: 99 } });
    t.candidates[0].forEach(s => w.addStroke(s));
    const path = [];
    for (let f = 0; f < 400 && w.state !== 'lost'; f++) { w.step(); if (f % 5 === 0) path.push([w.ball.position.x, w.ball.position.y]); }
    if (path.length < 10) return null;
    const pts = t.candidates[0].flat();
    for (let k = 0; k < 30; k++) {
      const [px, py] = path[Math.floor(R(0.4, 0.85) * path.length)];
      const len = RI(90, 130), a = R(0, Math.PI * 2), d = R(15, 40);
      const x = r1(px + Math.cos(a) * d), y = r1(py + Math.sin(a) * d);
      if (x < len / 2 + 10 || x > 400 - len / 2 - 10 || y < 150 || y > 500) continue;
      if (Math.hypot(t.ball[0] - x, t.ball[1] - y) < len / 2 + 40) continue;
      if (pts.some(([qx, qy]) => Math.hypot(qx - x, qy - y) < len / 2 + 15)) continue;
      return { ...t, kind, spinners: [...(t.spinners || []), [x, y, len, (rnd() < 0.5 ? -1 : 1) * RI(50, 110)]], need: [...(t.need || []), 'spinners'] };
    }
    return null;
  },
  // Catapulta i trapa: talla la corda, la pilota cau sobre la tapa del cistell; prem el botó.
  catapultatrapa() {
    const t = TEMPLATES.catapulta();
    if (!t) return null;
    const btn = TEMPLATES.botoPos(t.ball[0]);
    if (!btn) return null;
    const pes = TEMPLATES.pesos(btn, 4);
    return { ...t, kind: 'catapultatrapa', par: 2, lid: btn, candidates: t.candidates.slice(0, 4).flatMap(c => pes.map(p => [c[0], p])) };
  },
  // Corda, molinet i dues: dues pilotes pengen sobre el molinet; talla-les d'un sol traç.
  cordamolinetdues() {
    const t = TEMPLATES.cordamolinet();
    if (!t) return null;
    const [bx, by] = t.ball, ay = t.ropes[0][1];
    const dx = rnd() < 0.5 ? -RI(32, 42) : RI(32, 42);
    const cands = [];
    for (let i = 0; i < 8; i++) {
      const yc = RI(ay + 18, by - 26), a = Math.min(bx, bx + dx) - RI(14, 24), b = Math.max(bx, bx + dx) + RI(14, 24);
      cands.push([line(a, yc, b, yc + RI(-5, 5), 6)]);
    }
    return { ...t, kind: 'cordamolinetdues', extra: [[bx + dx, by]], ropes: [...t.ropes, [bx + dx, ay, 'e0']], candidates: cands };
  },
  // Pont, imant i toca.
  pontimantoca() { return TEMPLATES.ambImant(TEMPLATES.pontoca(), 'pontimantoca'); },
  // Catapulta i molinet: el balancí llança la pilota contra la plataforma que gira.
  catapultamolinet() { return TEMPLATES.ambMolinet(TEMPLATES.catapulta(), 'catapultamolinet'); },
  // Cadena: talla la corda; el pes tomba la caixa, la caixa prem el botó, s'obre la trapa.
  cadena() {
    const ty = RI(280, 380), tx = RI(110, 190), tw = RI(130, 170);
    const bh = RI(70, 90), bw = 18;
    const bx = r1(tx - tw / 2 + RI(30, 50));
    const btnX = r1(bx + bh * 0.8), btn = [btnX, ty - 10, 44];
    if (btnX + 22 > tx + tw / 2) return null;
    const cx = rnd() < 0.5 ? RI(50, 90) : RI(300, 350);
    if (Math.abs(cx - tx) < tw / 2 + 50) return null;
    const s = RI(30, 38), wx = r1(bx - bw / 2 - s / 2 + RI(-2, 8)), wy = r1(ty - bh - RI(60, 120));
    const ay = wy - RI(50, 80);
    if (ay < 20) return null;
    const cands = [];
    for (let i = 0; i < 8; i++) { const yc = RI(ay + 12, wy - s / 2 - 12), w = RI(14, 26); cands.push([line(wx - w, yc, wx + w, yc, 4)]); }
    return {
      kind: 'cadena', par: 1, ball: [cx, 498], cup: [cx, 578],
      walls: [[r1(tx - tw / 2), ty, r1(tx + tw / 2), ty, 12]],
      boxes: [[bx, r1(ty - 6 - bh / 2), bw, bh], [wx, wy, s, s]], ropes: [[wx, ay, 1]],
      doors: [{ button: btn, door: [cx - 46, 516, cx + 46, 516, 10] }], candidates: cands,
    };
  },
  imanbressol() {
    const t = TEMPLATES.aguanta();
    const [x1, y1] = [t.walls[0][0] + 6, t.walls[0][1]], [x2, y2] = [t.walls[1][0] + 6, t.walls[1][1]];
    // l'imant, al costat del bressol: estira la pilota cap a fora
    const side = rnd() < 0.5 ? -1 : 1;
    const mx = r1((side < 0 ? Math.min(x1, x2) : Math.max(x1, x2)) + side * RI(50, 80)), my = r1((y1 + y2) / 2 + RI(-10, 40));
    if (mx < 20 || mx > 380) return null;
    return { ...t, kind: 'imanbressol', magnets: [[mx, my, R(1, 2.2), RI(80, 120)]] };
  },
  // Zona: porta la pilota a la lleixa marcada i que s'hi quedi.
  zona() {
    const r = TEMPLATES.rampa();
    return { ...r, kind: 'zona', place: 'zone', goal: { type: 'zone', zone: [0, 0, 0, 0] } };
  },
};

const NAMES = {
  rampa: ['Rampa', 'Recolza una rampa sobre els tacs'],
  pont: ['Pont', 'Fes-li un pont sobre el forat'],
  balanci: ['Balancí', "Deixa caure un pes a l'altra punta"],
  embut: ['Embut', 'Recull la pilota que cau'],
  zigazaga: ['Ziga-zaga', 'Calen dues rampes'],
  empenta: ['Empenta', 'Fes baixar un pes pel tobogan'],
  domino: ['Dòmino', 'Tomba la caixa cap a la pilota'],
  precisio: ['Poca tinta', 'Tinta justa: aprofita-la bé'],
  toca: ['Toca', 'Fes que la pilota groga toqui la vermella'],
  tomba: ['Tomba', 'Fes caure la caixa de la taula'],
  aguanta: ['Aguanta', 'Que la pilota no caigui durant 5 segons'],
  zona: ['Zona', 'Deixa la pilota quieta dins la zona'],
  talla: ['Talla', 'Talla la corda amb un traç'],
  tallarampa: ['Talla i rampa', 'Prepara el camí i després talla la corda'],
  catapulta: ['Catapulta', 'Talla la corda i deixa caure el pes'],
  molinet: ['Molinet', 'Compte amb la plataforma que gira'],
  cordatomba: ['Pes i caixa', 'Talla la corda i que el pes tombi la caixa'],
  cordatoca: ['Penja i toca', 'Rampa, talla la corda i toca la vermella'],
  catapultazona: ['Catapulta i zona', 'Llança la pilota fins a la zona'],
  molinetzona: ['Molinet i zona', 'Guia la pilota fins a la zona'],
  cordamolinet: ['Corda i molinet', 'Talla la corda sobre la plataforma que gira'],
  aguantamolinet: ['Bressol', 'Que no caigui, i compte amb el molinet'],
  dominodoble: ['Dòmino doble', 'Tomba la primera caixa i que caigui la pilota'],
  catapultatoca: ['Catapulta i toca', 'Llança la pilota fins a la vermella'],
  trapa: ['Trapa', 'Prem el botó i la trapa s’obrirà'],
  trapatoca: ['Trapa i toca', 'Obre la trapa: a sota hi ha la vermella'],
  trapazona: ['Trapa i zona', 'Obre la trapa i que la pilota pari a la zona'],
  botorampa: ['Botó i rampa', 'Destapa el cistell amb el botó i fes-hi arribar la pilota'],
  iman: ['Imant', "L'imant estira la pilota: aprofita-ho"],
  imantoca: ['Imant i toca', "Amb l'ajuda de l'imant, arriba a la vermella"],
  imanzona: ['Imant i zona', "Amb l'ajuda de l'imant, deixa la pilota a la zona"],
  imanbressol: ['Imant i bressol', "Que no caigui en 5 segons, i que l'imant no se l'endugui"],
  imantalla: ['Talla i imant', "Talla la corda: l'imant farà la resta"],
  duesrampa: ['Dues i rampa', 'Totes dues pilotes al cistell'],
  duesrampes: ['Dues rampes', 'Una pilota a cada banda: totes dues al cistell'],
  duespont: ['Dues i pont', 'Que passin totes dues pel pont'],
  duesimant: ['Dues i imant', "L'imant les estira totes dues"],
  duestalla: ['Dues cordes', "Talla les dues cordes d'un sol traç"],
  cordamolinetiman: ['Corda, molinet i imant', "Talla la corda: el molinet la llança i l'imant la porta"],
  cordatrapaiman: ['Corda, trapa i imant', "Talla la corda, obre la trapa i deixa fer l'imant"],
  trapamolinetiman: ['Trapa, molinet i imant', "Obre la trapa: el molinet i l'imant faran la resta"],
  duestrapa: ['Pes, botó i dues', 'Talla la corda del pes i que caiguin totes dues'],
  catapultatrapa: ['Catapulta i trapa', 'Llança la pilota sobre la tapa i després prem el botó'],
  cordamolinetdues: ['Corda, molinet i dues', "Talla les dues cordes d'un sol traç sobre el molinet"],
  pontimantoca: ['Pont, imant i toca', "Fes el pont i que l'imant la porti a la vermella"],
  catapultamolinet: ['Catapulta i molinet', 'Llança la pilota contra la plataforma que gira'],
  cadena: ['Cadena', 'Talla la corda i que tot vagi caient'],
  imanmolinet: ['Molinet i imant', "La plataforma la llança i l'imant la corba"],
  imancatapulta: ['Catapulta i imant', "Llança la pilota i deixa que l'imant l'atrapi"],
  imanpenjatoca: ['Penja, imant i toca', "Rampa, talla la corda i que l'imant la porti a la vermella"],
  imantrapa: ['Trapa i imant', "Obre la trapa: l'imant porta la pilota al cistell"],
  pontoca: ['Pont i toca', 'Fes el pont i arriba a la vermella'],
  pontzona: ['Pont i zona', "Creua el pont i atura't a la zona"],
  molinettoca: ['Molinet i toca', 'La plataforma la llança: que toqui la vermella'],
  cordazona: ['Corda i zona', 'Talla la corda i que la pilota pari a la zona'],
  embuttoca: ['Embut i toca', 'Recull la pilota i porta-la a la vermella'],
  equilibri: ['Equilibri', 'Posa un contrapès: que la pilota no caigui en 5 segons'],
  tintatoca: ['Tinta i toca', 'Tinta justa per arribar a la vermella'],
  tintazona: ['Tinta i zona', 'Tinta justa per deixar la pilota a la zona'],
};
// Ordre: cada tipus nou apareix aviat, i després es van barrejant.
// (Un tipus «Tap» —aturar una pilota massa ràpida— no va funcionar: amb aquesta física
// la pilota sempre queia sola al forat. Si es torna a provar, cal un altre plantejament.)
// (L'«Empenta» tampoc: cap nivell aguantava la prova de dibuixar com en un mòbil.)
let ORDER = ['toca', 'rampa', 'tomba', 'pont', 'aguanta', 'balanci', 'zona', 'domino', 'embut', 'zigazaga', 'precisio', 'talla', 'catapulta', 'molinet', 'tallarampa'];
// TIPUS=talla,molinet només fa aquests tipus.
if (process.env.TIPUS) ORDER = process.env.TIPUS.split(',');

const JIT = [[-8, 0], [8, 0], [0, -8], [0, 6], [-6, -6], [6, -6], [-6, 4], [6, 4]];
// Com ho dibuixaria un mòbil: píxels enters d'un tauler de w px i sense moviments de menys de 3 px.
export function asPhone(pts, w) {
  const k = w / 400, out = [];
  for (const [x, y] of pts) {
    const p = [Math.round(x * k) / k, Math.round(y * k) / k], q = out[out.length - 1];
    if (!q || Math.hypot((p[0] - q[0]) * k, (p[1] - q[1]) * k) >= 3) out.push(p);
  }
  return out;
}
const PHONES = [283, 324, 360];
const shift = (sol, dx, dy) => sol.map(s => s.map(([x, y]) => [x + dx, y + dy]));
const DUDS = [line(10, 20, 40, 20, 3), line(370, 30, 395, 30, 3), line(180, 20, 220, 22, 3)];

const why = {}; // per què es descarten les candidates (per afinar les plantilles)
const no = (k) => { why[k] = (why[k] || 0) + 1; return null; };
// On passa la pilota per y = yy amb la solució (sense objectiu que molesti).
function passAt(lv, sol, yy) {
  const w = buildWorld(Matter, { ...lv, cup: undefined, goal: { type: 'hold', secs: 99 } });
  sol.forEach(s => w.addStroke(s));
  for (let f = 0; f < 1200; f++) { w.step(); if (w.ball.position.y > yy) return w.ball.position.x; if (w.state === 'lost') return null; }
  return null;
}

// Les solucions, uns píxels dins del tauler: ningú no comença un traç just a la vora.
const inside = (sol) => sol.map(st => st.map(([x, y]) => [Math.min(394, Math.max(6, x)), Math.min(594, Math.max(6, y))]));

function tryCandidate(base, solRaw) {
  const sol = inside(solRaw);
  const { place, ...rest } = base;
  const lv = { ...rest, solution: sol };
  const goal = lv.goal || { type: 'cup' };
  const gtype = goal.type;
  if (place === 'ball2') {
    // la pilota vermella, quieta sobre un tac allà on passa la groga
    const yy = RI(420, 500), x = passAt(lv, sol, yy);
    if (x === null) return no('la pilota no cau');
    if (x < 40 || x > 360 || Math.abs(x - lv.ball[0]) < 70) return no('cau massa a la vora');
    lv.ball2 = [r1(x), yy + 6];
    lv.walls = [...lv.walls, [r1(x) - 16, yy + 25, r1(x) + 16, yy + 25, 10]];
  } else if (place === 'zone') {
    // una lleixa amb paret on la pilota s'atura, i la zona a sobre
    const yy = RI(460, 520), x = passAt(lv, sol, yy - 60);
    if (x === null) return no('la pilota no cau');
    if (x < 60 || x > 340) return no('cau massa a la vora');
    const dir = lv.ball[0] < x ? 1 : -1; // cap on va la pilota
    const x0 = r1(x - dir * 50), x1 = r1(x + dir * 70);
    lv.walls = [...lv.walls, [Math.min(x0, x1), yy, Math.max(x0, x1), yy, 12], [x1, yy - 50, x1, yy, 12]];
    lv.goal = { type: 'zone', zone: [Math.min(x1, x1 - dir * 80), yy - 46, 80, 40] };
  } else if (goal.type === 'cup' && !lv.cup) {
    const x = landing(lv, sol);
    if (x === null) return no('la pilota no cau');
    if (x < 48 || x > 352) return no('cau massa a la vora');
    lv.cup = [r1(x), 578];
  }
  if (lv.cup) {
    const [cx, cy] = lv.cup;
    if (cy > 560) lv.nodraw = [...(lv.nodraw || []), [Math.max(0, cx - 70), 450, Math.min(140, 400 - Math.max(0, cx - 70)), 150]];
  }
  if (lv.lid) {
    const [cx] = lv.cup;
    if (Math.abs(lv.lid[0] - cx) < 90) return no('el botó cau a sobre del cistell');
    // la tapa, enfonsada dins el cistell: la pilota s'hi queda esperant el botó
    lv.doors = [{ button: lv.lid, door: [cx - 31, 556, cx + 31, 556, 10] }];
    delete lv.lid;
  }
  if (simulate(Matter, lv, sol).state !== 'won') return no('la solució no guanya');
  const wins = JIT.filter(([dx, dy]) => simulate(Matter, lv, shift(sol, dx, dy)).state === 'won').length;
  // les empentes depenen de més coses: se'ls demana més marge
  if (wins < (['empenta', 'domino'].includes(base.kind) ? 7 : 6)) return no('massa just (mà tremolosa)');
  if (DUDS.some(d => simulate(Matter, lv, [d]).state === 'won')) return no('es resol amb un gargot');
  if (PHONES.some(w => simulate(Matter, lv, sol.map(s => asPhone(s, w))).state !== 'won')) return no('falla dibuixat com al mòbil');
  // need: mecanismes que han de comptar (sense ells, la mateixa solució no ha de guanyar)
  for (const k of lv.need || []) {
    if (simulate(Matter, { ...lv, [k]: [] }, sol).state === 'won') return no(`sense ${k} també guanya`);
  }
  // l'imant ha de comptar: ha de desviar la pilota i, sense ell, la solució no ha de funcionar
  if (lv.magnets && lv.magnets.length) {
    const sense = { ...lv, magnets: [] };
    const track = (l) => { const w = buildWorld(Matter, l); sol.forEach(s => w.addStroke(s)); const p = []; for (let f = 0; f < 600 && w.state === 'playing'; f++) { w.step(); p.push([w.ball.position.x, w.ball.position.y]); } return p; };
    const a = track(lv), b = track(sense);
    let dev = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) dev = Math.max(dev, Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]));
    if (dev < 40) return no("l'imant no fa res");
    if (gtype !== 'hold' && simulate(Matter, sense, sol).state === 'won') return no("l'imant no cal");
  }
  // dos traços: una persona tarda una estona a fer el segon
  if (sol.length > 1 && [60, 90, 180, 300].some(d => simulate(Matter, lv, [[0, sol[0]], [d, sol[1]]], 1500).state !== 'won')) return no('falla si el segon traç arriba tard');
  return lv;
}

// Nivells massa semblants: vegeu tools/rodola-semblanca.mjs.

// AFEGEIX=1: conserva els nivells generats que ja hi ha i n'afegeix de nous al
// final (així les estrelles dels jugadors no canvien de nivell).
const out = [];
const seen = new Set();
const tally = {};
if (process.env.AFEGEIX) {
  const prev = (await import('../rodola-generats.js?' + Date.now())).default;
  for (const lv of prev) {
    out.push(lv);
    const k = Object.keys(NAMES).find(key => lv.name.startsWith(NAMES[key][0] + ' '));
    if (k) tally[k] = Math.max(tally[k] || 0, +lv.name.split(' ').pop());
  }
}
const START = out.length;
let tries = 0;
const LIMIT = +(process.env.INTENTS || 600); // escenaris per tipus abans de rendir-se
let failsInRow = 0;
let slot = 0; // posició dins l'ordre de tipus; avança quan un tipus no surt
while (out.length - START < WANT && failsInRow < LIMIT * ORDER.length) {
  tries++;
  const kind = ORDER[(out.length - START + slot) % ORDER.length];
  if (++failsInRow % LIMIT === 0) {
    // aquest tipus no surt ara: es passa al següent i no s'atura tot
    console.error(`(${kind}: cap en ${LIMIT} escenaris, es passa al següent tipus)`, why);
    slot++;
    for (const k in why) delete why[k];
    continue;
  }
  let base = TEMPLATES[kind]();
  if (!base) continue;
  if (rnd() < 0.5) base = mirrorLevel(base);
  const { candidates, ...scene } = base;
  let lv = null;
  for (const sol of candidates) { lv = tryCandidate(scene, sol); if (lv) break; }
  if (!lv) continue;
  const key = JSON.stringify([lv.ball, lv.cup, lv.walls]);
  if (seen.has(key)) continue;
  if ([...BASE, ...out].some(o => levelDistance(o, lv) < SIMILAR)) { no('massa semblant a un altre'); continue; }
  seen.add(key);
  tally[kind] = (tally[kind] || 0) + 1;
  const [name, hint] = NAMES[kind];
  const { kind: _k, need: _n, ...clean } = lv; // need és només per comprovar
  out.push({ name: `${name} ${tally[kind]}`, hint, ...clean });
  failsInRow = 0;
  for (const k in why) delete why[k];
  process.stderr.write(`${out.length - START}/${WANT} ${kind} (${tries} escenaris)\n`);
}

const body = `// ============================================================
// rodola-generats.js — nivells generats de Fes-la caure (no editar a mà).
// Fet amb: node tools/rodola-genera.mjs ${WANT} ${SEED}
// Cada nivell s'ha simulat: es resol amb la solució, aguanta una mà
// tremolosa (6 de 8 traços desplaçats) i cap gargot el resol.
// ============================================================

export default ${JSON.stringify(out).replace(/\},\{"name"/g, '},\n{"name"')};
`;
fs.writeFileSync(new URL('../rodola-generats.js', import.meta.url), body);
console.log(`${out.length} nivells en ${tries} escenaris:`, tally, `${(body.length / 1024).toFixed(0)} KB`);
