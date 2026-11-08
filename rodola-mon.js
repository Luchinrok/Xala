// ============================================================
// rodola-mon.js — el món físic de Fes-la caure, sense res de pantalla.
// Rep la llibreria Matter.js com a paràmetre (al navegador surt de
// vendor/matter.min.js; a les proves, del mateix fitxer amb require).
// Unitats: un món de 400 × 600, amb la y cap avall.
// ============================================================

export const W = 400;
export const H = 600;
export const T = 8;          // gruix del traç
export const BALL_R = 13;
export const CUP_W = 64;     // amplada de dins del cistell
export const CUP_H = 56;     // alçada de les parets
export const STEP_MS = 1000 / 60;

// Un segment [x1, y1, x2, y2, gruix] convertit en rectangle.
function segment(Bodies, [x1, y1, x2, y2, th = 14], opts) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  return Bodies.rectangle((x1 + x2) / 2, (y1 + y2) / 2, len, th, { ...opts, angle: Math.atan2(y2 - y1, x2 - x1) });
}

// Objectius possibles (level.goal.type; per defecte 'cup'):
//   cup   la pilota, quieta dins el cistell (level.cup)
//   touch les dues pilotes es toquen (level.ball2)
//   off   la caixa level.goal.box cau de la taula (surt per baix)
//   hold  la pilota aguanta level.goal.secs segons sense caure
//   zone  la pilota, quieta dins la zona level.goal.zone [x, y, w, h]
export const goalOf = (level) => level.goal || { type: 'cup' };

