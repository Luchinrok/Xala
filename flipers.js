// ============================================================
// Flipers — joc per a dos (del tipus «pinball cara a cara»).
//
// El mòbil, pla a la taula entre els dos. Cadascú té dues paletes a la seva
// punta: toca la meitat esquerra o dreta de la teva zona per pujar-ne una.
// Si la bola s'escapa per entre les teves paletes, l'altre fa gol.
// Guanya qui arriba primer a 5. Física pròpia (cercles i segments).
// ============================================================

const W = 300, H = 470, BR = 8, GOALS = 5;
const STEP = 1000 / 60, SUB = 5;
const FL = 70, FT = 7;                 // llargada i gruix de les paletes
const REST = 0.5, UP = -0.42;          // angles (radiants) de la paleta de baix-esquerra
const PLAYERS = [
  { name: 'Corall', c: '#E4572E' },
  { name: 'Verd', c: '#1F8A70' },
];

// paletes: jugador 0 a baix, jugador 1 a dalt (la mateixa taula girada)
function makeFlippers() {
  const fl = [];
  for (const pl of [0, 1]) {
    for (const side of [-1, 1]) {           // -1 esquerra de la pantalla, 1 dreta
      const px = side < 0 ? 62 : W - 62, py = pl === 0 ? H - 62 : 62;
      fl.push({ pl, side, px, py, a: 0, up: false, w: 0 });
    }
  }
  return fl;
}
// angle real d'una paleta segons el jugador i el costat (t: 0 en repòs, 1 amunt)
function angleOf(f) {
  const base = REST + (UP - REST) * f.a;     // baix-esquerra
  let th = f.side < 0 ? base : Math.PI - base;
  if (f.pl === 1) th = -th;                  // dalt: mirall vertical
  return th;
}

// parets: laterals, embuts cap a les paletes i quatre tacs
const WALLS = [];
for (const pl of [0, 1]) {
  const y = (v) => (pl === 0 ? v : H - v);
  WALLS.push([4, y(H - 150), 50, y(H - 66), 5], [W - 4, y(H - 150), W - 50, y(H - 66), 5]);
}
WALLS.push([2, 0, 2, H, 4], [W - 2, 0, W - 2, H, 4]);
// tacs simètrics (la taula és igual vista des de les dues bandes); el centre, lliure per al servei
const BUMPERS = [
  { x: 150, y: H / 2 - 105, r: 14 }, { x: 150, y: H / 2 + 105, r: 14 },
  { x: 78, y: H / 2 - 40, r: 15 }, { x: W - 78, y: H / 2 + 40, r: 15 },
  { x: W - 78, y: H / 2 - 40, r: 12 }, { x: 78, y: H / 2 + 40, r: 12 },
];

