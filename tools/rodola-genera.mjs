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
  if (simulate(Matter, lv, sol).state !== 'won') return no('la solució no guanya');
  const wins = JIT.filter(([dx, dy]) => simulate(Matter, lv, shift(sol, dx, dy)).state === 'won').length;
  // les empentes depenen de més coses: se'ls demana més marge
  if (wins < (['empenta', 'domino'].includes(base.kind) ? 7 : 6)) return no('massa just (mà tremolosa)');
  if (DUDS.some(d => simulate(Matter, lv, [d]).state === 'won')) return no('es resol amb un gargot');
  if (PHONES.some(w => simulate(Matter, lv, sol.map(s => asPhone(s, w))).state !== 'won')) return no('falla dibuixat com al mòbil');
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
  const { kind: _k, ...clean } = lv;
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
