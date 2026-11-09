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

// Ordre dels nivells a la versió xala-v106, quan les estrelles es guardaven pel número.
const ORDRE_V106 = ["Primer traç", "El pont", "El balancí", "L'embut", "Ziga-zaga", "Toca 1", "Rampa 1", "Tomba 1", "Aguanta 1", "Balancí 1", "Zona 1", "Dòmino 1", "Poca tinta 1", "Toca 2", "Rampa 2", "Tomba 2", "Aguanta 2", "Balancí 2", "Zona 2", "Dòmino 2", "Toca 3", "Tomba 3", "Aguanta 3", "Zona 3", "Poca tinta 2", "Talla 1", "Catapulta 1", "Molinet 1", "Talla i rampa 1", "Talla 2", "Catapulta 2", "Molinet 2", "Talla i rampa 2", "Catapulta 3", "Talla i rampa 3", "Catapulta 4", "Molinet 3"];

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
  color: 'var(--paper-2)', // la graella d'Un sol jugador alterna colors
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

    // Estrelles guardades pel nom del nivell ('rodola:estrelles' = { nom: estrelles }),
    // així es poden treure o afegir nivells sense que les estrelles canviïn de lloc.
    // Abans es guardaven pel número ('rodola:stars'): es passen al nom una sola vegada.
    function starsByName() {
      let m = getRecord('rodola:estrelles');
      if (!m) {
        m = {};
        const old = getRecord('rodola:stars') || {};
        for (const [i, v] of Object.entries(old)) if (ORDRE_V106[+i]) m[ORDRE_V106[+i]] = v;
        setRecord('rodola:estrelles', m);
      }
      return m;
    }
    // { índex del nivell actual: estrelles }
    const saved = () => {
      const m = starsByName(), st = {};
      LEVELS.forEach((lv, i) => { if (m[lv.name]) st[i] = m[lv.name]; });
      return st;
    };
    // obert: el primer, el que ve després d'un de superat, i qualsevol de superat
    // (amb l'ordre nou, un nivell superat pot quedar després d'un que no)
    const unlocked = (i) => { const st = saved(); return i === 0 || !!st[i - 1] || !!st[i]; };

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
        <h2 style="font-size:26px;margin:4px 0 14px">Dibuixa i porta la pilota al cistell</h2>
        <p class="muted" style="margin:-8px 0 14px">${Object.keys(st).length} de ${LEVELS.length} nivells · ${Object.values(st).reduce((a, b) => a + b, 0)} estrelles</p>
        <div class="rodola-levels">
          ${LEVELS.map((lv, i) => {
            const open = unlocked(i);
            return `<button class="rodola-level${st[i] ? ' done' : ''}" data-i="${i}" ${open ? '' : 'disabled'}
              aria-label="Nivell ${i + 1}: ${lv.name}${st[i] ? `, ${st[i]} ${st[i] === 1 ? 'estrella' : 'estrelles'}` : open ? '' : ', bloquejat'}">
              <span class="rodola-level__n">${i + 1}</span>
              <span class="rodola-level__s" aria-hidden="true">${st[i] ? starsText(st[i]) : ''}</span>
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
        <div class="chess-top rodola-top">
          <button class="back" id="back">‹ Enrere</button>
          <div class="chess-score">Nivell ${i + 1} de ${LEVELS.length}</div>
        </div>
        <p class="rodola-status" id="status" aria-live="polite">${lv.hint}</p>
        <div class="rodola-board" id="board"><canvas id="cv" role="img" aria-label="Tauler del nivell ${i + 1}: ${lv.hint}"></canvas></div>
        <div class="btn-row rodola-controls" id="controls">
          <button class="btn btn--outline" id="retry">Torna-hi</button>
        </div>
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
        const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (d < 3) return;
        if (world.ink) {
          // amb tinta limitada, el traç s'atura quan s'acaba
          drawing.used = (drawing.used || 0) + d;
          if (drawing.used > world.ink) return;
        }
        drawing.push(p);
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
      if (!st[level] || stars > st[level]) {
        const m = starsByName();
        m[LEVELS[level].name] = stars;
        setRecord('rodola:estrelles', m);
      }
      const isLast = level === LEVELS.length - 1;
      const cheer = { cup: 'Dins!', touch: 'Tocada!', off: 'Avall!', hold: 'Aguantada!', zone: 'Clavada!' }[world.goal.type] || 'Fet!';
      setStatus(`${isLast ? 'Ho has acabat tot!' : cheer} ${starsText(stars)} · ${used} ${used === 1 ? 'traç' : 'traços'}`);
      root.querySelector('#status').classList.add('rodola-status--win');
      const box = root.querySelector('#controls');
      box.innerHTML = `
        <button class="btn btn--outline" id="again">Torna-hi</button>
        ${isLast ? '<button class="btn btn--accent" id="levels">Nivells</button>' : '<button class="btn btn--accent" id="next">Següent ›</button>'}`;
      const nx = box.querySelector('#next');
      if (nx) nx.onclick = () => play(level + 1);
      const lb = box.querySelector('#levels');
      if (lb) lb.onclick = screenLevels;
      box.querySelector('#again').onclick = () => play(level);
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
      const goal = world.goal;
      // zona d'arribada: rectangle ratllat de corall
      if (goal.type === 'zone') {
        const [zx, zy, zw, zh] = goal.zone;
        ctx.save();
        ctx.fillStyle = 'rgba(228,87,46,.14)';
        ctx.fillRect(zx * scale, zy * scale, zw * scale, zh * scale);
        ctx.setLineDash([6 * scale, 5 * scale]);
        ctx.strokeStyle = coral; ctx.lineWidth = Math.max(1.5, scale * 2);
        ctx.strokeRect(zx * scale, zy * scale, zw * scale, zh * scale);
        ctx.restore();
      }
      // plataformes que giren: barra corall amb el pivot, i el cercle que escombren
      world.spinners.forEach(s => {
        ctx.save();
        ctx.setLineDash([4 * scale, 6 * scale]);
        ctx.strokeStyle = 'rgba(32,24,15,.18)'; ctx.lineWidth = Math.max(1, scale * 1.5);
        ctx.beginPath(); ctx.arc(s.position.x * scale, s.position.y * scale, s.reach * scale, 0, 7); ctx.stroke();
        ctx.restore();
        body(s, coral, ink);
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(s.position.x * scale, s.position.y * scale, scale * 4, 0, 7); ctx.fill();
      });
      // imants: una ferradura corall i, puntejat, fins on arriba la seva força
      world.magnets.forEach(mg => {
        const x = mg.position.x * scale, y = mg.position.y * scale, r = 14 * scale;
        ctx.save();
        ctx.setLineDash([3 * scale, 6 * scale]);
        ctx.strokeStyle = 'rgba(228,87,46,.45)'; ctx.lineWidth = Math.max(1, scale * 1.5);
        ctx.beginPath(); ctx.arc(x, y, mg.reach * scale, 0, 7); ctx.stroke();
        ctx.restore();
        ctx.lineCap = 'butt';
        ctx.strokeStyle = ink; ctx.lineWidth = 10 * scale;
        ctx.beginPath(); ctx.arc(x, y, r * 0.75, Math.PI, 0); ctx.lineTo(x + r * 0.75, y + r * 0.8); ctx.moveTo(x - r * 0.75, y); ctx.lineTo(x - r * 0.75, y + r * 0.8); ctx.stroke();
        ctx.strokeStyle = coral; ctx.lineWidth = 6 * scale;
        ctx.beginPath(); ctx.arc(x, y, r * 0.75, Math.PI, 0); ctx.lineTo(x + r * 0.75, y + r * 0.55); ctx.moveTo(x - r * 0.75, y); ctx.lineTo(x - r * 0.75, y + r * 0.55); ctx.stroke();
        ctx.lineCap = 'round';
      });
      // botons i portes: el botó és corall fins que es prem; la porta oberta deixa una ombra
      world.doors.forEach(d => {
        if (d.open) {
          ctx.save();
          ctx.setLineDash([5 * scale, 5 * scale]);
          ctx.strokeStyle = 'rgba(32,24,15,.25)'; ctx.lineWidth = Math.max(1, scale * 1.5);
          poly(d.door.vertices); ctx.stroke();
          ctx.restore();
        } else {
          body(d.door, '#8C7A66', ink);
        }
        body(d.pad, d.open ? soft : coral, ink);
      });
      // cordes: del punt fix al que aguanten (les tallades ja no es dibuixen)
      world.ropes.forEach(r => {
        ctx.fillStyle = ink;
        ctx.beginPath(); ctx.arc(r.a[0] * scale, r.a[1] * scale, scale * 4, 0, 7); ctx.fill();
        if (r.cut) return;
        ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1.5, scale * 2);
        ctx.beginPath(); ctx.moveTo(r.a[0] * scale, r.a[1] * scale); ctx.lineTo(r.body.position.x * scale, r.body.position.y * scale); ctx.stroke();
      });
      // la caixa que cal tombar va en corall
      world.boxes.forEach((b, i) => body(b, goal.type === 'off' && i === (goal.box || 0) ? coral : paper2, ink));
      world.strokes.forEach(b => body(b, soft));
      // pilotes: la groga és la teva; la vermella, la que has de tocar
      const ballAt = (b, fill) => {
        ctx.fillStyle = fill;
        ctx.strokeStyle = ink;
        ctx.lineWidth = Math.max(1.5, scale * 2);
        ctx.beginPath(); ctx.arc(b.position.x * scale, b.position.y * scale, b.circleRadius * scale, 0, 7); ctx.fill(); ctx.stroke();
      };
      if (world.ball2) ballAt(world.ball2, '#D21F1F');
      world.extra.forEach(b => ballAt(b, '#FFC828'));
      ballAt(world.ball, '#FFC828');
      // «Aguanta»: compte enrere a dalt a la dreta
      if (goal.type === 'hold' && world.state !== 'ready') {
        const left = Math.max(0, (goal.secs || 5) - Math.floor(world.frames / 60));
        ctx.fillStyle = ink;
        ctx.font = `800 ${Math.round(28 * scale)}px "Bricolage Grotesque", system-ui, sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(String(left), (W - 14) * scale, 40 * scale);
        ctx.textAlign = 'left';
      }
      // tinta que queda (nivells amb tinta limitada)
      if (world.ink) {
        let used = 0;
        if (drawing) for (let k = 1; k < drawing.length; k++) used += Math.hypot(drawing[k][0] - drawing[k - 1][0], drawing[k][1] - drawing[k - 1][1]);
        const left = Math.max(0, 1 - used / world.ink);
        const bx = 12 * scale, by = 12 * scale, bw = 110 * scale, bh = 10 * scale;
        ctx.fillStyle = paper2; ctx.fillRect(bx, by, bw, bh);
        ctx.fillStyle = left > 0.15 ? coral : ink; ctx.fillRect(bx, by, bw * left, bh);
        ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, scale * 1.5); ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = ink; ctx.font = `700 ${Math.round(11 * scale)}px system-ui, sans-serif`;
        ctx.fillText('Tinta', bx + bw + 6 * scale, by + bh - 1 * scale);
      }
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