export function buildWorld(Matter, level) {
  const { Engine, Bodies, Body, Composite, Constraint, Vertices, Common } = Matter;
  // Els números dels cossos decideixen l'ordre en què es resolen els xocs. Es
  // tornen a començar a cada nivell perquè la física sigui sempre igual: al
  // mòbil, després d'haver jugat altres nivells, i al simulador de les proves.
  Common._nextId = 0;
  const engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
  engine.gravity.y = 1;

  // fricció estàtica alta: un traç recolzat en pendent s'hi aguanta, com cartró sobre fusta
  const solid = { isStatic: true, friction: 1, frictionStatic: 10, restitution: 0.1 };
  const statics = (level.walls || []).map(s => segment(Bodies, s, { ...solid, label: 'wall' }));
  const goal = goalOf(level);
  const [cx, cy] = level.cup || [-1000, -1000];
  const cup = !level.cup ? [] : [
    // fons gruixut (cap avall) perquè una pilota ràpida no el travessi
    Bodies.rectangle(cx, cy + 8, CUP_W + T * 2, T + 16, { ...solid, label: 'cup' }),
    Bodies.rectangle(cx - CUP_W / 2 - T / 2, cy - CUP_H / 2, T, CUP_H, { ...solid, label: 'cup' }),
    Bodies.rectangle(cx + CUP_W / 2 + T / 2, cy - CUP_H / 2, T, CUP_H, { ...solid, label: 'cup' }),
  ];
  const ball = Bodies.circle(level.ball[0], level.ball[1], BALL_R, {
    label: 'ball', restitution: 0.25, friction: 0.03, frictionAir: 0.002, density: 0.0015,
  });
  const ball2 = level.ball2 ? Bodies.circle(level.ball2[0], level.ball2[1], BALL_R, {
    label: 'ball2', restitution: 0.25, friction: 0.03, frictionAir: 0.002, density: 0.0015,
  }) : null;
  // caixes que es poden empènyer
  const boxes = (level.boxes || []).map(([x, y, w, h]) => Bodies.rectangle(x, y, w, h, { label: 'box', friction: 0.6, density: 0.002 }));
  // balancins: una post que gira sobre un punt fix
  const planks = [];
  const pins = [];
  for (const [x, y, len] of level.seesaws || []) {
    const plank = Bodies.rectangle(x, y, len, 10, { label: 'plank', friction: 0.6, density: 0.002 });
    planks.push(plank);
    pins.push(Constraint.create({ pointA: { x, y }, bodyB: plank, pointB: { x: 0, y: 0 }, stiffness: 1, length: 0 }));
  }
  // plataformes que giren soles: [x, y, llargada, graus per segon]
  const spinners = (level.spinners || []).map(([x, y, len, dps]) => {
    const b = Bodies.rectangle(x, y, len, 10, { ...solid, label: 'spinner' });
    b.spin = (dps * Math.PI / 180) / 60; // radians per pas
    b.reach = len / 2;
    return b;
  });
  Composite.add(engine.world, [...statics, ...cup, ball, ...(ball2 ? [ball2] : []), ...boxes, ...planks, ...pins, ...spinners]);
  // cordes: [ax, ay, 'ball' | índex de caixa]. Un punt fix i una corda tibant
  // (com un pèndol). Un traç que la travessa la talla.
  const ropes = (level.ropes || []).map(([ax, ay, what]) => {
    const body = what === 'ball' ? ball : boxes[what];
    const c = Constraint.create({ pointA: { x: ax, y: ay }, bodyB: body, pointB: { x: 0, y: 0 }, stiffness: 1, damping: 0.01 });
    Composite.add(engine.world, c);
    return { a: [ax, ay], body, c, cut: false };
  });

  const nodraw = level.nodraw || [];
  const strokes = [];
  let started = false;
  let frames = 0;
  let inCup = 0;
  let state = 'ready'; // ready | playing | won | lost

  // No es pot dibuixar sobre les parets, el cistell, la pilota ni les zones ratllades.
  const blockers = () => [...statics, ...cup, ...boxes, ...planks];
  // tot el cercle per on passa una plataforma que gira és zona prohibida
  const m = T / 2 + 2;
  function forbidden(x, y) {
    if (x < 0 || x > W || y < 0 || y > H) return true;
    if (Math.hypot(x - ball.position.x, y - ball.position.y) < BALL_R + m + 2) return true;
    if (ball2 && Math.hypot(x - ball2.position.x, y - ball2.position.y) < BALL_R + m + 2) return true;
    if (spinners.some(s => Math.hypot(x - s.position.x, y - s.position.y) < s.reach + m + 2)) return true;
    if (goal.type === 'zone') { const [zx, zy, zw, zh] = goal.zone; if (x > zx && x < zx + zw && y > zy && y < zy + zh) return true; }
    if (nodraw.some(([nx, ny, nw, nh]) => x > nx && x < nx + nw && y > ny && y < ny + nh)) return true;
    const probes = [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]];
    for (const b of blockers()) {
      for (const part of b.parts.length > 1 ? b.parts.slice(1) : b.parts) {
        if (probes.some(([dx, dy]) => Vertices.contains(part.vertices, { x: x + dx, y: y + dy }))) return true;
      }
    }
    for (const s of strokes) {
      for (const part of s.parts.slice(1)) {
        if (probes.some(([dx, dy]) => Vertices.contains(part.vertices, { x: x + dx, y: y + dy }))) return true;
      }
    }
    return false;
  }

  // Neteja un traç: punts separats. Si un punt toca una paret, el llapis hi
  // llisca per sobre (el puja una mica); si no es pot, el traç s'acaba allà.
  // Amb tinta limitada (level.ink, en píxels del món), el traç s'acaba quan s'esgota.
  function clean(points) {
    const out = [];
    let ink = level.ink || Infinity;
    for (const [x, y0] of points) {
      let y = y0;
      if (forbidden(x, y)) {
        let lifted = null;
        for (let d = 2; d <= 18 && lifted === null; d += 2) if (!forbidden(x, y0 - d)) lifted = y0 - d;
        if (lifted === null) { if (out.length) break; continue; }
        y = lifted;
      }
      const last = out[out.length - 1];
      if (!last || Math.hypot(x - last[0], y - last[1]) >= 6) {
        if (last) {
          const d = Math.hypot(x - last[0], y - last[1]);
          if (d > ink) {
            if (ink >= 6) out.push([last[0] + (x - last[0]) * ink / d, last[1] + (y - last[1]) * ink / d]);
            break;
          }
          ink -= d;
        }
        out.push([x, y]);
      }
    }
    return out;
  }

  // Afegeix un traç com a cos rígid que cau. Retorna el cos (o null).
  // El traç es simplifica en pocs trams rectes: amb moltes peces petites la
  // llibreria fa lliscar els cossos pels pendents.
  function addStroke(points) {
    if (state === 'won' || state === 'lost') return null;
    const pts = simplify(clean(points), 5);
    if (!pts.length) return null;
    const opts = { friction: 1, frictionStatic: 10, restitution: 0.05, density: 0.003 };
    const parts = [];
    if (pts.length === 1) parts.push(Bodies.rectangle(pts[0][0], pts[0][1], T, T, opts));
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
      const len = Math.hypot(x2 - x1, y2 - y1) + T; // es solapen a les juntes
      parts.push(Bodies.rectangle((x1 + x2) / 2, (y1 + y2) / 2, len, T, { ...opts, angle: Math.atan2(y2 - y1, x2 - x1) }));
    }
    const body = parts.length === 1 ? parts[0] : Body.create({ parts, ...opts });
    body.label = 'stroke';
    // si el traç travessa una corda, la talla
    for (const r of ropes) {
      if (r.cut) continue;
      const [ax, ay] = r.a, bx = r.body.position.x, by = r.body.position.y;
      for (let i = 1; i < pts.length; i++) {
        if (segmentsCross(pts[i - 1], pts[i], [ax, ay], [bx, by])) {
          Composite.remove(engine.world, r.c);
          r.cut = true;
          break;
        }
      }
    }
    Composite.add(engine.world, body);
    strokes.push(body);
    started = true;
    if (state === 'ready') state = 'playing';
    return body;
  }

  // Un pas de física (1/60 s). El món no es mou fins al primer traç.
  function step() {
    if (!started || state === 'won' || state === 'lost') return state;
    for (const s of spinners) {
      Body.rotate(s, s.spin);
      s.angularVelocity = s.spin; // perquè el que toca la plataforma s'emporti l'empenta
    }
    Engine.update(engine, STEP_MS);
    frames++;
    // límit de velocitat: a més de 14 px per pas la pilota podria travessar parets
    for (const b of ball2 ? [ball, ball2] : [ball]) {
      const sp = Math.hypot(b.velocity.x, b.velocity.y);
      if (sp > 14) Body.setVelocity(b, { x: b.velocity.x * 14 / sp, y: b.velocity.y * 14 / sp });
    }
    const out = (b) => b.position.x < -60 || b.position.x > W + 60 || b.position.y > H + 60;
    const { x, y } = ball.position;
    const slow = Math.hypot(ball.velocity.x, ball.velocity.y) < 1.2;
    if (goal.type === 'off') {
      // l'objectiu és que la caixa caigui: la pilota pot anar on vulgui
      const box = boxes[goal.box || 0];
      if (box.position.y > H + 40 || box.position.x < -60 || box.position.x > W + 60) state = 'won';
      return state;
    }
    if (out(ball) || (ball2 && out(ball2))) { state = 'lost'; return state; }
    if (goal.type === 'touch') {
      if (Math.hypot(x - ball2.position.x, y - ball2.position.y) <= BALL_R * 2 + 1.5) state = 'won';
    } else if (goal.type === 'hold') {
      if (frames >= (goal.secs || 5) * 60) state = 'won';
    } else if (goal.type === 'zone') {
      const [zx, zy, zw, zh] = goal.zone;
      const inside = x > zx && x < zx + zw && y > zy && y < zy + zh;
      inCup = inside && slow ? inCup + 1 : 0;
      if (inCup >= 30) state = 'won';
    } else {
      const inside = Math.abs(x - cx) < CUP_W / 2 && y < cy && y > cy - CUP_H - 4;
      inCup = inside && slow ? inCup + 1 : 0;
      if (inCup >= 30) state = 'won';
    }
    return state;
  }

  return {
    engine, ball, ball2, goal, statics, cup, boxes, planks, spinners, ropes, strokes, nodraw, ink: level.ink || 0,
    addStroke, step, forbidden,
    get state() { return state; },
    get frames() { return frames; },
  };
}

