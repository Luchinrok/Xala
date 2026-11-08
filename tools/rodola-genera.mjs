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
};
// Ordre: cada tipus nou apareix aviat, i després es van barrejant.
// (Un tipus «Tap» —aturar una pilota massa ràpida— no va funcionar: amb aquesta física
// la pilota sempre queia sola al forat. Si es torna a provar, cal un altre plantejament.)
const ORDER = ['rampa', 'empenta', 'pont', 'balanci', 'domino', 'embut', 'zigazaga', 'precisio'];

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
function tryCandidate(base, sol) {
  const lv = { ...base, solution: sol };
  if (!lv.cup) {
    const x = landing(lv, sol);
    if (x === null) return no('la pilota no cau');
    if (x < 48 || x > 352) return no('cau massa a la vora');
    lv.cup = [r1(x), 578];
  }
  const [cx, cy] = lv.cup;
  if (cy > 560) lv.nodraw = [...(lv.nodraw || []), [Math.max(0, cx - 70), 450, Math.min(140, 400 - Math.max(0, cx - 70)), 150]];
  if (simulate(Matter, lv, sol).state !== 'won') return no('la solució no guanya');
  const wins = JIT.filter(([dx, dy]) => simulate(Matter, lv, shift(sol, dx, dy)).state === 'won').length;
  // les empentes depenen de més coses: se'ls demana més marge
  if (wins < (['empenta', 'domino'].includes(base.kind) ? 7 : 6)) return no('massa just (mà tremolosa)');
  if (DUDS.some(d => simulate(Matter, lv, [d]).state === 'won')) return no('es resol amb un gargot');
  if (PHONES.some(w => simulate(Matter, lv, sol.map(s => asPhone(s, w))).state !== 'won')) return no('falla dibuixat com al mòbil');
  return lv;
}

const out = [];
const seen = new Set();
const tally = {};
let tries = 0;
const LIMIT = +(process.env.INTENTS || 600); // escenaris per tipus abans de rendir-se
let failsInRow = 0;
let slot = 0; // posició dins l'ordre de tipus; avança quan un tipus no surt
while (out.length < WANT && failsInRow < LIMIT * ORDER.length) {
  tries++;
  const kind = ORDER[(out.length + slot) % ORDER.length];
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
  seen.add(key);
  tally[kind] = (tally[kind] || 0) + 1;
  const [name, hint] = NAMES[kind];
  const { kind: _k, ...clean } = lv;
  out.push({ name: `${name} ${tally[kind]}`, hint, ...clean });
  failsInRow = 0;
  for (const k in why) delete why[k];
  process.stderr.write(`${out.length}/${WANT} ${kind} (${tries} escenaris)\n`);
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
