// ============================================================
// Fes-la caure — trencaclosques de física per a un sol jugador.
// (Els fitxers es diuen rodola*.js: era el nom provisional.)
//
// Dibuixes amb el dit: el traç es converteix en una peça que cau amb
// gravetat. Has d'aconseguir que la pilota acabi dins del cistell. El món
// es posa en marxa amb el primer traç. Menys traços, més estrelles.
//
// Física: Matter.js (vendor/matter.min.js, llicència MIT), que es carrega
// en obrir el joc. El món i les regles són a rodola-mon.js; els nivells,
// a rodola-nivells.js.
// ============================================================

import { buildWorld, starsFor, W, H, T, STEP_MS } from './rodola-mon.js';
import { LEVELS } from './rodola-nivells.js';
import { getRecord, setRecord } from './records.js';

let matterReady = null;
function loadMatter() {
  if (window.Matter) return Promise.resolve(window.Matter);
  if (!matterReady) {
    matterReady = new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = './vendor/matter.min.js';
      s.onload = () => (window.Matter ? ok(window.Matter) : ko(new Error('Matter')));
      s.onerror = () => { matterReady = null; s.remove(); ko(new Error('Matter')); };
      document.head.appendChild(s);
    });
  }
  return matterReady;
}

const starsText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

export default {
  id: 'rodola',
  title: 'Fes-la caure',
  tagline: 'Dibuixa i porta la pilota al cistell',
  accent: '#E4572E',
  color: 'var(--accent)',
  ready: true,

  instructions: [
    'Dibuixa amb el dit: cada traç es converteix en una peça que cau i rodola.',
    'Has d\'aconseguir que la pilota groga acabi dins del cistell.',
    'Tot es posa en marxa quan acabes el primer traç. Recolza les peces en els tacs, fes ponts o deixa-les caure.',
    'A les zones ratllades no s\'hi pot dibuixar. Com menys traços facis servir, més estrelles.',
    'Si s\'encalla, toca «Torna-hi».',
  ],

  mount(root, { goHome }) {
    let M = null;
    let world = null;
    let level = 0;
    let raf = 0;
    let last = 0;
    let acc = 0;
    let drawing = null;   // punts del traç que s'està dibuixant
    let canvas = null, ctx = null, scale = 1;
    let colors = null;
    let restartTimer = null;
    let finished = false;

    const saved = () => getRecord('rodola:stars') || {};
    const unlocked = (i) => i === 0 || !!saved()[i - 1];

    function stop() {
      cancelAnimationFrame(raf); raf = 0;
      clearTimeout(restartTimer); restartTimer = null;
      window.removeEventListener('resize', fit);
    }
    function leave() { stop(); goHome(); }

    // ---------- 1) inici: tria de nivell ----------
    async function start() {
      root.innerHTML = '<button class="back" id="back">‹ Enrere</button><p class="muted center" style="margin-top:40px">Preparant la física…</p>';
      root.querySelector('#back').onclick = leave;
      try {
        M = await loadMatter();
      } catch (e) {
        if (!root.isConnected) return;
        root.innerHTML = `<button class="back" id="back">‹ Enrere</button>
          <p class="muted center" style="margin:40px 0 20px">No s'ha pogut carregar el joc. Mira la connexió.</p>
          <button class="btn btn--accent" id="retry">Torna-hi</button>`;
        root.querySelector('#back').onclick = leave;
        root.querySelector('#retry').onclick = start;
        return;
      }
      if (root.isConnected) screenLevels();
    }

    function screenLevels() {
      stop();
      const st = saved();
      const next = LEVELS.findIndex((_, i) => !st[i]);
      root.innerHTML = `
        <button class="back" id="back">‹ Enrere</button>
        <p class="kicker">Fes-la caure</p>
        <h2 style="font-size:30px;margin:6px 0 18px">Dibuixa i porta la pilota al cistell</h2>
        <div class="rodola-levels">
          ${LEVELS.map((lv, i) => {
            const open = unlocked(i);
            return `<button class="rodola-level${st[i] ? ' done' : ''}" data-i="${i}" ${open ? '' : 'disabled'}
              aria-label="Nivell ${i + 1}: ${lv.name}${st[i] ? `, ${st[i]} estrelles` : open ? '' : ', bloquejat'}">
              <span class="rodola-level__n">${i + 1}</span>
              <span class="rodola-level__s">${st[i] ? starsText(st[i]) : open ? lv.name : 'Bloquejat'}</span>
            </button>`;
          }).join('')}
        </div>
        <div class="spacer"></div>
        <button class="btn btn--accent" id="play" style="margin-top:24px">${next === -1 ? 'Torna a jugar' : next === 0 ? 'Comença' : 'Continua'}</button>
      `;
      root.querySelector('#back').onclick = leave;
      root.querySelectorAll('.rodola-level').forEach(b => { b.onclick = () => play(+b.dataset.i); });
      root.querySelector('#play').onclick = () => play(next === -1 ? 0 : next);
    }

    // ---------- 2) un nivell ----------
    function play(i) {
      stop();
      level = i;
      finished = false;
      const lv = LEVELS[i];
      root.innerHTML = `
        <div class="chess-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score">Nivell ${i + 1}</div>
        </div>
        <p class="kicker center" style="margin:0">${lv.name}</p>
        <p class="traca-status" id="status" aria-live="polite">${lv.hint}</p>
        <div class="rodola-board" id="board"><canvas id="cv" role="img" aria-label="Tauler del nivell ${i + 1}: ${lv.hint}"></canvas></div>
        <div class="btn-row" id="controls" style="margin-top:12px">
          <button class="btn btn--outline" id="retry">Torna-hi</button>
        </div>
        <div id="endbox"></div>
      `;
      root.querySelector('#back').onclick = screenLevels;
      root.querySelector('#retry').onclick = () => play(level);
      canvas = root.querySelector('#cv');
      ctx = canvas.getContext('2d');
      const css = getComputedStyle(document.documentElement);
      const v = (n, d) => (css.getPropertyValue(n) || d).trim();
      colors = { paper: v('--paper', '#FBF3E4'), paper2: v('--paper-2', '#F4E8D2'), ink: v('--ink', '#20180F'), soft: v('--ink-soft', '#6A5A48'), coral: v('--coral', '#E4572E') };
      world = buildWorld(M, lv);
      wireDrawing();
      window.addEventListener('resize', fit);
      fit();
      last = performance.now(); acc = 0;
      raf = requestAnimationFrame(loop);
    }

    function fit() {
      if (!canvas || !canvas.isConnected) return;
      const w = canvas.parentElement.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(w * H / W * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = (w * H / W) + 'px';
      scale = canvas.width / W;
    }

    function toWorld(e) {
      const r = canvas.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
    }

    function wireDrawing() {
      canvas.addEventListener('pointerdown', (e) => {
        if (finished) return;
        e.preventDefault();
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* res */ }
        drawing = [toWorld(e)];
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!drawing) return;
        const p = toWorld(e), q = drawing[drawing.length - 1];
        if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= 3) drawing.push(p);
      });
      const end = () => {
        if (!drawing) return;
        const pts = drawing;
        drawing = null;
        const body = world.addStroke(pts);
        if (!body) setStatus('Aquí no s\'hi pot dibuixar');
        else setStatus(`${world.strokes.length} ${world.strokes.length === 1 ? 'traç' : 'traços'}`);
      };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
    }

    function setStatus(t) {
      const el = root.querySelector('#status');
      if (el) el.textContent = t;
    }

    function loop(now) {
      if (!canvas || !canvas.isConnected) { stop(); return; }
      acc += Math.min(100, now - last);
      last = now;
      let n = 0;
      while (acc >= STEP_MS && n < 5) {
        const st = world.step();
        acc -= STEP_MS; n++;
        if (st === 'won' && !finished) { won(); break; }
        if (st === 'lost' && !finished) { lost(); break; }
      }
      draw();
      raf = requestAnimationFrame(loop);
    }

    function lost() {
      finished = true;
      setStatus('Ui! Se n\'ha anat. Torna-hi');
      restartTimer = setTimeout(() => { if (root.isConnected && level !== null) play(level); }, 1200);
    }

    function won() {
      finished = true;
      const used = world.strokes.length;
      const stars = starsFor(used, LEVELS[level].par);
      const st = saved();
      if (!st[level] || stars > st[level]) { st[level] = stars; setRecord('rodola:stars', st); }
      setStatus(starsText(stars));
      root.querySelector('#controls').style.display = 'none';
      const isLast = level === LEVELS.length - 1;
      const box = root.querySelector('#endbox');
      box.innerHTML = `
        <div class="panel center stack" style="margin-top:12px;--stack-gap:6px">
          <h2 style="font-size:28px;color:var(--accent)">${isLast ? 'Ho has acabat tot!' : 'Dins!'}</h2>
          <p class="muted">${used} ${used === 1 ? 'traç' : 'traços'} · ${starsText(stars)}</p>
        </div>
        <div class="stack" style="margin-top:12px;--stack-gap:10px">
          ${isLast ? '' : '<button class="btn btn--accent" id="next">Següent nivell</button>'}
          <button class="btn btn--outline" id="again">Torna-hi</button>
          <button class="btn btn--outline" id="levels">Tria nivell</button>
        </div>`;
      const nx = box.querySelector('#next');
      if (nx) nx.onclick = () => play(level + 1);
      box.querySelector('#again').onclick = () => play(level);
      box.querySelector('#levels').onclick = screenLevels;
    }

    // ---------- dibuix ----------
    function poly(vertices) {
      ctx.beginPath();
      vertices.forEach((p, i) => (i ? ctx.lineTo(p.x * scale, p.y * scale) : ctx.moveTo(p.x * scale, p.y * scale)));
      ctx.closePath();
    }
    function body(b, fill, stroke) {
      const parts = b.parts.length > 1 ? b.parts.slice(1) : [b];
      ctx.fillStyle = fill;
      for (const p of parts) { poly(p.vertices); ctx.fill(); }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = Math.max(1, scale * 1.5);
        for (const p of parts) { poly(p.vertices); ctx.stroke(); }
      }
    }

    function draw() {
      const { paper, paper2, ink, soft, coral } = colors;
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = paper2;
      for (let y = 10; y < H; y += 20) for (let x = 10; x < W; x += 20) {
        ctx.beginPath(); ctx.arc(x * scale, y * scale, scale * 1.2, 0, 7); ctx.fill();
      }
      // zones on no es pot dibuixar: ratllades
      for (const [x, y, w, h] of world.nodraw) {
        ctx.save();
        ctx.beginPath(); ctx.rect(x * scale, y * scale, w * scale, h * scale); ctx.clip();
        ctx.strokeStyle = 'rgba(32,24,15,.13)';
        ctx.lineWidth = scale * 3;
        for (let k = -h; k < w; k += 14) { ctx.beginPath(); ctx.moveTo((x + k) * scale, (y + h) * scale); ctx.lineTo((x + k + h) * scale, y * scale); ctx.stroke(); }
        ctx.restore();
      }
      world.statics.forEach(b => body(b, ink));
      world.cup.forEach(b => body(b, coral, ink));
      world.planks.forEach(b => body(b, paper2, ink));
      world.planks.forEach(b => {
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(b.position.x * scale, b.position.y * scale, scale * 4, 0, 7); ctx.fill();
      });
      world.boxes.forEach(b => body(b, paper2, ink));
      world.strokes.forEach(b => body(b, soft));
      // pilota
      const bp = world.ball.position;
      ctx.fillStyle = '#FFC828';
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1.5, scale * 2);
      ctx.beginPath(); ctx.arc(bp.x * scale, bp.y * scale, world.ball.circleRadius * scale, 0, 7); ctx.fill(); ctx.stroke();
      // traç en curs
      if (drawing && drawing.length) {
        ctx.strokeStyle = coral;
        ctx.lineWidth = T * scale;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        drawing.forEach(([x, y], i) => (i ? ctx.lineTo(x * scale, y * scale) : ctx.moveTo(x * scale, y * scale)));
        if (drawing.length === 1) ctx.lineTo(drawing[0][0] * scale + 0.1, drawing[0][1] * scale);
        ctx.stroke();
      }
    }

    start();
  },
};