// Es creuen els segments p1-p2 i q1-q2?
export function segmentsCross([ax, ay], [bx, by], [cx, cy], [dx, dy]) {
  const o = (px, py, qx, qy, rx, ry) => Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  return o(ax, ay, bx, by, cx, cy) !== o(ax, ay, bx, by, dx, dy) && o(cx, cy, dx, dy, ax, ay) !== o(cx, cy, dx, dy, bx, by);
}

// Douglas–Peucker: treu els punts que no canvien la forma més de `tol` píxels.
export function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  // traç tancat (comença i acaba al mateix lloc): es parteix pel punt més llunyà
  if (Math.hypot(bx - ax, by - ay) <= tol) {
    let idx = 0, far = -1;
    pts.forEach(([x, y], i) => { const d = Math.hypot(x - ax, y - ay); if (d > far) { far = d; idx = i; } });
    if (far <= tol) return [pts[0]];
    return [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)];
  }
  const len = Math.hypot(bx - ax, by - ay) || 1;
  let far = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
    if (d > far) { far = d; idx = i; }
  }
  if (far <= tol) return [pts[0], pts[pts.length - 1]];
  return [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)];
}

// Estrelles segons quants traços has fet servir.
export function starsFor(strokes, par = 1) {
  if (strokes <= par) return 3;
  return strokes === par + 1 ? 2 : 1;
}

// Simula un nivell amb uns traços (per a les proves i per dissenyar nivells).
// Cada traç es dibuixa en un fotograma: [fotograma, [[x, y], ...]].
export function simulate(Matter, level, plan, maxFrames = 60 * 20) {
  const w = buildWorld(Matter, level);
  let f = 0, still = 0;
  const pending = plan.map(s => (Array.isArray(s[0]) ? [0, s] : s)).sort((a, b) => a[0] - b[0]);
  while (f < maxFrames) {
    while (pending.length && pending[0][0] <= f) w.addStroke(pending.shift()[1]);
    const st = w.step();
    if (st === 'won' || st === 'lost') break;
    if (w.state === 'ready' && !pending.length) break;
    // pilota quieta durant 2 s (i no dins el cistell, que ja hauria guanyat): encallada
    still = Math.hypot(w.ball.velocity.x, w.ball.velocity.y) < 0.05 ? still + 1 : 0;
    if (still > 120 && !pending.length && goalOf(level).type !== 'hold') break;
    f++;
  }
  return { state: w.state, frames: w.frames, ball: { ...w.ball.position }, strokes: w.strokes.length };
}
