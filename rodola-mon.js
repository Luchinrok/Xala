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

export function buildWorld(Matter, level) {
  const { Engine, Bodies, Body, Composite, Constraint, Vertices } = Matter;
  const engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
  engine.gravity.y = 1;

  // fricció estàtica alta: un traç recolzat en pendent s'hi aguanta, com cartró sobre fusta
  const solid = { isStatic: true, friction: 1, frictionStatic: 10, restitution: 0.1 };
  const statics = (level.walls || []).map(s => segment(Bodies, s, { ...solid, label: 'wall' }));
  const [cx, cy] = level.cup;
  const cup = [
    // fons gruixut (cap avall) perquè una pilota ràpida no el travessi
    Bodies.rectangle(cx, cy + 8, CUP_W + T * 2, T + 16, { ...solid, label: 'cup' }),
    Bodies.rectangle(cx - CUP_W / 2 - T / 2, cy - CUP_H / 2, T, CUP_H, { ...solid, label: 'cup' }),
    Bodies.rectangle(cx + CUP_W / 2 + T / 2, cy - CUP_H / 2, T, CUP_H, { ...solid, label: 'cup' }),
  ];
  const ball = Bodies.circle(level.ball[0], level.ball[1], BALL_R, {
    label: 'ball', restitution: 0.25, friction: 0.03, frictionAir: 0.002, density: 0.0015,
  });
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
  Composite.add(engine.world, [...statics, ...cup, ball, ...boxes, ...planks, ...pins]);

  const nodraw = level.nodraw || [];
  const strokes = [];
  let started = false;
  let frames = 0;
  let inCup = 0;
  let state = 'ready'; // ready | playing | won | lost

  // No es pot dibuixar sobre les parets, el cistell, la pilota ni les zones ratllades.
  const blockers = () => [...statics, ...cup, ...boxes, ...planks];
  const m = T / 2 + 2;
  function forbidden(x, y) {
    if (x < 0 || x > W || y < 0 || y > H) return true;
    if (Math.hypot(x - ball.position.x, y - ball.position.y) < BALL_R + m + 2) return true;
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
  function clean(points) {
    const out = [];
    for (const [x, y0] of points) {
      let y = y0;
      if (forbidden(x, y)) {
        let lifted = null;
        for (let d = 2; d <= 18 && lifted === null; d += 2) if (!forbidden(x, y0 - d)) lifted = y0 - d;
        if (lifted === null) { if (out.length) break; continue; }
        y = lifted;
      }
      const last = out[out.length - 1];
      if (!last || Math.hypot(x - last[0], y - last[1]) >= 6) out.push([x, y]);
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
    Composite.add(engine.world, body);
    strokes.push(body);
    started = true;
    if (state === 'ready') state = 'playing';
    return body;
  }

  // Un pas de física (1/60 s). El món no es mou fins al primer traç.
  function step() {
    if (!started || state === 'won' || state === 'lost') return state;
    Engine.update(engine, STEP_MS);
    frames++;
    // límit de velocitat: a més de 14 px per pas la pilota podria travessar parets
    const sp = Math.hypot(ball.velocity.x, ball.velocity.y);
    if (sp > 14) Body.setVelocity(ball, { x: ball.velocity.x * 14 / sp, y: ball.velocity.y * 14 / sp });
    const { x, y } = ball.position;
    if (x < -60 || x > W + 60 || y > H + 60) { state = 'lost'; return state; }
    const inside = Math.abs(x - cx) < CUP_W / 2 && y < cy && y > cy - CUP_H - 4;
    const slow = Math.hypot(ball.velocity.x, ball.velocity.y) < 1.2;
    inCup = inside && slow ? inCup + 1 : 0;
    if (inCup >= 30) state = 'won';
    return state;
  }

  return {
    engine, ball, statics, cup, boxes, planks, strokes, nodraw,
    addStroke, step, forbidden,
    get state() { return state; },
    get frames() { return frames; },
  };
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
  let f = 0;
  const pending = plan.map(s => (Array.isArray(s[0]) ? [0, s] : s)).sort((a, b) => a[0] - b[0]);
  while (f < maxFrames) {
    while (pending.length && pending[0][0] <= f) w.addStroke(pending.shift()[1]);
    const st = w.step();
    if (st === 'won' || st === 'lost') break;
    if (w.state === 'ready' && !pending.length) break;
    f++;
  }
  return { state: w.state, frames: w.frames, ball: { ...w.ball.position }, strokes: w.strokes.length };
}