export default {
  id: 'flipers',
  title: 'Flipers',
  tagline: 'Pinball cara a cara',
  accent: '#E4572E',
  color: '#E4572E',
  ready: true,

  instructions: [
    'Deixeu el mòbil pla a la taula, entre els dos. Cadascú té dues paletes a la seva punta.',
    'Toca la meitat esquerra o dreta de la teva zona per pujar la paleta d\'aquell costat. Mentre hi tens el dit, es queda amunt.',
    'Si la bola s\'escapa per entre les teves paletes, l\'altre fa gol.',
    `Guanya qui arriba primer a ${GOALS} gols.`,
  ],

  mount(root, { goHome }) {
    let canvas = null, ctx = null, scale = 1, colors = null;
    let raf = 0, last = 0, acc = 0;
    let s = null;
    const touches = new Map(); // pointerId -> paleta

    function stop() {
      cancelAnimationFrame(raf); raf = 0;
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKey);
      window.removeEventListener('resize', fit);
    }
    function leave() { stop(); goHome(); }

    function screenConfig() {
      stop();
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Flipers</p>
        <h2 style="font-size:30px;margin:6px 0 16px">Pinball cara a cara</h2>
        <p class="muted">Deixeu el mòbil pla a la taula, entre els dos. Cadascú toca la meitat esquerra o dreta de la seva zona per pujar les paletes. Guanya qui fa ${GOALS} gols.</p>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="start" style="margin-top:28px">Comença</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelector('#start').onclick = begin;
    }

    function begin() {
      stop();
      s = { fl: makeFlippers(), score: [0, 0], ball: null, wait: 90, toward: Math.random() < 0.5 ? 0 : 1, over: false, flash: 0, hit: new Map() };
      serve();
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score" id="score"></div>
        </div>
        <div class="drac-board fp-board" id="board" style="--ar:${W / H}"><canvas id="cv" role="img" aria-label="Taula de pinball per a dos"></canvas></div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenConfig;
      canvas = root.querySelector('#cv');
      ctx = canvas.getContext('2d');
      const css = getComputedStyle(document.documentElement);
      const v = (n, d) => (css.getPropertyValue(n) || d).trim();
      colors = { paper: v('--paper', '#FBF3E4'), paper2: v('--paper-2', '#F4E8D2'), ink: v('--ink', '#20180F') };
      wireTouch(root.querySelector('#board'));
      document.addEventListener('keydown', onKey);
      document.addEventListener('keyup', onKey);
      window.addEventListener('resize', fit);
      renderScore();
      fit();
      last = performance.now(); acc = 0;
      raf = requestAnimationFrame(loop);
    }

    // la bola surt del mig cap a qui ha encaixat l'últim gol
    function serve() {
      const a = (Math.random() - 0.5) * 0.9;
      const dir = s.toward === 0 ? 1 : -1;
      s.ball = { x: W / 2, y: H / 2, vx: 4.2 * Math.sin(a), vy: dir * 4.2 * Math.cos(a) };
      s.wait = 70;
    }

    // cada dit controla la paleta del seu costat a la seva meitat
    function flipperAt(e) {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const pl = y > 0.5 ? 0 : 1, side = x < 0.5 ? -1 : 1;
      return s.fl.find(f => f.pl === pl && f.side === side);
    }
    function refresh() { s.fl.forEach(f => { f.up = [...touches.values()].includes(f) || !!f.key; }); }
    function wireTouch(el) {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); touches.set(e.pointerId, flipperAt(e)); refresh(); });
      const up = (e) => { touches.delete(e.pointerId); refresh(); };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('pointerleave', up);
    }
    // teclat: jugador de baix Z / M (o fletxes), jugador de dalt Q / P
    const KEYMAP = { z: [0, -1], ArrowLeft: [0, -1], m: [0, 1], ArrowRight: [0, 1], p: [1, -1], q: [1, 1] };
    function onKey(e) {
      if (!root.isConnected) { stop(); return; }
      const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase()];
      if (!k || !s) return;
      e.preventDefault();
      const f = s.fl.find(x => x.pl === k[0] && x.side === k[1]);
      f.key = e.type === 'keydown';
      refresh();
    }

    function fit() {
      if (!canvas || !canvas.isConnected) return;
      const w = canvas.parentElement.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * H / W * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = (w * H / W) + 'px';
      scale = canvas.width / W;
      draw();
    }

    function loop(now) {
      if (!canvas || !canvas.isConnected) { stop(); return; }
      acc += Math.min(100, now - last); last = now;
      while (acc >= STEP) { update(); acc -= STEP; }
      draw();
      if (!s.over) raf = requestAnimationFrame(loop);
    }

    // xoc de la bola amb un segment gruixut (càpsula); vs: velocitat de la superfície
    function capsule(b, ax, ay, bx, by, rad, surf) {
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      const t = Math.max(0, Math.min(1, ((b.x - ax) * dx + (b.y - ay) * dy) / len2));
      const cx = ax + dx * t, cy = ay + dy * t;
      let nx = b.x - cx, ny = b.y - cy;
      const d = Math.hypot(nx, ny);
      if (d >= BR + rad || d === 0) return false;
      nx /= d; ny /= d;
      b.x = cx + nx * (BR + rad); b.y = cy + ny * (BR + rad);
      const sv = surf ? surf(cx, cy) : [0, 0];
      const rx = b.vx - sv[0], ry = b.vy - sv[1];
      const vn = rx * nx + ry * ny;
      if (vn < 0) { b.vx = rx - 1.7 * vn * nx + sv[0]; b.vy = ry - 1.7 * vn * ny + sv[1]; }
      return true;
    }

    function update() {
      if (s.flash) s.flash--;
      // paletes: pugen de pressa i baixen una mica més a poc a poc
      for (const f of s.fl) {
        const prev = f.a;
        f.a = f.up ? Math.min(1, f.a + 0.34) : Math.max(0, f.a - 0.16);
        f.w = (angleOf({ ...f, a: f.a }) - angleOf({ ...f, a: prev })); // radiants per pas
      }
      if (s.wait > 0) { s.wait--; return; }
      const b = s.ball;
      for (let i = 0; i < SUB; i++) {
        b.x += b.vx / SUB; b.y += b.vy / SUB;
        for (const [ax, ay, bx, by, t] of WALLS) capsule(b, ax, ay, bx, by, t / 2);
        for (const f of s.fl) {
          const th = angleOf(f);
          const tx = f.px + Math.cos(th) * FL, ty = f.py + Math.sin(th) * FL;
          // velocitat de la superfície que gira: ω × r (per pas sencer)
          capsule(b, f.px, f.py, tx, ty, FT, (cx, cy) => [-f.w * (cy - f.py), f.w * (cx - f.px)]);
        }
        for (const k of BUMPERS) {
          const dx = b.x - k.x, dy = b.y - k.y, d = Math.hypot(dx, dy);
          if (d < BR + k.r && d > 0) {
            const nx = dx / d, ny = dy / d;
            b.x = k.x + nx * (BR + k.r); b.y = k.y + ny * (BR + k.r);
            const sp = Math.max(7, Math.hypot(b.vx, b.vy));
            b.vx = nx * sp; b.vy = ny * sp;
            s.hit.set(k, 8);
          }
        }
      }
      for (const [k, t] of s.hit) { if (t <= 1) s.hit.delete(k); else s.hit.set(k, t - 1); }
      // velocitat entre 3,5 i 12 (mai s'atura, mai travessa res)
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 12) { b.vx *= 12 / sp; b.vy *= 12 / sp; }
      else if (sp < 3.5) { const k = 3.5 / (sp || 1); b.vx = (b.vx || 0.5) * k; b.vy = (b.vy || 1) * k; }
      // que no quedi anant de costat a costat per sempre
      if (Math.abs(b.vy) < 1.2) b.vy = b.vy < 0 ? -1.2 : 1.2;
      // gol
      if (b.y > H + BR * 2 || b.y < -BR * 2) {
        const scorer = b.y > H ? 1 : 0;
        s.score[scorer]++;
        s.toward = 1 - scorer; s.flash = 30;
        if (navigator.vibrate) navigator.vibrate(40);
        renderScore();
        if (s.score[scorer] >= GOALS) { s.over = true; s.winner = scorer; setTimeout(gameOver, 500); return; }
        serve();
      }
    }

    function renderScore() {
      const el = root.querySelector('#score');
      if (el) el.textContent = `${PLAYERS[0].name} ${s.score[0]} – ${s.score[1]} ${PLAYERS[1].name}`;
    }

    // ---------- dibuix ----------
    function draw() {
      if (!ctx || !s) return;
      const { paper, paper2, ink } = colors;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      // zones de cada jugador
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = PLAYERS[0].c; ctx.fillRect(0, H / 2, W, H / 2);
      ctx.fillStyle = PLAYERS[1].c; ctx.fillRect(0, 0, W, H / 2);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(32,24,15,.25)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke(); ctx.setLineDash([]);
      // marcador gran, cadascú el seu, girat cap a ell
      ctx.font = '800 64px "Bricolage Grotesque", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(32,24,15,.12)';
      ctx.fillText(String(s.score[0]), W / 2, H / 2 + 56 + 22);
      ctx.save(); ctx.translate(W / 2, H / 2 - 56); ctx.rotate(Math.PI); ctx.fillText(String(s.score[1]), 0, 22); ctx.restore();
      // parets
      ctx.strokeStyle = ink; ctx.lineCap = 'round';
      for (const [ax, ay, bx, by, t] of WALLS) { ctx.lineWidth = t; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); }
      // tacs
      BUMPERS.forEach((k, i) => {
        const lit = s.hit.has(k);
        ctx.fillStyle = lit ? '#FFC828' : i < 2 ? paper2 : k.y > H / 2 ? PLAYERS[0].c : PLAYERS[1].c;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(k.x, k.y, k.r + (lit ? 2 : 0), 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(k.x, k.y, k.r * 0.3, 0, 7); ctx.fill();
      });
      // paletes
      for (const f of s.fl) {
        const th = angleOf(f), tx = f.px + Math.cos(th) * FL, ty = f.py + Math.sin(th) * FL;
        ctx.strokeStyle = ink; ctx.lineWidth = FT * 2 + 3;
        ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.strokeStyle = PLAYERS[f.pl].c; ctx.lineWidth = FT * 2 - 2;
        ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(f.px, f.py, 3, 0, 7); ctx.fill();
      }
      // bola (parpelleja mentre espera el servei)
      if (!(s.wait > 0 && Math.floor(s.wait / 8) % 2)) {
        ctx.fillStyle = '#FFC828'; ctx.strokeStyle = ink; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, BR, 0, 7); ctx.fill(); ctx.stroke();
      }
      ctx.textAlign = 'left'; ctx.lineCap = 'butt';
    }

    function gameOver() {
      if (!root.isConnected) return;
      stop(); draw();
      const w = s.winner;
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="--stack-gap:8px">
          <h2 style="color:${PLAYERS[w].c}">Guanya el ${PLAYERS[w].name}!</h2>
          <p class="muted">${s.score[0]} – ${s.score[1]}</p>
        </div>
        <div class="stack">
          <button class="btn btn--accent" id="again">Revenja</button>
          <button class="btn btn--outline" id="home">Sortir</button>
        </div>`;
      box.querySelector('#again').onclick = begin;
      box.querySelector('#home').onclick = leave;
    }

    screenConfig();
  },
};
